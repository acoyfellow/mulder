#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARGET=/tmp/mulder-polished-demo
PORT=8894
URL="http://127.0.0.1:$PORT/__mulder/"
WEBM="$TARGET/mulder-demo.webm"
MP4="$ROOT/demo/mulder-demo.mp4"
BROWSER_PATH=${BROWSER_PATH:-"$HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"}
cd "$ROOT"
if [[ -n "$(git status --porcelain)" ]]; then echo "Mulder source tree is not clean" >&2; exit 1; fi
for pid_file in /tmp/mulder-wrangler.pid /tmp/mulder-consumer-proof/server.pid /tmp/mulder-cmux-demo/server.pid "$TARGET/server.pid"; do
  if [[ -f "$pid_file" ]]; then kill "$(cat "$pid_file")" >/dev/null 2>&1 || true; fi
done
for old_port in 8891 8893 8894; do lsof -t -iTCP:$old_port -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true; done
rm -rf "$TARGET"
mkdir -p "$TARGET"/{producer,artifact,consumer,home,cache} "$ROOT/demo"
git archive HEAD | tar -x -C "$TARGET/producer"
HOME="$TARGET/home" BUN_INSTALL_CACHE_DIR="$TARGET/cache" bun install --cwd "$TARGET/producer" --frozen-lockfile --registry=https://registry.npmjs.org/ --ignore-scripts
(
  cd "$TARGET/producer"
  bun run build
  npm pack --ignore-scripts --pack-destination "$TARGET/artifact" >/dev/null
)
ARTIFACT=$(find "$TARGET/artifact" -name '*.tgz' -type f -print -quit)
[[ -n "$ARTIFACT" ]]
cp proof/consumer/{api.ts,index.ts,native-proof.mjs,wrangler.jsonc,tsconfig.json} "$TARGET/consumer/"
cp proof/{native-harness.mjs,record-polished-demo.mjs} "$TARGET/consumer/"
CONSUMER_MARKER="polished-demo-$(openssl rand -hex 8)"
printf 'export const marker = "%s";\n' "$CONSUMER_MARKER" > "$TARGET/consumer/marker.ts"
cat > "$TARGET/consumer/package.json" <<JSON
{
  "name": "mulder-polished-demo",
  "private": true,
  "type": "module",
  "dependencies": { "mulder": "file:$ARTIFACT" },
  "devDependencies": {
    "@cloudflare/workers-types": "4.20260527.1",
    "agent-browser": "0.35.1",
    "typescript": "6.0.3",
    "unsurf": "0.4.0",
    "wrangler": "4.95.0"
  }
}
JSON
rm -rf "$TARGET/producer"
(
  cd "$TARGET/consumer"
  HOME="$TARGET/home" NPM_CONFIG_CACHE="$TARGET/cache" NPM_CONFIG_REGISTRY=https://registry.npmjs.org npm install --ignore-scripts >/dev/null
  HOME="$TARGET/home" ./node_modules/.bin/agent-browser install >/dev/null
)
[[ -d "$TARGET/consumer/node_modules/mulder" && ! -L "$TARGET/consumer/node_modules/mulder" ]]
API_SHA=$(shasum -a 256 "$TARGET/consumer/api.ts" | awk '{print $1}')
POLICY="(version 1)(allow default)(deny file-read* (subpath \"$ROOT\"))"
(
  cd "$TARGET/consumer"
  exec sandbox-exec -p "$POLICY" env HOME="$TARGET/home" ./node_modules/.bin/wrangler dev --port "$PORT" --inspector-port 0
) > "$TARGET/worker.log" 2>&1 &
SERVER_PID=$!
printf '%s\n' "$SERVER_PID" > "$TARGET/server.pid"
cleanup_failure() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
  lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
}
trap cleanup_failure ERR
for _ in $(seq 1 120); do curl -fsS "$URL" >/dev/null 2>&1 && break; sleep .25; done
curl -fsS "$URL" | grep -F 'Waiting for the native call' >/dev/null
READY="$TARGET/recording-ready"
(
  cd "$TARGET/consumer"
  PATH="$TARGET/consumer/node_modules/.bin:$PATH" DEMO_URL="$URL" VIDEO_OUTPUT="$WEBM" RECORDING_READY="$READY" node record-polished-demo.mjs
) > "$TARGET/recording.log" 2>&1 &
RECORD_PID=$!
for _ in $(seq 1 120); do [[ -f "$READY" ]] && break; kill -0 "$RECORD_PID" 2>/dev/null || { cat "$TARGET/recording.log" >&2; exit 1; }; sleep .25; done
[[ -f "$READY" ]]
(
  cd "$TARGET/consumer"
  BROWSER_PATH="$BROWSER_PATH" CONSUMER_URL="http://127.0.0.1:$PORT" CONSUMER_MARKER="$CONSUMER_MARKER" OUTPUT_PATH="$TARGET/native.json" PRODUCER_ROOT="$ROOT" node native-proof.mjs
)
wait "$RECORD_PID" || { cat "$TARGET/recording.log" >&2; exit 1; }
[[ -s "$WEBM" ]]
rm -f "$MP4"
ffmpeg -loglevel error -i "$WEBM" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$MP4"
DURATION=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$MP4")
awk -v duration="$DURATION" 'BEGIN { exit !(duration > 5) }'
node - "$TARGET/native.json" <<'NODE'
const receipt = require(process.argv[2]);
const tools = receipt.receipt.tools.map(({ name }) => name);
if (JSON.stringify(tools) !== JSON.stringify(["get_weather"])) throw new Error(`wrong tools: ${JSON.stringify(tools)}`);
if (receipt.receipt.calls[0].responded.status !== "Completed") throw new Error("native call did not complete");
if (receipt.ledger.entries.length !== 1) throw new Error(`expected one API request, got ${receipt.ledger.entries.length}`);
NODE
curl -fsS "$URL" | grep -F 'Call completed' >/dev/null
[[ "$API_SHA" == "$(shasum -a 256 "$TARGET/consumer/api.ts" | awk '{print $1}')" ]]
[[ -z "$(git status --porcelain)" ]]
trap - ERR
echo "MULDER_POLISHED_DEMO_OK:$MP4:${DURATION}s:$CONSUMER_MARKER"

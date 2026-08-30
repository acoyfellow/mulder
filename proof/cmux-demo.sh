#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARGET=/tmp/mulder-cmux-demo
PORT=8894
URL="http://127.0.0.1:$PORT/__mulder/"
BROWSER_PATH=${BROWSER_PATH:-"$HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"}
cd "$ROOT"
if [[ -n "$(git status --porcelain)" ]]; then echo "Mulder source tree is not clean" >&2; exit 1; fi
if [[ ! -x "$BROWSER_PATH" ]]; then echo "Chrome for Testing is missing" >&2; exit 1; fi
if [[ -f "$TARGET/server.pid" ]]; then kill "$(cat "$TARGET/server.pid")" >/dev/null 2>&1 || true; fi
lsof -t -iTCP:$PORT -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
rm -rf "$TARGET"
mkdir -p "$TARGET"/{producer,artifact,consumer,home,cache}
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
cp proof/native-harness.mjs "$TARGET/consumer/native-harness.mjs"
CONSUMER_MARKER="cmux-demo-$(openssl rand -hex 12)"
printf 'export const marker = "%s";\n' "$CONSUMER_MARKER" > "$TARGET/consumer/marker.ts"
cat > "$TARGET/consumer/package.json" <<JSON
{
  "name": "mulder-cmux-demo",
  "private": true,
  "type": "module",
  "dependencies": { "mulder": "file:$ARTIFACT" },
  "devDependencies": { "@cloudflare/workers-types": "4.20260527.1", "typescript": "6.0.3", "wrangler": "4.95.0" }
}
JSON
rm -rf "$TARGET/producer"
(
  cd "$TARGET/consumer"
  HOME="$TARGET/home" NPM_CONFIG_CACHE="$TARGET/cache" NPM_CONFIG_REGISTRY=https://registry.npmjs.org npm install --ignore-scripts >/dev/null
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
curl -fsS "$URL" >/dev/null
IDENTITY=$(cmux identify --json)
WORKSPACE=${CMUX_WORKSPACE_ID:-$(printf '%s' "$IDENTITY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).focused.workspace_ref))')}
OPENED=$(cmux --json browser open "$URL" --workspace "$WORKSPACE")
SURFACE=$(printf '%s' "$OPENED" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const x=JSON.parse(s);console.log(x.surface_ref??x.surface?.ref??x.surface??"")})')
if [[ -z "$SURFACE" ]]; then SURFACE=$(printf '%s' "$OPENED" | grep -o 'surface:[0-9]*' | head -1); fi
[[ -n "$SURFACE" ]]
printf '%s\n' "$SURFACE" > "$TARGET/surface.ref"
cmux browser "$SURFACE" wait --text "waiting for a native WebMCP call" --timeout-ms 15000
(
  cd "$TARGET/consumer"
  BROWSER_PATH="$BROWSER_PATH" CONSUMER_URL="http://127.0.0.1:$PORT" CONSUMER_MARKER="$CONSUMER_MARKER" OUTPUT_PATH="$TARGET/native.json" PRODUCER_ROOT="$ROOT" node native-proof.mjs
)
cmux browser "$SURFACE" reload
cmux browser "$SURFACE" wait --text "$CONSUMER_MARKER" --timeout-ms 15000
VISIBLE=$(cmux browser "$SURFACE" get text body)
printf '%s\n' "$VISIBLE" > "$TARGET/cmux-visible.txt"
printf '%s' "$VISIBLE" | grep -F 'nativeCallArrived' >/dev/null
printf '%s' "$VISIBLE" | grep -F "$CONSUMER_MARKER" >/dev/null
cmux browser "$SURFACE" screenshot --out "$TARGET/cmux.png" >/dev/null
cmux trigger-flash --surface "$SURFACE" >/dev/null
cmux set-status mulder-demo "ready" --workspace "$WORKSPACE" --color "#64ff91" >/dev/null
[[ "$API_SHA" == "$(shasum -a 256 "$TARGET/consumer/api.ts" | awk '{print $1}')" ]]
[[ -z "$(git status --porcelain)" ]]
trap - ERR
echo "MULDER_CMUX_DEMO_OK:$SURFACE:$CONSUMER_MARKER"

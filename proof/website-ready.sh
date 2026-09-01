#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARGET=/tmp/mulder-website-proof
SITE_PORT=8895
CONSUMER_PORT=8896
SITE_URL="http://127.0.0.1:$SITE_PORT"
CONSUMER_URL="http://127.0.0.1:$CONSUMER_PORT"
BROWSER_PATH=${BROWSER_PATH:-"$HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"}
cd "$ROOT"
if [[ -n "$(git status --porcelain)" ]]; then echo "Mulder source tree is not clean" >&2; exit 1; fi
if [[ ! -x "$BROWSER_PATH" ]]; then echo "Chrome for Testing is missing" >&2; exit 1; fi
for pid_name in site.pid consumer.pid; do
  if [[ -f "$TARGET/$pid_name" ]]; then kill "$(cat "$TARGET/$pid_name")" >/dev/null 2>&1 || true; fi
done
sleep .3
for port in "$SITE_PORT" "$CONSUMER_PORT"; do
  if lsof -t -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then echo "port $port is already in use" >&2; exit 1; fi
done
rm -rf "$TARGET"
mkdir -p "$TARGET"/{repo,home,cache,consumer,browser}
git archive HEAD | tar -x -C "$TARGET/repo"
HOME="$TARGET/home" BUN_INSTALL_CACHE_DIR="$TARGET/cache" bun install --cwd "$TARGET/repo" --frozen-lockfile --registry=https://registry.npmjs.org/ --ignore-scripts
(
  cd "$TARGET/repo"
  bun run typecheck
  bun test
  bun run site:build
  node proof/verify-marketing-video.mjs demo/mulder-demo.mp4 site/dist/mulder-demo.mp4
  node proof/verify-site.mjs site/dist
  node proof/verify-kumo.mjs site/dist
  node proof/verify-writing.mjs site/dist
  node proof/verify-pwa.mjs site/dist
  node proof/verify-site-examples.mjs
)
(
  cd "$TARGET/repo"
  exec env HOME="$TARGET/home" ./node_modules/.bin/wrangler dev --config site/wrangler.jsonc --port "$SITE_PORT" --inspector-port 0
) > "$TARGET/site.log" 2>&1 &
SITE_PID=$!
printf '%s\n' "$SITE_PID" > "$TARGET/site.pid"
CONSUMER_PID=""
cleanup_failure() {
  [[ -z "$CONSUMER_PID" ]] || kill "$CONSUMER_PID" >/dev/null 2>&1 || true
  kill "$SITE_PID" >/dev/null 2>&1 || true
}
trap cleanup_failure ERR INT TERM
for _ in $(seq 1 120); do curl -fsS "$SITE_URL/" >/dev/null 2>&1 && break; sleep .25; done
curl -fsS "$SITE_URL/" | grep -F 'Let browser agents use it' >/dev/null
for route in /docs/ /docs/quickstart/ /docs/browser-support/ /docs/security/ /docs/reference/ /examples/ /examples/operations/ /examples/inventory/ /examples/support/ /examples/analytics/; do curl -fsS "$SITE_URL$route" >/dev/null; done
SITE_URL="$SITE_URL" BROWSER_PATH="$BROWSER_PATH" OUTPUT_DIR="$TARGET/browser" node "$TARGET/repo/proof/verify-site-browser.mjs"
for file in package.json tsconfig.json wrangler.jsonc api.ts index.ts; do curl -fsS "$SITE_URL/downloads/starter/$file" -o "$TARGET/consumer/$file"; done
curl -fsS "$SITE_URL/downloads/acoyfellow-mulder-0.1.0.tgz" -o "$TARGET/consumer/acoyfellow-mulder-0.1.0.tgz"
API_SHA=$(shasum -a 256 "$TARGET/consumer/api.ts" | awk '{print $1}')
(
  cd "$TARGET/consumer"
  HOME="$TARGET/home" NPM_CONFIG_CACHE="$TARGET/cache" NPM_CONFIG_REGISTRY=https://registry.npmjs.org npm install --ignore-scripts >/dev/null
  npm run check
  ./node_modules/.bin/wrangler deploy --dry-run --outdir "$TARGET/consumer-bundle" >/dev/null
)
[[ -d "$TARGET/consumer/node_modules/@acoyfellow/mulder" && ! -L "$TARGET/consumer/node_modules/@acoyfellow/mulder" ]]
if grep -R -F "$ROOT" "$TARGET/consumer/node_modules/@acoyfellow/mulder" "$TARGET/consumer-bundle" >/dev/null; then echo "consumer contains producer path" >&2; exit 1; fi
POLICY="(version 1)(allow default)(deny file-read* (subpath \"$ROOT\"))(deny file-read* (subpath \"$TARGET/repo\"))"
(
  cd "$TARGET/consumer"
  exec sandbox-exec -p "$POLICY" env HOME="$TARGET/home" ./node_modules/.bin/wrangler dev --port "$CONSUMER_PORT" --inspector-port 0
) > "$TARGET/consumer.log" 2>&1 &
CONSUMER_PID=$!
printf '%s\n' "$CONSUMER_PID" > "$TARGET/consumer.pid"
for _ in $(seq 1 120); do curl -fsS "$CONSUMER_URL/__mulder/" >/dev/null 2>&1 && break; sleep .25; done
curl -fsS "$CONSUMER_URL/__mulder/" | grep -F 'get_service_health' >/dev/null
CONSUMER_URL="$CONSUMER_URL" BROWSER_PATH="$BROWSER_PATH" OUTPUT_PATH="$TARGET/tutorial-native.json" node "$TARGET/repo/proof/verify-site-starter-native.mjs"
[[ "$API_SHA" == "$(shasum -a 256 "$TARGET/consumer/api.ts" | awk '{print $1}')" ]]
[[ -s "$TARGET/browser/desktop-home.png" && -s "$TARGET/browser/mobile-home.png" && -s "$TARGET/browser/desktop-quickstart.png" ]]
[[ -z "$(git status --porcelain)" ]]
kill "$CONSUMER_PID" >/dev/null 2>&1 || true
CONSUMER_PID=""
trap - ERR INT TERM
[[ "$(curl -sS -o /dev/null -w '%{http_code}' "$SITE_URL/demo/")" == "404" ]]
echo "MULDER_WEBSITE_READY_OK:$SITE_URL:11-routes:4-examples:1-native-call"

#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARGET=/tmp/mulder-consumer-proof
BROWSER_PATH=${BROWSER_PATH:-"$HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"}
cd "$ROOT"
if [[ -n "$(git status --porcelain)" ]]; then echo "producer tree is not clean" >&2; exit 1; fi
if [[ ! -x "$BROWSER_PATH" ]]; then echo "Chrome for Testing is missing" >&2; exit 1; fi
if lsof -nP -iTCP:8893 -sTCP:LISTEN >/dev/null 2>&1; then echo "consumer port 8893 is in use" >&2; exit 1; fi
PRODUCER_SHA=$(git rev-parse HEAD)
rm -rf "$TARGET"
mkdir -p "$TARGET"/{producer-build,artifact,consumer,home,npm-cache,bun-cache,bundle}
PRODUCER_BUILD="$TARGET/producer-build"
ARTIFACT="$TARGET/artifact/mulder-under-test.tgz"
CONSUMER="$TARGET/consumer"
EMPTY_NPMRC="$TARGET/empty.npmrc"
: > "$EMPTY_NPMRC"
git archive HEAD | tar -x -C "$PRODUCER_BUILD"
HOME="$TARGET/home" BUN_INSTALL_CACHE_DIR="$TARGET/bun-cache" bun install --cwd "$PRODUCER_BUILD" --frozen-lockfile --registry=https://registry.npmjs.org/ --ignore-scripts
(
  cd "$PRODUCER_BUILD"
  bun run build
  npm pack --ignore-scripts --pack-destination "$TARGET/artifact" >/dev/null
)
PACKED=$(find "$TARGET/artifact" -maxdepth 1 -name '*.tgz' -print -quit)
[[ -n "$PACKED" ]]
mv "$PACKED" "$ARTIFACT"
ARTIFACT_SHA=$(shasum -a 256 "$ARTIFACT" | awk '{print $1}')
mkdir -p "$TARGET/extracted"
tar -xzf "$ARTIFACT" -C "$TARGET/extracted"
node - "$TARGET/extracted/package/package.json" <<'NODE'
const manifest = require(process.argv[2]);
if (manifest.name !== "mulder" || manifest.version !== "0.1.0") throw new Error("package identity mismatch");
if (manifest.exports?.["."]?.import !== "./dist/public.js" || manifest.exports?.["."]?.types !== "./dist/public.d.ts") throw new Error("public export mismatch");
if (manifest.dependencies && Object.keys(manifest.dependencies).length) throw new Error("runtime dependencies are not allowed");
NODE
while IFS= read -r file; do
  case "$file" in
    package/package.json|package/LICENSE|package/README.md|package/SUPPORT.md|package/dist/*.js|package/dist/*.d.ts) ;;
    *) echo "unexpected artifact file: $file" >&2; exit 1 ;;
  esac
done < <(tar -tzf "$ARTIFACT" | sed 's:/$::' | grep -v '^package$')
if grep -R -I -E '(file:|link:|workspace:|/Users/jcoeyman/cloudflare/mulder|\.\./src)' "$TARGET/extracted/package"; then echo "artifact contains a source or local dependency" >&2; exit 1; fi
rm -rf "$PRODUCER_BUILD" "$TARGET/extracted"

cp proof/consumer/{api.ts,index.ts,native-proof.mjs,wrangler.jsonc,tsconfig.json} "$CONSUMER/"
cp proof/native-harness.mjs "$CONSUMER/native-harness.mjs"
CONSUMER_MARKER="consumer-$(openssl rand -hex 16)"
printf 'export const marker = %q;\n' "\"$CONSUMER_MARKER\"" > "$CONSUMER/marker.ts"
cat > "$CONSUMER/package.json" <<JSON
{
  "name": "mulder-clean-consumer",
  "private": true,
  "type": "module",
  "dependencies": { "mulder": "file:../artifact/mulder-under-test.tgz" },
  "devDependencies": {
    "@cloudflare/workers-types": "4.20260527.1",
    "typescript": "6.0.3",
    "wrangler": "4.95.0"
  }
}
JSON
API_SHA_BEFORE=$(shasum -a 256 "$CONSUMER/api.ts" | awk '{print $1}')
STERILE=(env -i "PATH=$PATH" "HOME=$TARGET/home" "NPM_CONFIG_USERCONFIG=$EMPTY_NPMRC" "NPM_CONFIG_CACHE=$TARGET/npm-cache" "NPM_CONFIG_REGISTRY=https://registry.npmjs.org" "BROWSER_PATH=$BROWSER_PATH")
(
  cd "$CONSUMER"
  "${STERILE[@]}" npm install --package-lock-only --ignore-scripts
  "${STERILE[@]}" npm ci --ignore-scripts
)
node - "$CONSUMER/package-lock.json" <<'NODE'
const lock = require(process.argv[2]);
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path.startsWith("node_modules/")) continue;
  if (path === "node_modules/mulder") {
    if (entry.resolved !== "file:../artifact/mulder-under-test.tgz" || !entry.integrity) throw new Error("Mulder is not locked to the artifact");
    continue;
  }
  if (entry.link || !entry.resolved?.startsWith("https://registry.npmjs.org/") || !entry.integrity) throw new Error(`non-public or unlocked dependency ${path}`);
}
NODE
[[ -d "$CONSUMER/node_modules/mulder" && ! -L "$CONSUMER/node_modules/mulder" ]]
RESOLVED=$(cd "$CONSUMER" && node --input-type=module -e 'console.log(import.meta.resolve("mulder"))')
case "$RESOLVED" in file://$CONSUMER/node_modules/mulder/dist/public.js) ;; *) echo "Mulder resolved outside installed artifact" >&2; exit 1 ;; esac
POLICY="(version 1)(allow default)(deny file-read* (subpath \"$ROOT\"))"
if sandbox-exec -p "$POLICY" test -r "$ROOT/package.json"; then echo "producer read negative control failed" >&2; exit 1; fi

WORKER_PID=""
cleanup() {
  [[ -z "$WORKER_PID" ]] || kill "$WORKER_PID" >/dev/null 2>&1 || true
  lsof -t -iTCP:8893 -sTCP:LISTEN 2>/dev/null | xargs kill >/dev/null 2>&1 || true
}
trap cleanup EXIT
(
  cd "$CONSUMER"
  exec sandbox-exec -p "$POLICY" env HOME="$TARGET/home" ./node_modules/.bin/wrangler dev --port 8893 --inspector-port 0
) > "$TARGET/worker.log" 2>&1 &
WORKER_PID=$!
for _ in $(seq 1 120); do curl -fsS http://127.0.0.1:8893/__mulder/ >/dev/null 2>&1 && break; sleep .25; done
curl -fsS http://127.0.0.1:8893/__mulder/ >/dev/null
(
  cd "$CONSUMER"
  sandbox-exec -p "$POLICY" env BROWSER_PATH="$BROWSER_PATH" CONSUMER_MARKER="$CONSUMER_MARKER" OUTPUT_PATH="$TARGET/native.json" PRODUCER_ROOT="$ROOT" node native-proof.mjs
  sandbox-exec -p "$POLICY" env HOME="$TARGET/home" ./node_modules/.bin/tsc --noEmit
  sandbox-exec -p "$POLICY" env HOME="$TARGET/home" ./node_modules/.bin/wrangler deploy --config wrangler.jsonc --dry-run --outdir "$TARGET/bundle" > "$TARGET/dry-run.log" 2>&1
)
grep -F -- '--dry-run: exiting now.' "$TARGET/dry-run.log" >/dev/null
BUNDLE=$(find "$TARGET/bundle" -name index.js -type f -print -quit)
MAP=$(find "$TARGET/bundle" -name index.js.map -type f -print -quit)
[[ -s "$BUNDLE" && -s "$MAP" ]]
grep -F 'consumer-owned-unchanged-api' "$BUNDLE" >/dev/null
grep -F "$CONSUMER_MARKER" "$BUNDLE" >/dev/null
grep -F 'node_modules/mulder/dist/public.js' "$MAP" >/dev/null
if grep -R -I -F "$ROOT" "$CONSUMER" "$TARGET/bundle" "$TARGET/native.json"; then echo "consumer output contains producer path" >&2; exit 1; fi
if grep -F 'from "mulder"' "$BUNDLE" || grep -F "from 'mulder'" "$BUNDLE"; then echo "consumer bundle retains unresolved Mulder import" >&2; exit 1; fi
API_SHA_AFTER=$(shasum -a 256 "$CONSUMER/api.ts" | awk '{print $1}')
[[ "$API_SHA_BEFORE" == "$API_SHA_AFTER" ]]
cd "$ROOT"
[[ -z "$(git status --porcelain)" ]]
echo "MULDER_CONSUMER_RELEASE_OK:$PRODUCER_SHA:$ARTIFACT_SHA"

#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "source tree is not clean" >&2
  exit 1
fi

BROWSER_PATH=${BROWSER_PATH:-"$HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"}
if [[ ! -x "$BROWSER_PATH" ]]; then
  echo "Chrome for Testing is missing: $BROWSER_PATH" >&2
  exit 1
fi
for port in 8891 8892; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "required local port $port is already in use" >&2
    exit 1
  fi
done

WORK=$(mktemp -d)
CHECKOUT="$WORK/checkout"
HOME_DIR="$WORK/home"
CACHE_DIR="$WORK/cache"
VARS_FILE="$WORK/runtime.env"
ORIGIN_LOG="$WORK/origin.log"
WORKER_LOG="$WORK/worker.log"
RESULT_PATH="$WORK/approval.json"
SCREENSHOT_PATH="$WORK/approval.png"
ORIGIN_PID=""
WORKER_PID=""
cleanup() {
  [[ -z "$WORKER_PID" ]] || kill "$WORKER_PID" >/dev/null 2>&1 || true
  [[ -z "$ORIGIN_PID" ]] || kill "$ORIGIN_PID" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
mkdir -p "$CHECKOUT" "$HOME_DIR" "$CACHE_DIR"
git archive HEAD | tar -x -C "$CHECKOUT"

HOME="$HOME_DIR" BUN_INSTALL_CACHE_DIR="$CACHE_DIR" bun install --cwd "$CHECKOUT" --frozen-lockfile --registry=https://registry.npmjs.org/ --ignore-scripts
(
  cd "$CHECKOUT"
  bun run check
  node proof/security.mjs
)
echo "MULDER_FRESH_INSTALL_OK"

ORIGIN_SECRET=$(openssl rand -hex 32)
HUMAN_APPROVAL_SECRET=$(openssl rand -hex 32)
printf 'ORIGIN_URL=http://127.0.0.1:8892\nORIGIN_SECRET=%s\nHUMAN_APPROVAL_SECRET=%s\n' "$ORIGIN_SECRET" "$HUMAN_APPROVAL_SECRET" > "$VARS_FILE"
(
  cd "$CHECKOUT"
  ORIGIN_SECRET="$ORIGIN_SECRET" ORIGIN_PORT=8892 bun experiments/04-credential-custody/origin.mjs
) >"$ORIGIN_LOG" 2>&1 &
ORIGIN_PID=$!

start_worker() {
  (
    cd "$CHECKOUT"
    HOME="$HOME_DIR" BUN_INSTALL_CACHE_DIR="$CACHE_DIR" bunx wrangler dev --env-file "$VARS_FILE" --port 8891 --inspector-port 0
  ) >"$WORKER_LOG" 2>&1 &
  WORKER_PID=$!
}
wait_url() {
  local url=$1
  for _ in $(seq 1 120); do
    if curl -fsS "$url" >/dev/null 2>&1; then return 0; fi
    sleep 0.25
  done
  echo "local service did not become ready: $url" >&2
  cat "$ORIGIN_LOG" "$WORKER_LOG" >&2
  return 1
}
start_worker
wait_url http://127.0.0.1:8892/ledger
wait_url http://127.0.0.1:8891/__mulder/

(
  cd "$CHECKOUT"
  BROWSER_PATH="$BROWSER_PATH" node proof/native-product.mjs
  BROWSER_PATH="$BROWSER_PATH" \
    WEBMCP_PROOF_MODULE="file://$CHECKOUT/proof/native-harness.mjs" \
    OUTPUT_PATH="$RESULT_PATH" \
    SCREENSHOT_PATH="$SCREENSHOT_PATH" \
    HUMAN_APPROVAL_SECRET="$HUMAN_APPROVAL_SECRET" \
    ORIGIN_URL=http://127.0.0.1:8892 \
    node experiments/06-write-approval/native-call.mjs
)

kill "$WORKER_PID"
wait "$WORKER_PID" 2>/dev/null || true
WORKER_PID=""
start_worker
wait_url http://127.0.0.1:8891/__mulder/
(
  cd "$CHECKOUT"
  RESULT_PATH="$RESULT_PATH" HUMAN_APPROVAL_SECRET="$HUMAN_APPROVAL_SECRET" node experiments/06-write-approval/restart-replay.mjs
  RESULT_PATH="$RESULT_PATH" SCREENSHOT_PATH="$SCREENSHOT_PATH" node experiments/06-write-approval/verify.mjs
)

if grep -Fq "$ORIGIN_SECRET" "$RESULT_PATH" || grep -Fq "$HUMAN_APPROVAL_SECRET" "$RESULT_PATH"; then
  echo "runtime receipt leaked a credential" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "source tree changed during product proof" >&2
  exit 1
fi

echo "MULDER_PRODUCT_READY_OK:$(git rev-parse HEAD)"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bun run check
for verifier in experiments/*/verify.mjs; do node "$verifier"; done
node proof/verify-terminal.mjs
if ! git diff --quiet || ! git diff --cached --quiet || test -n "$(git ls-files --others --exclude-standard)"; then
  echo "MULDER_GATE:working-tree-not-clean" >&2
  exit 1
fi
printf 'MULDER_TERMINAL_OK:%s\n' "$(git rev-parse HEAD)"

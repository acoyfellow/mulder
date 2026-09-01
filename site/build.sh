#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARGET=${MULDER_SITE_BUILD_TARGET:-/tmp/mulder-site-build}
cd "$ROOT"
rm -rf "$TARGET"
mkdir -p "$TARGET"
bun run build
npm pack --ignore-scripts --pack-destination "$TARGET" >/dev/null
TARBALL=$(find "$TARGET" -name 'acoyfellow-mulder-*.tgz' -type f -print -quit)
MULDER_TARBALL="$TARBALL" node site/build.mjs

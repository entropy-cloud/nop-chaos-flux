#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FLUX_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONSUMER_DIR="${1:-}"

if [ -z "$CONSUMER_DIR" ]; then
  echo "Usage: $0 <path-to-nop-chaos-next>"
  exit 1
fi

if [ ! -f "$CONSUMER_DIR/pnpm-workspace.yaml" ]; then
  echo "ERROR: Consumer project not found at $CONSUMER_DIR"
  echo "Usage: $0 [path-to-nop-chaos-next]"
  exit 1
fi

FLUX_LIB_DIR="$CONSUMER_DIR/flux-lib"

echo "=== Building @nop-chaos/ui and packing @nop-chaos/flux ==="
cd "$FLUX_ROOT"
pnpm --filter @nop-chaos/ui build
node scripts/pack-flux-bundle.mjs

echo ""
echo "=== Syncing @nop-chaos/ui to $FLUX_LIB_DIR ==="

mkdir -p "$FLUX_LIB_DIR"

src="$FLUX_ROOT/packages/ui"
dst="$FLUX_LIB_DIR/ui"

if [ ! -d "$src/dist" ]; then
  echo "ERROR: ui dist/ missing after build"
  exit 1
fi

rm -rf "$dst"
cp -R "$src" "$dst"
rm -rf "$dst/src"
rm -rf "$dst/node_modules"

echo "OK: ui"

TARBALL_PATH="$FLUX_ROOT/dist-packages/nop-chaos-flux-0.1.0.tgz"

echo ""
echo "=== Done ==="
echo "flux-lib/ui copied to: $dst"
echo "host-facing Flux tarball ready at: $TARBALL_PATH"
echo ""
echo "Supported next steps in nop-chaos-next:"
echo "  1. Keep only flux-lib/ui as a synced workspace package"
echo "  2. Add @nop-chaos/flux via file:.../dist-packages/nop-chaos-flux-0.1.0.tgz"
echo "  3. Do not sync flux-core/flux-react/flux-renderers-* into flux-lib/"

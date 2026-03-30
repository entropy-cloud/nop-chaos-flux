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

PACKAGES=(
  flux-core
  flux-formula
  flux-runtime
  flux-react
  flux-renderers-basic
  flux-renderers-form
  flux-renderers-data
  flow-designer-core
  flow-designer-renderers
  spreadsheet-core
  spreadsheet-renderers
  report-designer-core
  report-designer-renderers
  nop-debugger
  ui
)

echo "=== Building all packages ==="
cd "$FLUX_ROOT"
pnpm -r build

echo ""
echo "=== Syncing to $FLUX_LIB_DIR ==="

rm -rf "$FLUX_LIB_DIR"
mkdir -p "$FLUX_LIB_DIR"

for pkg in "${PACKAGES[@]}"; do
  src="$FLUX_ROOT/packages/$pkg"
  dst="$FLUX_LIB_DIR/$pkg"

  if [ ! -d "$src/dist" ]; then
    echo "SKIP: $pkg (no dist/)"
    continue
  fi

  rm -rf "$dst"
  cp -R "$src" "$dst"
  rm -rf "$dst/node_modules"

  echo "OK: $pkg"
done

echo ""
echo "=== Done ==="
echo "flux-lib packages copied to: $FLUX_LIB_DIR"
echo ""
echo "Next steps in nop-chaos-next:"
echo "  1. Ensure pnpm-workspace.yaml includes 'flux-lib/*'"
echo "  2. Run pnpm install"
echo "  3. Update apps/main/package.json with workspace:* deps"

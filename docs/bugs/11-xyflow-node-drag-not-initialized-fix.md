# 11 Xyflow Node Drag "Not Initialized" Fix

## Problem

- When dragging nodes in Flow Designer page, console showed warning: `[React Flow]: It seems that you are trying to drag a node that is not initialized. Please use onNodesChange as explained in the docs.`
- The warning appeared for both initial document nodes and newly added nodes
- Help link: https://reactflow.dev/error#015

## Root Cause

- React Flow's `calculateNodePosition` function checks `node.measured.width === undefined || node.measured.height === undefined` to determine if a node is "initialized"
- If a node lacks `measured` property with both dimensions, it triggers error code 015
- `canvas-bridge.tsx:createXyflowNodes()` set `width` and `height` properties but not `measured`
- Normally React Flow sets `measured` after rendering, but when drag starts before render completes, the check fails

## Fix

- Added `measured: { width: 180, height: 60 }` to nodes created in `createXyflowNodes()`
- The values match the static `width`/`height` already defined for designer nodes
- React Flow will update these with actual dimensions after render, but having initial values prevents the error

## Tests

- Manual testing: drag nodes immediately after page load - no warning
- Manual testing: add new nodes via palette and drag - no warning

## Affected Files

- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

## Notes For Future Refactors

- **measured property**: When creating nodes programmatically for React Flow, always include `measured: { width, height }` to avoid "not initialized" errors
- **Static dimensions**: If node types have known dimensions, pre-populate `measured` to avoid race conditions between render and user interaction
- **Error code 015**: This specific error always relates to missing `measured` dimensions, not `onNodesChange` usage (the error message is misleading)

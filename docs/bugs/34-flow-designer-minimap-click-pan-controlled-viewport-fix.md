# 34 Flow Designer Minimap Click/Pan Not Working With Controlled Viewport

## Problem

- Flow designer minimap: clicking does nothing, dragging only moves the canvas viewport a tiny amount instead of properly following the pointer
- Scrolling (zoom) on the minimap also felt broken for the same reason
- Expected: click jumps viewport to that position, drag pans smoothly in real-time

## Diagnostic Method

- First wrote an e2e test to confirm the behavior objectively
- Click test: `page.mouse.click` on minimap at 80%×80% → viewport stayed at (0, 0) — confirmed click does nothing
- Drag test: drag from 20% to 80% of minimap → viewport only moved ~73px — far too little
- Investigated `@xyflow/react` MiniMap source in `node_modules/.pnpm/@xyflow+react@12.10.2_.../dist/esm/index.mjs` and `@xyflow/system/dist/esm/index.mjs`
- Found that MiniMap `pannable` only handles d3-zoom `zoom` event (mousemove/touchmove), not click — no click-to-pan at all
- Found that MiniMap pan handler calls `panZoom.setViewportConstrained()` which directly mutates d3-zoom on the main canvas, bypassing React state
- This conflicts with the controlled viewport (`viewport={viewport}` prop on ReactFlow): ReactFlow's sync `useEffect` overrides d3-zoom changes on every render, snapping the viewport back to the old prop value
- Only when `onMoveEnd` fires (drag end) does the final position get committed through the store, resulting in a tiny accumulated movement

## Root Cause

- **Click broken**: `@xyflow/react` MiniMap's `pannable` prop only wires a d3-zoom `zoom` handler filtered to `mousemove`/`touchmove`. No click-to-pan exists upstream. D3-zoom also suppresses the `click` event when `pannable` is active (calls `event.preventDefault()` on mousedown in some configurations).

- **Drag barely moves**: MiniMap's pan handler (`XYMinimap.panHandler` in `@xyflow/system`) calls `panZoom.setViewportConstrained()` which directly mutates the d3-zoom transform on the main canvas DOM element. Because the flow designer uses a **controlled viewport** (`viewport={viewport}` prop), ReactFlow's sync `useEffect` runs after each render and resets the d3-zoom transform back to the controlled prop value. The viewport snaps back almost immediately, so the user sees little or no movement. Only the final `onMoveEnd` position survives the round-trip through the core store.

## Fix

Two changes in `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`:

1. **Added `onMove` callback on ReactFlow** — `onMove` fires synchronously when d3-zoom changes the viewport (including minimap-driven changes). The handler reuses the existing `handleViewportChange` which normalizes and dispatches to the core store. This keeps the controlled viewport prop in sync with the d3-zoom state in real-time, preventing snap-back during drag.

2. **Added custom minimap click handler** — A `useEffect` attaches `mousedown`/`mouseup` listeners on the minimap SVG element. On `mouseup`, if the mouse moved less than 5px (threshold), it's treated as a click. The handler reads the SVG `viewBox` attribute (which maps pixel space to flow-coordinate space), converts the click position to flow coordinates, then sets the viewport to center the canvas on that position. Uses a `viewportRef` to avoid stale closures for the current zoom level.

## Tests

- `tests/e2e/flow-designer-minimap-pan.spec.ts` — three e2e tests:
  - **click**: click at 80%×80% of minimap → viewport moves (dx or dy > 1)
  - **drag**: drag from 20% to 80% of minimap → viewport moves significantly (dx, dy > 1)
  - **scroll**: wheel on minimap → zoom level increases

## Affected Files

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`
- `tests/e2e/flow-designer-minimap-pan.spec.ts` (new)

## Notes For Future Refactors

- The controlled viewport pattern (`viewport={viewport}` prop + `onMoveEnd` sync) inherently conflicts with any component that directly mutates d3-zoom (like MiniMap's `pannable`). Any new interaction layer that bypasses React state will need the same `onMove` real-time sync treatment.
- The click handler reads `viewBox` from the DOM on each click. If the MiniMap's coordinate mapping logic changes upstream (e.g., `offsetScale`, padding), the click-to-flow conversion may need updating.
- `onMove` fires for ALL viewport changes (canvas pan, minimap drag, scroll zoom). Each call dispatches `setViewport` to the core store which pushes an undo history entry. During a smooth drag this creates multiple history entries. If single-undo-per-drag is needed later, add a `skipHistory` transient flag to the core's `setViewport` and use `onMoveStart`/`onMoveEnd` to bracket the transaction.

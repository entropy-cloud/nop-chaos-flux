# 15 RenderNodes setState During Render — NodeRenderer Warning Fix

## Problem

- React console warning: "Cannot update a component (`NodeRenderer`) while rendering a different component (`RenderNodes`)"
- Warning appeared when flow designer nodes were dragged or edited while the JSON preview dialog was open
- No visible user-facing breakage, but the warning indicated a React anti-pattern that could cause subtle state inconsistencies

## Diagnostic Method

- **Diagnosis difficulty: medium.** The warning message pointed to `RenderNodes` → `NodeRenderer`, narrowing the scope quickly.
- Stacked the warning trace: `RenderNodes.render` → `scope.store.setSnapshot()` → Zustand subscription in `NodeRenderer` → React re-render
- Confirmed that `render-nodes.tsx:162` called `scope.store?.setSnapshot(nextData)` directly in the render body (not inside `useEffect`)
- Verified the Zustand subscription path: `NodeRenderer` subscribes to the scope store; calling `setSnapshot` during render triggers the subscription synchronously, causing React to detect a nested render

## Root Cause

- `RenderNodes` called `scope.store.setSnapshot(nextData)` inline during render when fragment scope data changed
- This triggered Zustand's subscription in `NodeRenderer` synchronously during `RenderNodes`'s render phase
- React 18+ detects state updates during render and warns (and may batch or drop them)

## Fix

- Introduced `pendingDataRef` to buffer the new data instead of calling `setSnapshot` inline
- Added a `useEffect` (no dependency array) that flushes the pending data after render completes
- The `useEffect` reads `pendingDataRef.current`, calls `setSnapshot`, then clears the ref
- This preserves the same update semantics (data applied on next render cycle) without triggering the anti-pattern warning

## Tests

- No new test added — the fix removes a React warning, not a functional bug. The warning itself is the regression signal.
- Existing tests in `packages/flux-react/` continue to pass.

## Affected Files

- `packages/flux-react/src/render-nodes.tsx` — added `pendingDataRef`, deferred `setSnapshot` to `useEffect`

## Notes For Future Refactors

1. **Never call Zustand store setters during React render.** Even if it "works," it violates React's render phase contract and triggers warnings in Strict Mode.
2. **The pattern of "buffer in ref + flush in useEffect" is the standard fix** for state updates that must happen in response to render-time calculations. The `useEffect` with no deps runs after every render, making it equivalent to the inline call but safe.
3. **Fragment scope data updates are frequent** — any change to `props.options.data` flows through this path. Watch for regressions if `RenderNodes` is refactored.

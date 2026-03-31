# 22 Spreadsheet Integration Test Non-Reactive Scope Read Fix

## Problem

- `packages/spreadsheet-renderers/src/renderers.integration.test.tsx` failed: `A1ValueProbe` component never re-rendered after a namespaced action dispatched `setCellValue` and updated the spreadsheet store
- Test clicked a toolbar button → dispatched `spreadsheetCore.dispatch('setCellValue', ...)` → expected `A1ValueProbe` to reflect the new cell value, but it always showed `undefined`
- The scope snapshot was correctly updated (verified by logging), but the component never saw the change

## Diagnostic Method

- **Diagnosis difficulty: high.** The bug crossed 4 packages (spreadsheet-renderers → flux-react → flux-runtime → flux-react hooks) and involved a subtle difference between synchronous reads and reactive subscriptions
- First inspected the integration test itself — confirmed action dispatch and store update were working correctly
- Hypothesis 1 (rejected): "The action never fires" — disproved by adding `console.log` inside the dispatch handler; it executed
- Hypothesis 2 (rejected): "The scope snapshot is stale" — disproved by logging `scope.readOwn()` after dispatch; it returned updated data
- Hypothesis 3 (rejected): "RenderNodes doesn't detect data change" — disproved by tracing `shallowEqual` in `render-nodes.tsx`; it detected the change and set `pendingDataRef`
- Decisive evidence: traced the full data flow from `SpreadsheetPageRenderer` → `hostData` → `RenderNodes` → `scope.store.setSnapshot()` → component subscription. Discovered `A1ValueProbe` used `useRenderScope()` + `scope.readOwn()` (a synchronous direct read from the store snapshot) instead of `useScopeSelector` (which subscribes via `useSyncExternalStoreWithSelector`). The component was never subscribed to store changes, so it never re-rendered

## Root Cause

- `A1ValueProbe` called `scope.readOwn()` synchronously — this returns the current snapshot value but does NOT subscribe to future changes
- The scope store update path is: `RenderNodes` detects `hostData` change via `shallowEqual` → sets `pendingDataRef.current` → `useEffect` calls `scope.store.setSnapshot(nextData)` → store notifies subscribers
- Only components using `useScopeSelector` (which wraps `useSyncExternalStoreWithSelector`) are subscribed to the store. Components calling `scope.readOwn()` directly never re-render
- This is the intended API contract: `readOwn()` is for one-shot reads; `useScopeSelector` is for reactive bindings

## Fix

- Replaced `useRenderScope()` + `scope.readOwn('A1')` with `useScopeSelector(state => state.A1)` in the test's `A1ValueProbe` component
- No production code changed — this was a test-only fix where the test helper used the wrong API
- The fix aligns with the renderer runtime contract: reactive data access must go through `useScopeSelector`

## Tests

- `packages/spreadsheet-renderers/src/renderers.integration.test.tsx` — integration test now correctly subscribes to scope changes and verifies A1 cell value updates after dispatch

## Affected Files

- `packages/spreadsheet-renderers/src/renderers.integration.test.tsx`

## Notes For Future Refactors

- **`scope.readOwn()` is NOT reactive.** Any component that needs to re-render on scope data changes MUST use `useScopeSelector`. This is a recurring pitfall — consider adding a lint rule or runtime warning if `readOwn` is called inside a React component body
- **Test helpers should use the same APIs as production renderers.** The mismatch between how real renderers consume scope data (`useScopeSelector`) and how test helpers did it (`readOwn`) hid the bug
- **The `RenderNodes` → `pendingDataRef` → `useEffect` → `scope.store.setSnapshot()` path is the ONLY way scope data propagates to child components.** Any component bypassing `useScopeSelector` will silently miss updates. See `docs/architecture/renderer-runtime.md` for the full data flow

# 30 FormRuntime setValue setLastChange Missing Re-render Fix

## Problem

- After the **second** (or any subsequent) `parentForm.setValue(path, value)` call for the same field path, viewer expressions that depended on that field did not update in the UI.
- First confirm: viewer updated correctly.
- Second confirm (same field path, different value): viewer stayed frozen at the first-confirm value.
- Reproducible in `detail-view` after fixing bug 29, and in principle affects any code that calls `FormRuntime.setValue` or `setValues` twice for the same path in the same session.

## Diagnostic Method

- Added `console.log` inside `handleConfirm` to print `readOwn()` values. Both confirms logged the correct values (`First Edit`, then `Second Edit`), confirming that the data write itself was happening correctly.
- Suspected `useSyncExternalStoreWithSelector` equality check. Traced `NodeRenderer`'s subscription: it uses `props.scope.store.getLastChange()` as `getSnapshot`. If `getLastChange()` returns the same object reference on consecutive calls, the selector is never re-invoked.
- Traced `FormRuntime.setValue` in `form-runtime.ts`: it called `store.batchUpdate` but **never called `setLastChange`**. The `lastChange` variable remained as the object set during the first `setValue` call — same reference on the second call.
- Compared with `scope.update()` (the raw scope path), which does call `setLastChange` before every write. `setValue` was inconsistent with this contract.
- Confirmed: adding `setLastChange` before `batchUpdate` in `setValue` caused `getLastChange()` to return a new object on each call, and the viewer updated correctly on the second confirm.

## Root Cause

- `FormRuntime.setValue` and `setValues` in `packages/flux-runtime/src/form-runtime.ts` wrote to the zustand form store (`batchUpdate`) without updating `lastChange`.
- `NodeRenderer` subscribes via `props.scope.store.subscribe(change => { if (scopeChangeHitsDependencies(change, deps)) listener() })` and uses `props.scope.store.getLastChange()` as the `useSyncExternalStoreWithSelector` snapshot.
- `useSyncExternalStoreWithSelector` compares snapshots by reference. When `lastChange` was not refreshed, the snapshot was the same object on the second `setValue` call. Even though the subscriber fired (zustand always fires on `setState`), `useSyncExternalStoreWithSelector` saw an identical snapshot and skipped selector re-evaluation and re-render.
- `scope.update()` (used by raw scope writes and by `setSnapshot`) did call `setLastChange`, making it immune to this bug. `setValue`/`setValues` were the only paths that missed it.

## Fix

- `form-runtime.ts` `setValue`: added `setLastChange({ paths: [name || '*'], sourceScopeId: formId, kind: 'update' })` immediately before `store.batchUpdate`. This produces a fresh `lastChange` object on every field write, so `getLastChange()` always returns a new reference and `NodeRenderer` always re-evaluates its expressions.
- `form-runtime.ts` `setValues`: same fix, with `paths: changedPaths.length > 0 ? changedPaths : ['*']` to accurately report which paths changed.

## Tests

- `packages/flux-renderers-form/src/renderers/detail-view.test.tsx` — "viewer updates after second confirm when using name as scopePath": directly reproduces the stale-snapshot scenario — edits twice in the same session and asserts the viewer reflects the second edit.
- `packages/flux-runtime/src/` — all 478 existing runtime tests pass without modification, confirming the change does not regress validation, dirty tracking, or form submission behavior.

## Affected Files

- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-renderers-form/src/renderers/detail-view.test.tsx`

## Notes For Future Refactors

- `lastChange` is the snapshot key for `NodeRenderer`'s `useSyncExternalStoreWithSelector`. Every code path that modifies form values — including any future `patchValue`, `resetField`, or bulk-update variants — **must** call `setLastChange` before the corresponding store write, or re-renders will be silently skipped for repeated writes to the same field path.
- The contract is: `setLastChange` → `store.write`. Never reverse this order (stale snapshot) or omit `setLastChange` (missed re-render).
- `scope.update()` and `setSnapshot()` already follow this contract. `setValue`/`setValues` now match them.

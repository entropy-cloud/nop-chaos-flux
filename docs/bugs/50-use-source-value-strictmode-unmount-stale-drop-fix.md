# 50 `useSourceValue` StrictMode Remount And Unmount Stale-Drop Contract Fix

## Problem

- `useSourceValue` (in `packages/flux-react/src/use-source-value.ts`) had no explicit proof that observer settlements arriving after React StrictMode remount or after component unmount would not corrupt UI state.
- Without this proof, future refactors could easily introduce a regression where a stale observer's late settlement writes through to the React component even though the observer is no longer the active mount's observer.

## Diagnostic Method

- The gap was identified during the plan-248 contract closure audit, not from a production incident.
- The audit traced the hook's lifecycle: `useState` creates one observer per component instance, `useSyncExternalStore` subscribes to it, and `useEffect` disposes on cleanup.
- Under StrictMode, React calls effect cleanup then re-runs the effect, which means `observer.dispose()` fires while the same observer instance may still be the committed instance's observer. The audit flagged that without a test, the stale-settlement behavior was an implicit assumption.
- The test was designed to exercise three specific lifecycle scenarios: (1) multiple observers from StrictMode remount, (2) stale observer settlement does not update UI, (3) post-unmount settlement does not trigger `setState`.

## Root Cause

- Not a production defect. The hook's implementation already relied on `observer.dispose()` clearing listeners, which prevents post-unsettlement notifications, but this contract was implicit and unprotected by regression tests.
- The real risk: if a future refactor moves disposal to a different lifecycle phase or changes how listeners are managed, stale settlements could leak through.

## Fix

- Added explicit regression test covering StrictMode remount and unmount stale-drop semantics.
- The test verifies:
  - StrictMode produces at least 2 observers; exactly 1 has live listeners (`listeners.size > 0`).
  - Settlements from stale observers (those without live listeners) do not change the rendered output.
  - After unmount, settlement on the formerly-live observer does not trigger additional `setState` calls.
  - `dispose()` is called at least once per observer.

## Tests

- `packages/flux-react/src/__tests__/use-source-value.test.tsx` — `drops stale settlements across StrictMode remounts and after unmount` verifies the full lifecycle contract described above.

## Affected Files

- `packages/flux-react/src/__tests__/use-source-value.test.tsx`

## Notes For Future Refactors

- `useSourceValue` observer disposal clears the listener set, which is the mechanism that prevents stale settlements from reaching `useSyncExternalStore`. Any refactor that changes listener management or disposal timing must re-check StrictMode + unmount ordering.
- The observer is created via `useState(() => runtime.createSourceObserver())`, so it is stable per component instance. Do not change this to `useMemo` or `useRef` without considering StrictMode replay semantics.
- Tests that prove lifecycle invariants should use the mock-observer pattern (record `listeners`, `dispose`, and `setResolved`) rather than asserting on snapshot internals, because the observable contract is listener-based, not snapshot-identity-based.

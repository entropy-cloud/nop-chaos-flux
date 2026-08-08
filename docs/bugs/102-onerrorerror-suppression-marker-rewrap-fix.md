# 102 onErrorError Rewrap Dropping Caught-Failure Suppression Marker Fix

## Problem

In action execution, a nested error chain — an `onError` handler that itself
fails and triggers the action's own `onErrorError` path — reported the error
**twice** (duplicate toast/report). The retry path's single-report guarantee
did not hold for the nested `onErrorError` rewrapping branch.

## Diagnostic Method

- Hard part: the defect needs a nested chain (outer onError fails → inner
  onErrorError), which unit tests rarely exercise; the suppression WeakSet
  works for the simple paths.
- Read `action-execution.ts` error handling from the suppression primitive:
  `caughtFailureResults` WeakSet (`:207`) plus the
  `preserveCaughtFailureMarker` flag used by retry paths (`:402/:455`).
- Checked every place a result object is rewrapped for whether the marker
  survives the spread.
- Decisive evidence: the `onErrorError` rewrapping at `:579-591`
  (`{...result, onErrorError}`) dropped `preserveCaughtFailureMarker`, so the
  nested failure was reported through `reportUnhandledFailureClass`
  (`:165`, the WeakSet-suppression check site) without the marker — the
  suppression could not recognize it as already-handled.

## Root Cause

- `action-execution.ts:578-591` rewrapped the result with
  `{...result, onErrorError}` without preserving
  `preserveCaughtFailureMarker`, breaking the caught-failure suppression
  chain for nested onError failures — duplicate error reporting.

## Fix

- The `onErrorError` rewrap now passes `preserveCaughtFailureMarker` through
  (aligned with the retry paths at `:402/:455`), so the WeakSet suppression
  in `reportUnhandledFailureClass` (`:165`) recognizes nested failures as
  already-caught and reports exactly once.

## Tests

- `packages/flux-action-core/src/__tests__/nested-onerror-suppression.test.ts`
  (test-first, red before the fix): nested onError-failure chain → single
  error report (suppression effective).

## Affected Files

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`

## Notes For Future Refactors

- Any rewrap of a result/error payload must preserve the suppression marker
  flags (spread-based rewraps silently drop non-enumerable/private flags).
- The WeakSet suppression is only as good as the marker propagation at every
  branch that transforms a failure result — check all spread sites when
  touching error paths.

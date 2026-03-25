# 07 Submit Concurrent Guard Fix

## Problem

- rapid double-click on submit button fires two API calls
- first call's `finally` block sets `submitting=false` while the second call is still in flight
- user sees spinner disappear prematurely; second request completes silently in the background

## Root Cause

- `packages/flux-runtime/src/form-runtime.ts:248` â€” `submit()` started with `store.setSubmitting(true)` but never checked the current `submitting` state
- `submitting` was a UI flag, not a method gate â€” any number of concurrent calls could proceed
- `finally` at line 291 unconditionally reset `submitting=false`, even when other calls were pending

## Fix

- added a guard at the top of `submit()`:
  ```ts
  if (store.getState().submitting) {
    return { ok: false, cancelled: true, error: new Error('Submit already in progress') };
  }
  ```
- subsequent concurrent calls return immediately with a cancelled result instead of firing a duplicate API request
- this keeps duplicate submits out of the normal failure path, so action chains and monitor/debugger output treat the second click as ignored cancellation rather than a business error

## Tests

- `packages/flux-runtime/src/__tests__/bug-submit-race.test.ts` - verifies only one API call executes, the second call resolves as `cancelled`, and `submitting` stays true until the first request finishes
- `packages/flux-runtime/src/index.test.ts` - verifies concurrent `submitForm` actions return `cancelled` and monitor callbacks observe a cancelled result instead of a failure

## Affected Files

- `packages/flux-runtime/src/form-runtime.ts`

## Notes For Future Refactors

- all mutating async methods (`submit`, `validateForm`) that have side effects should have a concurrency guard
- if a queuing or retry behavior is needed later, replace the early-return with a queue/debounce pattern rather than removing the guard
- duplicate submit prevention should use the same `cancelled` semantics as other intentionally skipped actions; do not report it as a normal business failure unless product behavior explicitly requires that contract
- the `submitting` flag must remain consistent with actual request state â€” never set it without a corresponding API call


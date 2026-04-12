# 28 Reaction Debounce Timer Leak On Dispose

## Problem

- A reaction with `debounce > 0` could create a ghost `setTimeout` after `dispose()` had already been called.
- The ghost timer fired after the debounce window, called `runReaction`, which correctly detected `disposed = true` and returned early — so no action was executed.
- The practical impact was a leaked timer (no functional error, no warning), but the timer kept a closure over the reaction's scope, helpers, and action schema alive for the full debounce window after dispose.
- The bug was completely silent: no console errors, no test failures in normal conditions.

## Diagnostic Method

- **Diagnosis difficulty: medium.** The bug is a timing race with no observable output error; it was found by static code review of `scheduleReaction` in `reaction-runtime.ts`.
- The review identified that `dispose()` clears `debounceTimer` (line 238-241) but does NOT prevent the already-queued microtask from continuing.
- Tracing the `invoke` closure: after `dispose()` runs, the `Promise.resolve().then(invoke)` microtask still executes; `invoke()` had no `disposed` guard at its entry point.
- Inside `invoke()`, the debounce branch (`if (input.debounce && input.debounce > 0)`) unconditionally created a new `setTimeout`, regardless of `disposed` state.
- `runReaction` (called from the timer) does check `if (disposed) return;`, so no action fires — the root cause is one layer earlier, in `invoke`.
- Confirmed by writing a fake-timers test that verifies `vi.getTimerCount()` is zero after dispose races the microtask.

## Root Cause

- `invoke`, the microtask callback inside `scheduleReaction`, did not check `disposed` before executing. Only `runReaction` had a `disposed` guard.
- When `dispose()` ran between the `Promise.resolve().then(invoke)` scheduling and the microtask flush, `disposed = true` was set and the existing `debounceTimer` was cleared — but when `invoke` ran, it found `debounceTimer === undefined` and created a new `setTimeout` without checking `disposed`.
- The lifecycle invariant was broken: `invoke` assumed that if it was running, the reaction was still active.

## Fix

- Added `if (disposed) return;` at the entry of `invoke` in `scheduleReaction` (`packages/flux-runtime/src/reaction-runtime.ts`).
- This ensures that a microtask that was scheduled before dispose was called exits immediately without entering the debounce branch or calling `runReaction`.
- The fix is a single line; it mirrors the existing guard in `runReaction` and in the store subscription callback.

## Tests

- `packages/flux-runtime/src/__tests__/reaction-runtime.test.ts`
  - Verifies that `vi.getTimerCount()` is 0 after dispose races the scheduled microtask (no debounce timer created).
  - Verifies that dispatch is never called when dispose races the microtask.
  - Verifies the normal (no-race) debounce path still fires the action correctly.

## Affected Files

- `packages/flux-runtime/src/reaction-runtime.ts`
- `packages/flux-runtime/src/__tests__/reaction-runtime.test.ts`

## Notes For Future Refactors

- Any closure scheduled via `Promise.resolve().then(fn)` inside `registerReaction` must check `disposed` as its first statement, not rely on downstream callee guards.
- If the scheduling strategy changes (e.g. from microtask to `MessageChannel`), the same `disposed` guard is still required at the callback entry.
- The `runReaction` guard is still needed independently — a reaction can be disposed while an async `runReaction` is in flight (between `await` points); the two guards are complementary, not redundant.

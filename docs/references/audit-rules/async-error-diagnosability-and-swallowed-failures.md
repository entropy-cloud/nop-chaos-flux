# Async Error Diagnosability And Swallowed Failures

## Purpose

This rule captures recurring failures where async work can fail without leaving a diagnosable signal, or where follow-up error handling ignores existing abort/stale guards.

Use it when reviewing fire-and-forget promises, promise chains in effects/handlers, or renderer/runtime async flows that are not directly awaited by the caller.

## Scope

Apply this rule when code changes touch any of the following:

- `void` promise chains or fire-and-forget async helpers
- `.then(...).finally(...)` or async IIFEs launched without a caller awaiting them
- effect-triggered async work that updates local or shared state
- non-critical decorative async flows such as previews, counters, or layout helpers

## Required Pattern

### 1) Every fire-and-forget async path must have an explicit failure strategy

- If the work can fail, the code must either publish error state, log a scoped diagnostic, or intentionally ignore the failure with an explicit empty handler and reason.
- Do not allow promise rejections to disappear implicitly.
- Non-critical decorative flows may intentionally ignore failure, but the ignore path must still be explicit.

Review checks:

- Search for `void` promise chains, async IIFEs, and `.then(...)` chains with no `.catch()`.
- Check whether the failure path leaves the owner in a diagnosable state.
- For non-critical flows, verify the intentional ignore is visible in code.

### 2) Error handling must respect cancellation, abort, and stale-result guards

- Do not report or publish failures for work that was intentionally aborted or superseded.
- `.catch()` handlers added during remediation must honor the same abort/stale guards as the success path.
- Cancelled work should not be turned into noisy diagnostics or stale error state.

Review checks:

- Compare the `.catch()` path against the success-path abort/stale guards.
- Confirm aborted/cancelled work does not publish misleading errors.
- Add tests for both real failure and cancelled/stale failure when the path is significant.

## Allowed Exceptions

- Synchronous wrappers that already catch and report downstream failures may omit a second `.catch()` if the invariant is documented and locally obvious.
- Decorative async work may intentionally ignore failures only when the code makes that choice explicit.

## Review Checklist

- Every fire-and-forget async path has an explicit failure strategy.
- Non-critical ignored failures are intentional and visible in code.
- Failure handling respects abort/cancelled/stale guards.
- Significant async paths have focused tests for both failure and cancellation behavior.

## Evidence From This Repository

- `docs/plans/160-swallowed-exception-remediation-plan.md`
- `docs/analysis/2026-05-01-deep-audit-full-2/summary.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/06-async-safety.md`

## Primary Architecture Anchors

- `docs/architecture/action-interaction-state.md`
- `docs/architecture/performance-design-requirements.md`

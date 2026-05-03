# Validation Pending Readiness Semantics

## Purpose

This rule captures recurring failures where owner-level `validating`, `ready`, `canSubmit`, or similar derived flags ignore scheduled-but-not-yet-started validation work.

Use it when reviewing validation debounce, async validation state publication, owner readiness summaries, or submit gating.

## Scope

Apply this rule when code changes touch any of the following:

- async validation debounce scheduling
- owner-derived flags such as `validating`, `ready`, `canSubmit`, or `hasPendingValidation`
- summary publication of validation state to parent owners or host scopes
- submit or commit flows that bypass or supersede lower-priority validation work

## Required Pattern

### 1) Scheduled validation work still counts as pending work

- A debounced async validation run that has been scheduled but not started yet still counts as pending validation.
- Owner-level `validating` and `ready` semantics must include scheduled debounce windows, not only already-running async calls.
- Do not let `validatingDelay` or UI-spinner timing control the truth of owner readiness.

Review checks:

- Search for debounce queues or pending maps used by validation scheduling.
- Check whether owner-derived flags read those queues in addition to field-local `validating` booleans.
- Confirm `ready` is not published as `true` during a live debounce window that may still change validation results.

### 2) Readiness and submit semantics must match the documented owner contract

- `ready`, `canSubmit`, and similar flags must honor lifecycle and pending validation semantics together.
- A high-priority path such as `submit` or `commit` may supersede debounce, but ordinary owner summaries must remain honest until that supersession happens.
- If the architecture distinguishes UI spinner timing from owner pending-work truth, keep those channels separate.

Review checks:

- Trace how `ready` and `canSubmit` are computed from lifecycle, errors, active async runs, and scheduled debounce runs.
- Check whether parent-owner summaries or host summaries reuse the same meaning.
- Add focused tests that assert the debounce window still reports pending validation.

## Allowed Exceptions

- Synchronous-only validation paths with no queued or debounced work do not need a separate pending-work channel.
- A documented owner may collapse debounce semantics only if the owner doc explicitly states that scheduled work does not affect readiness.

## Review Checklist

- Debounced validation work contributes to owner pending-work semantics.
- `ready`/`canSubmit` remain false while scheduled work may still change the result.
- `validatingDelay` affects presentation only, not owner-truth semantics.
- Focused tests cover queued-but-not-started validation windows.

## Evidence From This Repository

- `docs/analysis/2026-05-03-deep-audit-full/08-validation.md`
- `docs/analysis/2026-05-03-deep-audit-full/summary.md`

## Primary Architecture Anchors

- `docs/architecture/form-validation.md`
- `docs/references/form-validation-execution-details.md`

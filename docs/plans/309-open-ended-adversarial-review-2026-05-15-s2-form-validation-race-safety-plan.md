# 309 Open-Ended Adversarial Review 2026-05-15 Session2 Form Validation Race Safety Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-01.md` (Findings 2, 4)
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`

## Purpose

Close the two coupled form-validation defects owned by session-2 Findings 2 and 4 on the live baseline: shared `existingStore` field state must remain owner-isolated, and `validateForm()` must no longer report a stale clean result or fold unrelated concurrent store writes into its returned result while submit/blur validation overlaps.

## Current Baseline

- The code slice is already landed. `packages/flux-runtime/src/form-runtime.ts` now wraps any shared `existingStore` with `createOwnedFormStore(inputValue.existingStore, formId)` before exposing it as a form runtime store.
- `packages/flux-runtime/src/form-store-owned.ts` is the live owner-isolation mechanism. It stores owner-qualified backing keys on the shared base store, decodes only the current owner's visible `fieldStates`, preserves per-owner summary counters, and leaves the external `FormStoreApi` path-level surface unchanged.
- `packages/flux-runtime/src/form-runtime-owner.ts` no longer uses the old parallel `Promise.allSettled(...)` aggregation path. `validateForm()` now validates compiled traversal paths sequentially, tracks `validatedPaths`, preserves only causally related side-effect child-path errors via `captureSideEffectErrors()`, and excludes unrelated concurrent store writes from the returned `fieldErrors` / `errors` result.
- `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts` already contains the focused proof surface for this plan: same-store owner isolation, sequential validation order, same-path concurrent blur supersession, and rejection of unrelated concurrent store errors from `validateForm()` results while those unrelated errors remain in the store.
- `docs/architecture/form-validation.md` is already aligned with the landed behavior. It states that canonical validation bookkeeping identity is `{ ownerId, path }`; no further owner-doc delta is required for closure.
- The only remaining gap before honest closure is stale plan/log metadata: this plan still describes the pre-landing baseline and has not yet recorded closure-audit evidence.

## Goals

- Sync the plan text to the landed owner-isolated shared-store baseline and the sequential `validateForm()` baseline.
- Confirm the focused proof surface covers both Finding 4 (`existingStore` owner isolation) and Finding 2 (same-path concurrency plus unrelated-error exclusion).
- Close the plan only after an independent closure audit verifies the live code, tests, docs, and hard-gate baseline all match the claimed result.

## Non-Goals

- No further changes to `FormStoreApi`, `FormRuntime`, or validation behavior beyond the already-landed implementation.
- No redesign of single-field run-id supersession semantics outside the current landed `validateForm()` aggregation behavior.
- No changes to submit flow, debounce policy, or form publication behavior beyond what is already in the live baseline.

## Scope

### In Scope

- Shared `existingStore` owner isolation through `createOwnedFormStore(...)` and owner-qualified backing keys.
- Sequential `validateForm()` aggregation and its preserved side-effect child-path behavior.
- Focused regression proof in `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts`.
- Plan/log closure sync and independent closure-audit evidence.

### Out Of Scope

- Scope-adaptor isolation defects owned by Plan 308.
- Source-prop lifecycle defects owned by Plan 310.
- Import/action security defects owned by Plan 311.
- Any new validation-architecture redesign beyond the already-landed baseline.

## Execution Plan

### Phase 1 - Sync Live Baseline And Proof

Status: completed
Targets: `docs/plans/309-open-ended-adversarial-review-2026-05-15-s2-form-validation-race-safety-plan.md`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-store-owned.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts`, `docs/architecture/form-validation.md`

- Item Types: `Decision | Proof`

- [x] Re-audit the live implementation and replace the stale pre-landing plan baseline with the landed `createOwnedFormStore(...)` owner-isolation shape in `packages/flux-runtime/src/form-runtime.ts` and `packages/flux-runtime/src/form-store-owned.ts`.
- [x] Re-audit the live `validateForm()` implementation in `packages/flux-runtime/src/form-runtime-owner.ts` and record the actual sequential aggregation plus constrained side-effect preservation behavior instead of the old `Promise.allSettled(...)` baseline.
- [x] Confirm the focused regression proof in `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts` covers owner isolation, sequential traversal order, same-path blur supersession, and exclusion of unrelated concurrent store errors from returned `validateForm()` results.
- [x] Confirm `docs/architecture/form-validation.md` already matches the landed `{ ownerId, path }` bookkeeping contract, so no additional owner-doc edit is required.

Exit Criteria:

- [x] This plan describes only the current landed baseline, not the obsolete pre-fix implementation.
- [x] The code/test references in this plan point to the actual live closure surface.
- [x] Focused proof for Findings 2 and 4 is explicitly identified and matches the live test file.
- [x] `No owner-doc update required` - `docs/architecture/form-validation.md` already matches the landed contract.
- [x] `docs/logs/2026/05-15.md` will be updated when closure-audit evidence is recorded.

### Phase 2 - Closure Verification And Audit

Status: completed
Targets: `docs/plans/309-open-ended-adversarial-review-2026-05-15-s2-form-validation-race-safety-plan.md`, `docs/logs/2026/05-15.md`

- Item Types: `Proof | Decision`

- [x] Reconfirm the workspace hard-gate baseline used for closure, including a fresh full-workspace `pnpm test` run.
- [x] Run an independent closure audit against this plan, the daily log, the runtime sources, the focused proof file, and the aligned owner doc.
- [x] Record the audit evidence in both this plan and `docs/logs/2026/05-15.md`, then mark the plan completed only if no in-scope debt remains.

Exit Criteria:

- [x] A fresh full-workspace `pnpm test` run is green on the landed baseline.
- [x] Independent closure audit confirms no remaining in-scope defect or contract drift for Findings 2 and 4.
- [x] `docs/logs/2026/05-15.md` updated.

## Closure Gates

- [x] Shared `existingStore` usage is owner-isolated on the live baseline.
- [x] `validateForm()` no longer returns a stale clean result for same-path concurrent blur validation.
- [x] `validateForm()` no longer folds unrelated concurrent store errors into its returned result.
- [x] Focused regression tests for both findings exist and pass.
- [x] No in-scope live defect or contract drift is silently deferred to follow-up.
- [x] `docs/architecture/form-validation.md` remains aligned with the live baseline; no additional owner-doc update is required.
- [x] Independent closure audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Closed after re-syncing the stale plan text to the already-landed owner-isolated shared-store baseline, re-confirming the sequential `validateForm()` aggregation/result-integrity behavior, and passing an independent closure audit against the live runtime, focused proof, aligned owner doc, and fresh green workspace hard-gate baseline.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d4da276effeLEJp9oRbzJ7He0`
- Evidence: Independent closure audit re-read Plan `309`, `docs/logs/2026/05-15.md`, `docs/architecture/form-validation.md`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-store-owned.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts`, and the fresh workspace test output at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2b1ec830001lS06Gp0Mj6Glvy`, and confirmed that shared `existingStore` state is owner-isolated, `validateForm()` no longer returns stale clean same-path results or folds unrelated concurrent store writes into its returned result, focused proof covers the closure surface, the owner doc is already aligned, and no in-scope blocker remains.

Follow-up:

- no remaining plan-owned work

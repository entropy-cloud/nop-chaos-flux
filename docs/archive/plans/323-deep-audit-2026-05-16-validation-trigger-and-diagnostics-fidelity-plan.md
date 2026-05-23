# 323 Deep Audit 2026-05-16 Validation Trigger And Diagnostics Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{08-validation.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/293-deep-audit-2026-05-15-validation-submit-boundary-convergence-plan.md`

## Purpose

收口 validation family 的 retained residual：current-form trigger reason 仍丢失，且 non-form validation owner 缺少 dependent revalidation diagnostics wiring。

## Current Baseline

- `08-03` 是 runtime-owned validation owner diagnostics seam，与 Plan `293` 已 closed 的 submit/activation/summary-gate core boundary 不同。
- `08-02` 与 `08-03` 都位于 validation trigger / diagnostics fidelity surface，不应该继续与 cache 或 generic error-fidelity 混装。
- `15-*`、`19-*` 已拆到独立 successor owners。

## Goals

- Restore one honest validation diagnostics baseline across form-owned and non-form validation-owner paths.
- Preserve the real trigger reason across supported `validateField(...)` paths.

## Non-Goals

- 不接管 scope/action resource teardown；那部分由 Plan `317` owning。
- 不接管 detail-family staged commit work；那部分由 Plan `316` owning。
- 不接管 cache identity、debugger observability、error-fidelity、palette perf。

## Scope

### In Scope

- `08-02`
- `08-03`
- `packages/flux-runtime/src/runtime-owned-factories.ts`
- `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`
- focused tests and relevant docs

### Out Of Scope

- `19-02`
- detail commit / staged owner closure
- `15-01`
- `15-02`
- `15-03`
- `19-01`
- `19-03`

## Execution Plan

### Phase 1 - Freeze Validation Trigger / Diagnostics Baseline

Status: completed
Targets: `runtime-owned-factories.ts`, `field-handlers.tsx`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Re-audit `08-02` and `08-03` together and define one supported validation trigger / diagnostics baseline.
- [x] Add or update focused proof for both trigger-reason propagation and non-form diagnostics wiring.

Exit Criteria:

- [x] The plan records why these residuals belong to validation fidelity rather than generic runtime diagnostics.
- [x] Focused proof exists for both in-scope residuals.
- [x] `docs/logs/2026/05-17.md` records the validation-baseline decision.

### Phase 2 - Land Validation Trigger / Diagnostics Fixes

Status: completed
Targets: `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`

- Item Types: `Fix | Proof`

- [x] Fix `08-02` so form-owned `validateField(...)` paths preserve the actual trigger reason.
- [x] Fix `08-03` so non-form validation owners wire `reportDependentRevalidationFailure` through the supported diagnostics seam.

Exit Criteria:

- [x] Form-owned field trigger reason is preserved on the supported baseline.
- [x] Non-form validation owner diagnostics wiring matches the supported form-owner baseline.
- [x] Focused proof is green.
- [x] `docs/logs/2026/05-17.md` records the final decisions.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining validation trigger / diagnostics blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`08-02`, `08-03`) are fixed.
- [x] Validation trigger and diagnostics fidelity converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed on the 2026-05-17 live baseline after final workspace verification and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `323` is closure-ready with no remaining validation trigger / diagnostics blocker.

Follow-up:

- None currently.

# 354 Open-Ended Adversarial Review 2026-05-18 Form Validation Lifecycle And Dependency Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-01.md` (Findings 7, 8), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/form-validation.md`

## Purpose

收口 form validation lifecycle / dependency fidelity surface 的 2 个 defects：async validators 无法声明 cross-field dependencies，以及 runtime field unregister 后 stale errors 会继续泄漏进 `validateForm()` 结果。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix validation baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R1-7` 和 `R1-8` 都位于 form validation owner surface：一个是依赖图不完整，一个是 runtime registration lifecycle 清理不完整。
- 当前 live baseline 下，async validation 只能靠字段自身变化或 submit 重跑；runtime field unregister 也不会清空 store 中遗留的 error state。
- `docs/architecture/form-validation.md` 是这个结果面的 owner doc；如果 live baseline 改变，必须同步更新。

## Goals

- Restore one honest dependency baseline for async validation rules.
- Ensure runtime field unregister does not leave phantom errors in form-level validation results.
- Add focused proof for dependency revalidation and unregister cleanup behavior.

## Non-Goals

- 不接管 renderer init failure 或 generic runtime scope lifecycle。
- 不处理 form-wide performance tuning beyond the two in-scope defects。
- 不做新的 validation DSL redesign。

## Scope

### In Scope

- `R1-7`
- `R1-8`
- `packages/flux-runtime/src/{validation/rules.ts,form-runtime-field-ops.ts,form-runtime-owner.ts}`
- `packages/flux-core/src/validation-model.ts` if required by the dependency fix
- focused tests and relevant docs
- `docs/architecture/form-validation.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R1-6`
- `R2-7`
- hidden-field policy redesign unrelated to the two in-scope defects

## Execution Plan

### Phase 1 - Freeze Validation Dependency And Unregister Baseline

Status: completed
Targets: touched validation/runtime files, focused tests, owner doc

- Item Types: `Decision | Proof`

- [x] Re-audit async dependency tracking and unregister cleanup as one validation fidelity surface.
- [x] Record one supported baseline for async cross-field dependency behavior and unregister cleanup semantics.
- [x] Add or update focused proof for both in-scope defects before landing fixes.

Exit Criteria:

- [x] The plan records one explicit supported baseline for async dependency tracking and runtime-field unregister cleanup.
- [x] Focused proof exists for both in-scope defects.
- [x] Owner-doc update needs are explicitly decided.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Validation Fidelity Fixes

Status: completed
Targets: touched validation/runtime implementation files

- Item Types: `Fix | Proof`

- [x] Fix `R1-7` so supported async validation on the in-scope surface has an honest dependency contract and no longer behaves as the reported live defect.
- [x] Fix `R1-8` so unregistering a runtime field no longer leaves phantom errors in `validateForm()` results.
- [x] Keep focused proof green for both in-scope defects after implementation.

Exit Criteria:

- [x] Async validation dependency behavior matches one explicit supported baseline.
- [x] Runtime field unregister no longer leaks phantom validation errors on the supported baseline.
- [x] Focused proof is green for both in-scope defects.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/docs/tests, and verification results.

Exit Criteria:

- [x] Focused verification for all in-scope defects has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned validation fidelity blocker.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R1-7`, `R1-8`) are fixed.
- [x] Form validation lifecycle and dependency fidelity converge to one supported baseline.
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

Status Note: Completed. Schema and compiler validation lowering now preserve explicit `dependsOn` dependency paths, runtime unregister clears stale field errors and validating state, and `docs/architecture/form-validation.md` now matches the landed dependency and cleanup baseline.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked `packages/flux-runtime/src/{validation/rules.ts,form-runtime-field-ops.ts}`, `packages/flux-compiler/src/{validation-lowering.ts,schema-compiler/validation-collection.ts}`, the updated owner doc `docs/architecture/form-validation.md`, and the focused validation proofs, and reported `354` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.

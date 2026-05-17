# 316 Deep Audit 2026-05-16 Detail Draft Commit And Validation Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{04-state-ownership.md,08-validation.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/304-open-ended-adversarial-review-2026-05-15-detail-view-commit-atomicity-plan.md`

## Purpose

收口 `detail-field` / `detail-view` staged owner residual：sibling `detail-field` commit failure 仍会污染父 owner，且 `detail-view` 的 parent-form subtree commit 仍漏传 `commit` reason 并只做 subtree 前缀 revalidation，未覆盖 owner-local dependent closure。

## Current Baseline

- Plan `304` 已闭合 `detail-view.tsx` 的 rejected transformed write rollback surface，但没有覆盖 `detail-field.tsx` 的 sibling commit path。
- `04-03` 更像前一轮 detail atomicity closure 的 coverage gap，而不是 `304` 已关闭 defect 的原样复发。
- `08-01` 与 `08-04` 是相邻 validation semantics residual：它们不否定 `304`，但说明 detail family 仍未达到完整 staged-commit baseline。

## Goals

- Make failed `detail-field` commit paths atomic with respect to parent owner state.
- Ensure `detail-view` parent-form commit validation preserves the `commit` reason.
- Ensure detail commit revalidation covers owner-local dependents outside the edited subtree.

## Non-Goals

- 不重开已由 Plan `304` honest closed 的 `detail-view.tsx` rejected-transform rollback slice。
- 不接管 non-form validation-owner diagnostics wiring。
- 不接管 generic form-field blur/change trigger cleanup outside detail family。

## Scope

### In Scope

- `04-03`
- `08-01`
- `08-04`
- `packages/flux-renderers-form-advanced/src/detail-view/{detail-field.tsx,detail-view.tsx}`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- focused proof and relevant owner docs

### Out Of Scope

- `08-03`
- `08-02`
- any `detail-view` surface already closed by Plan `304`

## Execution Plan

### Phase 1 - Re-audit The Shared Detail Commit Surface

Status: completed
Targets: `detail-field.tsx`, `detail-view.tsx`, `docs/plans/304-*.md`, focused tests

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit `detail-field.tsx` and `detail-view.tsx` together and explicitly record why `04-03`, `08-01`, and `08-04` are new residuals adjacent to Plan `304`, not a retroactive claim that `304` was dishonest.
- [x] Add or update focused regression proof for sibling-path atomicity, `commit` reason propagation, and out-of-subtree dependent revalidation.

Exit Criteria:

- [x] The plan records an explicit residual-vs-closed-surface boundary with Plan `304`.
- [x] Focused proof exists for all three in-scope residuals before code changes are declared complete.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.

### Phase 2 - Land Atomic Commit And Validation Closure

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/{detail-field.tsx,detail-view.tsx}`, `packages/flux-runtime/src/form-runtime-subtree.ts`

- Item Types: `Fix | Proof`

- [x] Fix `04-03` so failed `detail-field` commit paths do not leave parent owner state mutated.
- [x] Fix `08-01` so parent-form subtree commit preserves `reason='commit'`.
- [x] Fix `08-04` so detail commit revalidation expands beyond subtree prefix to owner-local dependent closure where required.

Exit Criteria:

- [x] Failed detail commit paths no longer mutate parent owner state after rejection.
- [x] Parent-form subtree validation receives the `commit` reason on the supported detail path.
- [x] Out-of-subtree owner-local dependents are revalidated on the supported detail commit baseline.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plan `304`, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope residuals has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining detail-family blocker and no dishonest overlap with Plan `304`.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`04-03`, `08-01`, `08-04`) are fixed.
- [x] Detail staged commit and validation semantics converge to one supported baseline.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `316` is closure-ready with no remaining detail-family blocker and no dishonest overlap with Plan `304`.

Follow-up:

- None currently.

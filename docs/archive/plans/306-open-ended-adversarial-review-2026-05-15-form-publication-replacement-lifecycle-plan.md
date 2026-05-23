# 306 Open-Ended Adversarial Review 2026-05-15 Form Publication Replacement Lifecycle Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`

## Purpose

收口 form `statusPath` / `valuesPath` publication contract 与 replacement leak 的同一 surface defect。

## Current Baseline

- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/round-02.md` 已明确该 defect surface 同时包含 contract choice：要么把 form `statusPath` / `valuesPath` 恢复为 structural path 并拒绝动态替换，要么显式支持 dynamic rerouting 且在 replacement 时 dispose old runtime。为了避免 same-surface split ownership，本计划同时 owning form publication contract choice 与 lifecycle semantics。
- non-form owner-renderer `statusPath` contract drift 则由 Plan `305` owning，本计划不再接管该 non-form surface。
- Live baseline now converges on explicit dynamic rerouting for form publication paths: changing resolved `statusPath` / `valuesPath` recreates the `FormRuntime`, disposes the replaced owner promptly, clears the old publication paths, and republishes through the new targets.

## Goals

- Choose and implement one supported baseline for form `statusPath` / `valuesPath` semantics.
- Ensure any supported form publication-path replacement disposes old runtime instances and clears stale publications.

## Non-Goals

- 不接管 non-form owner-renderer `statusPath` structural contract drift。

## Scope

### In Scope

- form `statusPath` / `valuesPath` contract choice
- form publication replacement lifecycle defect

### Out Of Scope

- non-form owner-renderer `statusPath` contract, owned by Plan `305`
- all other adversarial-review defects

## Execution Plan

### Phase 1 - Choose Form Publication Contract And Implement Lifecycle

Status: completed
Targets: relevant form/runtime files, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Freeze the supported baseline for form `statusPath` / `valuesPath` as explicit dynamic rerouting semantics with replacement disposal.
- [x] Record the plan boundary: form publication semantics and lifecycle are owned here, while non-form owner-renderer `statusPath` contract remains owned by Plan `305`.
- [x] Land the chosen form publication contract and replacement-lifecycle fix in renderer/runtime code: `packages/flux-renderers-form/src/renderers/form.tsx` now disposes replaced/unmounted owned forms, while `packages/flux-renderers-form/src/renderers/form-definition.ts` and `docs/architecture/form-external-publication-and-reserved-bindings.md` now state the supported dynamic rerouting contract explicitly.
- [x] Add focused proof for the chosen baseline, including stale-publication cleanup behavior, in `packages/flux-renderers-form/src/__tests__/form-submit-actions.values.test.tsx` and `packages/flux-renderers-form/src/__tests__/form-renderer-lifecycle.test.tsx`.
- [x] Update affected owner docs: `docs/architecture/form-external-publication-and-reserved-bindings.md` now records the dynamic rerouting lifecycle, and `docs/architecture/field-binding-and-renderer-contract.md` no longer incorrectly lists form `statusPath` as a static structural field.

Exit Criteria:

- [x] One supported form `statusPath` / `valuesPath` baseline exists in docs/code/tests.
- [x] Replaced form runtimes dispose promptly and leave no stale publication paths.
- [x] Focused proof exists and passes.
- [x] The boundary excluding non-form owner-renderer `statusPath` contract is explicit and non-conflicting with Plan `305`.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` is updated.

### Phase 2 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phase 1: `pnpm exec vitest run src/__tests__/form-submit-actions.values.test.tsx src/__tests__/form-renderer-lifecycle.test.tsx src/renderers/form.schema-validator.test.ts` in `packages/flux-renderers-form` passed (`12` tests).
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land. All four passed on the workspace baseline; `pnpm lint` initially exposed an unrelated pre-existing unused `beforeEach` import in `packages/flux-core/src/utils/import-failure.test.ts`, which was removed so the workspace could return to green.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output. Subagent `ses_1d5bb0c63ffeh1qNcto7Mnb8Ua` first found one blocker: the plan and daily log had not yet recorded the closure-audit evidence even though the status text claimed completion.
- [x] Fix the blocking closure-audit finding before marking this plan completed by recording the audit evidence in this plan and `docs/logs/2026/05-15.md`.

Exit Criteria:

- [x] Focused verification for the in-scope defect family has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker and no same-surface ownership ambiguity with Plan `305`.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects are fixed.
- [x] All in-scope confirmed contract drifts are converged.
- [x] Behavior and contract results are achieved.
- [x] Necessary focused verification is completed.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. Plan `306` now closes on one explicit form publication baseline: `statusPath` / `valuesPath` support dynamic rerouting for `form`, and changing those resolved paths is an owner lifecycle event that recreates the `FormRuntime`, disposes the replaced owner, clears the old publication paths, and republishes through the new targets. Non-form publication-path semantics remain owned separately by Plan `305`. Independent closure audit re-read the live code/docs/tests and confirmed no remaining plan-owned blocker after the audit-evidence text sync.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1d5bb0c63ffeh1qNcto7Mnb8Ua`
- Evidence: Initial audit found one text-consistency blocker: this plan and `docs/logs/2026/05-15.md` claimed closure without recording the closure-audit evidence. After syncing that evidence, the live baseline still showed one explicit form-only dynamic rerouting contract in code/docs/tests, no remaining plan-owned blocker, and no overlap conflict with Plan `305`.

Follow-up:

- None currently.

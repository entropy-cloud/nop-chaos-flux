# 306 Open-Ended Adversarial Review 2026-05-15 Form Publication Replacement Lifecycle Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`

## Purpose

收口 form `statusPath` / `valuesPath` publication contract 与 replacement leak 的同一 surface defect。

## Current Baseline

- form renderer path replacement 仍会遗留旧 `FormRuntime` publication subscription 与旧路径清理缺口。
- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/round-02.md` 已明确该 defect surface 同时包含 contract choice：要么把 form `statusPath` / `valuesPath` 恢复为 structural path 并拒绝动态替换，要么显式支持 dynamic rerouting 且在 replacement 时 dispose old runtime。为了避免 same-surface split ownership，本计划同时 owning form publication contract choice 与 lifecycle semantics。
- non-form owner-renderer `statusPath` contract drift 则由 Plan `305` owning，本计划不再接管该 non-form surface。

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

Status: planned
Targets: relevant form/runtime files, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Freeze one supported baseline for form `statusPath` / `valuesPath`: either structural-only semantics or explicit dynamic rerouting semantics with replacement disposal.
- [ ] Record the plan boundary: form publication semantics and lifecycle are owned here, while non-form owner-renderer `statusPath` contract remains owned by Plan `305`.
- [ ] Land the chosen form publication contract and replacement-lifecycle fix in renderer/runtime code.
- [ ] Add focused proof for the chosen baseline, including stale-publication cleanup behavior.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] One supported form `statusPath` / `valuesPath` baseline exists in docs/code/tests.
- [ ] Replaced form runtimes dispose promptly and leave no stale publication paths.
- [ ] Focused proof exists and passes.
- [ ] The boundary excluding non-form owner-renderer `statusPath` contract is explicit and non-conflicting with Plan `305`.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` is updated.

### Phase 2 - Verification And Closure Audit

Status: planned
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phase 1.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for the in-scope defect family has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no same-surface ownership ambiguity with Plan `305`.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] All in-scope confirmed live defects are fixed.
- [ ] All in-scope confirmed contract drifts are converged.
- [ ] Behavior and contract results are achieved.
- [ ] Necessary focused verification is completed.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.

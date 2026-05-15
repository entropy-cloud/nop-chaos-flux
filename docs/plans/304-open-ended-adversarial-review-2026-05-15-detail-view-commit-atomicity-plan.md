# 304 Open-Ended Adversarial Review 2026-05-15 Detail-View Commit Atomicity Plan

> Plan Status: in_progress
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`, `docs/analysis/2026-05-15-deep-audit-full/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`, `docs/plans/289-open-ended-adversarial-review-2026-05-15-remediation-plan.md`

## Purpose

收口 `detail-view` rejected transformed commit 泄漏到 parent owner 的原子性 defect，对齐 adversarial review 与 deep-audit retained `04-02` 的同 surface contract。

## Current Baseline

- adversarial review 确认 `detail-view` staged commit 不是原子操作。
- deep audit retained `04-02` 与该 surface 指向同一 parent-owner-before-validation residual。
- 这两条当前应该由一份单-surface plan owning，而不是继续挂在 broad umbrella plan 下。

## Goals

- Make rejected transformed commits atomic with respect to parent owner state.
- Close both the adversarial-review surface and deep-audit `04-02` same-surface residual under one owner.

## Non-Goals

- 不接管 viewer invalidation 或其它已由历史计划关闭的 `detail-view` defects。

## Scope

### In Scope

- adversarial-review detail-view commit atomicity defect
- deep-audit retained `04-02`

### Out Of Scope

- unrelated `detail-view` defect families

## Execution Plan

### Phase 1 - Implement Atomic Commit Semantics

Status: completed
Targets: `detail-view` code/tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Re-audit and record that this plan owns the same `detail-view` result surface as deep-audit retained `04-02`, while Plan `280` remains limited to already-closed viewer invalidation work.
- [x] Freeze the supported commit contract: rejected transformed commits must not mutate parent owner state.
- [x] Land the atomic commit fix in `detail-view`.
- [x] Add focused proof that invalid transformed commits preserve parent owner state while keeping the current validation-feedback UX.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Rejected transformed commits do not mutate parent owner state.
- [x] Focused proof exists and passes.
- [x] Same-surface ownership with retained `04-02` is explicitly recorded and non-conflicting.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` is updated.

Phase Notes:

- Same-surface ownership note: this plan owns the retained staged-commit atomicity residual shared with deep-audit `04-02`. Historical Plan `280` touched the same `detail-view.tsx` file only for the now-closed viewer invalidation / serialized-remount defect, and is not reopened by this change.
- Implemented in `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` by collecting the transformed parent write set, snapshotting previous values, applying the writes, and rolling them back if parent validation or local draft commit validation rejects the result.
- Focused proof passed in `packages/flux-renderers-form-advanced/src/detail-view/{detail-view-transform-concurrency.test.tsx,detail-revalidation.test.tsx,detail-view-transform.test.tsx}`.
- Package verification for the landed slice passed via `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck`, `build`, and `lint`.

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
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no unresolved same-file overlap conflict with historical Plan `280`.
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

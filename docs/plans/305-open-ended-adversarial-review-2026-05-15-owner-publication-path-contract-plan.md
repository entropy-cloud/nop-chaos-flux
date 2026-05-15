# 305 Open-Ended Adversarial Review 2026-05-15 Owner Publication Path Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/301-open-ended-adversarial-review-2026-05-15-owner-routing-plan.md`

## Purpose

收口 non-form owner-renderer `statusPath` structural contract drift。

## Current Baseline

- non-form owner-style renderer `statusPath` 语义仍在 static structural 与 dynamic resolved-prop 之间分裂。
- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/round-02.md` 同时指出 form `statusPath` / `valuesPath` 的 contract choice 与 replacement-lifecycle leak 相互耦合；为了避免同一 form publication surface 再次双 owner，本计划不 owning form renderer semantics。
- form `statusPath` / `valuesPath` semantic choice and lifecycle consequences are owned together by Plan `306`.

## Goals

- Converge non-form owner-renderer publication-path semantics to one supported baseline.
- Keep form publication-path semantics out of this plan so the form surface has one owner in Plan `306`.

## Non-Goals

- 不接管 form publication replacement lifecycle。
- 不接管 form `statusPath` / `valuesPath` contract choice。

## Scope

### In Scope

- non-form owner-renderer `statusPath` contract only

### Out Of Scope

- form `statusPath` / `valuesPath` semantics and replacement lifecycle, owned by Plan `306`
- all other adversarial-review defects

## Execution Plan

### Phase 1 - Converge Non-Form Owner Publication Contract

Status: planned
Targets: relevant renderer/compiler/docs/tests

- Item Types: `Fix | Proof | Decision`

- [ ] Freeze one supported baseline for non-form owner-renderer `statusPath` semantics.
- [ ] Explicitly record that form `statusPath` / `valuesPath` semantics are excluded from this plan and owned by Plan `306`.
- [ ] Land the non-form owner publication-path contract convergence in renderer metadata, compiler validation, and focused proof.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] One supported non-form owner-renderer `statusPath` baseline exists in docs/code/tests.
- [ ] Focused proof exists and passes.
- [ ] The boundary excluding form `statusPath` / `valuesPath` semantics is explicit and non-conflicting with Plan `306`.
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
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no same-surface ownership ambiguity with Plan `306`.
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

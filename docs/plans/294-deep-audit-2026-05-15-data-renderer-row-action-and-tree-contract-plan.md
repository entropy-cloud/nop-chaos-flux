# 294 Deep Audit 2026-05-15 Data Renderer Row State And Action Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{summary.md,04-state-ownership.md,05-reactive-precision.md,12-field-slot.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `flux-renderers-data` family 的 retained row-state and action contract drift：quick-edit row truth-surface 泄漏、CRUD selector ancestor amplification、以及 quick-save action 误建模。

## Current Baseline

- `04-04` 仍 live：table quick-edit 把未保存 draft 直接发布进共享 `rowScope.record`。
- `05-05` 仍 live：CRUD selectors 同时订阅 owner root path 与 child path，形成连带唤醒放大器。
- `12-02` 仍 live：quick-save row action 仍被建模为 `prop`。

## Goals

- Close retained `04-04`, `05-05`, and `12-02` on one supported row-state/action baseline.
- Make row draft state, row action execution, and CRUD subscriptions converge to honest package-owned contracts.

## Non-Goals

- 不接管 spreadsheet host command failure handling；那是另一条 host-command surface。
- 不重构整个 data renderer package；只收口 confirmed retained row-state/action contract drift。

## Scope

### In Scope

- `04-04`
- `05-05`
- `12-02`
- `packages/flux-renderers-data/src/**` touched by those defect families
- relevant docs and `docs/logs/2026/05-15.md`

### Out Of Scope

- spreadsheet renderers
- any retained ID not listed above

## Execution Plan

### Phase 1 - Row Draft Truth Surface And Quick-Save Action Modeling

Status: planned
Targets: table/crud renderer paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `04-04` so unsaved/failed quick-edit drafts do not publish into shared canonical row scope.
- [ ] Fix `12-02` so quick-save row actions no longer use `prop` modeling.
- [ ] Add focused proof for row draft isolation and row-scope action execution semantics.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `04-04` and `12-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers row draft isolation and execution-time row action modeling.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - CRUD Subscription Precision

Status: planned
Targets: CRUD renderer paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `05-05` so CRUD state selectors no longer subscribe to redundant ancestor paths on the supported owner-state baseline.
- [ ] Add focused proof for narrowed CRUD subscriptions.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `05-05` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers CRUD selector precision.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all in-scope defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] All in-scope confirmed live defects (`04-04`, `05-05`, `12-02`) are fixed.
- [ ] Data-renderer row truth-surface, row-action modeling, and CRUD subscription semantics converge to one supported baseline.
- [ ] Necessary focused verification exists for every touched defect family.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending implementation, verification, and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.

# 294 Deep Audit 2026-05-15 Data Renderer Row State And Action Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-16
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

Status: completed
Targets: table/crud renderer paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `04-04` so unsaved/failed quick-edit drafts do not publish into shared canonical row scope.
- [x] Fix `12-02` so quick-save row actions no longer use `prop` modeling.
- [x] Add focused proof for row draft isolation and row-scope action execution semantics.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `04-04` and `12-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers row draft isolation and execution-time row action modeling.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - CRUD Subscription Precision

Status: completed
Targets: CRUD renderer paths, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `05-05` so CRUD state selectors no longer subscribe to redundant ancestor paths on the supported owner-state baseline.
- [x] Add focused proof for narrowed CRUD subscriptions.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `05-05` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers CRUD selector precision.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`04-04`, `05-05`, `12-02`) are fixed.
- [x] Data-renderer row truth-surface, row-action modeling, and CRUD subscription semantics converge to one supported baseline.
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

Status Note: Code, focused proof, workspace hard gates, and independent closure audit are complete.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent `ses_1d34ca833ffeUvyKecS36FMTfA`.
- Evidence: Focused proof is green via `pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/table-quick-edit-controller.test.tsx src/__tests__/crud-renderer-state.unit.test.tsx src/__tests__/data-crud-quick-edit.test.tsx` plus the repaired quick-edit-cell proof `pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/table-quick-edit-cell.unit.test.tsx src/__tests__/table-quick-edit-controller.test.tsx src/__tests__/crud-renderer-state.unit.test.tsx src/__tests__/data-crud-quick-edit.test.tsx`; touched-package `typecheck` / `build` / `lint` are green for `@nop-chaos/flux-renderers-data`; workspace hard gates are green via fresh `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` reruns, with the final workspace test output saved at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2ccecd63001Xvak230yPmU0l7`. Owner-doc decision: `No owner-doc update required`.

Follow-up:

- None currently.

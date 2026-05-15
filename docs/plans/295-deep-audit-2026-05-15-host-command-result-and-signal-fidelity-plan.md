# 295 Deep Audit 2026-05-15 Host Command Result And Signal Fidelity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/06-async-safety.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 2026-05-15 retained host command result-fidelity defects：resolved failure result 被 UI host surface 吞掉。

## Current Baseline

- `06-02` 仍 live：spreadsheet toolbar 与 page-body 都会吞掉 resolved `ok:false` 的 Undo/Redo 失败结果。
- `06-05` 仍 live as P2：flow designer toolbar back 路径不处理 resolved `ok:false/cancelled`。
- `06-03` 与 `06-04` 在维度 06 最终 retained set 中已被降级出当前 retained owner matrix；本计划不把它们伪装成 retained coverage。

## Goals

- Close retained `06-02` and `06-05` on one supported host command result-fidelity baseline.
- Make resolved failure results observable across the touched host surfaces.

## Non-Goals

- 不接管 validation submit core defects。
- 不把 `06-03` / `06-04` 作为 retained execution scope 重开。
- 不重构整个 action system；只修 confirmed retained result-fidelity defects。

## Scope

### In Scope

- `06-02/06-05`
- touched files under `packages/spreadsheet-renderers`, `packages/flow-designer-renderers`, `packages/report-designer-renderers`, `packages/flux-runtime`
- relevant docs and `docs/logs/2026/05-15.md`

### Out Of Scope

- `06-01`
- any retained ID not listed above

## Execution Plan

### Phase 1 - Spreadsheet Command Result Fidelity

Status: planned
Targets: `packages/spreadsheet-renderers/src/{default-page-body.tsx,spreadsheet-interactions/use-sheet-commands.ts,spreadsheet-toolbar/**}`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `06-02` so spreadsheet Undo/Redo handles resolved `ok:false` results visibly and honestly across both retained entry points: toolbar and page-body/interactions.
- [ ] Add focused proof for both retained spreadsheet entry points.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `06-02` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers resolved-failure handling on both retained spreadsheet entry points.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Flow Designer Result-Fidelity Closure

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-toolbar.tsx`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `06-05` so flow-designer toolbar back handles resolved failure/cancelled results, not only thrown errors.
- [ ] Add focused proof for flow-designer resolved-failure handling.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `06-05` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers flow-designer resolved-failure handling.
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

- [ ] All in-scope confirmed live defects (`06-02`, `06-05`) are fixed.
- [ ] Host command failure visibility converges to one supported baseline on the touched retained surfaces.
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

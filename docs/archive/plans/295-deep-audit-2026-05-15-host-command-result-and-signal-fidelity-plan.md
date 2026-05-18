# 295 Deep Audit 2026-05-15 Host Command Result And Signal Fidelity Plan

> Plan Status: completed
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

Status: completed
Targets: `packages/spreadsheet-renderers/src/{default-page-body.tsx,spreadsheet-interactions/use-sheet-commands.ts,spreadsheet-toolbar/**}`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `06-02` so spreadsheet Undo/Redo handles resolved `ok:false` results visibly and honestly across both retained entry points: toolbar and page-body/interactions.
- [x] Add focused proof for both retained spreadsheet entry points.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `06-02` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers resolved-failure handling on both retained spreadsheet entry points.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

Phase Notes:

- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts` now reports resolved failed and cancelled Undo/Redo results honestly through the shared command-reporting helper.
- Focused proof now covers both retained spreadsheet entry points: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.test.tsx` proves cancelled/failed undo and cancelled/successful redo semantics on the shared command path, and `packages/spreadsheet-renderers/src/default-page-body.test.tsx` proves the default page body wires the toolbar entry point through to the undo/redo handlers exposed by `useSpreadsheetInteractions`.
- No owner-doc update required beyond this plan and `docs/logs/2026/05-15.md`; the fix restores existing result-fidelity semantics without changing a supported public contract.

### Phase 2 - Flow Designer Result-Fidelity Closure

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-toolbar.tsx`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `06-05` so flow-designer toolbar back handles resolved failure/cancelled results, not only thrown errors.
- [x] Add focused proof for flow-designer resolved-failure handling.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `06-05` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers flow-designer resolved-failure handling.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

Phase Notes:

- `packages/flow-designer-renderers/src/designer-toolbar.tsx` now treats resolved failed back results the same way as thrown failures.
- Focused proof lives in `packages/flow-designer-renderers/src/designer-controls.test.tsx`, which proves both rejected and soft-failed back-action behavior.
- No owner-doc update required beyond the execution log because the change restores the existing host-command failure visibility baseline.

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

Phase Notes:

- Focused verification passed via `pnpm --filter @nop-chaos/spreadsheet-renderers exec vitest run src/spreadsheet-interactions/use-sheet-commands.test.tsx src/default-page-body.test.tsx src/spreadsheet-toolbar.test.tsx` and `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/designer-controls.test.tsx`.
- Fresh workspace hard gates are green, with the latest `pnpm test` output saved at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2b4ca192001NVjp6fzrHZFpoI`.
- Independent closure audit passed via `ses_1d4a5ab75ffeabGM2MUBocR14v`.

## Closure Gates

- [x] All in-scope confirmed live defects (`06-02`, `06-05`) are fixed.
- [x] Host command failure visibility converges to one supported baseline on the touched retained surfaces.
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

Status Note: Completed. Spreadsheet Undo/Redo and flow-designer back actions now preserve resolved failure and cancellation visibility on the retained host-command surfaces, focused verification is complete, and independent closure audit found no remaining plan-owned blocker.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d4a5ab75ffeabGM2MUBocR14v`
- Evidence: Re-read this plan, `docs/analysis/2026-05-15-deep-audit-full/06-async-safety.md`, `docs/logs/2026/05-15.md`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.test.tsx`, `packages/spreadsheet-renderers/src/default-page-body.tsx`, `packages/spreadsheet-renderers/src/default-page-body.test.tsx`, `packages/flow-designer-renderers/src/designer-toolbar.tsx`, and `packages/flow-designer-renderers/src/designer-controls.test.tsx`. Confirmed both retained spreadsheet entry points are now covered, the flow-designer proof remains sufficient, no additional owner-doc update is required, and fresh workspace verification is green.

Follow-up:

- None currently.

# 433 Open-Ended Adversarial Review 2026-05-23 Report Designer Host Projection And Manifest Plan

> Plan Status: completed
> Last Reviewed: 2026-05-23
> Source: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/{round-01.md,round-03.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`, `docs/plans/428-open-ended-adversarial-review-2026-05-21-host-page-authoring-contract-residual-plan.md`

## Purpose

收口本轮 Report Designer 的两条 live residual：top-level `activeSheet` convenience 语义仍错误，以及 manifest 对 nested `spreadsheet.selection` 的公开结构仍弱于 live runtime 和 owner doc。

## Current Baseline

- `R23-01`: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/round-01.md` 已确认 top-level `activeSheet` 仍由 `selectionTarget` 子集反推；当 target 为 `workbook` / `row` / `column` 时返回 `undefined`，而 `spreadsheet.activeSheet` 仍有值。
- `R23-03`: `round-03.md` 已确认 runtime 与 owner doc 都发布结构化 `spreadsheet.selection` vocabulary，但 manifest 仍把它定义为 `kind: 'object', fields: {}`。
- 已完成计划 `409` 处理的是 report/spreadsheet host provider enforcement、bridge undo/redo summary、以及 shell canonical state；它没有 owning `activeSheet` convenience 语义或 nested `spreadsheet.selection` manifest 精度残余。
- 已完成计划 `428` 处理的是 host-page formal authoring contract，不 owning 本计划这两条 live runtime/manifest semantic residual。

## Goals

- 修复 `R23-01` 与 `R23-03`。
- 让 Report Designer host scope convenience fields、manifest precision、owner docs、focused proof 使用同一套 supported contract。

## Non-Goals

- 不重开 `409` 已关闭的 bridge subscribe/undo-redo/workbook split-brain family。
- 不处理 `selectionTarget` alias cleanup 或其他已确认旧家族问题。
- 不扩大到 Report Designer 其他未命名 manifest precision 候选。

## Scope

### In Scope

- `R23-01`, `R23-03`
- `packages/report-designer-renderers/src/{host-data.ts,report-designer-manifest.ts}`
- Focused tests under `packages/report-designer-renderers/src/`
- `docs/components/report-designer-page/design.md`
- `docs/architecture/report-designer/{design.md,api.md,inspector-design.md,contracts.md}` when live-baseline review proves they must change
- `docs/logs/2026/05-23.md`

### Out Of Scope

- bridge subscribe fidelity
- report/spreadsheet workbook sync split-brain
- page formal authoring metadata work owned by Plan `428`

## Execution Plan

### Phase 1 - Re-verify Residual Boundary

Status: completed
Targets: this plan, live code paths named above, `docs/logs/2026/05-23.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R23-01` and `R23-03` against the live repo before editing.
- [x] Record explicit non-overlap with completed Plans `409` and `428` in the execution log / plan notes if any boundary moved during re-audit.

Exit Criteria:

- [x] `R23-01` and `R23-03` remain accurately scoped and singly owned by this plan.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-23.md` is updated.

### Phase 2 - Repair Host Projection And Manifest Precision

Status: completed
Targets: `packages/report-designer-renderers/src/{host-data.ts,report-designer-manifest.ts}`, focused tests, owner docs listed above

- Item Types: `Fix | Proof`

- [x] Make top-level `activeSheet` represent the supported active-sheet baseline instead of a selection-target subset projection.
- [x] Publish a structured `spreadsheet.selection` manifest shape that matches the runtime vocabulary already emitted by host data.
- [x] Add focused proof for final `activeSheet` semantics and manifest/runtime selection-shape parity.
- [x] Update `docs/components/report-designer-page/design.md` and affected report-designer owner docs (`docs/architecture/report-designer/{design.md,api.md,inspector-design.md,contracts.md}`).

Exit Criteria:

- [x] `R23-01` and `R23-03` are fixed.
- [x] Focused proof covers `activeSheet` behavior and `spreadsheet.selection` manifest precision.
- [x] Affected owner docs are updated if needed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-23.md` is updated.

## Closure Gates

- [x] All in-scope confirmed live defects / contract drifts are fixed.
- [x] Report Designer host scope and manifest now publish one final supported contract for the touched fields.
- [x] Necessary focused verification is complete.
- [x] No in-scope residual is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Draft split from the original umbrella 2026-05-23 host-contract plan after independent review concluded `R23-01` and `R23-03` share one honest Report Designer closure surface.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- If execution reveals additional Report Designer manifest weak-shape fields, extend scope only with an explicit scope-change note and only if they share the same proof bundle.

## Closure

Status Note: `R23-01` and `R23-03` are fixed in live code, focused proof and owner-doc sync are complete, workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1ad94538dffeskWerOoXF8tPyx`
- Evidence: fresh-session audit re-checked live report-designer projection/manifest/docs and confirmed `host-data.ts`, `report-designer-manifest.ts`, `host-data.test.ts`, and owner docs now agree on top-level `activeSheet` plus structured nested `spreadsheet.selection`, with `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` already passing in the workspace.

Follow-up:

- No remaining plan-owned work.

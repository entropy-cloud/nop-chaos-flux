# 226 Accessibility Keyboard And Label Integrity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,20-accessibility.md}`
> Related: `docs/plans/{195-accessibility-compliance-remediation-plan.md,212-renderer-workbench-contract-and-accessibility-closure-plan.md,221-deep-audit-2026-05-07-confirmed-defect-remediation-plan.md}`

## Purpose

收口 `full-8` 中仍保留的 complex-widget accessibility defects，重点是键盘等价路径、交互元素语义、以及程序化 label/description 关联。完成态要求：table/tree/condition/chart/spreadsheet/flow/report/word 等 in-scope complex widgets 在支持的交互路径上具备可访问的键盘或 label baseline，并有 focused DOM/a11y proof。

## Current Baseline

- 维度 20 的 P1 retained set 包括：table row click mouse-only、TreeRenderer/tree-controls keyboard model 不完整、condition-builder selected badge delete mouse-only 且 between inputs 无名、chart clickable div 无 keyboard/name、spreadsheet corner/column headers mouse-only、flow inspector branch card clickable div、word editor dialog form controls 缺程序化 labels、report designer drag/drop workflow 无 keyboard alternative。
- 维度 20 还保留了 P2/P3 label/association residuals：pagination select label、ArrayEditor/KeyValue `aria-describedby` / `aria-errormessage`、checkbox-group source error live association、table loading status text、spreadsheet find/cell labels、debugger JSON toggles labels、carousel accessible name。
- `212` 已关闭 earlier workbench/accessibility families；`WrappedFieldAction` 与 CodeEditor toolbar “无键盘”在 `full-8` 中被明确驳回，本计划不重开。
- `195` 已经建立 tree renderer 的基础 ARIA semantics；本计划只拥有 `full-8` 新保留的 keyboard/label residuals。

## Goals

- 为 retained mouse-only / drag-only / clickable-div paths 建立 supported keyboard equivalent。
- 为 retained complex-dialog / widget controls 补程序化 labels、descriptions、and status text。
- 用 focused DOM/a11y tests 锁定 final accessible baseline。

## Non-Goals

- 不把本计划扩大成完整 APG compliance rewrite。
- 不重开 `212` 已驳回或已关闭的 keyboard 误报。
- 不接管 renderer contract、slot modeling、or non-a11y style work。

## Scope

### In Scope

- `packages/flux-renderers-data/src/{table-renderer/*,tree-renderer.tsx,chart-renderer.tsx}`
- `packages/spreadsheet-renderers/src/*` where retained keyboard/label defects apply
- `packages/flux-renderers-form-advanced/src/{tree-controls.tsx,condition-builder/*,array-editor.tsx,key-value.tsx}`
- `packages/flow-designer-renderers/src/designer-inspector.tsx`
- `packages/word-editor-renderers/src/*` where retained dialog label defects apply
- `packages/report-designer-renderers/src/*` where retained drag/drop-only workflow defects apply
- `packages/nop-debugger/src/*` where retained JSON toggle labeling defects apply
- `packages/ui/src/components/ui/carousel.tsx`
- directly affected component docs and focused accessibility tests

### Out Of Scope

- `WrappedFieldAction` / CodeEditor toolbar keyboard false positives rejected by `full-8`
- full APG tree/navigation expansion beyond the retained `full-8` baseline
- styling-only or renderer-contract-only work owned by other plans

## Execution Plan

### Workstream 1 - Add Keyboard Equivalents For Retained Mouse-Only Paths

Status: planned
Targets: table/tree/chart/spreadsheet/flow/report paths, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Add supported keyboard activation/focus behavior for retained mouse-only table row, tree, chart, spreadsheet header, and flow inspector paths.
- [ ] [Fix] Add a supported keyboard alternative for the retained report designer drag/drop field workflow.
- [ ] [Proof] Add focused DOM/a11y tests for the repaired keyboard paths.

Exit Criteria:

- [ ] The retained mouse-only or drag-only P1 paths have supported keyboard equivalents.
- [ ] Focused tests prove the final keyboard/focus behavior.
- [ ] Affected owner docs are updated if the stable interaction baseline changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Repair Labels, Names, And Status Associations

Status: planned
Targets: condition-builder, word dialog forms, array/key-value, pagination/loading/debugger/carousel labels, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Add programmatic labels/names for the retained condition-builder, word-editor dialog, pagination, spreadsheet find/cell, debugger toggle, and carousel paths.
- [ ] [Fix] Repair retained `aria-describedby` / status / live-association defects for ArrayEditor, KeyValue, checkbox-group, and table loading state.
- [ ] [Proof] Add focused DOM/a11y tests for the repaired label/association/status paths.

Exit Criteria:

- [ ] The retained label/name/association defects are closed on the supported paths.
- [ ] Focused tests prove the final accessible naming/status baseline.
- [ ] Affected owner docs are updated if the stable baseline changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: planned
Targets: in-scope renderers/tests/docs, this plan

- Item Types: `Proof | Decision`

- [ ] Run focused accessibility verification for the repaired keyboard and label paths.
- [ ] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [ ] Perform an independent closure audit and fix any remaining in-scope accessibility ambiguity before closing the plan.

Exit Criteria:

- [ ] Focused verification is recorded for keyboard and label/status families.
- [ ] Workspace verification passes.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained accessibility defects from `full-8` are closed.
- [ ] Focused verification exists for keyboard and label/status families.
- [ ] No in-scope retained defect is silently deferred or downgraded.
- [ ] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Validation Checklist

- [ ] `212` and `195` carve-outs remain explicit.
- [ ] Keyboard fixes use real interactive semantics, not only visual focus changes.
- [ ] Programmatic labels/status associations are test-covered on the retained paths.
- [ ] No retained `full-8` item from dimension 20 is left without an owner decision.

## Closure

Status Note: pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending execution.

# 362 Accessibility Contract Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-deep-audit-full/{20-accessibility.md,summary.md}`
> Related: `docs/plans/204-renderer-workbench-and-accessibility-closure-plan.md`, `docs/plans/361-slot-contract-host-manifest-and-owner-doc-closure-plan.md`

## Purpose

收口 2026-05-18 深度审核中新确认的 retained accessibility defects。完成态是：standalone/public `ReportFieldPanel` 残余 surface、spreadsheet resize interaction、word-editor dialog 输入控件都满足当前支持基线下的最小键盘语义与程序化命名要求，并有 focused verification 防止回归。

## Current Baseline

- `packages/report-designer-renderers/src/field-panel-renderer.tsx` 的 renderer-owned path 已经有独立 insert button 与 focused tests；`20-01` 的 live retained defect 现已收窄到 standalone/public `packages/report-designer-renderers/src/report-field-panel.tsx`，它仍把纯拖拽项暴露成 `role="button" + tabIndex={0}`，但没有 click / Enter / Space 激活路径。
- `spreadsheet-grid.tsx` 的列宽/行高 resize handle 仍是 `role="separator"` + `onMouseDown` 的 mouse-only 交互，没有键盘 resize，也未确认存在等价可访问 resize path：`20-02`。
- `word-editor` hyperlink / page margins / watermark dialogs 中多个 `Input` 仍只有 placeholder 或视觉文本，没有稳定的程序化标签：`20-03`。
- `summary.md` 已将 `20-01` 评为 P1，将 `20-02`、`20-03` 评为 P2；这些都属于 retained must-fix items，而不是更广的 a11y sweep 候选。

## Goals

- 修复 standalone/public `ReportFieldPanel` 的 faux button 语义缺陷。
- 修复 spreadsheet resize interaction 的 accessibility contract。
- 修复 word-editor dialog 输入控件的程序化命名缺口。
- 为三类 retained a11y 缺陷补 focused DOM/test verification。

## Non-Goals

- 不做 repo-wide accessibility sweep。
- 不重开已关闭 plan 中已经收口的旧 a11y surfaces。
- 不顺带进行 broader visual redesign、toolbar UX 重写或 word-editor form re-layout。
- 不扩展到 `summary.md` 里未列入本计划的其它 retained defects。

## Scope

### In Scope

- `packages/report-designer-renderers/src/report-field-panel.tsx`
- `packages/report-designer-renderers/src/index.ts` for standalone public export compatibility
- `apps/playground/src/pages/report-designer-demo.tsx` for live public-surface compatibility adjudication
- `docs/components/report-field-panel/design.md` if standalone/public field-panel semantics need owner-doc sync
- `docs/architecture/report-designer/design.md` if family-level field-panel interaction semantics need owner-doc sync
- `docs/architecture/report-designer/api.md` if target family API semantics intentionally change during `20-01` closure
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-grid/use-context-menu-actions.ts` if the chosen closure branch uses a context-menu size-edit path
- `packages/spreadsheet-renderers/src/spreadsheet-grid/spreadsheet-grid-context-menu.tsx` if the chosen `20-02` branch adds row/column size actions to the shared context menu
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts` for canonical resize preview/dispatch adjudication
- `docs/components/spreadsheet-page/design.md` for single-renderer/grid interaction owner-doc adjudication
- `docs/architecture/report-designer/design.md` if spreadsheet/report family interaction contract changes need owner-doc sync
- any minimal spreadsheet size-edit dialog / entry files needed for the chosen `20-02` closure branch
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx`
- `packages/word-editor-renderers/src/toolbar/page-controls.tsx`
- `docs/components/word-editor-page/design.md` if dialog input semantics need owner-doc sync
- `docs/architecture/word-editor/design.md` if word-editor family interaction semantics need owner-doc sync
- `docs/bugs/` note if final remediation meets the bug-note threshold; otherwise explicit adjudication in plan/log
- related focused tests and `docs/logs/2026/05-18.md`

### Out Of Scope

- generic spreadsheet keyboard model redesign beyond the retained resize-handle defect
- broader report-designer drag-and-drop redesign beyond the retained standalone/public faux-button defect
- repo-wide dialog labeling cleanup beyond the retained word-editor dialogs

## Execution Plan

### Phase 1 - Standalone Report Field Panel And Spreadsheet Resize Accessibility Closure

Status: completed
Targets: `report-field-panel.tsx`, `index.ts`, `report-designer-demo.tsx`, `spreadsheet-grid.tsx`, `spreadsheet-grid/use-context-menu-actions.ts`, `spreadsheet-grid/spreadsheet-grid-context-menu.tsx`, `spreadsheet-interactions/use-resize.ts`, report/spreadsheet owner docs, focused package tests

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] 修复 `20-01`：关闭 standalone/public `report-field-panel.tsx` 的 faux button defect，并保留当前 public surface。draggable item 本身不得继续宣称 button semantics；同一 field row 上必须存在明确可聚焦的 keyboard-accessible non-drag insert path，通过受支持的 public props/export contract 暴露 canonical insert 行为。
- [x] [Decision] 冻结 `20-01` 的 standalone contract：public `ReportFieldPanel` 继续是受支持 surface；standalone public props/export contract 必须显式承载 keyboard-accessible non-drag insert 行为，并在没有合法 insert target / availability 时明确 disabled/unavailable。最终采用的 exact prop shape 由实现与 owner-doc adjudication 固定，但不得用删除或收窄当前 public surface 的方式关闭 `20-01`。
- [x] [Decision] 明确 `20-01` 的 owner-doc 路由：`docs/components/report-field-panel/design.md` 必须新增 standalone-public-contract 子节，并作为 `ReportFieldPanel` renderer + exported component 语义的单一 owner doc；`docs/architecture/report-designer/design.md` 只记录 family-level 的“drag plus non-drag insert path”基线。
- [x] [Decision] 冻结 `20-02` 的 supported closure contract：本计划只接受 shared-context-menu size-edit path。现有 resize handle 不再暴露为 interactive separator；最终支持路径必须从已 keyboard-focusable 的 row/column header button 出发，通过 `Shift+F10` 或 Context Menu key 打开 shared context menu，选择 row-height / column-width size action 后进入带程序化标签的 size-edit dialog，形成端到端无需鼠标前置条件的 accessible resize path。
- [x] [Decision] 明确 `20-02` 的 dialog owner：size-edit dialog 的挂载、open state、提交/关闭编排由 `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 统一拥有；`use-context-menu-actions.ts` / `spreadsheet-grid-context-menu.tsx` 只负责 action 暴露与触发，不得各自引入 ad-hoc dialog owner。
- [x] [Decision] 明确 `20-02` 的 owner-doc 路由：`docs/components/spreadsheet-page/design.md` 负责 single-renderer/grid/header/context-menu 交互语义的 update / no-update adjudication；`docs/architecture/report-designer/design.md` 负责 family-level resize baseline 与 shared interaction model 的 adjudication。
- [x] [Decision] 冻结 `20-02` 的 keyboard-entry contract：当焦点位于 row/column header button 且用户通过 `Shift+F10` 或 Context Menu key 打开 shared context menu 时，grid 必须先归一化匹配的单行/单列 selection 与 anchor，再评估 row-height / column-width size action 的 enabled/disabled state 或后续 dispatch；不得沿用陈旧 cell selection。
- [x] [Decision] 冻结 `20-02` 的 multi-selection contract：row-height / column-width size action 必须明确单选/多选语义并在 docs/tests 中固定。默认支持路径是仅在 exactly-one row header 或 exactly-one column header 选择时启用 size action；若当前为多行/多列选择，则 shared context menu 中对应 size action 必须 disabled/unavailable，而不是对锚点静默生效。
- [x] [Decision] 明确处理 `use-resize.ts` 义务：mouse-drag resize 保留，并继续通过 canonical `spreadsheet:resizeRow` / `spreadsheet:resizeColumn` command surface 提交。
- [x] [Fix] 修复 `20-02`：移除现有 handle 的 interactive separator 语义，并补齐从 row/column header button 出发的 shared-context-menu size-edit 入口。shared context menu 必须新增 row-height / column-width size action；keyboard-opened menu 必须先归一化对应 row/column selection 与 anchor；size-edit dialog 的输入与 primary action 都必须具备稳定 accessible name，且最终尺寸变更必须通过 canonical `spreadsheet:resizeRow` / `spreadsheet:resizeColumn` shared command 提交，而不是走宿主私有旁路。
- [x] [Proof] 新增 focused tests，分别验证 `20-01` / `20-02` 的 closure contract：`20-01` 已覆盖 public `ReportFieldPanel` 的 keyboard-accessible non-drag insert path、canonical callback dispatch、no-target/no-callback 负向行为，以及 `apps/playground/src/pages/report-designer-demo.tsx` live consumer proof；`20-02` 已覆盖 row-height 与 column-width 两条 shared-context-menu size-edit 路径、selection/anchor normalization、dialog accessible names、禁用态与 canonical resize commands。
- [x] [Fix] 明确处理 owner-doc 义务：`docs/components/report-field-panel/design.md`、`docs/architecture/report-designer/design.md`、`docs/components/spreadsheet-page/design.md` 已完成 owner-doc adjudication；`docs/architecture/report-designer/api.md` 无额外更新要求。
- [x] [Decision] 明确处理 bug-note 义务：`20-01` / `20-02` 本次为 retained contract closure，focused tests 与 owner-doc 已足够固定 supported baseline，因此 `No bug-note update required`。

Exit Criteria:

- [x] `20-01` 与 `20-02` retained accessibility defects 已收口
- [x] focused verification 已明确证明 `20-01` 的 standalone/public surface 已收口：public `ReportFieldPanel` 的 keyboard-accessible non-drag insert path 已覆盖 canonical callback dispatch 与 no-target/no-callback 负向证明，且 `apps/playground/src/pages/report-designer-demo.tsx` 已完成 live consumer proof。`20-02` 已按最终 control model 收口，不再保留 mouse-only interactive separator；旧 row/column resize handle 不再暴露 interactive `role="separator"` / focus target 语义，且 row-height 与 column-width 两条路径都存在从 keyboard-focusable row/column header button 出发，经 `Shift+F10` 或 Context Menu key 打开 shared context menu、先归一化匹配 selection/anchor 再进入 size-edit UI 的 resize 入口；单选/多选启用状态符合 frozen contract，并通过 canonical resize command 落地真实尺寸变更。`use-resize.ts` 保留且 focused verification 已证明 mouse-drag row/column resize 继续通过同一个 canonical command surface 提交。
- [x] `docs/components/report-field-panel/design.md` 已新增 standalone-public-contract 子节并完成 `20-01` owner-doc adjudication，`docs/architecture/report-designer/design.md` 已完成 `20-01` family-level adjudication并记录 `20-02` family-level resize baseline，`docs/components/spreadsheet-page/design.md` 已完成 `20-02` single-renderer/grid interaction semantics 的 update / no-update adjudication，且 `docs/architecture/report-designer/api.md` 已完成 non-gate update / no-update 裁定
- [x] `20-01` / `20-02` 对应的 `docs/bugs/` update / no-update 裁定已明确落盘
- [x] `docs/logs/2026/05-18.md` 已更新

### Phase 2 - Word Editor Dialog Labeling Closure

Status: completed
Targets: `insert-controls.tsx`, `page-controls.tsx`, word-editor owner docs, focused dialog accessibility tests

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] 修复 `20-03`：word-editor hyperlink / page margins / watermark dialogs 中的输入框具备稳定程序化标签。
- [x] [Decision] 明确处理 owner-doc 义务：`docs/components/word-editor-page/design.md` 已更新；`docs/architecture/word-editor/design.md` 本次 `No owner-doc update required`，因为 family-level contract 未发生额外变化。
- [x] [Decision] 明确处理 bug-note 义务：`20-03` 本次为 retained labeling closure，focused tests 与 owner-doc 已足够固定 supported baseline，因此 `No bug-note update required`。
- [x] [Proof] 新增 focused DOM/tests，优先落在 `packages/word-editor-renderers/src/__tests__/insert-controls.test.tsx` 与 `packages/word-editor-renderers/src/toolbar/page-controls.test.tsx`，验证这些 dialog 输入框存在稳定 accessible name，而不是只依赖 placeholder 或视觉文本；至少覆盖 hyperlink display/url、四个 page-margin 输入，以及 watermark text 输入。

Exit Criteria:

- [x] `20-03` retained accessibility defect 已收口
- [x] focused verification 已覆盖 hyperlink display/url、四个 page-margin 输入、watermark text 输入的 accessible naming
- [x] `docs/components/word-editor-page/design.md` 与 `docs/architecture/word-editor/design.md` 的 owner-doc 结果已明确落盘（已更新或明确 `No owner-doc update required` + 理由）
- [x] `20-03` 对应的 `docs/bugs/` update / no-update 裁定已明确落盘
- [x] `docs/logs/2026/05-18.md` 已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] `20-01`、`20-02`、`20-03` 全部达到最终行为/语义结果
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract drift
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] `docs/bugs/` update / no-update adjudication 已完成
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Repo-Wide Accessibility Sweep

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只承接 `summary.md` 中本轮新确认的 `20-01/02/03` retained defects；更广的 a11y sweep 不属于这份 owner plan 的 closure 前提。
- Successor Required: no

## Closure

Status Note: `20-01`、`20-02`、`20-03` 的 retained accessibility closure 已全部落到 live code、focused proof 与 owner docs。standalone/public `ReportFieldPanel` 现在通过 supported public props 暴露真实 non-drag insert 行为并已有 playground consumer proof；spreadsheet resize 已收敛到 shared context menu + size-edit dialog + canonical resize commands；word-editor dialog 输入已补稳定 accessible names。最终 workspace verification 已通过。

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit agent
- Evidence: initial audit `ses_1c55a694cffez9SDKin6SfqwYw` found the remaining Plan 362 blocker in `apps/playground/src/pages/report-designer-demo.tsx`; after fixing that consumer path, resolving the trailing lint/doc blockers, and rerunning workspace verification, final re-audit `ses_1c535e086ffevAPe86bOliyo0S` reported `Plan 362 verdict: Closure-ready` with `No findings.`.

Follow-up:

- None.

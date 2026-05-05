# 212 Renderer Workbench Contract And Accessibility Closure Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full-7/{09-renderer-contract.md,10-styling.md,11-ui-components.md,12-field-slot.md,18-cross-package.md,20-accessibility.md}`, `docs/analysis/2026-05-05-deep-audit-full-7/summary.md`, `docs/architecture/{renderer-runtime.md,field-binding-and-renderer-contract.md,styling-system.md}`, `docs/components/designer-page/design.md`
> Related: `docs/plans/195-accessibility-compliance-remediation-plan.md`, `docs/plans/204-renderer-workbench-and-accessibility-closure-plan.md`, `docs/plans/210-deep-audit-full-7-confirmed-defect-remediation-program-plan.md`

## Purpose

收口 `full-7` 中仍保留的 renderer/workbench-side confirmed defects：live renderer metadata/marker drift、BEM 作为外部样式接口、原生 UI element 违约、deep-region / `FieldFrame<label>` contract gap、跨包 workbench 文案与 override-surface schema drift，以及 retained a11y failures。该计划完成后，这些 retained contract defects 会从“审计确认问题”变成“live baseline 已修复并有 proof”。

## Current Baseline

- plan `204` 已收口上一轮 renderer/workbench/a11y retained set，但 `full-7` 仍确认存在新的 retained defects，不能复用 `204` 的 completed 状态来假装它们已关闭。
- `designer-field` 当前仍缺显式 authored field metadata，且 root 上没有稳定 marker，同时在 fallback 中固化 `grid gap-1.5`，与 renderer root contract 和 styling contract 冲突。
- playground flow designer 仍把 BEM selector 和 BEM class 当作 live authoring/public styling surface；这不是单纯历史 CSS 残留，而是仍在暴露给 schema 的外部接口。
- 渲染器层与 playground/demo 层仍有明确 UI-component 违约：`FieldLabel` 直接输出原生 `<label>`，report-designer demo 折叠开关仍用原生 `<button>`。
- `table.columns[].quickEdit.body` deep-region extraction 仍半接线；`array-field`、`tree-select` / `input-tree` 仍会落入默认 `FieldFrame<label>` 包裹并在内部放置交互控件；`table.columns[].label` 的 region 在响应式展开路径仍未消费。
- cross-package retained drift 仍在：domain workbench 与 advanced widget 的默认文案/i18n key 未收敛，failure observability 最低线不一致，`designer-page` 的 live `toolbar/inspector/dialogs` region 能力仍未在 schema input/doc 中完整声明。
- retained a11y failures 仍集中在真实焦点控件错误/必填关联、条件构建器可访问名称与键盘可操作语义、tree/table search naming、detail draft/status 宣告等路径。

## Goals

- 修复 retained renderer contract / styling-interface / slot-field / UI-component / a11y defects。
- 让 `designer-page` / workbench family 的 current supported contract 与 live schema/doc/implementation 保持一致。
- 只覆盖 `full-7` retained must-fix set，不扩大成全面的 design refresh 或全仓 i18n 清理计划。

## Non-Goals

- 不进行 workbench 全量视觉重做。
- 不清空全仓 mixed-language 文案。
- 不把所有 widget renderer 内部 utility 样式迁移到 CSS token 层。
- 不处理 docs/test-hardening/performance/runtime-side defects。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/{designer-field.tsx,designer-palette.tsx}`
- `packages/report-designer-renderers/src/{field-panel-renderer.tsx,inspector-shell-renderer.tsx,report-designer-inspector.tsx,report-designer-toolbar.tsx,page-renderer.tsx,host-action-provider.ts}`
- `packages/word-editor-renderers/src/{word-editor-page.tsx,panels/outline-panel.tsx}`
- `packages/flux-code-editor/src/{types.ts,source-resolvers.ts,code-editor-renderer.tsx}`
- `packages/flux-react/src/default-spacing.css`
- `packages/flux-renderers-data/src/table-renderer/fixed-columns.ts`
- `packages/nop-debugger/src/panel/styles-css.ts`
- `apps/playground/src/flow-designer-nodes.css`
- `apps/playground/src/schemas/dingtalk-workflow-tree-schema.json`
- `packages/flux-renderers-form/src/renderers/shared/label.tsx`
- `apps/playground/src/pages/report-designer-demo.tsx`
- `packages/flux-renderers-data/src/table-renderer/{table-quick-edit-cell.tsx,table-header-row.tsx,table-body-row-rendering.tsx}`
- `packages/flux-react/src/{field-frame.tsx,node-frame-wrapper.tsx}`
- `packages/flux-renderers-form-advanced/src/{composite-field/array-field.tsx,tree-controls.tsx,condition-builder/*,array-editor.tsx,key-value.tsx,detail-view/*}`
- `packages/flow-designer-renderers/src/{index.tsx,designer-page.tsx}`
- `docs/components/designer-page/design.md`
- directly affected focused tests and owner docs

### Out Of Scope

- docs path drift and verification-hardening
- report-designer deep-copy performance
- runtime-side async/type/error defects owned by plan `211`

## Execution Plan

### Phase 1 - Close Renderer Root And Styling-Interface Contract Defects

Status: in progress
Targets: `designer-field.tsx`, playground BEM files, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Add explicit authored field metadata and a stable root marker to `designer-field`, and remove the implicit root layout fallback that violates the styling contract.
- [ ] [Fix] Close the retained report-designer live renderer contract drifts for field-panel / inspector-shell / inspector / toolbar roots where authored fields or root passthrough still diverge from live consumption.
- [x] [Fix] Close the retained `code-editor` root `data-cid` contract drift so renderer DOM root uses the normalized `props.meta.cid` path.
- [ ] [Fix] Remove BEM selectors/classes from the live public styling interface of the playground flow-designer example, replacing them with allowed marker/data-slot/classAlias surfaces.
- [ ] [Fix] Close the retained HSL-token misuse / token-bypass defects in the in-scope CSS/TS styling files.
- [ ] [Decision] Record the final styling-interface baseline for this example so the BEM removal does not silently regress host integration or package-owned styling ownership.
- [ ] [Proof] Add focused tests or schema assertions covering `designer-field` contract shape and the replacement public styling surface.

Exit Criteria:

- [ ] `designer-field`, `code-editor`, and the retained report-designer root renderers no longer violate in-scope root contract requirements.
- [ ] The in-scope playground flow-designer example no longer exposes BEM as a public styling API, and the retained HSL-token misuse defects are closed.
- [ ] Focused verification covers the landed contract/styling changes.
- [ ] Affected owner docs are updated if baseline changed; otherwise explicitly record `No owner-doc update required`.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Close Wrapped-Field, Deep-Region, And UI-Component Defects

Status: in progress
Targets: `field-frame.tsx`, `node-frame-wrapper.tsx`, advanced-form files, `label.tsx`, report-designer demo page, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Remove the retained `FieldFrame<label>` conflicts for `array-field` and `tree-select` / `input-tree` by giving them a contract-honest non-label wrapper path.
- [ ] [Fix] Complete the retained `table.columns[].quickEdit.body` and `table.columns[].label` deep-region consumption gaps.
- [x] [Fix] Replace the retained raw `<label>` / `<button>` usage with `@nop-chaos/ui` components where the repository rules require them.
- [ ] [Proof] Add focused tests covering wrapper-tag behavior, deep-region rendering, and UI-component replacement semantics.

Exit Criteria:

- [ ] The retained wrapped-field and deep-region defects are closed.
- [ ] The retained UI-component violations are removed.
- [ ] Focused verification covers the landed field-slot and UI-component fixes.
- [ ] Affected owner docs are updated if baseline changed; otherwise explicitly record `No owner-doc update required`.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Close Cross-Package Workbench Contract Drift

Status: in progress
Targets: `designer-page` code/docs and other in-scope workbench files

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Bring `designer-page` schema input / docs / live definition back into alignment for retained override-surface regions (`toolbar`, `inspector`, `dialogs`).
- [ ] [Fix] Close the retained in-scope cross-package vocabulary drift for the concrete paths owned here: `flow-designer` shell text, `word-editor` shell/auxiliary defaults, `flux-code-editor` widget defaults, and retained advanced-form accessibility helper defaults.
- [ ] [Fix] Close the retained failure-observability minimum-line split only for the in-scope workbench paths owned here, and leave runtime-side general async safety to plan `211`.
- [ ] [Proof] Add focused tests or doc-backed assertions for final supported override-surface and vocabulary behavior.

Exit Criteria:

- [ ] The retained override-surface drift is closed in code and owner docs.
- [ ] The in-scope retained cross-package vocabulary/observability defects are closed for the explicitly named owner files without expanding to a full i18n cleanup campaign.
- [ ] Focused verification covers the landed workbench contract fixes.
- [ ] `docs/components/designer-page/design.md` and any directly affected owner docs are updated to the final baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Close Retained Accessibility Defects

Status: in progress
Targets: in-scope form/data/workbench renderer files, related focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Ensure the retained real-focus-control a11y gaps are closed: select error association, required semantics on inputs, detail draft status announcement, and row-delete focus restoration.
- [ ] [Fix] Ensure retained naming and keyboard semantics are closed for tree search, table column search, condition-builder controls, and detail action buttons.
- [ ] [Fix] Ensure retained tree/status/live-region semantics are closed where `full-7` still reports them as must-fix.
- [ ] [Proof] Add focused DOM/e2e tests for every retained a11y defect family in scope.

Exit Criteria:

- [ ] All in-scope retained a11y defects from dimension `20` are fixed.
- [ ] Focused verification covers each landed retained a11y path.
- [ ] Affected owner docs are updated if baseline changed; otherwise explicitly record `No owner-doc update required`.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained defects from dimensions `09`, `10`, `11`, `12`, `18`, and `20` are fixed, or moved to explicit successor ownership with recorded reasoning.
- [ ] No in-scope confirmed defect is silently downgraded into generic design polish or i18n cleanup.
- [ ] The in-scope retained set is explicit and auditable: `designer-field` contract drift, retained report-designer root contract drift, `code-editor` root `data-cid` drift, BEM public styling drift, retained HSL-token misuse, retained UI-component violations, retained wrapped-field/deep-region defects, the explicitly named dimension-18 vocabulary/observability items, and retained dimension-20 a11y defects.
- [ ] Focused verification exists for renderer root contracts, styling interface, wrapped-field/deep-region behavior, cross-package workbench contract alignment, and retained a11y semantics.
- [ ] Affected owner docs are synced to the live baseline, or each phase explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope renderer/workbench blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Broader Workbench Visual Redesign

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan owns retained correctness/contract/a11y defects, not a full visual refresh of Flow Designer or other workbench shells.
- Successor Required: no

## Closure

Status Note: In progress. This pass landed part of the retained renderer/workbench set: `designer-field` now declares authored fields and a stable root marker, `designer-page` schema input now exposes `toolbar`/`inspector`/`dialogs`, `code-editor` root uses `meta.cid`, and the in-scope raw `<label>` / `<button>` violations were replaced with repository UI components. Remaining styling-interface, deep-region, observability, and a11y items still block closure.

Closure Audit Evidence:

- Pending.

Follow-up:

- None yet. Confirmed in-scope defects must be fixed before closure.

# 204 Renderer Workbench And Accessibility Closure

> Plan Status: completed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-deep-audit-full/09-renderer-contract.md`, `docs/analysis/2026-05-05-deep-audit-full/10-styling.md`, `docs/analysis/2026-05-05-deep-audit-full/18-cross-package.md`, `docs/analysis/2026-05-05-deep-audit-full/20-accessibility.md`, `docs/analysis/2026-05-05-deep-audit-full/12-field-slot.md`, `docs/analysis/2026-05-05-deep-audit-full/summary.md`
> Related: `docs/plans/195-accessibility-compliance-remediation-plan.md`, `docs/plans/198-renderer-and-workbench-surface-contract-closure-plan.md`

## Purpose

收口 05-05 retained renderer/workbench defects：host page authoring metadata、`designer-canvas` / `designer-palette` root contract、palette 样式归属、wrapped field 与 `FieldFrame<label>` 冲突，以及 retained a11y 缺口。

## Current Baseline

- `spreadsheet-page` / `report-designer-page` / `word-editor-page` 仍缺少最小 host page authoring metadata，shared tooling 会把它们降成 `instance-renderer`。
- report designer host projection 仍在 manifest / runtime / owner doc 三处漂移。
- `designer-canvas` / `designer-palette` 已注册为 live renderer，但组件本身不接 `RendererComponentProps`；`designer-field` 与多处 report root renderer 仍缺根契约透传。
- `word-editor-page` 的 `onBack` 仍丢失原始 click event。
- flow designer palette 仍依赖 playground 私有 gradient 样式，且当前 `id -> gradient` 映射覆盖不完整。
- `array-editor` / `key-value` / `detail-field` 仍在默认 `FieldFrame<label>` 壳层内放置次级按钮交互。
- `FieldFrame` 真实控件 ARIA 关联链未闭合，spreadsheet grid 缺少键盘模型，`designer-palette` 分组标题仍不能键盘切换，且其余 retained a11y 缺口仍存在。

## Goals

- 修复 retained host page / live renderer / styled workbench contract drift。
- 让 retained a11y defects 达到当前支持基线，并补 focused verification。

## Non-Goals

- 全仓 workbench shell 的 mixed-language text 清仓
- 全量 Flow Designer 视觉重做
- 已降级的 playground legacy CSS 全面迁移

## Scope

### In Scope

- `packages/spreadsheet-renderers/src/renderers.tsx`
- `packages/report-designer-renderers/src/renderers.tsx`
- `packages/report-designer-renderers/src/report-designer-manifest.ts`
- `packages/report-designer-renderers/src/host-data.ts`
- `docs/components/report-designer-page/design.md`
- `packages/word-editor-renderers/src/renderers.tsx`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/designer-palette.tsx`
- `packages/flow-designer-renderers/src/designer-field.tsx`
- `packages/report-designer-renderers/src/field-panel-renderer.tsx`
- `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- `packages/report-designer-renderers/src/report-designer-inspector.tsx`
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- `packages/flow-designer-renderers/src/dingflow/`
- `packages/flow-designer-renderers/src/designer-palette.tsx`
- `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-button.tsx`
- `packages/word-editor-renderers/src/panels/outline-panel.tsx`
- related tests and owner docs

### Out Of Scope

- playground legacy flow-designer CSS 的全面清理
- report / spreadsheet / word workbench 全量 i18n 文案收尾
- `table quick-edit` region 半成品规则

## Execution Plan

### Phase 1 - Host Renderer And Designer Root Contract Closure

Status: completed
Targets: host page renderers, `designer-page.tsx`, `index.tsx`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] `spreadsheet-page` / `report-designer-page` / `word-editor-page` 补齐最小 host page authoring metadata，至少包含 `rendererClass: 'domain-host-renderer'`。
- [x] [Fix] report designer host projection 在 manifest / runtime / owner doc 三处使用同一 vocabulary，不再漂移。
- [x] [Fix] `designer-canvas` / `designer-palette` live renderer 改为 `RendererComponentProps` 模式，并补齐 root meta passthrough。
- [x] [Fix] `designer-field`、report `field-panel` / `inspector-shell` / `inspector` / `toolbar` 根契约补齐 `meta` 透传；`word-editor-page onBack` 补 click event passthrough。
- [x] [Proof] focused tests：shared tooling 不再把上述 host page 解析成 `instance-renderer`；report host projection vocabulary 不再漂移；designer/report/word root contract 与 event passthrough 成立。

Exit Criteria:

- [x] host page / report host projection / renderer root contract drift 已闭合
- [x] focused verification 已覆盖 shared tooling classification、root passthrough 和 event passthrough
- [x] 若 live baseline 改变：相关 renderer/component docs 已更新；否则明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Palette Styling And Wrapped Field Contract Closure

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-palette.tsx`, related style entry, wrapped field files, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] flow designer palette 不再依赖 playground 私有 gradient 样式；`id -> appearance` 映射在 package 内闭合。
- [x] [Fix] `array-editor` / `key-value` / `detail-field` 不再在默认 `FieldFrame<label>` 壳层内放次级按钮交互。
- [x] [Proof] focused tests：palette 在 package-owned style 路径下工作；wrapped field contract conflict 不再复现。

Exit Criteria:

- [x] palette 样式归属与 wrapped field contract drift 已收敛
- [x] focused verification 已覆盖 retained styling / field-frame conflict defects
- [x] 若 live baseline 改变：相关 owner docs 已更新；否则明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Retained Accessibility Closure

Status: completed
Targets: `field-frame.tsx`, input renderer, `spreadsheet-grid.tsx`, `tree-controls.tsx`, dingflow entry controls, `sheet-tab-bar.tsx`, report toolbar switch, spreadsheet toolbar button, word outline panel, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] `FieldFrame` 将 `aria-describedby` / `aria-errormessage` / `id` 透传到真实焦点控件。
- [x] [Fix] spreadsheet grid 建立最小可用的键盘入口与选择/导航模型。
- [x] [Fix] `designer-palette` 分组标题改为键盘可操作的 disclosure / trigger 语义。
- [x] [Fix] tree-controls、dingflow controls、sheet tab close、report switch label、toolbar icon label、word outline toggle 等 retained a11y defects 全部收敛。
- [x] [Proof] focused DOM/e2e tests 覆盖 retained a11y failure modes。

Exit Criteria:

- [x] 所有 in-scope retained a11y defects 已修复
- [x] focused verification 已覆盖真实焦点控件、grid 键盘模型、palette trigger keyboard semantics 和 retained control semantics
- [x] 若 live baseline 改变：相关 renderer/component docs 已更新；否则明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Playground Legacy Flow Designer CSS Cleanup

- Classification: `watch-only residual`
- Why Not Blocking Closure: 05-05 已裁定其为示例层 legacy CSS 技术债，不是当前 retained critical package defect。
- Successor Required: no

## Non-Blocking Follow-ups

- mixed-language shell text 的剩余清理可在后续 i18n successor 中逐文件推进。

## Closure

Status Note: Plan 204 host renderer metadata, renderer root contracts, package-owned palette styling, wrapped-field conflicts, and retained accessibility defects are closed in the live repository. A fresh independent closure audit verified the scoped host metadata, report host vocabulary, root meta passthrough, and retained accessibility paths against live code/docs/tests with no remaining blocking findings, and the full workspace verification suite now passes.

Closure Audit Evidence:

- Reviewer / Agent: independent audit task `ses_209da0340ffeP56Z9YIhZgMrvo`
- Evidence: verified host-renderer metadata in `packages/spreadsheet-renderers/src/renderers.tsx`, `packages/report-designer-renderers/src/renderers.tsx`, `packages/word-editor-renderers/src/renderers.tsx`, and `packages/flow-designer-renderers/src/index.tsx`; root wrapper/meta passthrough in `packages/flow-designer-renderers/src/designer-page.tsx` and `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`; report host vocabulary alignment in `packages/report-designer-renderers/src/report-designer-manifest.ts`, `packages/report-designer-renderers/src/host-data.ts`, and `docs/components/report-designer-page/design.md`; retained accessibility closure in `packages/flux-react/src/field-frame.tsx`, `packages/flow-designer-renderers/src/designer-palette.tsx`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, and `packages/word-editor-renderers/src/word-editor-page.tsx`; no blocking findings remained and full `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` passed.

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>

# 220 Slot Contract, Host Manifest, And Accessibility Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-deep-audit-full/{12-field-slot.md,16-doc-code-consistency.md,18-cross-package.md,20-accessibility.md,summary.md}`
> Related: `docs/plans/204-renderer-workbench-and-accessibility-closure-plan.md`, `docs/plans/205-doc-boundary-and-test-hardening-closure-plan.md`, `docs/plans/209-renderer-definition-fields-only-convergence-plan.md`

## Purpose

收口 2026-05-18 深度审核中新确认的 slot contract、host manifest/runtime 契约漂移、owner-doc 基线漂移与 retained accessibility defects。完成态是：`array-field` 参数化 slot、flow/spreadsheet host contract、相关 architecture/reference docs，以及 report/spreadsheet/word-editor 的可访问性交互都与当前 live baseline 对齐，并有 focused verification 防止回归。

## Current Baseline

- `array-field` 的 `item` region 已声明 `params: ['index', 'value']`，但 live 渲染路径同时传入显式 `scope` 与 `bindings`，导致 `$slot.index` / `$slot.value` 在 item region 内不会稳定发布：`docs/analysis/2026-05-18-deep-audit-full/12-field-slot.md`。
- `docs/architecture/field-binding-and-renderer-contract.md`、`docs/architecture/action-scope-and-imports.md`、`docs/references/renderer-interfaces.md` 的部分“权威/当前基线”表述已与 live code 分叉：`docs/analysis/2026-05-18-deep-audit-full/16-doc-code-consistency.md`。
- `flow-designer` manifest 宣布的 projection 字段没有完整进入 runtime host scope，`spreadsheet` manifest 公开能力面也显著落后于 live namespace provider：`docs/analysis/2026-05-18-deep-audit-full/18-cross-package.md`。
- report field panel 仍把纯拖拽项暴露成无键盘激活路径的 faux button；spreadsheet resize handle 仍是 mouse-only 交互 separator；word-editor 多个 dialog 输入框仍缺少程序化标签：`docs/analysis/2026-05-18-deep-audit-full/20-accessibility.md`。
- `summary.md` 已把 `12-01`、`16-01/02/03`、`18-01/02`、`20-01/02/03` 标记为 retained must-fix items；`18-03` 与 `17-*` 已被明确驳回或降级，不应重新混入本计划。

## Goals

- 修复 `array-field` 参数化 item region 的 `$slot` 发布缺口，并补 focused regression coverage。
- 让 flow-designer / spreadsheet 的 manifest 与 live host publisher/provider 使用同一份真实契约面。
- 让 in-scope architecture/reference docs 与 live baseline 完整对齐，不再把旧接口或旧冻结集写成当前权威状态。
- 修复 retained report/spreadsheet/word-editor accessibility defects，并补 focused DOM/test coverage。

## Non-Goals

- 不处理 `18-03` 已裁定的 word-editor saved-document 语义取舍。
- 不重开 `11-ui-components` 与 `17-naming` 已驳回/零发现项。
- 不顺带收口 `summary.md` 中其余 retained runtime、validation、performance、test-hardening defects。
- 不进行 broader visual redesign、全仓 i18n 清理、或 generic manifest tooling 重写，除非它们是修复 in-scope defect 的最小必要条件。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- any focused tests needed for parameterized region `$slot` publication
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`
- `packages/spreadsheet-renderers/src/host-action-provider.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx` if manifest/provider alignment requires owner wiring changes
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/references/renderer-interfaces.md`
- `packages/report-designer-renderers/src/report-field-panel.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx`
- `packages/word-editor-renderers/src/toolbar/page-controls.tsx`
- related focused tests and `docs/logs/2026/05-18.md`

### Out Of Scope

- `summary.md` 中未列入本计划的其它 retained items
- `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts` 的 saved-document projection 语义调整
- repo-wide accessibility sweep beyond the three retained defects
- generalized audit automation beyond the in-scope focused tests/guards needed to hold these fixes

## Execution Plan

### Phase 1 - Freeze Contract Decisions And Slot Baseline

Status: planned
Targets: `array-field.tsx`, `render-nodes.tsx`, in-scope architecture/reference docs, focused tests

- Item Types: `Fix | Decision | Proof`

- [ ] [Decision] 冻结 `array-field` 参数化 item region 的 supported contract：`params: ['index', 'value']` 必须在 live path 中稳定发布 `$slot.index` / `$slot.value`，不得继续依赖“显式 `scope` + 隐式 owner payload”这种未文档化双语义。
- [ ] [Fix] 收敛 `array-field` item 渲染路径，使 parameterized region 在 owner 包装 scope 下仍获得稳定 `$slot` frame。
- [ ] [Proof] 新增 focused regression tests，覆盖 `${$slot.index}` / `${$slot.value}` 在 `array-field` item region 内的 live authoring path。
- [ ] [Fix] 同步 owner docs，仅保留最终 live slot contract；若 final baseline 改变了 `field-binding-and-renderer-contract.md` 的相关表达，一并更新。

Exit Criteria:

- [ ] `12-01` retained defect 已修复，`array-field` item region 的 `$slot.index/$slot.value` live 可用
- [ ] focused verification 已覆盖 parameterized item region 的 supported path
- [ ] 受影响 owner docs 已同步到 final live baseline，或明确写 `No owner-doc update required`
- [ ] `docs/logs/2026/05-18.md` 已更新

### Phase 2 - Host Manifest And Runtime Publication Closure

Status: planned
Targets: flow/spreadsheet host manifest & publisher/provider files, related tests/docs

- Item Types: `Fix | Decision | Proof`

- [ ] [Decision] 冻结 flow-designer host projection 的真实 published surface，决定是补齐 `buildDesignerScopeData()` 还是收窄 manifest；无论选择哪条路径，manifest 与 live host scope 必须回到单一真源。
- [ ] [Fix] 修复 `18-01`：让 flow-designer manifest 与 runtime host scope 对齐，覆盖 `doc.*` 与 `runtime.*` 中当前漂移字段。
- [ ] [Decision] 冻结 spreadsheet host capability 的真实公开方法面，决定以 manifest 补齐 provider，还是从单一 method contract 派生两侧定义。
- [ ] [Fix] 修复 `18-02`：让 spreadsheet manifest 与 `host-action-provider` 的 `listMethods()` 完整对齐。
- [ ] [Proof] 新增 focused tests，覆盖 manifest/runtime projection 与 capability surface 的 retained drift，不再只靠人工审计发现。

Exit Criteria:

- [ ] `18-01` 与 `18-02` retained contract drift 已收敛
- [ ] focused verification 已覆盖 flow/spreadsheet host manifest 与 live runtime publication/provider
- [ ] 若 live baseline 改变：相关 `docs/architecture/` / `docs/components/` 已更新；否则明确写 `No owner-doc update required`
- [ ] `docs/logs/2026/05-18.md` 已更新

### Phase 3 - Doc Baseline And Accessibility Closure

Status: planned
Targets: in-scope docs, report/spreadsheet/word accessibility files, focused tests

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] 收窄并修复 `16-01`：让 `field-binding-and-renderer-contract.md` 的 `Frozen Contract Matrix / Global META_FIELDS Frozen Set` 与 final live baseline 一致。
- [ ] [Fix] 修复 `16-02`：让 `action-scope-and-imports.md` 的 `ComponentHandleRegistry` / `ComponentTarget` 规范形状回到 live exported/runtime contract。
- [ ] [Fix] 修复 `16-03`：让 `renderer-interfaces.md` 的 `RendererResolvedProps` current typing baseline 回到当前导出类型。
- [ ] [Fix] 修复 `20-01`：report field panel 的条目语义与键盘行为闭合，不再保留 faux button。
- [ ] [Fix] 修复 `20-02`：spreadsheet resize handle 提供最小可访问交互路径，或改成诚实的非交互语义并提供等价可访问入口。
- [ ] [Fix] 修复 `20-03`：word-editor hyperlink / page setup / watermark dialogs 中的输入框具备稳定程序化标签。
- [ ] [Proof] 新增 focused DOM/tests，覆盖 retained accessibility 缺陷与 doc-contract drift 的关键行为。

Exit Criteria:

- [ ] `16-01`、`16-02`、`16-03`、`20-01`、`20-02`、`20-03` 均已收口
- [ ] focused verification 已覆盖 in-scope docs baseline 与 retained accessibility paths
- [ ] in-scope architecture/reference docs 已同步到 final live baseline
- [ ] `docs/logs/2026/05-18.md` 已更新

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛
- [ ] `12-01`、`16-01/02/03`、`18-01/02`、`20-01/02/03` 全部达到最终行为/契约结果
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Word Editor Saved-Document Projection Semantics

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `18-03` 已在本轮独立复核中裁定为当前已文档化语义取舍，而不是 manifest/runtime 漂移；它不属于本计划的 must-fix 集合。
- Successor Required: no

## Non-Blocking Follow-ups

- 如 Phase 2 证明 manifest/provider drift 适合后续抽成 shared host-contract generation guard，可在本计划关闭后单独立 successor plan，但不得阻塞本计划内 retained defects 的直接修复。

## Closure

Status Note: <<完成或关闭时填写：为什么这份计划可以关闭>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>

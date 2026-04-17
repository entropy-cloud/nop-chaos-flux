# 12 表单字段与 Slot 建模

- Task ID: `ses_268b25019ffe0h9fiZL3cMdylq`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- **审计验证日期**: 2026-04-17

# 维度12：表单字段与 Slot 建模审计

- 自动化/抽检已覆盖且本次未见偏差：
  - `packages/flux-runtime/src/schema-compiler/tables.ts` 与 `packages/flux-renderers-data/src/table-renderer.tsx` 的 `table.columns[*]` 深层 region 提取/消费
  - `packages/flux-runtime/src/schema-compiler/tables.ts` 与 `packages/flux-renderers-basic/src/tabs.tsx` 的 `tabs.items[*]` 深层 region 提取/消费
  - `packages/flux-react/src/render-nodes.tsx` / `packages/flux-react/src/frame-slot-meta.test.tsx` 的 `resolveRendererSlotContent`、`frameWrap` 基础行为

## 审计验证与修正摘要

| 渲染器 | 原始违规类别 | 验证结果 | 修正状态 |
|--------|-------------|---------|---------|
| input-tree | slot | **已确认** | **已修正** |
| tree-select | slot | **已确认** | **已修正** |
| tag-list | field-frame | **已确认** | 保留（需重构） |
| key-value | field-frame | **已确认** | 保留（需重构） |
| array-editor | field-frame | **已确认** | 保留（需重构） |
| condition-builder | field-frame | **已确认** | **已修正** |
| object-field | field-frame | **已确认** | 保留（需重构） |
| array-field | field-frame | **已确认** | 保留（需重构） |
| variant-field | field-frame | **已确认** | 保留（需重构） |
| variant-field | deep-region | **已确认** | 保留（需深层 region 提取架构） |
| detail-field | field-frame | **已确认** | 保留（需重构） |
| detail-view | field-frame | **误报** | 不需要修正 |
| code-editor | event | **已确认** | **已修正** |

## 已修正的违规项

### [维度12] 渲染器名: input-tree — **已修正**
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
  - **严重程度**: P1
  - **违规类别**: slot
  - **原状**: 渲染器已声明 `wrap: true`，但组件内部输出 `data-slot="field-error"` / `data-slot="field-hint"`，与 FieldFrame 的保留 slot 冲突，导致表单验证错误重复显示。
  - **修正**: 移除了组件内的 `field-error`/`field-hint` 保留 slot 输出。表单验证错误/验证中状态改由 FieldFrame 统一处理。源数据加载状态（`optionsSourceState`）改用渲染器自有 slot 名称 `input-tree-source-error` / `input-tree-source-loading`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: tree-select — **已修正**
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
  - **严重程度**: P1
  - **违规类别**: slot
  - **原状**: 与 `input-tree` 相同，已启用 `wrap: true`，但渲染器内部输出 `field-error` / `field-hint` slot。
  - **修正**: 同 input-tree 处理方式。表单验证状态交给 FieldFrame，源数据状态使用 `tree-select-source-error` / `tree-select-source-loading`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: condition-builder — **已修正**
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx`
  - **严重程度**: P1
  - **违规类别**: field-frame
  - **原状**: 定义显式声明 `wrap: true`，但 embed 模式和 PickerModeContent 内部仍手动渲染 `FieldLabel` / `FieldHint` 及字段状态 data 属性，与 FieldFrame 产生重复。
  - **修正**: 从 embed 模式和 PickerModeContent 中移除了 `FieldLabel`、`FieldHint`、`data-field-*` 属性及 `presentation.className`。组件仅渲染控制体（ConditionGroup / Popover），字段 chrome 交给 FieldFrame。PickerModeContent 不再接收 `labelContent` 和 `presentation` 参数。移除了不再使用的 `resolveFieldLabelContent`、`useFieldPresentation`、`FieldLabel`、`FieldHint`、`cn` 导入。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: code-editor — **已修正**
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-code-editor/src/types.ts:45-47`
  - **严重程度**: P2
  - **违规类别**: event
  - **原状**: `onChange` / `onFocus` / `onBlur` 在 schema 类型里声明为 `string`，但对应 `RendererDefinition.fields` 把它们建模为 `event`，类型与实际使用不一致。
  - **修正**: 将 `onChange`/`onFocus`/`onBlur` 类型从 `string` 改为 `ActionSchema | ActionSchema[]`，与 `BaseSchema.onMount` 的类型模式保持一致。
  - **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`

## 已确认但暂不修正的违规项（需要专门重构）

### [维度12] 渲染器名: tag-list
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx:66-114,119-122`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 表单字段渲染器，但未接入 `FieldFrame`，而是在组件内手动渲染 `FieldLabel` / `FieldHint`；定义中未声明 `wrap: true`，实例级 `frameWrap` 无法生效。
  - **建议**: 改造成 wrap-compatible 字段渲染器，仅保留 control body，把 label/hint/error 交给 `NodeFrameWrapper -> FieldFrame`。
  - **保留原因**: 需要重构组件结构，属于独立的架构改进任务。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: key-value
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:340-392,397-400`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 渲染器手动输出 `FieldLabel` / `FieldHint`，未通过 `FieldFrame` 统一管理字段 chrome。
  - **建议**: 控件自身只渲染 key-value 编辑 body；字段外框、标签、错误、提示改由 `FieldFrame` 负责。
  - **保留原因**: 复合控件含嵌套子字段，重构需仔细处理子字段验证和作用域传递。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: array-editor
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:246-299,304-307`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 渲染器自行渲染 `FieldLabel` / `FieldHint`，未走 `FieldFrame` 包装链路。
  - **建议**: 将字段 chrome 下沉到 `FieldFrame`；组件只保留数组项编辑和子项错误展示。
  - **保留原因**: 同 key-value，复合控件需要专门重构。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: object-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:107-161,166-170`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `label` 通过 metadata 正确建模为 `value-or-region`，`body` 也正确走 region，但最终字段 chrome 仍由渲染器内的 `FieldLabel` / `FieldHint` 手动管理，未接入 `FieldFrame`。
  - **建议**: 保留 `body` 的 content slot 处理，字段标签/提示/错误改由 `FieldFrame` 统一渲染。
  - **保留原因**: 复合字段管理子 FormRuntime/ScopeContext，重构需验证作用域隔离。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: array-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:156-359,364-368`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `item` content slot 建模正常，但字段级 label/hint/error 仍由渲染器手动输出，未接入 `FieldFrame`，实例级 `frameWrap` 也无法统一控制。
  - **建议**: 仅保留 `item` region 和数组项控制逻辑；字段外层 chrome 交由 `FieldFrame`。
  - **保留原因**: 重复模板项与子 FormRuntime 代理逻辑复杂，重构需专门处理。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: variant-field (field-frame)
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:253-304`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 字段级 label/error/hint 仍由渲染器内 `FieldLabel` / `FieldHint` 手工管理，未通过 `FieldFrame` 统一接线。
  - **建议**: 将 variant selector/body 与 field chrome 分离；字段 chrome 交给 `FieldFrame`。
  - **保留原因**: 与下方 deep-region 问题需一并处理。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: variant-field (deep-region)
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:71-72,167-168,201-204,226-229,244-246,281-289`
  - **严重程度**: P1
  - **违规类别**: deep-region
  - **现状**: `variants` 被标记为 `ignored`，渲染器随后直接读取 `schema.variants[*].content/viewer` 并通过 `props.helpers.render(...)` 渲染原始 schema；这绕过了编译期的 field metadata 归一化，也没有为嵌套 slot 生成稳定 region key。
  - **建议**: 为 `variants[*].content` / `viewer` 增加 renderer-owned 深层 region 提取规则（类似 table/tabs 的 `...RegionKey` 模式），让组件消费标准化后的 `regions`/handle，而不是直接读原始 schema。
  - **保留原因**: 需要实现新的深层 region 提取架构，属于独立的架构改进任务。
  - **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/field-frame.md`

### [维度12] 渲染器名: detail-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:165-217,222-226`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `viewer` / `content` slot 通过 `resolveRendererSlotContent` 读取是正确的，但字段级 `label` / `error` 仍由渲染器自身管理，未统一进入 `FieldFrame`。
  - **建议**: 保留 viewer/content 作为 content slot；字段标签、提示、错误、`frameWrap` 交由 `FieldFrame`。
  - **保留原因**: detail-field 管理临时 draft form 和 surface（dialog/drawer），重构需验证 draft form 生命周期不受影响。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

## 误报项

### [维度12] 渲染器名: detail-view — **误报**
- **field metadata 完整性**: N/A
- **原报告违规类别**: field-frame
- **原报告内容**: `viewer` / `content` slot 解析位置正确，但字段级 `label` 仍由组件内 `FieldLabel` 直接渲染，且定义未接入 `wrap: true`。
- **误报原因**: `detail-view` 是容器型渲染器（`validation: { kind: 'container' }`），不是表单字段。它使用 `scopePath` 而非 `name` 进行作用域映射，不参与表单字段验证。其 `FieldLabel` 是区块标题而非字段标签。对容器应用 FieldFrame 包装会引入不合适的表单字段语义（touched/dirty/invalid 追踪、验证错误显示）。因此不应要求 `detail-view` 接入 FieldFrame。
- **参考文档**: `docs/architecture/field-frame.md`

## 未发现需要报告的问题的渲染器

- `page`, `container`, `fragment`, `loop`, `recurse`, `text`, `button`, `dialog`, `drawer`, `tabs`
- `table`, `chart`, `tree`
- `form`, `input-text`, `input-email`, `input-password`, `select`, `textarea`, `checkbox`, `switch`, `radio-group`, `checkbox-group`
- `report-inspector-shell`, `report-inspector`, `report-field-panel`, `report-designer-page`, `report-toolbar`, `spreadsheet-page`

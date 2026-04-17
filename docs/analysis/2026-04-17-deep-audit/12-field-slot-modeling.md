# 12 表单字段与 Slot 建模

- Task ID: `ses_268b25019ffe0h9fiZL3cMdylq`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 维度12：表单字段与 Slot 建模审计

- 自动化/抽检已覆盖且本次未见偏差：
  - `packages/flux-runtime/src/schema-compiler/tables.ts` 与 `packages/flux-renderers-data/src/table-renderer.tsx` 的 `table.columns[*]` 深层 region 提取/消费
  - `packages/flux-runtime/src/schema-compiler/tables.ts` 与 `packages/flux-renderers-basic/src/tabs.tsx` 的 `tabs.items[*]` 深层 region 提取/消费
  - `packages/flux-react/src/render-nodes.tsx` / `packages/flux-react/src/frame-slot-meta.test.tsx` 的 `resolveRendererSlotContent`、`frameWrap` 基础行为

## 主要违规项

### [维度12] 渲染器名: input-tree
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx:148-152,240-246`
  - **严重程度**: P1
  - **违规类别**: slot
  - **现状**: 渲染器已声明 `wrap: true`，但组件内部仍直接输出 `data-slot="field-error"` / `data-slot="field-hint"`；这些 field slot 按契约应由 `FieldFrame` 统一拥有，当前把控件内部加载/错误状态混入了 field chrome。
  - **建议**: 改为渲染器自有 slot 名称，或把该状态提升为由 `FieldFrame` 消费的统一输入；不要在 wrap-compatible 渲染器内再次输出保留的 field slot。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: tree-select
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx:231-235,248-253`
  - **严重程度**: P1
  - **违规类别**: slot
  - **现状**: 与 `input-tree` 相同，已启用 `wrap: true`，但渲染器内部仍输出 `field-error` / `field-hint` slot，破坏 field slot 与 content slot 的来源隔离。
  - **建议**: 由 `FieldFrame` 统一承接 field error/hint；控件内部状态改用专有 slot/marker。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: tag-list
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tag-list.tsx:66-114,119-122`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 这是表单字段渲染器，但未接入 `FieldFrame`，而是在组件内手动渲染 `FieldLabel` / `FieldHint`；同时定义中未声明 `wrap: true`，实例级 `frameWrap` 无法生效。
  - **建议**: 改造成 wrap-compatible 字段渲染器，仅保留 control body，把 label/hint/error 交给 `NodeFrameWrapper -> FieldFrame`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: key-value
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:340-392,397-400`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 渲染器手动输出 `FieldLabel` / `FieldHint`，未通过 `FieldFrame` 统一管理字段 chrome；这使 `frameWrap`、label/hint/error 的统一入口缺失。
  - **建议**: 控件自身只渲染 key-value 编辑 body；字段外框、标签、错误、提示改由 `FieldFrame` 负责。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: array-editor
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:246-299,304-307`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 渲染器自行渲染 `FieldLabel` / `FieldHint`，未走 `FieldFrame` 包装链路。
  - **建议**: 将字段 chrome 下沉到 `FieldFrame`；组件只保留数组项编辑和子项错误展示。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: condition-builder
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\ConditionBuilder.tsx:140-165,191-238,242-263`
  - **严重程度**: P1
  - **违规类别**: field-frame
  - **现状**: 定义里显式声明了 `wrap: true`，但组件内部仍手动渲染 `FieldLabel` / `FieldHint`；这会与 `NodeFrameWrapper -> FieldFrame` 的统一 field chrome 发生重复/冲突。
  - **建议**: 二选一：要么完全交给 `FieldFrame`，要么取消 `wrap: true` 并明确自管字段 chrome；按当前架构应优先前者。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: object-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:107-161,166-170`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `label` 通过 metadata 正确建模为 `value-or-region`，`body` 也正确走 region，但最终字段 chrome 仍由渲染器内的 `FieldLabel` / `FieldHint` 手动管理，未接入 `FieldFrame`。
  - **建议**: 保留 `body` 的 content slot 处理，字段标签/提示/错误改由 `FieldFrame` 统一渲染。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: array-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:156-359,364-368`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `item` content slot 建模正常，但字段级 label/hint/error 仍由渲染器手动输出，未接入 `FieldFrame`，实例级 `frameWrap` 也无法统一控制。
  - **建议**: 仅保留 `item` region 和数组项控制逻辑；字段外层 chrome 交由 `FieldFrame`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: variant-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:253-304`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: 字段级 label/error/hint 仍由渲染器内 `FieldLabel` / `FieldHint` 手工管理，未通过 `FieldFrame` 统一接线。
  - **建议**: 将 variant selector/body 与 field chrome 分离；字段 chrome 交给 `FieldFrame`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:71-72,167-168,201-204,226-229,244-246,281-289`
  - **严重程度**: P1
  - **违规类别**: deep-region
  - **现状**: `variants` 被标记为 `ignored`，渲染器随后直接读取 `schema.variants[*].content/viewer` 并通过 `props.helpers.render(...)` 渲染原始 schema；这绕过了编译期的 field metadata 归一化，也没有为嵌套 slot 生成稳定 region key。
  - **建议**: 为 `variants[*].content` / `viewer` 增加 renderer-owned 深层 region 提取规则（类似 table/tabs 的 `...RegionKey` 模式），让组件消费标准化后的 `regions`/handle，而不是直接读原始 schema。
  - **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/field-frame.md`

### [维度12] 渲染器名: detail-field
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:165-217,222-226`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `viewer` / `content` slot 通过 `resolveRendererSlotContent` 读取是正确的，但字段级 `label` / `error` 仍由渲染器自身管理，未统一进入 `FieldFrame`。
  - **建议**: 保留 viewer/content 作为 content slot；字段标签、提示、错误、`frameWrap` 交由 `FieldFrame`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: detail-view
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:37-38,229-270,276-282`
  - **严重程度**: P2
  - **违规类别**: field-frame
  - **现状**: `viewer` / `content` slot 解析位置正确，但字段级 `label` 仍由组件内 `FieldLabel` 直接渲染，且定义未接入 `wrap: true`；`FieldFrame` 无法统一接管 label/hint/error，也无法按实例处理 `frameWrap`。
  - **建议**: 将 detail-view 作为 wrap-compatible 字段渲染器处理；viewer/content 保持 content slot，field chrome 改由 `FieldFrame`。
  - **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度12] 渲染器名: code-editor
- **field metadata 完整性**: 部分
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\types.ts:45-47`
  - **严重程度**: P2
  - **违规类别**: event
  - **现状**: `onChange` / `onFocus` / `onBlur` 在 schema 类型里被声明为 `string`，但对应 `RendererDefinition.fields` 已把它们建模为 `event`；这会把事件字段误导成普通 JSON 值，而不是 declarative action schema。
  - **建议**: 将这几个字段改为 `ActionSchema | ActionSchema[]`（或项目统一的事件 action 类型），保持 schema 类型与 `event` field rule 一致。
  - **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`

## 未发现需要报告的问题的渲染器

- `page`, `container`, `fragment`, `loop`, `recurse`, `text`, `button`, `dialog`, `drawer`, `tabs`
- `table`, `chart`, `tree`
- `form`, `input-text`, `input-email`, `input-password`, `select`, `textarea`, `checkbox`, `switch`, `radio-group`, `checkbox-group`
- `report-inspector-shell`, `report-inspector`, `report-field-panel`, `report-designer-page`, `report-toolbar`, `spreadsheet-page`

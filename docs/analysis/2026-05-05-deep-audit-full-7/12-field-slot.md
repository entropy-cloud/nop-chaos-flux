# 维度 12：表单字段与 Slot 建模

## 第1轮初审

### [维度12] `table` 的 RendererDefinition 仍把部分 slot/deep-region 语义藏在全局默认规则里

- **文件**: `packages/flux-renderers-data/src/data-renderer-definitions.ts`, `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-compiler/src/schema-compiler/fields.ts`
- **严重程度**: P2
- **违规类别**: field-rule
- **现状**: `columns/header/footer` 等实际字段语义仍依赖 `DEFAULT_FIELD_RULES` 隐式兜底。
- **建议**: 在 `table` 自身 `fields` 中显式补齐。

### [维度12] 多个高级表单字段把语义 action slot 继续声明为 `prop`

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/*`
- **严重程度**: P2
- **违规类别**: event
- **现状**: `detectVariantAction/transformInAction/transformOutAction/validateValueAction` 被当作普通 prop。
- **建议**: 为 owner semantic action slot 建立统一 event-like/action-slot 归类。

### [维度12] `table.columns[].quickEdit.body` 的 deep region extraction 仍是半接线状态

- **文件**: `packages/flux-compiler/src/schema-compiler/tables.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`
- **严重程度**: P3
- **违规类别**: deep-region
- **现状**: 编译器生成 `quickEditBodyRegionKey`，renderer 仅做存在性判定，未形成完整消费链。
- **建议**: 完整消费该 compiled key，或删除当前提取规则。

### [维度12] `array-field` 仍会落入默认 `FieldFrame<label>` 包裹，同时内部放置次级操作按钮

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- **严重程度**: P1
- **违规类别**: field-frame
- **建议**: 为 `array-field` 提供 `rootTag="div"` 或等价非 label 包裹路径。

## 深挖第2轮追加

### [维度12] `tree-select` / `input-tree` 仍会落入默认 `FieldFrame<label>` 包裹，同时内部放置 `Button`

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- **严重程度**: P1
- **违规类别**: field-frame
- **建议**: 为 `input-tree` / `tree-select` 走 `rootTag="div"` 例外路径。

### [维度12] `condition-builder` 仍会落入默认 `FieldFrame<label>` 包裹，同时内部使用 `Button` 作为 picker trigger

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`
- **严重程度**: P1
- **违规类别**: field-frame
- **建议**: 为 `condition-builder` 提供非 label 包裹路径。

## 深挖第3轮追加

### [维度12] `table` 虚拟滚动空态分支丢弃了已归一化的 `empty` slot 内容

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:160-162`, `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:257-272`
- **严重程度**: P1
- **违规类别**: slot
- **现状**: 虚拟空态分支直接输出空字符串，绕过 `emptyContent`。
- **建议**: 统一渲染 `emptyContent`。

### [维度12] `table.columns[].label` 的 deep region 在响应式展开行路径未被消费

- **文件**: `packages/flux-compiler/src/schema-compiler/tables.ts:9-10`, `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:88-94`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:300-323`
- **严重程度**: P2
- **违规类别**: deep-region
- **现状**: header 路径会消费 `labelRegionKey`，响应式展开路径仍只读 `column.label` / `column.name`。
- **建议**: 响应式展开路径也优先消费 `labelRegionKey`。

## 深挖统计

- 第1轮发现数：4
- 第2轮新增：2
- 第3轮新增：2

## 维度复核结论

- 初审与深挖共 8 项，独立复核后保留 4 项、降级 3 项、驳回 1 项。
- 复核后优先保留的是真实 deep-region 消费链缺口和默认 `FieldFrame<label>` 包裹下嵌入交互控件的问题。

## 子项复核结论

- `[维度12] table 的 RendererDefinition 仍把部分 slot/deep-region 语义藏在全局默认规则里`: 降级。更偏显式性不足，因为 `header/footer/columns` 当前走的是框架级通用兜底，不算 `table` 独有漏建模。
- `[维度12] 多个高级表单字段把语义 action slot 继续声明为 prop`: 驳回。这些字段本质是动作 schema 值，被 `actionAdapter` / `helpers.dispatch` 直接消费，不属于 event/slot 误分类。
- `[维度12] table.columns[].quickEdit.body 的 deep region extraction 仍是半接线状态`: 保留。编译器已产出 `quickEditBodyRegionKey`，但 renderer 实际只渲染 `config.body`，消费链没接完。
- `[维度12] array-field 仍会落入默认 FieldFrame<label> 包裹，同时内部放置次级操作按钮`: 保留。交互控件嵌入 `label` 包裹不合适。
- `[维度12] tree-select / input-tree 仍会落入默认 FieldFrame<label> 包裹，同时内部放置 Button`: 保留。内部存在 `Button` / popover trigger，问题成立。
- `[维度12] condition-builder 仍会落入默认 FieldFrame<label> 包裹，同时内部使用 Button 作为 picker trigger`: 降级。`label` 包裹风险成立，但当前文件中可直接确认的按钮场景主要在 picker 模式，原表述略泛化。
- `[维度12] table 虚拟滚动空态分支丢弃了已归一化的 empty slot 内容`: 降级。虚拟分支确实没用 `emptyContent`，但按当前 `virtualEnabled` 判定，正常无数据空表通常不会进入该分支。
- `[维度12] table.columns[].label 的 deep region 在响应式展开行路径未被消费`: 保留。header 路径会消费 `labelRegionKey`，响应式展开路径仍只读 `column.label/name`。

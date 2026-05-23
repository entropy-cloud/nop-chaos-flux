# 09 Renderer Contract

- 深挖轮次: 3
- 深挖发现数: 11
- 维度复核: 8 保留 / 2 降级 / 1 驳回
- 子项复核: 无单独高风险追加成立项

## 第 1 轮初审

- `input` 文本类与 `textarea` 未透传 `props.meta.className`
- `input-number` 根节点未合并 `props.meta.className`
- `TextRenderer` 输出 `nop-text`

## 深挖第 2 轮追加

- `tabs` `onChange` 首参传 `null`
- `condition-builder` picker 模式读取 `schema.className` 绕过 `props.meta.className`
- `input-tree` / `tree-select` 根节点未合并 `props.meta.className`
- `tree-controls` key 仅 `valueKey:depth`

## 深挖第 3 轮追加

- `ArrayFieldRenderer` 根节点未合并 `props.meta.className`
- `ObjectFieldRenderer` 根节点未合并 `props.meta.className`
- `DetailFieldRenderer` 本地控件根未透传 meta 入口
- `DesignerFieldRenderer` 未消费 `props.meta.disabled`

## 维度复核结论

保留:

- 文本类 input / textarea 缺 `meta.className`
- `input-number` 缺 `meta.className`
- `condition-builder` picker 绕过 `props.meta.className`
- `input-tree` / `tree-select` 缺 `meta.className`
- `DesignerFieldRenderer` 未消费 `meta.disabled`

降级:

- `tabs` `onChange` 首参 `null`
- `tree-controls` key 不稳定
- `array/object/detail` 的 meta 透传问题需按 frame-root vs control-root 细化

驳回:

- `TextRenderer` 的 `nop-text` root marker

## 最终保留项

### [维度09] 多个字段型 renderer 仍遗漏 `props.meta.className`

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`
- **严重程度**: P1
- **现状**: 文本类输入、textarea、input-number、input-tree/tree-select 以及 condition-builder picker 模式都仍存在 `meta.className` 落点缺失或绕过 resolved meta 的情况
- **风险**: runtime-resolved className/classAliases 无法稳定命中控件根节点，破坏 renderer customization contract
- **建议**: 统一所有字段 renderer 的 control-root className 落点
- **复核状态**: 维度复核通过

### [维度09] `DesignerFieldRenderer` 仍未消费 `props.meta.disabled`

- **文件**: `packages/flow-designer-renderers/src/designer-field.tsx`
- **严重程度**: P1
- **现状**: 输入、文本域、下拉分支都未把 `meta.disabled` 传给 UI 控件
- **风险**: renderer contract 的控制态在设计器字段中失效，禁用时仍可编辑
- **建议**: 将 `meta.disabled` 统一接到 `Input` / `Textarea` / `Select`
- **复核状态**: 维度复核通过

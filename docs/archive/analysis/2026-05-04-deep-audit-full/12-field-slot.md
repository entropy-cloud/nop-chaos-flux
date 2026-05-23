# 维度 12：表单字段与 Slot 建模

- 初审发现：3
- 维度复核：完成
- 子项复核：2

## 保留

1. [子项复核通过] 公开 schema typings 仍把 `label/title` 写成 `string`，但 live metadata/runtime 已把它们当作 `value-or-region`。
   文件：`packages/flux-core/src/types/schema.ts:19-25`、`packages/flux-renderers-basic/src/schemas.ts:8-10,23-25,36-38`、`packages/flux-compiler/src/schema-compiler.ts:250-274`
   严重程度：P2

2. [子项复核通过] 一批 `wrap: true` 字段 renderer 在已经进入 `FieldFrame` owner 后，仍重复输出 `data-slot="field-control"` 与外层 identity 标记。
   文件：`packages/flux-react/src/field-frame.tsx:151-193`、`packages/flux-renderers-form-advanced/src/tag-list.tsx:72-77,115-118`、`key-value.tsx:335-340,382-385`、`array-editor.tsx:257-263,305-308`、`composite-field/object-field.tsx:377-383,393-396`、`composite-field/array-field.tsx:348-354,390-393`
   严重程度：P2

## 驳回

1. [已驳回] `report-inspector.body` 作为 prop-based schema carrier 属于当前已接受建模，不再保留为 live contract mismatch。

## 复核摘要

- `label/title` 问题已经越过“中间态”门槛，因为 owner docs、compiler、renderer metadata 三方都已把 `value-or-region` 作为 live baseline。

# 维度 12：表单字段与 Slot 建模

- 初审发现：3
- 维度复核：完成
- 子项复核：建议继续围绕 code-editor label authoring 与 host page raw schema 回退展开

## 保留

1. [维度复核通过] `flow-designer-renderers/src/designer-page.tsx` 只声明了 `toolbar/inspector/dialogs` 为 regions，却仍回退读取 `props.props.inspector/dialogs`。
2. [维度复核通过] `report-designer-renderers/src/page-renderer.tsx` 只声明了 `toolbar/fieldPanel/inspector/dialogs/body` 为 regions，却仍读取 `props.props.toolbar/fieldPanel/inspector`。

## 降级

1. [已降级] `flux-code-editor` 的问题不是“FieldFrame 完全没 label 通道”，而是当前实现没有兑现组件文档里 `label: value-or-region` 的契约。

## 复核摘要

- 保留：2
- 降级：1
- 驳回：0

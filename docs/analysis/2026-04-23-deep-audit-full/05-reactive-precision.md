# 维度 05：响应式订阅精度

- 初审发现：6
- 维度复核：完成
- 子项复核：1 组（`useCurrentFormState`）

## 保留

1. [维度复核通过] `report-designer-renderers` 中多个组件直接 `useOwnScopeSelector((data) => data)` 订阅整份 own scope，实际只需要少量字段。
文件：`report-designer-inspector.tsx`、`field-panel-renderer.tsx`、`inspector-shell-renderer.tsx`、`report-designer-toolbar.tsx`

2. [维度复核通过] `flow-designer-renderers` 中 `DesignerToolbarContent`、`DefaultInspector` 直接订阅整份 `DesignerSnapshot`。

3. [维度复核通过] `flow-designer-renderers/src/designer-page.tsx` 的 `DesignerPageBody` 也在用整份 designer snapshot，属于更上游的宽订阅点。

## 降级

1. [已降级] `useCurrentFormState` 本身是广播订阅没错，但整体不宜直接定性为 P7 硬违规；更准确地说，它形成了广义性能债务，其中 `useFieldPresentation()` 这条链路已经最接近/碰到 P7 要求边界。

## 复核摘要

- 保留：4
- 降级：1
- 驳回：0

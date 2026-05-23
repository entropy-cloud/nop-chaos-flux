# 05 响应式订阅精度

## 复核结论

- 保留: 2
- 降级: 1
- 驳回: 0

## 保留

### `useFieldPresentation()` 走 whole-store broadcast

- 文件: `packages/flux-renderers-form/src/field-utils.tsx`
- 结论: 保留，P1
- 依据: `useCurrentFormState(...)` 未提供 `path`，最终走 `store.subscribe(listener)`；这是 per-field presentation hook，却在表单级广播上唤醒。

### `FieldFrame` 动态 required 计算走 whole-store broadcast

- 文件: `packages/flux-react/src/field-frame.tsx`
- 结论: 保留，P2
- 依据: 动态 required selector 读取 `state.values` 且未提供 `path`，激活时同样走 `store.subscribe(listener)`。

## 已降级

### host-scope publication 粒度偏粗

- 文件: `packages/flow-designer-renderers/src/designer-context.ts`, `packages/report-designer-renderers/src/host-data.ts`
- 结论: 已降级
- 依据: 这是跨多个 workbench host 的 publication precision 问题，但尚未确认到必须立即重构的 hot-path bug。

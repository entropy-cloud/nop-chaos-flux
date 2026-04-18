# 维度15：安全与性能红线

- 审核日期：2026-04-17
- 初审发现：2
- 维度复核结论：保留 2，补充 3

## 安全

- 未发现通过独立复核的高置信度安全红线问题。

## 性能

### [维度15-01] `FieldFrame` 聚合错误读取违反 P7 per-path 订阅红线

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/hooks.ts`, `docs/architecture/performance-design-requirements.md`

### [维度15-02] `useFieldPresentation` 仍在单字段展示态上走 whole-form broadcast

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-react/src/form-state.ts`, `docs/architecture/performance-design-requirements.md`

### [维度15-03] `DynamicRenderer` 的 async effect 未使用 `AbortController`

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-basic/src/dynamic-renderer.tsx`, `packages/flux-runtime/src/request-runtime.ts`

### [维度15-04] `stopWhen` 求值失败被静默吞掉，可能导致持续轮询

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-runtime/src/data-source-runtime.ts`

### [维度15-05] playground `FlowDesignerCanvas` 渲染每条边时双 `find`

- 严重程度：P2
- 复核判定：保留
- 文件：`apps/playground/src/flow-designer/FlowDesignerCanvas.tsx`

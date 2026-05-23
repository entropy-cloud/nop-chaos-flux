# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05] NodeRenderer 中 getNodeResolution 选择器未缓存

- **文件**: `packages/flux-react/src/node-renderer.tsx:94-130`
- **严重程度**: P2
- **订阅位置**: `NodeRendererResolved` 内 `useSyncExternalStoreWithSelector`
- **订阅范围**: 订阅 scope store，通过 dependency-tracking 过滤
- **实际需要**: 只在相关 scope paths 变更时重算 meta + resolvedProps
- **重渲染频率**: 每次 store 变更时 selector 都执行，但 equality fn 做引用比较阻止多余重渲染
- **建议**: selector 执行成本存在但在大量节点场景中可通过 equality fn 短路

### [维度05] useFormErrorStoreSelector 中 selector 依赖 args 对象闭包

- **文件**: `packages/flux-react/src/hooks.ts:262-264`
- **严重程度**: P2
- **订阅位置**: `useFormErrorStoreSelector` 内部
- **订阅范围**: form store per-path
- **实际需要**: 目标 path 的 fieldStates
- **重渲染频率**: args 变更时 selector 被重建，但不会多余重渲染
- **建议**: useCallback 依赖 args 对象导致每次 render 都重建，但影响有限

### [维度05] useTableFilter 中 selector 每次创建新 Set 对象

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts:18-53`
- **严重程度**: P2
- **订阅范围**: scope store 全量广播
- **实际需要**: filterStatePath 下的数据
- **重渲染频率**: 每次 scope 变更执行 selector，equality fn 阻断多余重渲染
- **建议**: selector 创建成本（多个 Set），但 equality 阻断了多余重渲染

### [维度05] DialogHost getSnapshot 每次渲染创建新闭包

- **文件**: `packages/flux-react/src/dialog-host.tsx:44-50`
- **严重程度**: P3
- **重渲染频率**: sameSurfaces equality fn 按 identity 比较，实际安全

### [维度05] useSurfaceScopeSnapshot 完整订阅 scope store

- **文件**: `packages/flux-react/src/dialog-host-surface.tsx:50-73`
- **严重程度**: P3
- **重渲染频率**: 无 paths 参数时全 scope 订阅，但 readVisible 返回 identity-stable 快照

### [维度05] useTableSelection selector 每次创建新 Set

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:27-41`
- **严重程度**: P3
- **重渲染频率**: equality fn 做元素级比较，不会多余重渲染

### [维度05] useScopeSelector getSnapshot 调用 scope.readVisible()

- **文件**: `packages/flux-react/src/hooks.ts:108-113`
- **严重程度**: P3
- **重渲染频率**: 仅在 subscribe 触发时调用，selector + equality 提供二次保护

### [维度05] ScopeDebugRenderer JSON.stringify 全量序列化

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:54`
- **严重程度**: P3
- **重渲染频率**: 调试渲染器，不在生产路径上

---

## 正向确认（无问题）

- **P7 per-path subscription 已普遍落地**：所有 `useCurrentFormState` 调用都正确传了 path/paths
- **Context Provider 值稳定**：NodeRendererProviders、SurfaceScopeProviders 使用 useMemo
- **NodeRenderer dependency-tracking 有效**
- **useFormFieldController 使用 per-path 订阅**
- **FieldFrame dynamicRequired 使用 paths 选项**
- **useSurfaceRenderer summary 使用 ref 缓存**

## 总结

| 严重程度 | 数量 |
| -------- | ---- |
| P0       | 0    |
| P1       | 0    |
| P2       | 3    |
| P3       | 5    |

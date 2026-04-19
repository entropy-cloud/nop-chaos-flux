# 维度05：响应式订阅精度 — 初审报告

**审核日期**: 2026-04-18
**审核范围**: flux-core、flux-formula、flux-runtime、flux-react

---

## 发现清单

### [维度05-1] useSurfaceScopeSnapshot 订阅完整 scope 快照导致 DialogView/DrawerView 不必要重渲染

- **文件**: `packages/flux-react/src/dialog-host-surface.tsx:47-55`
- **严重程度**: P2
- **订阅位置**: `useSurfaceScopeSnapshot` 被 DialogView、DrawerView 调用
- **订阅范围**: 完整的 `scope.readVisible()` 全量可见数据
- **实际需要**: DialogView/DrawerView 自身不消费任何 scope 数据字段，内容通过 NodeRenderer 精确订阅
- **重渲染频率**: 父级 scope 中任意字段变更都触发重渲染。表单场景中每个字段值变更都会导致所有打开的对话框重渲染
- **建议**: 评估移除 `useSurfaceScopeSnapshot`，或改为静默订阅不触发 React 重渲染

### [维度05-2] DialogHost subscribe/getSnapshot/selector 均为内联不稳定引用

- **文件**: `packages/flux-react/src/dialog-host.tsx:30-36`
- **严重程度**: P3
- **订阅位置**: DialogHost 组件内 useSyncExternalStoreWithSelector
- **订阅范围**: surfaceRuntime.store 的 entries 数组
- **实际需要**: 仅需监听 surface entries 变化
- **重渲染频率**: `sameSurfaces` equality 函数阻止了实质重渲染，但每次 render 的 selector 调用和快照比较是不必要开销
- **建议**: 通过 useMemo/useCallback 稳定化

### [维度05-3] useOwnScopeSelector 的 getSnapshot 未 memo 化

- **文件**: `packages/flux-react/src/hooks.ts:166`
- **严重程度**: P3
- **说明**: 与维度15发现4重复，此处不重复展开

### [维度05-4] NodeRendererResolved 中 getNodeResolution selector 和 equality 函数均为内联

- **文件**: `packages/flux-react/src/node-renderer.tsx:73-76, 97-106`
- **严重程度**: P3
- **订阅位置**: NodeRendererResolved 组件内 useSyncExternalStoreWithSelector
- **订阅范围**: 通过 scopeChangeHitsDependencies 过滤的精确 scope 变更
- **实际需要**: 仅当 meta 或 resolvedProps 引用变化时重渲染
- **重渲染频率**: 被 memo() 包裹且 props 稳定，非订阅触发的渲染极少，实际影响有限
- **建议**: 考虑提取为 useCallback，在节点数量大时减少 GC 压力

### [维度05-5] renderSurfaceNode 每次调用创建不稳定的 options 对象

- **文件**: `packages/flux-react/src/dialog-host-surface.tsx:83-91`
- **严重程度**: P3
- **建议**: 若05-1被修复，此问题影响将大幅降低

### [维度05-6] useScopeSelector 订阅全量 scope 变更无路径过滤

- **文件**: `packages/flux-react/src/hooks.ts:137-153`
- **严重程度**: P2（设计限制）
- **订阅范围**: store?.subscribe — 转发自身和所有父级 scope 变更
- **实际需要**: 调用方 selector 实际访问的 scope 路径
- **重渲染频率**: 单次字段变更产生 O(M) 次 selector 调用（M = 订阅者数量）
- **建议**: 作为未来优化方向，利用 ScopeChange.paths 在 listener 层做前置剪枝

---

## 积极发现

- NodeRenderer 的 subscribe 通过 scopeChangeHitsDependencies 实现了精确依赖过滤
- useCurrentFormFieldState 使用 subscribeToPath 实现路径级订阅
- 所有 Context provider 的 value 均通过 useMemo 稳定化
- NodeRenderer 和 NodeRendererResolved 均使用 memo() 包裹

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| 05-1: useSurfaceScopeSnapshot | 保留降级P3 | **降级P4**（readVisible缓存+Object.is有效防止多余重渲染） | P4 |
| 05-2: DialogHost 内联引用 | **驳回** | — | — |
| 05-3: getSnapshot 未memo | 降级P4 | — | P4（与Dim15-4合并） |
| 05-4: NodeRenderer selector内联 | **驳回** | — | — |
| 05-5: renderSurfaceNode options | 降级P4 | — | P4（从属于05-1） |
| 05-6: useScopeSelector 无路径过滤 | 保留P2 | **成立P2** | P2 |

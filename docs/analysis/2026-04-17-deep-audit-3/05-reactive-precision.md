# 维度 05：响应式订阅精度

## 发现清单

### [维度05-01] WordEditorPage runtimeSnapshot 选择器返回新对象引用

- **文件**: `packages/word-editor-renderers/src/WordEditorPage.tsx:70-87`
- **严重程度**: P2
- **订阅位置**: `useSyncExternalStoreWithSelector` 调用
- **订阅范围**: 整个 `editorStore` 状态，选择器每次返回新对象
- **实际需要**: 组件实际依赖的 8 个字段值变化
- **重渲染频率**: 每次 store 任意更新触发重渲染
- **建议**: 添加浅比较 equalityFn
- **复核状态**: 保留

### [维度05-05] LoopProvider/RecurseProvider renderBody 函数引用不稳定

- **文件**: `packages/flux-renderers-basic/src/loop.tsx:18-28`
- **严重程度**: P2
- **订阅位置**: `StructuralLoopContext.Provider value={contextValue}`
- **问题描述**: `contextValue` 的 useMemo 依赖包含内联 `renderBody` 函数
- **重渲染频率**: 父组件每次渲染都导致 context value 变化
- **建议**: 将 renderBody 提升到组件级别并 memoize

---

## P3 级发现

### [维度05-02] ScopeDebugRenderer 调用 stringifyDebugValue

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:53`
- **严重程度**: P3
- **说明**: 调试专用组件，可接受当前行为

### [维度05-03] useCurrentFormModelGeneration 全量订阅

- **文件**: `packages/flux-react/src/hooks.ts:384-390`
- **严重程度**: P3
- **说明**: 实际重计算消耗低，ROI 较低

### [维度05-06] useDesignerHostScope scopeData 对象

- **文件**: `packages/flow-designer-renderers/src/designer-context.ts:134-142`
- **严重程度**: P3
- **说明**: `buildDesignerScopeData` 是轻量级映射

---

## 符合 P7 要求的实现

### per-path subscription 正确实现

- **文件**: `packages/flux-react/src/hooks.ts:228-276`
- `useCurrentFormFieldState` 正确使用 `store.subscribeToPath(path, listener)`
- `useFieldError` 同样使用 `subscribeToPath`
- `form-store.ts:121-134` 正确实现了 `subscribeToPath` 和 `pathListeners` Map

### NodeRenderer 路径命中检测

- **文件**: `packages/flux-react/src/node-renderer.tsx:77-106`
- 静态节点完全跳过订阅
- 动态节点使用 `scopeChangeHitsDependencies` 进行路径命中检测
- 只有依赖路径变化时才触发重渲染

### DialogHost 数组比较

- **文件**: `packages/flux-react/src/dialog-host.tsx:14-24`
- 历史问题已修复，使用 `sameSurfaces` 函数进行引用相等和元素逐一比较

---

## 总结

| 严重程度 | 数量 |
| -------- | ---- |
| P0       | 0    |
| P1       | 0    |
| P2       | 2    |
| P3       | 3    |
| 符合要求 | 4    |

**核心结论**：per-path subscription (P7) 已正确实现，主要改进点是 WordEditorPage 的选择器和 Loop/Recurse 的函数引用稳定性。

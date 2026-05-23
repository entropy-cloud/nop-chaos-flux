# [维度05] 响应式订阅精度 — 初审报告

## 发现清单

### [维度05-01] useOwnScopeSelector getSnapshot 未 memoize

- **文件**: `packages/flux-react/src/hooks.ts:154`
- **严重程度**: P2
- **订阅位置**: `useOwnScopeSelector` 的 `getSnapshot` 定义
- **订阅范围**: 当前 scope 的 own 数据快照
- **实际需要**: scope.readOwn() 的返回值
- **重渲染频率**: 每次 render 重新调用 getSnapshot
- **建议**: 用 useMemo 包装 getSnapshot（与 useScopeSelector 第 133 行一致）

### [维度05-02] useCurrentFormState 使用全量 store 广播订阅

- **文件**: `packages/flux-react/src/hooks.ts:176-177`
- **严重程度**: P1（架构级已知缺口）
- **订阅位置**: `useCurrentFormState` 的 subscribe
- **订阅范围**: form.store.subscribe（Zustand 全量广播）
- **实际需要**: 仅 state.values 中特定路径
- **重渲染频率**: 1000 字段表单中单次按键 → 最多 1000 次 selector 执行
- **建议**: form-store 层面增加 value-path 级别变更通知

### [维度05-03] useBoundFieldValue 双路径订阅，总是浪费一个分支

- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:75-86`
- **严重程度**: P2
- **订阅范围**: 同时订阅 form store 全量和 scope 全量，根据 currentForm 存在只使用一个
- **建议**: 拆分为条件路径

### [维度05-04] 复合表单渲染器自行实现双路径读取

- **文件**: object-field.tsx:93-98, variant-field.tsx:75-80, detail-field.tsx:40-48
- **严重程度**: P2
- **建议**: 统一到 useBoundFieldValue 或提取共用 helper

### [维度05-05] 复合表单渲染器 selector 每次创建新派生数组

- **文件**: key-value.tsx:212-231, array-editor.tsx:147-162, array-field.tsx:155-170, ConditionBuilder.tsx:54-61
- **严重程度**: P2
- **现状**: toArrayItems()/toKeyValuePairs()/toGroupValue() 每次创建新数组，equality 函数做深度比较
- **建议**: 随 per-value-path 订阅一起解决

### [维度05-06] Report designer 四个渲染器订阅完整 own-scope

- **文件**: inspector-shell-renderer.tsx:19, report-designer-inspector.tsx:22, report-designer-toolbar.tsx:12, field-panel-renderer.tsx:10
- **严重程度**: P3
- **建议**: 拆分为细粒度 selector

### [维度05-07] ScopeDebugRenderer 全量 JSON.stringify

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:53`
- **严重程度**: P3
- **建议**: 调试专用，可加 DEV 保护

### [维度05-08] useSurfaceScopeSnapshot 订阅完整 visible scope

- **文件**: `packages/flux-react/src/dialog-host-surface.tsx:47-55`
- **严重程度**: P3
- **建议**: 明确用途，考虑更轻量订阅

### [维度05-09] useTableSelection selector 每次创建新 Set

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts:94-107`
- **严重程度**: P3
- **建议**: 实际影响取决于 scope 变更频率

### [维度05-10] useFieldPresentation 全量订阅

- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:244-265`
- **严重程度**: P2
- **建议**: 随 per-value-path 订阅一起解决

## 已收敛的领域

1. NodeRenderer 订阅精度 — 已使用 scopeChangeHitsDependencies 路径级过滤
2. Field-state hooks — 已使用 per-path subscribeToPath
3. Context Provider value 稳定性 — 均使用 useMemo
4. React.memo 使用 — NodeRenderer 已 memo 包装

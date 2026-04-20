# 维度05：响应式订阅精度

## 审核日期: 2026-04-20

## 发现清单（经初审+维度复核+子项复核）

### [P1→P2] useFieldPresentation 订阅完整表单 store

- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:230-251`
- **严重程度**: P2（维度复核+子项复核确认降级）
- **订阅位置**: useFieldPresentation → useCurrentFormState → form.store.subscribe
- **订阅范围**: 完整 FormStoreState，selector 读取 state.values（用于 isFieldEffectivelyRequired）和 state.fieldStates
- **实际需要**: 特定路径的 fieldState + requiredWhen/requiredUnless 规则引用的值路径
- **重渲染频率**: equalityFn（11 属性逐字段比较）正确阻止不相关字段变化引起的重渲染。但 O(n) selector 唤醒仍存在。
- **缓解因素**: setValue 不调用 notifyPath，无法用 subscribeToPath 替代读取 values 的场景
- **建议**: 当前 equalityFn 有效，P7 per-path subscription 的完全实现需要 store 层先支持值路径通知

### [P1→P2] useBoundFieldValue 订阅完整表单 store

- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:58-71`
- **严重程度**: P2
- **订阅位置**: useBoundFieldValue → useCurrentFormState
- **订阅范围**: 完整 FormStoreState，selector 仅 `getIn(state.values, name)`
- **实际需要**: 单个字段路径 `state.values[name]`
- **重渲染频率**: Object.is 对原始值完全有效。对 object/array 值有次优可能。
- **建议**: 同上，P7 的完全实现依赖 store 值路径通知

### [P1→P2] FieldFrame dynamicRequired 订阅完整表单状态

- **文件**: `packages/flux-react/src/field-frame.tsx:64-71`
- **严重程度**: P2
- **订阅位置**: FieldFrame → useCurrentFormState
- **订阅范围**: 完整 FormStoreState（读取 state.values 用于 isFieldEffectivelyRequired）
- **实际需要**: requiredWhen/requiredUnless 规则引用的特定值路径
- **重渲染频率**: 仅对有动态必填规则的字段激活（`enabled: hasDynamicRequiredRule`），绝大多数字段无订阅开销。结果为 boolean，Object.is 完全精确。
- **建议**: conditional enablement 已大幅限制影响面

### [P2→P3] report-designer inspector-shell 恒等选择器

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:19`
- **严重程度**: P3（子项复核降级）
- **现状**: `useOwnScopeSelector((data) => data)` 恒等选择器。组件使用多个 scope 属性。createScopeOwnSubscribe 有引用守卫。
- **建议**: 单实例设计器组件，引用守卫防止 noop 重渲染。P3 优化机会。

### [P2→P3] report-designer toolbar 恒等选择器

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:12`
- **严重程度**: P3（子项复核降级）
- **现状**: 工具栏需要动态访问 scope 用于 evalTextTemplate/evalBooleanExpr。
- **建议**: 单实例，引用守卫有效。P3。

### [P2→P3] report-designer inspector + field-panel 恒等选择器

- **文件**: `report-designer-inspector.tsx:22`, `field-panel-renderer.tsx:10`
- **严重程度**: P3（子项复核降级）
- **现状**: 可改为精确选择器但组件轻量且单实例。
- **建议**: 最佳优化候选——改为 `(data) => data.selectionTarget` 即可。

### [驳回] useSurfaceScopeSnapshot 恒等选择器

- **排除理由**: 设计意图。Surface hook 返回值被忽略，目的是驱动子树重渲染。是"全量脏标记"模式。

### [驳回] useFieldPresentation 新闭包

- **排除理由**: useSyncExternalStoreWithSelector 不依赖 selector 引用稳定性。内联闭包不影响正确性。

## 统计

| 严重程度 | 数量 |
|---------|------|
| P2 | 3 |
| P3 | 3 |
| 驳回 | 2 |

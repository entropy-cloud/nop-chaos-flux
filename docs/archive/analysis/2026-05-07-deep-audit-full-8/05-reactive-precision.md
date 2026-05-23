# 维度 05: 响应式订阅精度

## 深挖轮次

- 第 1 轮: `useScopeSelector` 无 path 订阅；DialogHost/surface 订阅候选。
- 第 2 轮: `useOwnScopeSelector`, non-form field binding, data renderers, `useDataSourceStatus`, modelGeneration, surface renderer。
- 第 3 轮: flow/spreadsheet/report/debugger full snapshot subscriptions。
- 第 4 轮: flow toolbar selector identity, inspector doc counts, word ribbon candidate。
- 第 5 轮: array-field non-form scope subscription 等补充。

## 维度复核结论

### 保留

- `useScopeSelector` 底层 full scope subscribe，无 path-level subscription: `packages/flux-react/src/hooks.ts:96-123`。
- `useOwnScopeSelector` full own snapshot subscribe: `packages/flux-react/src/hooks.ts:132-146`, `hook-subscriptions.ts:127-147`。
- non-form field binding 只读单 path 但 full scope 唤醒: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:53-57`。
- data renderers 多个 scope-owned 状态拆成多次 full scope subscribe: `packages/flux-renderers-data/src/crud-renderer-state.ts:220-270` 及 table hooks。
- `useDataSourceStatus` 只读 status path 但 full scope subscribe: `packages/flux-react/src/hooks.ts:401-415`。
- `useCurrentFormModelGeneration` 订阅 full form store 只读 `form.modelGeneration`: `packages/flux-react/src/hooks.ts:491-497`。
- `useSurfaceRenderer` 为单 surface open/summary 订阅 full surface store，保留但 severity 降级。
- flow designer canvas/page full snapshot 与 host projection 粗粒度，保留但需与 host boundary 分阶段处理。
- flow toolbar selector 返回新对象且未传 equalityFn: `packages/flow-designer-renderers/src/designer-toolbar.tsx:111-119`。
- flow inspector 订阅 full doc 只取 counts: `packages/flow-designer-renderers/src/designer-inspector.tsx:24-29`。
- spreadsheet page/interactions full snapshot 与 report page double full snapshot 保留为 host bridge 粗粒度问题。
- debugger panel full snapshot 保留但降级为 devtool hot path。

### 降级/驳回

- DialogHost 原“full surface scope”表述降级/驳回: live code 使用 entries slice + equality，surface content scope subscription 属 host boundary。
- word ribbon “full store”驳回: live selector 订阅 `state.selection`，不是整个 editor store。

## 最终保留项

1. 为 scope selector hooks 增加 path/dependency-aware subscription 能力。
2. 为 form model generation 提供专用 subscription channel。
3. 收窄 flow/report/spreadsheet/debugger host snapshot 消费，先修 selector identity 明确缺陷。

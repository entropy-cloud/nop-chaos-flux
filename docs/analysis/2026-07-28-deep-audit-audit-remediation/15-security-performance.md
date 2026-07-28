# Dimension 15: Security & Performance Red Lines

## 第 1 轮（初审）

### 安全违规

#### [D15-S1a] use-select-remote-search.ts — 冗余 cancelled + AbortController 双取消

- **文件**: packages/flux-renderers-form/src/renderers/use-select-remote-search.ts:34-88
- **严重程度**: P2
- **类别**: 安全（异步生命周期管理）
- **规则编号**: P5
- **现状**: 使用裸 `let cancelled = false` flag 和 `AbortController`。P5 要求两者都必须使用 signal.aborted，而不是单独的 boolean。
- **风险**: 分歧的取消状态——如果 `controller.abort()` 在 `cancelled` flag 被读取前触发错误路径，两个守卫必须一致。
- **建议**: 移除以 `cancelled` boolean，仅使用 `signal.aborted`。

#### [D15-S1b] tree-control-controllers.ts — 相同的冗余双取消模式

- **文件**: packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:107-153
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: P5
- **现状**: 与 S1a 相同的模式：裸 `cancelled` flag 和 `AbortController`。
- **风险**: 同上。
- **建议**: 移除以 `cancelled` boolean。

#### [D15-S1c] value-input.tsx — 裸 boolean，完全无 AbortController

- **文件**: packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:174-192
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: P5
- **现状**: 无 AbortController。effect 调用 `evaluateFormula(formulaStr)` 并使用裸 boolean 守卫陈旧结果。
- **风险**: 无法取消 inflight promise。裸 boolean 违反 P5 的明确禁止。
- **建议**: 添加 AbortController。

#### [D15-S1d] use-dict-options.ts — 裸 boolean，无 AbortController

- **文件**: packages/flux-renderers-form/src/renderers/use-dict-options.ts:23-46
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: P5
- **现状**: 无 AbortController。
- **风险**: 卸载/dep 变更时无法取消字典加载。
- **建议**: 添加 AbortController。

#### [D15-S1e] crud-renderer-state.ts — 裸 boolean，dispatch 无 AbortController

- **文件**: packages/flux-renderers-data/src/crud-renderer-state.ts:608-672
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: P5
- **现状**: 裸 `cancelled` boolean。`loadReaction.dispatch()` 可能接受但未传递 signal。
- **风险**: Inflight 请求无法通过 store/scope 生命周期取消。
- **建议**: 传递 AbortSignal。

#### [D15-S1f] markdown.tsx — 裸 boolean，fetch 无 AbortController

- **文件**: packages/flux-renderers-content/src/markdown.tsx:35-56
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: P5
- **现状**: `fetch()` 原生支持 `AbortSignal` 但未创建或传递。
- **风险**: Inflight HTTP 请求在卸载后继续。
- **建议**: 创建并传递 AbortSignal。

### 性能违规

#### [D15-P1] node-renderer-resolved.tsx JSON.stringify(instancePath) 每次渲染 — 热路径

- **文件**: packages/flux-react/src/node-renderer-resolved.tsx:74-77
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P1
- **现状**: `useMemo(() => JSON.stringify(instancePath ?? []), [instancePath])`。`instancePath` 每次渲染产生新数组引用，使 React 依赖检查始终失败。`JSON.stringify` 每次渲染都运行。
- **风险**: 渲染树中每个节点支付 `JSON.stringify` 成本。在大表单或页面中累加显著每次渲染开销。
- **建议**: 使用相等比较工具替代 stringify，或在上游稳定引用。

#### [D15-P2] dynamic-renderer.tsx JSON.stringify(loadAction) 作为缓存键

- **文件**: packages/flux-renderers-basic/src/dynamic-renderer.tsx:35-45
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P1
- **现状**: `JSON.stringify(loadAction)` 转换整个 action schema 以创建缓存键。`loadAction` 可能大且嵌套深。
- **风险**: 每次 `loadAction` 变化时（schema 变化），完整 action schema 被序列化。对于复杂 schemas 可能代价高。
- **建议**: 使用识别字段的子集或哈希，而非完整 stringify。

#### [D15-P4] 8x React.memo 无 'use no memo'（React Compiler 下冗余）

- **文件**: 多个（combo-renderer.tsx、array-field.tsx、input-table-renderer.tsx、table-body-row-rendering.tsx、diff-header.tsx、diff-line.tsx、diff-hunk.tsx、ding-flow-edge.tsx）
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: React Compiler 自动记忆化
- **现状**: 这些组件使用手写 `React.memo` 且文件中无 `'use no memo'` 或 `eslint-disable react-compiler/react-compiler` 注释。
- **风险**: 无。编译器已自动 memoize。手写 memo 冗余但无害。
- **建议**: 可作为代码风格收敛移除，非高优先级。

#### [D15-P5] kanban-helpers.ts Object.assign 原位突变（破坏引用同一性）

- **文件**: packages/flux-renderers-scheduling/src/kanban/kanban-helpers.ts:100-103
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P3
- **现状**: `cloneBoard` 后用 `Object.assign(card.data, partial.data)` 原位突变克隆上的 `card.data`。返回的板中 `card.data` 引用在突变前后相同，破坏了变更检测。
- **风险**: 如果下游代码在 `card.data` 上使用 `===`，将错过变更。
- **建议**: 替换为 `card.data = { ...card.data, ...partial.data }`。

#### [D15-P7] hook-subscriptions.ts 回退到全 store subscribe（无路径级别警告）

- **文件**: packages/flux-react/src/hook-subscriptions.ts:155, 179, 247
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P7
- **现状**: 代码正确优先用 `subscribeToPath`，但回退到全 store `subscribe`。如果 store 实现不暴露 `subscribeToPath`，字段级 hook 回退到全 store 订阅。
- **风险**: 在大表单中每次按键触发 O(n) 唤醒。
- **建议**: 当回退到全 subscribe 时添加 `console.warn`，以便检测缺少 `subscribeToPath` 委派的投影 store。

#### [D15-P6] 任何包中无 performance.mark/measure

- **文件**: 所有包
- **严重程度**: P6（信息性）
- **类别**: 可观察性
- **规则编号**: P6
- **现状**: 搜索 `performance.mark` 和 `performance.measure` 返回零结果。
- **风险**: 生产性能回归诊断需手动 profiling 工具。
- **建议**: 至少在关键生命周期边界添加标记：渲染开始/结束、表单初始化、CRUD 加载、验证管道。

## 维度复核结论

- [D15-S1a 至 S1f]: 保留 P2。都是真实的性能设计需求违规，但路径非关键（这些是 dimension 06 已经覆盖的发现，此处仅从安全性角度保留）。
- [D15-P1]: 保留 P1。热路径 JSON.stringify 是真实性能问题。
- [D15-P2]: 保留 P1。每次 schema 变化的 JSON.stringify 是真实性能开销。
- [D15-P4]: 保留 P3。冗余的 React.memo，编译器已处理。
- [D15-P5]: 保留 P3。原位突变破坏引用同一性。
- [D15-P7]: 保留 P3。缺少 subscribeToPath 回退警告。
- [D15-P6]: 保留 P6。信息性，可观察性改进。

## 最终保留项

| 编号   | 严重程度 | 文件                                                                  | 一句话摘要                            |
| ------ | -------- | --------------------------------------------------------------------- | ------------------------------------- |
| 15-P1  | P1       | `flux-react/src/node-renderer-resolved.tsx:74-77`                     | 热路径 JSON.stringify(instancePath)   |
| 15-P2  | P1       | `flux-renderers-basic/src/dynamic-renderer.tsx:35-45`                 | JSON.stringify(loadAction) 作为缓存键 |
| 15-S1a | P2       | `flux-renderers-form/src/renderers/use-select-remote-search.ts:34-88` | 冗余 cancelled + AbortController      |
| 15-S1b | P2       | `form-advanced/src/tree-control-controllers.ts:107-153`               | 冗余 cancelled + AbortController      |
| 15-S1c | P2       | `form-advanced/src/condition-builder/value-input.tsx:174-192`         | 裸 boolean，无 AbortController        |
| 15-S1d | P2       | `flux-renderers-form/src/renderers/use-dict-options.ts:23-46`         | 裸 boolean，无 AbortController        |
| 15-S1e | P2       | `flux-renderers-data/src/crud-renderer-state.ts:608-672`              | 裸 boolean，无 AbortController        |
| 15-S1f | P2       | `flux-renderers-content/src/markdown.tsx:35-56`                       | fetch 无 AbortController              |

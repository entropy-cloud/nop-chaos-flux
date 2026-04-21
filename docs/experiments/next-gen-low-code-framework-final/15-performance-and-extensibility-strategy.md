# 15 Performance And Extensibility Strategy

## 1. 目标

本文不是泛泛谈“要高性能、高扩展性”，而是明确：

1. 热点在哪里。
2. 每个热点如何控成本。
3. 扩展点如何开放，同时不污染 core。

## 2. 性能目标

新框架的性能目标分三层：

### P0

1. transaction publish 顺序确定
2. 旧 async 结果不覆盖新结果
3. row identity 稳定

### P1

1. 大表格局部编辑不触发全表重渲染
2. 大多数 value/reaction/resource invalidation 保持 root-targeted
3. validation 支持 subtree / leaf closure

### P2

1. windowing 场景下不创建完整 offscreen child scope
2. debugger 不污染热路径

## 3. 热点清单

### 3.1 编译期热点

1. canonical traversal
2. value / formula compile
3. validation graph compile
4. source-map emit

### 3.2 运行期热点

1. path parse / path write
2. transaction collapse
3. dependency invalidation
4. node contract resolution
5. row scope reuse
6. validation materialization
7. resource/result mapping

## 4. 关键性能决策

### 4.1 Path parse cache

固定选择：

1. 全局 LRU / strong map path cache
2. 所有热路径 API 以 parsed segments 为主

### 4.2 Structural sharing

固定选择：

1. 自定义 path-based copy helpers
2. array mutation 专用算法

不选择：

1. deep clone baseline
2. generic diff library on every write

### 4.3 Invalidation indexes

固定选择：

1. root index
2. exact path index
3. collection-shape index

### 4.4 Row scope cache

```ts
interface RowScopeCacheEntry {
  rowKey: string;
  scopeId: string;
  snapshotVersion: number;
  lastAccessAt: number;
}
```

规则：

1. row cache 按 `rowKey` 索引
2. windowing 可驱逐旧 row scope
3. reorder 不重建同一 `rowKey`
4. eviction 使用 LRU + maxEntries 双约束

四元组：

1. key: `ownerId + rowKey`
2. populate: 首次 materialize row scope
3. invalidate: row remove / owner dispose / itemKey change
4. eviction: `maxEntries` 或 LRU 过期

### 4.5 Node resolution cache

固定选择：

1. cache key = `templateNodeId + instancePath + publishSeq + scopeVersionSubset`
2. props/meta/region resolution 分开缓存

其中 `scopeVersionSubset` 的来源固定为：

1. 编译期静态依赖标注
2. runtime node-resolution collector 收集到的 scope read roots
3. 两者合并后映射到当前 publish 时刻的 scope/root version tuple

四元组：

1. key: `templateNodeId + normalizedInstancePath + scopeVersionSubset`
2. populate: 首次 resolve 或 cache miss
3. invalidate: 依赖到的 scope/root version 变化
4. eviction: size bound + least-recently-used

### 4.6 Validation materialization cache

固定选择：

1. owner-local cache
2. path-scoped invalidation
3. branch switch / array remap 显式失效

四元组：

1. key: `ownerId + path + modelGeneration`
2. populate: 首次 materialize rule set / effective requiredness
3. invalidate: dependent path change / branch switch / array remap / overlay change / model refresh
4. eviction: owner-local bounded map

### 4.7 Debug data retention

固定选择：

1. ring buffer retention
2. summary-first snapshot

不选择：

1. 无上限全量事件保留

四元组：

1. key: `debugChannel + ownerId`
2. populate: transaction settle / admission / failure emit
3. invalidate: never by default, only overwritten by retention
4. eviction: fixed ring size

## 5. 大表格策略

这是性能关键场景。

固定策略：

1. row identity 与值地址分离
2. inline 编辑默认 leaf closure validation
3. aggregate-heavy rule 不在每次 keystroke 执行 owner-wide validateAll
4. staged 行编辑优先用 row draft owner
5. table view 必须支持 virtualization

最小验收场景：

1. 1000 行对象数组，编辑一行 leaf field，不允许 1000 行全部重算 node contract。
2. reorder 一行后，同 `rowKey` 的 row scope cache 命中率应接近 100%。

## 6. 异步性能策略

1. owner/lane/epoch 定位 authoritative run
2. timeout/retry 是 lane policy，而不是调用点临时拼接
3. stale-dropped 不再做二次 publish
4. resource/result mapping 只在 authoritative settle 后执行

## 7. 扩展性原则

### 7.1 扩展点必须有物理 owner

可扩展的点：

1. renderer definition
2. capability provider
3. host contract
4. compiler plugin
5. validation rule registry

不可扩展的点：

1. transaction phases
2. RuntimeFailureKind 主分类
3. capability 单出口原则
4. `ExecutionPackage` 基本骨架

### 7.2 Facade-first

UI 层、host 层、plugin 层都先通过 facade 访问 runtime。

禁止：

1. 朋友式 import kernel 内部模块
2. renderer 自己直接改 owner state

### 7.3 Contract versioning

每个扩展面必须带版本：

1. renderer contract version
2. host contract version
3. capability contract version
4. plugin API version

版本不兼容处理：

1. core contract mismatch -> reject-fast
2. optional plugin mismatch -> degraded mode if manifest allows
3. 所有降级都必须进入 diagnostics

## 8. 插件策略

### 8.1 Compiler plugin

允许：

1. authoring normalize extensions
2. custom lowering helpers
3. diagnostics

不允许：

1. 引入 nondeterministic emit
2. 绕过 package hash canonicalization

### 8.2 Runtime capability plugin

允许：

1. 注册新的 capability namespace
2. 暴露新的 host-targeted command family

不允许：

1. 绕过 capability resolver 直写 store

### 8.3 Renderer plugin

允许：

1. 注册新 renderer metadata
2. 注册新 React host adapter bindings

不允许：

1. 重新定义 `ResolvedNodeContract`

## 9. 兼容与演化策略

1. primitive closure 稳定后，不再新增第八 primitive
2. owner family 可以新增，但必须落在 `kernel-owners`
3. 新 field family 先证明不是 `object/variant/array/detail` 的组合变体
4. 新 async 类型优先映射到已有 lane / failure taxonomy，而不是再造调度系统

## 10. 当前实现可复用的高价值点

1. `useSyncExternalStore` 订阅模式
2. form store 的 per-path subscription 思路
3. data-source 的结构共享意识
4. async governance 的 stale-dropped 诊断思路
5. validation compiled model 的平坦结构

## 11. 当前实现需要替换的性能关键点

1. runtime 总装过大，导致热路径边界不够清楚
2. React host 过早拥有 runtime create/dispose 生命周期
3. resource/reaction/validation 各自带一部分调度逻辑
4. `FormRuntime` 在实现重心上仍是中心对象，owner substrate 还没完全独立出来

## 12. 性能验收指标建议

实验阶段至少监控：

1. `tx_count_per_interaction`
2. `writes_collapsed_per_tx`
3. `avg_invalidated_subscribers_per_tx`
4. `row_scope_cache_hit_rate`
5. `validation_materialization_cache_hit_rate`
6. `stale_drop_count_per_lane`
7. `resolved_node_cache_hit_rate`
8. `avg_publish_scopes_per_tx`
9. `async_authoritative_drop_rate`

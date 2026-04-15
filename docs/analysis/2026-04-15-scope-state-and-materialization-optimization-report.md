# 2026-04-15 Scope State And Materialization Optimization Report

## 1. Purpose

本文分析 Flux 当前 `ScopeRef` / `EvalContext.materialize()` / row scope 路径的性能与内存取舍，回答以下问题：

- 如果暂时不考虑已发布 API 兼容，`ScopeRef` 是否应该重构为更激进的 prototype-chain / single-state 方案。
- `read()` 与 `readOwn()` 是否应统一到底层一个 scope state，而不是继续维护“own snapshot + merged view”双心智。
- 哪些路径应该继续保留 whole-object materialize，哪些路径应该明确迁移到 path-based 访问。
- 在“最小化内存消耗、最大化热路径性能”目标下，当前最优的改造方向是什么。

本文是分析报告，不直接修改 architecture owner docs。当前 normative baseline 仍以：

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`

为准。

## 2. Current Baseline

当前 `ScopeRef` 实现在 `packages/flux-runtime/src/scope.ts`。

### 2.1 实际数据模型

当前模型本质上有三层：

1. own snapshot
2. lexical parent chain
3. 按需物化的 merged snapshot

其中：

- `readOwn()` 直接返回 own store snapshot
- `get(path)` / `has(path)` 按 root shadowing + parent recursion 读取
- `read()` 在非 isolated child scope 上通过 `{ ...parent.read(), ...own }` 做缓存后的物化

所以当前不是“每个 scope 永远维护两份状态副本”，而是：

- 一份真实 own state
- 一份按需缓存的 merged view

### 2.2 热路径分裂

当前仓库里的热路径已经出现明显分裂：

- path-based 读取主路径：`scope.get(path)` / `scope.has(path)`
- whole-object 路径：`scope.read()` / `EvalContext.materialize()`

`docs/architecture/flux-core.md` 已明确把前者当成首选热路径，把 `read()` 定位为“whole-object materialization is truly needed” 时的 fallback。

### 2.3 真实调用面

当前代码中：

- `readOwn()` 主要用于 owner-local state、form submit payload、selector snapshot、draft/subform payload、fragment own patch 同步等路径。
- `read()` 主要用于：
  - action evaluation overlay：`packages/flux-runtime/src/action-runtime-core.ts`
  - form import binding overlay：`packages/flux-renderers-form/src/renderers/form.tsx`
  - request includeScope `'*'`：`packages/flux-runtime/src/request-runtime.ts`
  - status projection wrapper：`packages/flux-runtime/src/status-owner.ts`
  - formula `EvalContext.materialize()`：`packages/flux-formula/src/evaluate.ts`, `packages/flux-formula/src/scope.ts`
  - debugger / playground scope dump

这说明当前 `read()` 不是“很少被调用的死 API”，但它也不是 reactive leaf evaluation 的唯一主通道。

## 3. Benchmark Evidence

基于 `packages/flux-runtime/src/__tests__/scope-read-benchmark.test.ts` 的 opt-in microbenchmark（2026-04-15 当日首次扩展后的实测数据），有以下结果：

| Case | Median ns/op |
| --- | ---: |
| `scope.read() cached + root access` | 38.0 |
| `prototype view + root access` | 4.3 |
| `scope.get(path)` | 593.4 |
| `prototype view getByPath(path)` | 224.6 |
| `scope.read() rematerialize + root access` | 3577.8 |
| `prototype create + root access` | 375.3 |
| `Object.keys(scope.read())` | 180.7 |
| `Object.keys(prototype view)` | 51.2 |
| `JSON.stringify(scope.read())` | 1467.1 |
| `JSON.stringify(prototype view)` | 1102.2 |
| `spread clone from scope.read()` | 351.5 |
| `spread clone from prototype view` | 240.4 |

结论：

1. 纯 root access 与 rematerialize 路径上，prototype view 明显更快。
2. `scope.get(path)` 也慢于直接在 prototype view 上做 path traversal，但差距远小于 rematerialize。
3. `Object.keys` / spread / `JSON.stringify` 这些 own-property 语义路径上，prototype 仍快，但优势显著收窄。

这说明性能结论不能只写成“prototype chain 一定全面更优”，而应拆成：

- 对读值和重建视图，它明显更优
- 对枚举/序列化，它仍有优势，但已经受 own-property 语义约束

## 4. Core Design Question: Should `read()` And `readOwn()` Share One State Model?

如果不考虑外部兼容，答案是：

**应该统一到底层一个真实 state 模型，但不应该把 `read()` 和 `readOwn()` 直接做成完全相同的 API。**

### 4.1 为什么底层应该统一

当前最重要的事实是：

- 真正的 state 只有 own snapshot 才需要持久保存
- merged snapshot 只是派生视图，不应被当成第二真实状态

因此底层最优模型应是：

- 一个 scope node 只拥有一份 own patch/state
- 父子可见性通过 parent pointer + root shadowing 解决
- 所有 merged / materialized / enumerable 结果都是派生视图

也就是说，底层 state 确实应统一。

### 4.2 为什么 API 不应完全统一

`readOwn()` 与 `read()` 语义上服务的是两个不同问题：

- `readOwn()`：owner-local state snapshot
- `read()`：whole lexical visible view

这两个概念即使底层使用同一份真实状态，也不应在语义上完全抹平。原因是：

1. owner-local submit / patch / diff / child registration 等路径需要知道“own data only”。
2. whole lexical materialize 仍然是公式 wildcard、request includeScope `'*'`、debugger dump 这类路径的真实需求。
3. 把它们强制合一会让“local patch”和“visible scope”重新混成一个心智，反而模糊性能边界。

因此最优方向不是“删掉 `readOwn()` 或把 `read()` 改成等同 `readOwn()`”，而是：

- 底层 state 一份
- 上层暴露两种视图：own view / visible view
- visible view 不默认用 eager flatten 实现

## 5. Recommended Target Model

### 5.1 `ScopeRef` as a lightweight scope node

建议目标：

```ts
interface ScopeNode {
  id: string;
  path: string;
  parent?: ScopeNode;
  ownStore: ScopeStore<Record<string, unknown>>;
  isolate: boolean;
}
```

在这个模型里：

- `ownStore` 是唯一真实数据源
- `parent` 只负责 lexical visibility
- 不再把 composite merged view 当作另一层“准状态”

### 5.2 `get(path)` / `has(path)` 保持为第一热路径

这条路已经是当前正确方向，应继续强化，而不是弱化。

推荐：

- `get(path)` / `has(path)` 继续成为 formula/runtime/reactive 的首选 API
- row-local, action-eval, selector, request includeScope list, validation, same-row renderer access 都优先走 path-based 读取

这可以最大限度避免 whole-object materialize。

### 5.3 `readOwn()` 保持 cheap and direct

`readOwn()` 应继续是：

- zero-copy snapshot read
- 不订阅 parent
- 不做 flatten

它是 owner-local payload 的最佳 API，不应让它退化成任何可见视图的别名。

### 5.4 `read()` 不应再是默认 eager flatten

最重要的结构性建议是：

**把 `read()` 从“默认返回 plain merged object”降级为“visible-view API”，其实现允许是 lazy view。**

推荐分层：

1. internal visible-view object
   - prototype-backed
   - parent pointer + own patch
   - 尽量零拷贝
2. explicit materialize/flatten helper
   - 只有在枚举/序列化/ownKeys 语义真正需要时才执行

也就是说，`read()` 的最优实现不一定是今天的 plain object。

如果允许架构调整，建议未来把 `read()` 重命名心智改成：

- `readVisible()` / `view()` 类概念更准确
- plain-object flatten 则由更显式 helper 承担，例如 `materializeVisibleScope(scope)`

即便短期不改名字，内部也应沿这个分层推进。

## 6. Should Formula `materialize()` Continue To Mean Plain Object?

这是是否能真正吃到 prototype 性能收益的关键。

当前 `packages/flux-formula/src/scope.ts` 明确依赖：

- `Reflect.ownKeys(context.materialize())`
- `getOwnPropertyDescriptor`
- top-level wildcard enumeration semantics

因此 `materialize()` 现在等同于：

- whole lexical scope
- plain enumerable object
- own-property visible set

如果目标是最小化内存、最大化性能，建议把 formula 层拆成两层语义：

### 6.1 `resolve/has` 继续作为主执行路径

普通表达式、模板、path access、nested member reads，继续只依赖：

- `resolve(path)`
- `has(path)`

这部分不需要 whole-object flatten。

### 6.2 broad-access / wildcard 路径单独走 materialize budget

只在以下情况触发 visible-scope flatten：

- top-level `Object.keys(scope)`
- `JSON.stringify(scope)`
- top-level spread
- any operation that semantically needs own enumerable visible roots

这意味着 `materialize()` 不应该在普通 `get` fallback 中被轻易触发。

当前 `createFormulaScope(...).get` 在 `context.resolve(property)` miss 后会 fallback 到 `getIn(context.materialize(), property)`。这是一个性能上不够纯的点。

若要优化，应改为：

- 优先完全通过 `resolve/has` 解决 root path
- 仅在明确 broad-access / enumerable contract 时才请求 materialize

### 6.3 最优方向：分离 `visible roots enumerable view` 与 `path resolution`

建议把 formula contract 显式拆成：

- path resolution API
- optional enumerable visible-roots API

而不是让一个 `materialize()` 同时承担：

- path fallback
- wildcard tracking
- ownKeys surface
- JSON serialization substrate

## 7. Row Scope Implications

### 7.1 Row scope should stay isolated and narrow

`docs/architecture/scope-ownership-and-isolation.md` 与 `docs/architecture/table-row-identity-and-scope-performance.md` 已经给出正确方向：

- row scope 默认 isolated
- row payload 最小集合是 `{ record, index }`
- optional extras must stay narrow

如果做 scope 优化，这条原则应进一步加强，而不是削弱。

### 7.2 Do not widen row scope into parent clones

如果切到 prototype-backed visible view，一个常见误区是“既然 prototype 很快，那 row scope 也可以默认继承整个 table/page scope”。

这不是最优设计。

原因：

1. row 数量大时，parent churn fanout 仍会扩大订阅面。
2. 即使 prototype view 减少了 flatten 成本，也没有消除 broad visibility 带来的 invalidation surface。
3. row-local data 最佳模型仍然是 isolated narrow payload，而不是 cheap parent inheritance。

所以：

- prototype view 适合优化 generic child scope / materialize path
- row scope 仍应优先做 isolated narrow state

### 7.3 更激进的方向：pure-display row carriers

`docs/architecture/table-row-identity-and-scope-performance.md` 已经允许 future optimization：

- pure-display tables 可用 lighter row-local evaluation carriers
- 不必总是一个完整 `ScopeRef`

如果要追求极限性能，真正更优的路线是：

1. 对通用 renderer/runtime 先把 `ScopeRef` 变成 single-state + lazy visible view
2. 对 ultra-hot repeated renderers（如 table cell）再进一步评估 lighter eval carrier

不要反过来先让所有 scope 都为 row-table 最极端场景付复杂度。

## 8. Memory Minimization Strategy

如果目标是最小化内存消耗，建议按以下顺序：

### 8.1 只保留 own snapshot

每个 scope node 只持有：

- own snapshot
- parent pointer
- minimal metadata (`id`, `path`, `isolate`)

不要长期缓存 merged plain object，除非有非常确定的高命中枚举场景。

### 8.2 visible view should be cheap to recreate

如果需要 visible view：

- 优先 prototype-backed transient object
- 不要把它重新塞回 store state
- 不要把它作为长期 retained snapshot 在 child scopes 上层层传播

### 8.3 flatten only on enumerable boundary

对以下路径做显式 flatten：

- request `includeScope === '*'`
- debugger / scope dump
- formula top-level wildcard enumeration
- any host bridge that must receive plain JSON-like object

不要在：

- action bindings overlay
- formula ordinary property access
- row-local renderer access
- selector subscription

这些路径上默认 flatten。

### 8.4 avoid duplicate overlay materialization

当前 `withEvaluationBindings()`、form import bindings、status-owner 等 wrapper 都在 `read()` 上再次 spread overlay。

如果改造，应让 overlay 也走“view + explicit flatten”路线：

- `get/has` 继续是 overlay-first
- `readOwn` 明确保留原 own snapshot
- `read()` 尽量返回 cheap overlay view
- 只有在 downstream 要求 plain object 时再 flatten

### 8.5 keep broad-access rare and observable

建议把 broad-access 做成显式性能预算对象：

- wildcard materialize count 可监控
- top-level enumerable access 可打 debug marker
- `scope-debug` 等调试用途默认就应视为 expensive

## 9. Recommended Refactor Order

如果决定实施，推荐顺序如下。

### Phase 1 - Separate view from materialize

目标：不先大改外部 API，先在内部把概念拆清楚。

工作：

- 引入 internal visible-view helper（prototype-backed）
- 引入 explicit flatten helper
- 让 `scope.read()` 暂时仍返回旧结果，但内部路径开始分流

### Phase 2 - Purify formula path resolution

目标：减少普通表达式对 `materialize()` 的依赖。

工作：

- 审查 `packages/flux-formula/src/scope.ts`
- 尽量把普通 property access 留在 `resolve/has`
- 只把 top-level enumeration / serialization 路径绑定到 materialize

### Phase 3 - Remove eager merged cache from child scope

目标：让 child scope 不再长期缓存 merged plain object。

工作：

- child scope 仅保留 own snapshot
- visible view 临时生成
- flatten path 显式调用 helper

### Phase 4 - Narrow hot callers

目标：把真正不需要 whole-object 的调用点改为 path-based。

重点位置：

- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-runtime/src/request-runtime.ts`
- any broad `scope.read()` wrapper that can be replaced by `get/has`

### Phase 5 - Consider row/table specialized carrier work

只有在以上阶段完成且 profiling 仍指向 row scope，才继续做：

- table row lighter carrier
- rowData projection cache refinement
- broader row-scope instantiation reduction

## 10. Direct Answers To The Core Questions

### Q1. `read()` 和 `readOwn()` 是否实际会统一？

底层 state 模型应该统一：是。

API 语义不应该完全统一：否。

最优答案是：

- one real state
- two views
- own view stays direct
- visible view becomes lazy / explicit-materialize-aware

### Q2. 底层是否应该只保留一个 scope state？

应该。

这个 state 就是 own snapshot。

parent visibility、overlay bindings、enumerable materialize 都不应再被当作第二真实状态。

### Q3. 在遍历方式上直接区分是否可行？

可行，而且应该这样做。

建议区分：

1. path traversal
   - `get(path)` / `has(path)` / `resolve(path)`
2. visible root enumeration
   - ownKeys / wildcard / serialization
3. plain-object flatten
   - only on explicit enumerable boundaries

这是目前最符合性能与内存目标的结构分层。

### Q4. 如果不考虑兼容性，最优改法是什么？

最优改法不是“把所有东西都换成 prototype chain 然后结束”。

最优改法是：

- keep own snapshot as the only real state
- make visible lexical scope a lazy view, preferably prototype-backed
- split path access from enumerable materialization
- keep row scopes narrow and isolated
- move broad-access to explicit expensive boundaries

prototype chain 是这个方案中的一个关键实现手段，但不是完整答案本身。

## 11. Recommendation

建议把 scope 优化的 owner decision 定成：

1. `ScopeRef` 的真实状态只保留 own snapshot。
2. `readOwn()` 保持 direct own snapshot API。
3. `read()` 不再被视为“默认 plain merged object”，而被重构为 visible-view API。
4. plain-object flatten 变成显式、昂贵、预算可观测的 helper 路径。
5. formula/runtime/reactive 主路径进一步向 `get/has/resolve` 收敛。
6. row scope 继续 narrow + isolated，不因 prototype optimization 而重新放宽 parent visibility。

这条路线能同时满足：

- 最小化 retained memory
- 最大化 root/path read 性能
- 避免频繁 merged object rebuild
- 不把 whole-object enumeration 成本误埋进普通表达式热路径

## 12. Suggested Follow-up

如果要继续推进，建议先产出一个 owner plan，范围限定为：

- `packages/flux-runtime/src/scope.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-runtime/src/request-runtime.ts`

并把目标写成：

- single-state scope node
- lazy visible view
- explicit flatten boundaries
- benchmark + playground regression comparison before/after

在这之前，不建议直接在广泛调用点上做零散替换；应先把 scope/view/materialize 三层语义明确收口。

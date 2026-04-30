# 2026-04-15 Scope State And Materialization Optimization Report

## 1. Purpose

本文重新分析 Flux 当前 `ScopeRef` / `EvalContext.materialize()` / row scope 路径的性能与内存取舍，并在**暂时不考虑已发布兼容性约束**的前提下，回答以下问题：

- `ScopeRef` 的最优形态是否应该从“merged plain object”转向“single-state + prototype-backed visible view”。
- `readOwn()` 与当前 `read()` 是否应该收敛为一套更清晰的 API 分层。
- 哪些路径应该直接消费原生 prototype-chain 对象，哪些路径应该显式 materialize。
- `includeScope: '*'`、action/form overlay、formula broad-access、row scope 等路径在这个新模型下应如何处理。

本文是分析报告，只描述建议方向，不修改 architecture owner docs，也不直接驱动代码变更。

## 2. Executive Summary

结论如下：

1. **真实状态只应保留一份：own snapshot。**
2. **当前 `read()` 代表 merged plain object 的语义不是最优形态。**
3. **最优 API 分层应收敛为：`readOwn()` / `readVisible()` / `materializeVisible()`。**
4. **`readVisible()` 应返回 prototype-backed visible view，而不是 eager merged object。**
5. **plain-object flatten 应降级为显式、昂贵、边界化的行为，只在真正需要 own-enumerable 语义时发生。**
6. **`includeScope: '*'` 更合理的语义应是当前 owner 的 own snapshot，而不是整个 visible lexical scope。**
7. **overlay 场景（bindings/import/status 等）应优先用 prototype chain 构造局部 view，而不是 spread 合并。**
8. **row scope 仍应保持 narrow + isolated，不因为 prototype 方案更快就重新放宽 parent visibility。**

一句话概括：

> 最优方向不是“继续优化 merged object cache”，而是“让 scope 退化成 one real state + one lazy visible view，再把 materialization 明确压缩到少数 enumerable 边界”。

## 3. Current Baseline

当前 `ScopeRef` 实现在 `packages/flux-runtime/src/scope.ts`。

### 3.1 当前实际模型

当前模型本质上有三层：

1. own snapshot
2. lexical parent chain
3. 缓存后的 merged plain object

具体表现为：

- `readOwn()` 直接返回 own store snapshot
- `get(path)` / `has(path)` 使用 root shadowing + parent recursion
- `read()` 在非 isolated child scope 上执行：

```ts
lastMaterialized = {
  ...parentSnapshot,
  ...ownSnapshot,
};
```

所以当前并不是“每个 scope 永远存两份真实状态”，而是：

- 一份真实 own state
- 一份按需缓存的 visible merged object

### 3.2 当前热路径已经分裂

当前代码实际已经把热路径分成两类：

- path-based 读取：`scope.get(path)` / `scope.has(path)`
- whole-object 读取：`scope.read()` / `EvalContext.materialize()`

`docs/architecture/flux-core.md` 也已经明确：

- 首选热路径应是 `get/has/readOwn`
- `read()` 只在 truly needed 的 whole-object materialization 场景使用

所以从设计方向上看，Flux 已经在向“path first, materialize second”收敛，只是 API 和实现机制还未彻底对齐。

## 4. Benchmark Evidence

基于 `packages/flux-runtime/src/__tests__/scope-read-benchmark.test.ts` 的 opt-in microbenchmark（2026-04-15 实测），得到以下数据：

| Case                                       | Median ns/op |
| ------------------------------------------ | -----------: |
| `scope.read() cached + root access`        |         38.0 |
| `prototype view + root access`             |          4.3 |
| `scope.get(path)`                          |        593.4 |
| `prototype view getByPath(path)`           |        224.6 |
| `scope.read() rematerialize + root access` |       3577.8 |
| `prototype create + root access`           |        375.3 |
| `Object.keys(scope.read())`                |        180.7 |
| `Object.keys(prototype view)`              |         51.2 |
| `JSON.stringify(scope.read())`             |       1467.1 |
| `JSON.stringify(prototype view)`           |       1102.2 |
| `spread clone from scope.read()`           |        351.5 |
| `spread clone from prototype view`         |        240.4 |

结论：

1. **读值和 rematerialize 路径上，prototype-backed visible view 明显更快。**
2. **枚举/序列化路径上 prototype 仍然更快，但优势显著收窄。**
3. **问题核心不是“prototype 是否更快”，而是“哪些路径值得保留 own-enumerable plain object 语义”。**

因此，真正要做的不是简单把所有地方切到 prototype chain，而是把 API 语义重新拆开。

## 5. Recommended API Model

### 5.1 Replace `read()` with two explicit concepts

建议未来不再使用当前 `read()` 这个名字。

最优 API 分层应是：

```ts
readOwn(): Record<string, unknown>
readVisible(): Record<string, unknown>
materializeVisible(): Record<string, unknown>
```

三者分别代表：

1. `readOwn()`
   - 当前 scope 自己拥有的 snapshot
   - 唯一真实持久 state
   - zero-copy / zero-flatten

2. `readVisible()`
   - 当前 lexical visible view
   - prototype-backed
   - 允许 inherited reads
   - 不承诺 own-enumerable plain object 语义

3. `materializeVisible()`
   - 显式 flatten visible lexical scope
   - 返回 plain object
   - 只给需要枚举/序列化/ownKeys 语义的边界使用

### 5.2 Why this naming is better

`readOwn()` / `readVisible()` 比当前 `readOwn()` / `read()` 更清楚，因为它明确区分：

- own snapshot
- visible lexical scope

而 `materializeVisible()` 则把“plain object flatten”从默认语义里剥离出来，防止读代码的人误以为 visible view 天生就是 merged plain object。

## 6. Core Structural Decision

### 6.1 One real state only

最优设计里，每个 scope node 只保留一份真实状态：own snapshot。

建议模型：

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

- `ownStore.snapshot` 是唯一真实状态
- parent 负责 lexical visibility
- visible view / materialized object 都是派生物

### 6.2 Why `readOwn()` and `readVisible()` should not collapse into one API

底层 state 可以统一，但 API 语义不应合并。

原因：

1. owner-local submit / diff / patch / registration / selector 都需要 own-only 视图。
2. visible lexical scope 是另一个概念，它服务于表达式、上下文叠加和 inherited reads。
3. 如果把两者重新混成一个 API，只会回到旧的 merged-object 心智。

因此最优答案是：

- one real state
- two read APIs
- one explicit materialize API

### 6.3 Suggested interface sketch

若未来真的执行这次重构，建议目标接口先在分析层收敛为：

```ts
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;

  get(path: string): unknown;
  has(path: string): boolean;

  readOwn(): Record<string, unknown>;
  readVisible(): Record<string, unknown>;
  materializeVisible(): Record<string, unknown>;

  update(path: string, value: unknown): void;
  merge(data: Record<string, unknown>): void;
  replace?(data: Record<string, unknown>): void;
}
```

其中：

- `readVisible()` 明确是 view API
- `materializeVisible()` 明确是 enumerable/plain-object API
- 不再保留 today-style `read()` 这个含混名字

## 7. Recommended Implementation Strategy

### 7.1 `readVisible()` should return a prototype-backed view

建议 `readVisible()` 不再返回 `{ ...parent, ...own }`，而是返回类似：

```ts
const view = Object.assign(Object.create(parentVisibleView), ownSnapshot);
```

或等价的 prototype-backed实现。

重点：

- 这是 visible view，不是 store snapshot
- 这是 transient / cached-by-identity view，不是第二真实状态

### 7.2 Why the view should not be the store snapshot itself

不建议把 prototype-backed 对象直接当作 store 的长期 snapshot。

更合理的是：

- store 只管理 own snapshot
- visible view 单独按需构造/缓存

原因：

1. store 的 diff / update / change publication 语义都属于 own state。
2. parent snapshot 替换时，直接长期持有 prototype object 容易出现 prototype 过期或频繁 `Object.setPrototypeOf` 问题。
3. 把 visible view 当 state 会重新混淆“真实数据”和“可见数据”。

## 8. Raw Native Access Versus Materialization

### 8.1 Where native prototype-backed access is ideal

以下场景应优先直接消费 `readVisible()` 返回的对象：

- identifier/member access
- row-local or overlay-local point reads
- evaluator-controlled property access
- bindings overlay
- ordinary runtime reads that only need values, not enumeration

这些路径只要能直接用原生对象访问，就不该再付 merged-object 的 flatten 成本。

### 8.2 Where explicit `materializeVisible()` is still needed

以下路径仍然需要 own-enumerable plain object：

1. formula broad-access
   - `Object.keys(scope)`
   - `JSON.stringify(scope)`
   - top-level spread / wildcard enumeration

2. debugger / scope dump / inspection tooling
   - 如果要展示完整 visible lexical scope

3. 明确要求 plain JSON-like payload 的宿主边界
   - 例如未来某些必须接收完整 visible snapshot 的 debug/export path

换句话说：

- point reads -> `readVisible()`
- enumerable / serialization -> `materializeVisible()`

### 8.3 `materializeVisible()` should have narrow, explicit semantics

建议明确把 `materializeVisible()` 的语义写死成：

- 输入：当前 scope node
- 输出：当前 visible lexical roots 的 plain object 副本
- 规则：top-level own keys 完整展开，child/root shadowing 与 visible lexical scope 一致
- 成本：明确视为 expensive path，不保证 zero-copy，不保证 stable object identity

也就是说，它不该再被表述成“普通读取 API 的另一种形式”，而应被表述成：

- serialization boundary helper
- wildcard boundary helper
- debugging/export helper

这有助于防止调用方再次把它当成默认读值接口。

## 9. Formula Evaluator Implications

### 9.1 Formula does not fundamentally depend on `ScopeRef.read()`

这一点很关键。

formula evaluate 本质上是 token/AST 驱动执行：

- identifier resolution
- member access
- operator evaluation
- function call evaluation

依赖收集也本质上是：

- 当 evaluator 解析到 lexical root 时记录 rootPath
- broad-access 时记录 wildcard

因此，formula 的主热路径并不要求继续依赖 today-style `scope.read()`。

### 9.2 Recommended split for formula

建议 formula 层明确分成两条路径：

1. point-read path
   - 直接走 evaluator-controlled native access or `resolve/has`
   - 记录 rootPath
   - 不触发 `materializeVisible()`

2. broad-access path
   - 例如 `Object.keys(scope)` / `JSON.stringify(scope)` / spread-like enumeration
   - 记录 wildcard / broadAccess
   - 必要时调用 `materializeVisible()`

### 9.3 Remove materialize fallback from ordinary property lookup

当前 `packages/flux-formula/src/scope.ts` 的 `get(...)` trap 在 `context.resolve(property)` miss 后会 fallback 到：

```ts
getIn(context.materialize(), property);
```

这不是最优路径。

如果走新模型，普通 property lookup 应尽量停留在：

- `resolve(path)`
- `has(path)`
- native view property access

而不是在普通 miss 上轻易触发 whole visible scope materialization。

## 10. `includeScope: '*'` Should Not Mean Visible Lexical Scope

这是一个重要 owner decision。

### 10.1 Recommended semantics

`includeScope: '*'` 更合理的语义应是：

- **当前 owner 的 own snapshot**
- 即未来的 `readOwn()`
- 不包含 parent lexical scope

### 10.2 Why

原因：

1. 请求自动注入更接近 owner-local payload，不是 lexical visibility dump。
2. 如果把 parent scope 也带进请求，会扩大 collision surface。
3. 这会把 request path 绑定到 expensive visible materialization。
4. 它不符合“当前 owner 发送自己的数据”这一更直观的 authoring 心智。

### 10.3 Recommended split

- `includeScope: '*'` -> `readOwn()`
- `includeScope: ['foo', 'bar']` -> 继续允许 lexical `get(key)`

这套语义比“`*` 代表整个 visible scope”更清楚，也更高性能。

## 11. Overlay Construction Should Use Prototype Chain

当前存在多处：

```ts
{
  ...scope.read(),
  ...bindings
}
```

例如：

- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-runtime/src/status-owner.ts`

这些都不应继续视为默认的 merged plain object 路径。

更优实现是：

- base = `readVisible()`
- overlay = prototype-backed local object

例如：

```ts
const overlay = Object.assign(Object.create(baseVisibleView), bindings);
```

这样可以：

- 保持 overlay-first root shadowing
- 避免重新复制整个 visible scope
- 最大化 point-read 性能

只有当调用方明确要 own-enumerable plain object 时，才进一步 `materializeVisible()`。

### 11.1 Overlay helper should be explicit

建议未来不要在 action/form/status 等地方各自手写 overlay 逻辑，而是统一收口成类似 helper：

```ts
createOverlayVisibleView(baseVisible: Record<string, unknown>, overlay: Record<string, unknown>)
```

或等价的 runtime helper。

目标不是抽象出一个新复杂层，而是避免：

- 重复 spread clone
- 重复 overlay-first root shadowing 逻辑
- 各处对 `readVisible()` / `materializeVisible()` 语义的二次发散

## 12. Row Scope Implications

### 12.1 Row scope should stay narrow and isolated

虽然 prototype-backed visible view 在 benchmark 中明显更快，但这**不意味着** row scope 应该默认继承更宽的 parent visibility。

row scope 的最佳规则仍然是：

- default isolated
- minimal payload `{ record, index }`
- optional `rowKey` / narrow projection
- no accidental parent-scope widening

### 12.2 Why prototype optimization does not justify wider rows

原因：

1. prototype 优化解决的是 view construction / point-read 成本，不是 invalidation surface。
2. row 数量大时，parent visibility 仍会扩大 churn fanout。
3. row-local data-first 设计仍优于 inherited-scope-first 设计。

因此：

- generic scope/view 可以 prototype-backed
- row scope 仍要 narrow + isolated

### 12.3 Future ultra-hot path

对纯展示型 table / repeated renderers，未来仍可进一步研究：

- lighter eval carriers
- row-local param objects
- fewer full `ScopeRef` instances

但这属于 row-specific optimization，不应反过来主导整个 scope API 退化成 row-special-case 设计。

## 13. Memory Minimization Rules

如果目标是最小化内存占用，建议坚持以下规则：

1. **只保留 own snapshot 作为 retained state。**
2. **visible view 不进入 store，不参与真实状态持久化。**
3. **不要长期缓存 wide merged plain object。**
4. **只在 enumerable boundary 上显式 flatten。**
5. **overlay 也走 prototype-backed view，而不是 spread clone。**
6. **row scope 不要因为 visible view 变便宜就携带更宽 payload。**

这套规则同时最小化：

- retained memory
- rematerialize cost
- unnecessary object copies
- inherited visibility 扩张带来的错误使用冲动

## 14. Risk Analysis

如果未来实施这次重构，主要风险如下。

### 14.1 Prototype pollution and dangerous keys

如果大量使用 prototype-backed visible view，必须显式处理危险 key：

- `__proto__`
- `constructor`
- `prototype`

建议要求：

- scope root 写入路径做危险 key 审计
- overlay helper 不直接对不可信 key 无脑 `Object.assign(...)`
- 文档层明确 prototype-backed visible view 不是对任意未审计输入开放的低层 escape hatch

### 14.2 Deep prototype chains can still hurt hot paths

prototype 更快，不代表无限深继承永远更快。

如果 scope 链过深：

- page
- form
- fragment
- overlay
- dialog
- row
- subform

native property lookup 仍可能累积成本。

因此优化方向不应被误解成“能继承就继承”，而应坚持：

- generic visible view 可以 prototype-backed
- repeated hot subtrees 仍优先 narrow payload / isolation

### 14.3 Broad-access can silently re-introduce hidden cost

如果 `Object.keys(...)` / `JSON.stringify(...)` / spread 等路径没有显式标为 expensive，团队很容易再次把 broad-access 写回热路径。

因此：

- `materializeVisible()` 应显式命名为 expensive path
- formula wildcard / broadAccess 应在诊断和 benchmark 中可观测

### 14.4 Compile-time breakage is a feature, not a migration bug

删除 `read()` 后出现的大量编译报错是预期内、且有价值的。

因为这正是重新分类调用点所需要的信号，而不是迁移阻碍。

如果为了减少报错数量而保留一个兼容 `read()` 壳，反而容易让迁移再次变成模糊替换。

## 15. Migration Classification Rules

如果未来按“删除 `read()`，由编译报错驱动迁移”的方式执行，建议把每个调用点按以下规则分类：

### 15.1 Class A - path read only

特征：

- 只读取一个或几个确定路径
- 不做对象枚举

替换为：

- `get(path)`
- `has(path)`

### 15.2 Class B - own payload only

特征：

- submit payload
- owner-local patch/diff
- selector snapshot
- local registration

替换为：

- `readOwn()`

### 15.3 Class C - visible point-read view

特征：

- 需要 lexical visible roots
- 但只是点读/member access
- 不依赖 `Object.keys` / spread / stringify

替换为：

- `readVisible()`

### 15.4 Class D - enumerable plain object boundary

特征：

- `Object.keys(...)`
- `JSON.stringify(...)`
- spread clone
- host bridge 需要 plain JSON-like payload

替换为：

- `materializeVisible()`

### 15.5 Class E - should be redesigned, not mechanically translated

特征：

- today code does `...scope.read(), ...bindings`
- 或者广泛 whole-object 传递但真实只需要少量字段

处理方式：

- 不直接翻译成 `materializeVisible()`
- 优先改成 overlay view / `get` / narrow projection

这些调用点往往是此次重构真正能拿回性能收益的地方。

## 16. Recommended Refactor Order

如果未来执行重构，推荐顺序如下：

### Phase 1 - Rename and split the API

目标：先把语义层次拆清楚。

- 从 `ScopeRef` 删除 `read()`
- 引入 `readVisible()`
- 引入 `materializeVisible()`
- 保留 `readOwn()`

### Phase 2 - Use compile errors to classify call sites

逐个调用点判断：

1. 只读某个路径 -> `get(path)`
2. 只读 owner-local data -> `readOwn()`
3. 只需要 visible point reads -> `readVisible()`
4. 需要 own-enumerable plain object -> `materializeVisible()`

### Phase 3 - Change `includeScope: '*'`

把：

- `includeScope: '*'` -> `readOwn()`

从 visible lexical scope 收窄为 owner-local payload。

### Phase 4 - Rewrite overlay wrappers

把 action/form/status 等 overlay 从 spread 迁移到 prototype-backed local view。

### Phase 5 - Purify formula broad-access boundaries

把 formula 的普通 path access 与 wildcard/materialize 路径拆清楚。

### Phase 6 - Re-check row/table hotspots

只有在前述收口完成后，再判断 row/table 是否还需要更极端的 specialized carrier 优化。

## 17. Direct Answers

### Q1. `readOwn()` / `readVisible()` 这样的命名是否更好？

是，更好。

因为它们对称、语义清楚，而且不会再让人把 `read()` 理解成“默认 merged object”。

### Q2. 底层是否仍然必须保存 own snapshot？

必须。

因为 own snapshot 是唯一真实、可写、可 diff、可发布 change 的状态。

### Q3. 那为什么不让 `readVisible()` 直接返回 prototype-chain 对象？

应该这样做。

这正是建议方向。

### Q4. 那为什么还需要 `materializeVisible()`？

因为 prototype-backed visible view 不等于 own-enumerable plain object。

以下路径仍然需要显式 flatten：

- `Object.keys(...)`
- `JSON.stringify(...)`
- spread clone
- formula wildcard / broad-access
- debugger full visible dump

### Q5. `includeScope: '*'` 是否需要父 scope？

不需要。

更优语义是当前 owner 的 own snapshot。

### Q6. `...scope.read(), ...bindings` 是否应该改成 prototype chain？

应该。

这类 overlay 本质上表达的是：

- base visible scope
- local root shadowing

prototype-backed overlay view 比 spread clone 更符合语义，也更节省内存与重建成本。

## 18. Recommendation

建议把 scope 优化的 owner decision 固化为：

1. one real state: own snapshot only
2. `readOwn()` = owner-local snapshot
3. `readVisible()` = prototype-backed visible lexical view
4. `materializeVisible()` = explicit expensive plain-object flatten
5. `includeScope: '*'` = own snapshot only
6. overlays = prototype-backed local views
7. formula point-read path avoids materialization
8. row scope remains narrow + isolated

这条路线同时满足：

- 最小 retained memory
- 最大化 point-read 性能
- 避免 merged-object rebuild 成为默认成本
- 避免把 own-enumerable 语义错误混入普通 visible reads

## 19. Suggested Follow-up

如果要继续推进，建议未来单独起一个 owner plan，范围集中在：

- `packages/flux-core/src/types/scope.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-runtime/src/status-owner.ts`

并按以下目标执行：

- API rename: `read()` -> `readVisible()`
- add explicit `materializeVisible()`
- reclassify all callers by compile errors
- benchmark + playground comparison before/after

在这之前，不建议做零散局部替换；应先把 `own` / `visible` / `materialize` 三层语义彻底收口。

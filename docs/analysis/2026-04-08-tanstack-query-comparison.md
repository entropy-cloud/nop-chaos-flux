# TanStack Query 与 NOP Chaos Flux 对比分析

> 日期: 2026-04-08
> 状态: 分析文档
> 源码基准: TanStack Query v5 (~/sources/query), nop-chaos-flux master
> 边界: 本文聚焦于 data-source、reaction、operational control 三个领域的设计对比，不涉及 TanStack Query 的 persistence、hydration、devtools 等外围能力。

## 目的

分析 TanStack Query 的核心架构设计，对照 Flux 当前在 data-source、reaction、operational control 方面的实现，回答三个问题：

1. TanStack Query 的核心抽象与 Flux 的 data-source/reaction 在定位上有何根本差异。
2. TanStack Query 的哪些成熟设计对 Flux 有真实参考价值。
3. Flux 在哪些方向已经比 TanStack Query 更适合自身目标，不应照搬。

## 结论摘要

| 维度                                               | 参考价值 | 建议                                                                |
| -------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| 状态机 + reducer 模式                              | **高**   | DataSourceController 可引入显式状态机替代 ad-hoc boolean flags      |
| Observer 引用计数 → GC                             | **中**   | 已通过 scope-scoped registry + dispose 覆盖，不需要额外 GC 机制     |
| 通知批量调度 (notifyManager)                       | **中**   | 多 source 同时触发刷新时可考虑批量通知                              |
| 结构共享 (structural sharing)                      | **高**   | 可在 scope.update / selector 层引入引用稳定性优化                   |
| 双轨状态 (status + fetchStatus)                    | **高**   | 当前 loading/stale/error 扁平状态缺少 data-ready 与 fetching 的分离 |
| Retryer 抽象                                       | **中**   | 当前 retry 逻辑散在 action-runtime，可抽取独立 Retryer              |
| Invalidation flag 模式                             | **低**   | Flux 的依赖追踪已覆盖自动失效，手动 invalidate 场景有限             |
| Mutation 生命周期 (onMutate → onError → onSuccess) | **高**   | 对 ajax action 链式回调设计有直接参考价值                           |
| Query dedup + 共享                                 | **中**   | 当前 dedup 按 action owner 隔离，跨 owner 共享可评估                |
| Tracked props / 精细订阅                           | **高**   | useScopeSelector 的 equalityFn 可以参考 tracked-props 自动追踪模式  |

---

## 一、TanStack Query 核心架构概览

### 1.1 类层次关系

```
QueryClient (全局协调器)
  ├── QueryCache extends Subscribable (查询存储 + GC)
  │     └── Query extends Removable (单查询实例 + 状态机 + fetch)
  │           └── QueryObserver extends Subscribable (桥接 React 订阅)
  │
  └── MutationCache extends Subscribable (变更存储 + 队列)
        └── Mutation extends Removable (单变更实例 + 生命周期)
              └── MutationObserver extends Subscribable (桥接 React 订阅)

基础设施:
  Subscribable    → 发布订阅基类 (Set<Listener>)
  Removable       → GC 基类 (gcTime + scheduleGc)
  Retryer         → 重试执行器 (指数退避 + pause/continue)
  NotifyManager   → 通知批调度 (transaction + flush)
```

### 1.2 QueryState 状态机

TanStack Query 的核心状态由两条轨道组成：

**数据轨道 (status)**: 表示数据本身的生命周期

```typescript
type QueryStatus = 'pending' | 'error' | 'success';
```

**网络轨道 (fetchStatus)**: 表示请求活动的生命周期

```typescript
type FetchStatus = 'fetching' | 'paused' | 'idle';
```

组合语义:

| status    | fetchStatus | 含义                   |
| --------- | ----------- | ---------------------- |
| `pending` | `fetching`  | 首次加载，尚无数据     |
| `pending` | `paused`    | 网络离线，首次加载暂停 |
| `success` | `fetching`  | 有数据，后台刷新中     |
| `success` | `idle`      | 有数据，无请求活动     |
| `error`   | `idle`      | 请求失败               |
| `error`   | `fetching`  | 有错误，正在重试       |

状态更新通过 reducer 模式集中管理：

```typescript
// query.ts#dispatch — 状态转换核心
#dispatch(action: Action): void {
  const reducer = (state: QueryState): QueryState => {
    switch (action.type) {
      case 'fetch':    return { ...state, ...fetchState(), fetchMeta }
      case 'success':  return { ...state, ...successState(), dataUpdateCount++ }
      case 'error':    return { ...state, error, status: 'error', isInvalidated: true }
      case 'invalidate': return { ...state, isInvalidated: true }
      case 'pause':    return { ...state, fetchStatus: 'paused' }
      case 'continue': return { ...state, fetchStatus: 'fetching' }
      case 'failed':   return { ...state, fetchFailureCount, fetchFailureReason }
    }
  }
  this.state = reducer(this.state)
  notifyManager.batch(() => {
    this.observers.forEach(o => o.onQueryUpdate())
    this.#cache.notify({ query: this, type: 'updated', action })
  })
}
```

### 1.3 Observer 引用计数与 GC

```typescript
// Subscribable 基类
class Subscribable<TListener> {
  protected listeners = new Set<TListener>()
  subscribe(listener): () => void {
    this.listeners.add(listener)
    this.onSubscribe()        // 钩子：第一个订阅者加入
    return () => {
      this.listeners.delete(listener)
      this.onUnsubscribe()    // 钩子：最后一个订阅者离开
    }
  }
}

// QueryObserver — 第一个订阅者时 attach Query
protected onSubscribe() {
  if (this.listeners.size === 1) {
    this.#currentQuery.addObserver(this)  // 引用 +1
    if (shouldFetchOnMount(...)) this.#executeFetch()
  }
}

// Query — 最后一个 observer 离开时调度 GC
removeObserver(observer) {
  this.observers = this.observers.filter(x => x !== observer)
  if (!this.observers.length) {
    this.scheduleGc()  // 默认 5 分钟后清除
  }
}

// Removable 基类
protected scheduleGc() {
  this.#gcTimeout = setTimeout(() => {
    this.optionalRemove()  // Query: 如果 observers 仍为 0 且 idle，从 cache 移除
  }, this.gcTime)
}
```

### 1.4 通知批量调度

```typescript
// notifyManager — 事务式批调度
const notifyManager = createNotifyManager()
// 内部: queue[], transactions counter

batch<T>(callback: () => T): T {
  transactions++
  try { return callback() }
  finally {
    transactions--
    if (!transactions) flush()  // 最外层 batch 结束时统一刷新
  }
}

// flush: 收集所有排队的回调 → 通过 setTimeout(0) 调度 → batchNotifyFn 包裹执行
```

React 集成中 `useSyncExternalStore` 的 subscribe 回调被 `notifyManager.batchCalls()` 包裹，确保同一 tick 内的多次状态变更只触发一次重渲染。

### 1.5 Retryer 抽象

```typescript
// retryer.ts — 独立的重试执行器
function createRetryer(config) {
  let failureCount = 0
  const thenable = pendingThenable()  // 手动 Promise

  const run = () => {
    Promise.resolve(config.fn())
      .then(resolve)
      .catch(error => {
        // 指数退避: min(1000 * 2^n, 30000)
        const delay = config.retryDelay ?? defaultRetryDelay
        if (shouldRetry) {
          failureCount++
          sleep(delay)
            .then(() => canContinue() ? undefined : pause())
            .then(() => run())
        }
      })
  }

  return { promise: thenable, start, cancel, continue, cancelRetry, continueRetry }
}
```

关键能力：指数退避、网络离线暂停/恢复、取消（含 revert）、重试次数控制。

### 1.6 Mutation 生命周期

```typescript
// mutation.ts — 变更执行流程
async execute(variables) {
  // 1. onMutate (乐观更新准备)
  const context = await this.options.onMutate?.(variables, ctx)

  try {
    const data = await this.#retryer.start()

    // 2. onSuccess
    await this.options.onSuccess?.(data, variables, context, ctx)
    // 3. onSettled (成功路径)
    await this.options.onSettled?.(data, null, variables, context, ctx)

    this.#dispatch({ type: 'success', data })
    return data
  } catch (error) {
    // 4. onError (回滚乐观更新)
    await this.options.onError?.(error, variables, context, ctx)
    // 5. onSettled (失败路径)
    await this.options.onSettled?.(undefined, error, variables, context, ctx)

    this.#dispatch({ type: 'error', error })
    throw error
  } finally {
    // 6. 运行队列中的下一个 mutation
    this.#mutationCache.runNext(this)
  }
}
```

MutationCache 还维护了 scope-based 队列：同一 scope 内的 mutation 串行执行，不同 scope 可并行。

### 1.7 Tracked Props — 自动精细订阅

```typescript
// queryObserver.ts — Proxy 追踪属性访问
trackResult(result) {
  return new Proxy(result, {
    get: (target, key) => {
      this.trackProp(key)           // 记录访问的属性名
      return Reflect.get(target, key)
    },
  })
}

// 通知时只检查 tracked props 是否变化
shouldNotifyListeners() {
  const includedProps = this.#trackedProps  // 只检查实际访问过的属性
  return Object.keys(this.#currentResult).some(key =>
    changed && includedProps.has(key)
  )
}
```

React 集成中：未设置 `notifyOnChangeProps` 时自动使用 tracked-props 模式，组件只在其实际使用的属性变化时重渲染。

---

## 二、Flux 当前实现概览

### 2.1 DataSourceController 状态

```typescript
// data-source-runtime.ts — 当前状态模型
let started = false
let stopped = false
let loading = false
let stale = false
let value: unknown = initialData
let error: unknown

// 对外暴露
getState() {
  return { started, loading, stale, value, error }
}
```

状态通过直接赋值管理，没有集中的状态机或 reducer。

### 2.2 SourceRegistry — Scope 分桶注册表

```typescript
// source-registry.ts — scope-scoped 注册表
const scopeEntries = new Map<string, Map<string, RuntimeSourceEntry>>();

// 外层 key: scopeId
// 内层 key: sourceId
// 生命周期: registerDataSource → controller.start() → dispose → controller.stop()
```

依赖追踪通过 store subscription + `scopeChangeHitsDependencies()` 实现：

```typescript
const unsubscribe = scope.store?.subscribe((change) => {
  if (scopeChangeHitsDependencies(change, dependencies)) {
    void controller.refresh();
  }
});
```

### 2.3 ReactionRuntime — 声明式副作用

```typescript
// reaction-runtime.ts
// watch → evaluate → compare with Object.is → check when guard → dispatch actions
// 调度: Promise.resolve().then() 异步执行
// 防抖: debounce + changedPaths coalescing
// 循环保护: MAX_REACTION_FIRE_COUNT = 10
```

### 2.4 缓存 — LRU + TTL

```typescript
// api-cache.ts — 请求级 LRU 缓存
// 最大 200 条，key = `${method}:${url}:${stableStringify(data)}`
// TTL 过期淘汰 + LRU 淘汰
// 仅 data-source 的 GET 类请求自动启用 (需 cacheTTL > 0)
```

### 2.5 订阅 — useScopeSelector

```typescript
// hooks.ts — useSyncExternalStoreWithSelector
function useScopeSelector<T>(selector, equalityFn = Object.is) {
  const scope = useRenderScope();
  return useSyncExternalStoreWithSelector(
    scope.store?.subscribe,
    () => scope.store?.getSnapshot(),
    selector,
    equalityFn,
  );
}
```

---

## 三、逐域对比分析

### 3.1 状态管理

| 维度     | TanStack Query                            | Flux                                                  |
| -------- | ----------------------------------------- | ----------------------------------------------------- |
| 状态模型 | 显式状态机 (status + fetchStatus)         | ad-hoc boolean flags (loading/stale/error)            |
| 状态更新 | Reducer + dispatch(action)                | 直接赋值                                              |
| 状态通知 | notifyManager.batch → observers → cache   | scope.update → store.subscribe → useSyncExternalStore |
| 不可变性 | 每次产生新 state 对象                     | 直接修改 closure 变量                                 |
| 时间戳   | dataUpdatedAt, errorUpdatedAt (精确到 ms) | 无时间戳                                              |

**差距分析**:

Flux 当前的 `loading / stale / error` 扁平状态无法表达以下组合：

- 有数据 + 正在刷新（后台 refetch）
- 有数据 + 请求失败（不丢失已有数据）
- 无数据 + 网络暂停

参考 TanStack Query 的双轨模型，Flux 可引入：

```typescript
interface DataSourceState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching' | 'paused';
  data: T | undefined;
  error: unknown;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
}
```

**参考建议**: 引入显式状态机 + reducer，将 `DataSourceController` 的状态管理从散落的 boolean 赋值升级为集中的状态转换。这是本次分析中 **优先级最高** 的改进点。

### 3.2 生命周期与垃圾回收

| 维度          | TanStack Query                                   | Flux                               |
| ------------- | ------------------------------------------------ | ---------------------------------- |
| 生命周期驱动  | Observer 引用计数                                | Scope 分桶 + null-renderer dispose |
| GC 机制       | gcTime 定时器 (默认 5min)                        | scope dispose 时批量清理           |
| 无用检测      | observers.length === 0 && fetchStatus === 'idle' | scope unmount 触发 disposeScope    |
| 跨 scope 共享 | 全局 QueryCache + queryHash                      | scope-scoped 隔离                  |

**差距分析**:

Flux 的 scope-scoped registry + dispose 已经很好地解决了低代码场景下的生命周期管理。与 TanStack Query 的全局 cache + gcTime 模型相比：

- Flux 不需要全局缓存共享：低代码的 data-source 通常绑定到具体 scope，跨 scope 共享需求有限
- Flux 不需要 gcTime：scope dispose 已经是确定的清理时机，比定时器 GC 更可靠
- Flux 的 scope 分桶天然避免了全局 registry 的内存泄漏风险

**参考建议**: **不需要引入** TanStack Query 的 gcTime / Removable 机制。当前 scope-scoped 模型更适合低代码场景。

### 3.3 通知与调度

| 维度             | TanStack Query                                 | Flux                                               |
| ---------------- | ---------------------------------------------- | -------------------------------------------------- |
| 通知模型         | NotifyManager (transaction + batch + schedule) | Zustand store.subscribe → useSyncExternalStore     |
| 批量通知         | batch() 包裹，同一 tick 内只 flush 一次        | 依赖 React 的 batch 更新 (React 18+)               |
| 调度策略         | setTimeout(0) 调度，避免同步通知               | Promise.resolve().then() (reaction), 同步 (source) |
| 多 observer 通知 | 一次 dispatch → 遍历所有 observers             | scope.update → 所有 store subscribers              |

**差距分析**:

React 18+ 的 automatic batching 已经覆盖了大部分批量通知场景。但在以下情况下仍可能有多余通知：

1. 多个 data-source 在同一 scope 同时刷新完成 → 多次 scope.update → 多次重渲染
2. reaction 调度使用 `Promise.resolve().then()` 与 store 更新的时序不统一

**参考建议**: 可以在 `RendererRuntime` 层引入轻量级批调度机制，将同一微任务内的多个 scope.update 合并为一次通知。但优先级不高，React 18 的 automatic batching 已经覆盖了大部分场景。

### 3.4 结构共享

| 维度     | TanStack Query                        | Flux                                    |
| -------- | ------------------------------------- | --------------------------------------- |
| 数据替换 | replaceData() with structural sharing | scope.update(path, newValue) — 引用不保 |
| 配置     | `structuralSharing: boolean \| fn`    | 无                                      |
| 目的     | 避免相同数据的引用变化 → 避免重渲染   | —                                       |

**差距分析**:

TanStack Query 的 `replaceData` 在设置新数据时，如果新数据与旧数据结构相同（deep equal），则保留旧引用。这对 React 渲染性能至关重要——即使 query 刷新返回相同数据，消费组件也不会重渲染。

Flux 当前的 `scope.update(path, newValue)` 直接设置新值，如果 API 返回相同结构的对象，scope snapshot 会变化，所有 selector 都需要重新计算。

**参考建议**: 在 `scope.update` 层或 `useScopeSelector` 的 equalityFn 默认值中引入 shallow structural sharing。具体方案：

```typescript
// 方案 A: scope.update 内部优化
function update(path, value) {
  const current = this.readAtPath(path)
  if (shallowEqual(current, value)) return  // 不触发变更
  // ... 正常更新
}

// 方案 B: useScopeSelector 默认 equalityFn 使用 shallowEqual
function useScopeSelector<T>(selector, equalityFn = shallowEqual) { ... }
```

方案 A 更高效（源头避免不必要通知），方案 B 更安全（不影响 scope 本身语义）。建议评估后选择。

### 3.5 重试与错误恢复

| 维度     | TanStack Query                                | Flux                           |
| -------- | --------------------------------------------- | ------------------------------ |
| 重试抽象 | 独立 Retryer 工厂函数                         | action-runtime 内联 retry 逻辑 |
| 退避策略 | 指数退避 min(1000×2^n, 30s)                   | 可配置 retryCount + retryDelay |
| 网络感知 | 在线/离线 → pause/continue                    | 无网络状态感知                 |
| 取消     | AbortController + CancelledError + revert     | AbortController + isAbortError |
| 失败追踪 | failureCount, failureReason, errorUpdateCount | error: unknown                 |

**差距分析**:

Flux 的 retry 逻辑嵌在 `action-runtime.ts` 中，与 action dispatch 耦合。TanStack Query 的 Retryer 是独立抽象，可以被 Query 和 Mutation 共享。

关键缺失：

1. **网络离线暂停**: TanStack Query 的 Retryer 在网络离线时自动暂停重试，恢复后继续。Flux 没有这个能力。
2. **revert 取消**: TanStack Query 的 CancelledError 支持 `revert` 选项，取消时可以回退到之前的状态。Flux 的取消只是中止请求。
3. **失败计数器**: TanStack Query 有 `failureCount` 和 `failureReason`，Flux 只有一个 `error`。

**参考建议**: 将 retry 逻辑从 `action-runtime` 抽取为独立的 Retryer 工厂函数。网络感知可暂不实现（低代码场景通常有稳定的内网环境），但 revert 取消和失败计数器对 data-source 的健壮性有价值。

### 3.6 Invalidation 与依赖追踪

| 维度     | TanStack Query                                 | Flux                               |
| -------- | ---------------------------------------------- | ---------------------------------- |
| 失效触发 | 手动: `queryClient.invalidateQueries(filters)` | 自动: 依赖追踪 + scope 变更        |
| 失效标记 | `isInvalidated` flag → `isStale()` 返回 true   | 直接调用 `controller.refresh()`    |
| 精确度   | 按 queryKey / queryKey prefix 匹配             | 按 scope 变更路径 + 收集的依赖匹配 |
| 全局协调 | QueryClient.invalidateQueries 可跨组件         | scope-scoped，不支持跨 scope 失效  |

**差距分析**:

Flux 的依赖追踪模型比 TanStack Query 的手动 invalidation **更适合低代码场景**：

- 低代码 schema 不应该要求开发者手动管理 query invalidation
- Flux 的 `scopeChangeHitsDependencies()` 已经实现了基于变更路径的精确触发
- 自目标循环保护防止了 source 写入自身发布路径时的无限循环

但 TanStack Query 有一个 Flux 缺失的能力：**全局批量失效**。例如"提交表单后使所有相关列表查询失效"，在 TanStack Query 中是 `invalidateQueries({ queryKey: ['todos'] })`，在 Flux 中需要逐个 `refreshSource`。

**参考建议**: 可以考虑在 `RendererRuntime` 层增加按 tag/pattern 的批量 source 刷新能力，但优先级不高。当前的依赖追踪已经覆盖了绝大多数自动失效场景。

### 3.7 Mutation vs Action

| 维度     | TanStack Query Mutation                    | Flux Action                                  |
| -------- | ------------------------------------------ | -------------------------------------------- |
| 定位     | 一次性变更操作 + 自动失效                  | 通用动作分发（含 ajax、setValue、dialog 等） |
| 乐观更新 | onMutate → return context → onError 回滚   | 无内置乐观更新支持                           |
| 成功回调 | onSuccess(data, variables, context)        | then / onSuccess 链                          |
| 失败回调 | onError(error, variables, context)         | onError 链                                   |
| 完成回调 | onSettled(data, error, variables, context) | 无统一完成回调                               |
| 串行队列 | MutationCache scope-based 队列             | 无内置串行队列                               |
| 结果追踪 | MutationState: status/data/error/context   | ActionResult: ok/data/error                  |

**差距分析**:

TanStack Query 的 Mutation 生命周期比 Flux 的 ajax action 更结构化：

1. **乐观更新**: `onMutate` 返回 context，`onError` 用 context 回滚。Flux 的 action 链可以做类似的事，但没有标准化的 context 传递和回滚协议。
2. **统一完成回调**: `onSettled` 无论成功失败都执行。Flux 需要在 `then` 和 `onError` 中重复清理逻辑。
3. **串行队列**: 同 scope 的 mutation 自动串行。Flux 的 parallel 控制是 per-action 的，没有全局队列。

**参考建议**: Flux 的 action 系统定位更广（不仅仅是"变更"），不需要完全对齐 Mutation。但以下两个模式值得参考：

1. **标准化乐观更新协议**: 在 action 执行层面引入 `onMutate` → `context` → `onError(context)` 的回滚机制
2. **onSettled 回调**: 在 action 链中增加 `onSettled` 回调，统一成功和失败的清理逻辑

### 3.8 精细订阅

| 维度     | TanStack Query                    | Flux                                |
| -------- | --------------------------------- | ----------------------------------- |
| 订阅粒度 | 属性级: tracked props via Proxy   | 路径级: useScopeSelector + selector |
| 自动追踪 | Proxy get trap 记录访问属性       | 手动编写 selector + equalityFn      |
| 通知过滤 | trackedProps 变化才通知           | selector 返回值变化才通知           |
| 默认行为 | 无 notifyOnChangeProps 时自动追踪 | Object.is 比较                      |

**差距分析**:

TanStack Query 的 tracked-props 模式自动解决了"开发者不知道哪些属性变化需要触发重渲染"的问题。Flux 的 `useScopeSelector` 需要开发者手动编写 selector 和 equalityFn。

在低代码场景下，selector 通常由编译器生成，因此手动追踪的负担不大。但编译器生成的 selector 可能过于保守（返回整个 scope 对象），导致不必要的重渲染。

**参考建议**: 不需要引入 Proxy tracked-props 模式（低代码编译器可以精确控制 selector），但可以在编译层优化 selector 的精确度，确保只选择 renderer 实际需要的字段路径。

---

## 四、综合建议与优先级

### P0 — 建议尽快落地

1. **DataSourceController 状态机改造**
   - 将 `loading / stale / error` boolean flags 替换为 `status + fetchStatus` 双轨状态机
   - 引入 reducer 模式管理状态转换
   - 增加 `dataUpdatedAt` / `errorUpdatedAt` 时间戳
   - 影响: `data-source-runtime.ts`, `source-registry.ts`, `flux-core` 类型

### P1 — 近期可评估

2. **Structural Sharing**
   - 在 `scope.update` 或 `useScopeSelector` 层引入 shallow equality 检查
   - 避免相同数据导致的引用变化和不必要重渲染
   - 影响: `scope.ts` 或 `hooks.ts`

3. **Retryer 抽象**
   - 将 retry 逻辑从 `action-runtime` 抽取为独立 `createRetryer()` 工厂
   - 共享给 data-source controller 和 ajax action
   - 增加 failureCount / failureReason 追踪
   - 影响: 新文件 `retryer.ts`, 修改 `action-runtime.ts`, `data-source-runtime.ts`

4. **Mutation 生命周期参考**
   - 在 action 链中增加 `onSettled` 回调
   - 评估 `onMutate` context + rollback 协议的可行性
   - 影响: `action-runtime.ts`, 类型定义

### P2 — 远期观察

5. **批量通知优化**
   - 评估在 RendererRuntime 层引入 notifyManager 风格的批调度
   - 多 source 同时刷新时的合并通知
   - 影响: `renderer-runtime` 核心路径

6. **Tag-based 批量失效**
   - 在 data-source schema 中增加可选 `tag` 字段
   - `refreshSources({ tag: 'user-list' })` 批量刷新同 tag 的所有 source
   - 影响: schema 类型, source-registry

---

## 五、不应照搬的设计

| TanStack Query 设计                      | 不照搬的原因                                         |
| ---------------------------------------- | ---------------------------------------------------- |
| 全局 QueryCache + queryHash key          | 低代码的 data-source 绑定 scope，不需要全局共享      |
| gcTime + Removable 垃圾回收              | scope dispose 已经是更可靠的清理机制                 |
| Proxy tracked-props                      | 编译器生成的 selector 可以精确控制粒度               |
| enable/disable 函数式配置                | Flux 的 data-source 通过 schema condition 控制更自然 |
| networkMode (always/online/offlineFirst) | 低代码运行环境通常是可控内网                         |
| infiniteQuery / pagination 行为          | Flux 的列表分页由 table renderer 自行管理            |

---

## 六、架构哲学差异

### TanStack Query: 命令式 + 查询键驱动

```
开发者 → useQuery({ queryKey, queryFn })
       → QueryObserver 订阅 QueryCache 中的 Query
       → Query 通过 queryFn 获取数据
       → 数据缓存在全局 QueryCache 中
       → queryClient.invalidateQueries() 手动失效
```

核心假设：开发者精确控制查询键、缓存策略、失效时机。

### Flux: 声明式 + 依赖追踪驱动

```
Schema → data-source { name, api, interval }
      → DataSourceController 自动注册到 scope registry
      → 运行时自动收集 API 配置中的依赖路径
      → scope 变更触发依赖匹配 → 自动刷新
      → 结果写入 scope.dataPath → useScopeSelector 响应式消费
```

核心假设：schema 声明意图，运行时自动管理依赖、缓存和失效。

这两种哲学没有优劣之分，但决定了哪些设计可以互相借鉴、哪些不适合。TanStack Query 的"手动控制"模式适合应用开发者，Flux 的"声明式自动"模式适合低代码 schema 运行时。

---

## 源码索引

### TanStack Query 关键文件

| 文件                              | 关注点                                            |
| --------------------------------- | ------------------------------------------------- |
| `query-core/src/query.ts`         | 状态机 reducer, fetch 生命周期, observer 管理     |
| `query-core/src/queryObserver.ts` | React 桥接, tracked props, optimistic result      |
| `query-core/src/retryer.ts`       | 独立重试执行器, 指数退避, pause/continue          |
| `query-core/src/notifyManager.ts` | 事务式批调度                                      |
| `query-core/src/mutation.ts`      | 变更生命周期 onMutate/onError/onSuccess/onSettled |
| `query-core/src/queryCache.ts`    | 全局缓存, GC, find/findAll                        |
| `query-core/src/removable.ts`     | GC 基类                                           |
| `query-core/src/subscribable.ts`  | 发布订阅基类                                      |
| `react-query/src/useBaseQuery.ts` | React 集成 useSyncExternalStore                   |

### Flux 关键文件

| 文件                                      | 关注点                            |
| ----------------------------------------- | --------------------------------- |
| `flux-runtime/src/data-source-runtime.ts` | DataSourceController 生命周期     |
| `flux-runtime/src/source-registry.ts`     | scope-scoped 注册表, 依赖追踪     |
| `flux-runtime/src/api-cache.ts`           | LRU 请求缓存                      |
| `flux-runtime/src/reaction-runtime.ts`    | 声明式副作用, watch/when/debounce |
| `flux-runtime/src/scope-change.ts`        | 依赖路径匹配                      |
| `flux-runtime/src/action-runtime.ts`      | action 分发, retry 逻辑           |
| `flux-react/src/hooks.ts`                 | useScopeSelector, 表单 hooks      |
| `docs/architecture/api-data-source.md`    | data-source/reaction 架构设计     |

---

## 相关文档

- `docs/architecture/api-data-source.md` — Flux data-source/reaction 设计规范
- `docs/architecture/flux-runtime-module-boundaries.md` — 运行时模块边界
- `docs/architecture/renderer-runtime.md` — 渲染器运行时
- `docs/analysis/2026-04-04-formily-vs-flux-final-report.md` — Formily 对比分析（参考分析风格）

# 43 TanStack Query 启发的运行时改进计划

> Plan Status: draft
> Last Reviewed: 2026-04-08
> Source: `docs/analysis/tanstack-query-comparison.md` 对比分析结果

## 与现有计划的关系

- `docs/plans/42-design-convergence-and-runtime-improvement-plan.md` — **已完成**。Phase 1 补齐了 name-first identity + statusPath + mergeToScope；Phase 3 补齐了 onError 递归保护 + framework fallback；Phase 4 提取了 `operation-control.ts`。本计划在 Plan 42 完成的底座上推进状态机和数据层优化。
- `docs/plans/37-flux-core-runtime-architecture-convergence-plan.md` — 依赖追踪基线。本计划依赖其依赖收集机制但不干预其实现。
- `docs/analysis/tanstack-query-comparison.md` — 本计划的完整分析依据。本文不重复分析细节，只描述"做什么"和"为什么"。

---

## Problem

对比 TanStack Query v5 核心架构（~/sources/query/packages/query-core/src/）与 Flux 当前 data-source / reaction / operational control 实现，识别出以下 4 个值得改进的差距。每个差距按以下格式描述：现状 → 问题 → 参考 → 期望状态。

### P1: DataSourceController 缺少显式状态机

**现状**：`data-source-runtime.ts` 中 `DataSourceController` 的状态由 5 个散落的 closure 变量管理：

```typescript
let started = false;
let stopped = false;
let loading = false;
let stale = false;
let value: unknown = initialData;
let error: unknown;
```

这些变量在 `runRequest()`、`start()`、`stop()` 中直接赋值，没有集中的状态转换逻辑。

**问题**：

1. **无法表达关键状态组合**：当 API source 有旧数据且正在后台刷新时，`loading=true, stale=true, value=<旧数据>` —— 这组状态丢失了"数据有效但正在刷新"的语义。UI 无法区分"首次加载中"和"有数据的后台刷新"。
2. **无法表达"有数据但请求失败"**：当后台 refetch 失败时，`loading=false, error=<错误>, value=<旧数据>` —— UI 无法知道旧数据仍然有效且请求失败了。
3. **缺少时间戳**：没有 `dataUpdatedAt` / `errorUpdatedAt`，无法判断数据新鲜度。
4. **状态不一致风险**：散落赋值没有强制转换约束。例如 `runRequest()` 的 catch 块中设置 `loading = false; stale = value !== undefined; error = caughtError;`，如果后续代码在中间位置抛出异常，状态可能停留在中间态。

**参考**：TanStack Query 的 `QueryState` 使用双轨状态 + reducer 模式：

```typescript
// TanStack Query: 两条独立轨道
interface QueryState {
  status: 'pending' | 'error' | 'success';      // 数据轨道
  fetchStatus: 'fetching' | 'paused' | 'idle';  // 网络轨道
  data: T | undefined;
  error: TError | null;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  dataUpdateCount: number;
  errorUpdateCount: number;
  isInvalidated: boolean;
}
```

状态通过 `#dispatch(action)` 以 reducer 模式集中转换：

```typescript
// 所有状态变更经过唯一入口
#dispatch(action: Action): void {
  this.state = reducer(this.state)
  notifyManager.batch(() => {
    this.observers.forEach(o => o.onQueryUpdate())
  })
}
```

**期望状态**：Flux 的 `DataSourceController` 拥有显式状态机，能表达所有有意义的状态组合，状态转换集中且可审计。

---

### P2: 缺少结构共享（Structural Sharing）

**现状**：`data-source-runtime.ts` 中 API 请求完成后直接调用 `writeDataToScope(scope, dataPath, response.data)` 写入 scope。当 API 返回与上次结构相同但引用不同的数据时（例如轮询返回相同列表），scope snapshot 会变化，触发所有相关 `useScopeSelector` 重新计算。

**问题**：

1. **轮询场景的无效重渲染**：`interval: 3000` 的轮询 source 每次请求都会写入 scope，即使数据未变。消费该数据的所有 renderer 都会重渲染。
2. **`useScopeSelector` 的 equalityFn 负担**：消费者需要自行实现 `shallowEqual` 或 `deepEqual` 来避免无效重渲染，增加了使用成本。
3. **与编译器优化的冲突**：编译器对静态节点做了引用复用优化（`isStatic: true` 直接返回原值），但动态 API 数据绕过了这层优化。

**参考**：TanStack Query 的 `replaceData()` 在设置新数据时执行结构共享：

```typescript
// TanStack Query: utils.ts
function replaceData<TData>(prevData, data, options) {
  if (typeof options.structuralSharing === 'function') {
    return options.structuralSharing(prevData, data)
  }
  if (options.structuralSharing !== false) {
    // 深度结构共享：如果数据结构相同，保留旧引用
    return deepEqual(prevData, data) ? prevData : data
  }
  return data
}
```

效果：即使 `query.fetch()` 返回了新的 JSON 对象，如果数据与缓存相同，消费者拿到的仍然是同一个引用，React 组件不会重渲染。

**期望状态**：API source 的数据写入 scope 时，如果新数据与旧数据 shallow equal，跳过写入或保留旧引用，避免不必要的订阅通知。

---

### P3: Retryer 缺少指数退避和失败追踪

**现状**：`operation-control.ts` 的 `withRetry()` 使用固定 delay 重试：

```typescript
// 当前实现：固定 delay，无指数退避
while (attempts <= retryTimes) {
  lastResult = await fn();
  if (shouldStop(lastResult)) return { result: lastResult, attempts };
  if (retryDelay > 0) await sleep(retryDelay);  // 固定延迟
}
```

返回值只有 `{ result, attempts }`，没有失败原因追踪。

**问题**：

1. **固定延迟不适合瞬态故障恢复**：网络请求失败通常需要指数退避（1s → 2s → 4s → 8s），而非固定间隔重复。固定延迟在服务器压力下会加剧负载。
2. **缺少失败原因**：`DataSourceController.getState()` 只有 `error: unknown`，没有 `failureCount` 和 `failureReason`。UI 无法显示"已重试 3 次，最后一次因为网络超时"。
3. **与 TanStack Query 的差距**：TanStack Query 的 `Retryer` 支持指数退避、暂停/恢复、取消（含 revert）、`failureCount` / `failureReason` 追踪。

**参考**：TanStack Query 的 `createRetryer()`:

```typescript
function defaultRetryDelay(failureCount: number) {
  return Math.min(1000 * 2 ** failureCount, 30000)  // 1s, 2s, 4s, 8s, 16s, 30s...
}

// 失败追踪
config.onFail?.(failureCount, error)

// 状态追踪
interface QueryState {
  fetchFailureCount: number;
  fetchFailureReason: TError | null;
}
```

**期望状态**：`operation-control.ts` 的 `withRetry()` 支持指数退避策略和失败追踪，`DataSourceController` 的 `getState()` 包含 `failureCount` 和 `failureReason`。

---

### P4: Action 链缺少 onSettled 统一完成回调

**现状**：Flux action 链支持 `then`（成功回调）和 `onError`（失败回调），但没有无论成功失败都执行的 `onSettled` 回调。

**问题**：

1. **清理逻辑需要重复写两遍**：例如"提交表单后关闭 loading 状态"，需要在 `then` 和 `onError` 中分别写 `setLoading(false)`。
2. **与 TanStack Query Mutation 的差距**：Mutation 有标准化的 `onMutate → onSuccess/onError → onSettled` 生命周期，`onSettled` 保证在成功和失败路径都会执行。

**参考**：TanStack Query Mutation lifecycle:

```typescript
try {
  const data = await retryer.start()
  await options.onSuccess?.(data, variables, context)
  await options.onSettled?.(data, null, variables, context)  // 成功路径也走 settled
} catch (error) {
  await options.onError?.(error, variables, context)
  await options.onSettled?.(undefined, error, variables, context)  // 失败路径也走 settled
}
```

**期望状态**：Flux action 链增加可选 `onSettled` 回调，在 `then` 或 `onError` 之后无条件执行。

---

## Root Cause

1. **状态模型的历史路径**：`DataSourceController` 最初设计为简单的"请求 → 写入 scope"流程，状态变量是为 API-backed source 手动添加的。随着 formula source、依赖追踪、轮询等能力叠加，状态维度增加但没有回过头来统一模型。
2. **缺少对"后台刷新"场景的专门设计**：当前 `loading` 只区分"正在请求"和"非请求中"，没有考虑"有数据的同时正在刷新"这个高频场景。
3. **重试逻辑在 Plan 42 Phase 4 中被提取但未增强**：提取时保持了原有简单语义（固定延迟），没有利用提取后的独立性来增强能力。
4. **Action 链的回调模型在 Plan 42 Phase 3 中聚焦了 onError 补全，但未触及 onSettled**：这是一个合理的前后排序——先补齐错误处理，再补齐完成回调。

---

## Goals

1. **DataSourceController 状态机**：引入 `status + fetchStatus` 双轨状态机 + reducer，替代散落的 boolean flags。增加 `dataUpdatedAt` / `errorUpdatedAt` / `failureCount` / `failureReason`。
2. **结构共享**：在 `DataSourceController` 写入 scope 前，对新旧数据执行 shallow equality 检查，相同则跳过写入。
3. **Retryer 增强**：为 `operation-control.ts` 的 `withRetry()` 增加指数退避策略和失败追踪回调。
4. **Action 链 onSettled**：在 action schema 类型中增加 `onSettled` 回调字段，在 action-runtime 的 `dispatch()` 中实现执行逻辑。

## Non-Goals

- 不引入 TanStack Query 的全局 QueryCache / gcTime / Removable 机制。Flux 的 scope-scoped registry 已覆盖。
- 不引入网络在线/离线感知（`networkMode` / `onlineManager`）。低代码运行环境通常可控。
- 不引入 Proxy tracked-props 自动追踪。编译器生成的 selector 可以精确控制。
- 不引入手动 `invalidateQueries()` 模式。Flux 的依赖追踪已覆盖自动失效。
- 不引入 MutationObserver / useMutation hook。Flux 的 action dispatch 模型已覆盖变更操作。
- 不修改 ScopeRef / ScopeStore 的核心接口。只修改 DataSourceController 的内部实现。
- 不修改 `statusPath` 的发布格式（Plan 42 Phase 1 已定义），只在其中增加新字段。

---

## Implementation Plan

### Phase 1: DataSourceController 状态机

**前置条件**：Plan 42 Phase 1 已完成（statusPath 已接线）。

**目标**：将 `DataSourceController` 的散落 boolean flags 替换为集中式状态机。

#### 1.1 定义状态类型

文件：`packages/flux-core/src/types/runtime.ts`

替换当前的 `DataSourceController.getState()` 返回类型：

```typescript
// Before (Plan 42 后)
export interface DataSourceController {
  getState(): {
    started: boolean;
    loading: boolean;
    stale: boolean;
    value?: unknown;
    error?: unknown;
  };
  start(): void;
  stop(): void;
  refresh(): Promise<void>;
}

// After
export type DataSourceStatus = 'idle' | 'pending' | 'success' | 'error';
export type DataSourceFetchStatus = 'idle' | 'fetching' | 'paused';

export interface DataSourceState {
  /** 数据轨道：数据本身是否可用 */
  status: DataSourceStatus;
  /** 网络轨道：当前是否有请求活动 */
  fetchStatus: DataSourceFetchStatus;
  /** 当前数据（success 时有值） */
  data: unknown;
  /** 当前错误（error 时有值） */
  error: unknown;
  /** 数据上次成功更新的时间戳 */
  dataUpdatedAt: number;
  /** 错误上次发生的时间戳 */
  errorUpdatedAt: number;
  /** 连续请求失败次数（成功后重置为 0） */
  failureCount: number;
  /** 最近一次失败的原因 */
  failureReason: unknown;
}

export interface DataSourceController {
  getState(): DataSourceState;
  start(): void;
  stop(): void;
  refresh(): Promise<void>;
}
```

双轨状态的组合语义：

| status | fetchStatus | 含义 | 旧模型对应 |
| --- | --- | --- | --- |
| `idle` | `idle` | 未启动 | `started=false` |
| `pending` | `fetching` | 首次加载中 | `loading=true, value=undefined` |
| `success` | `fetching` | 有数据，后台刷新中 | `loading=true, stale=true, value≠undefined` |
| `success` | `idle` | 有数据，无请求 | `loading=false, stale=false` |
| `error` | `idle` | 请求失败，无数据 | `loading=false, error≠undefined, value=undefined` |
| `error` | `fetching` | 有错误，正在重试 | `loading=true, error≠undefined` |

#### 1.2 实现 Reducer

文件：`packages/flux-runtime/src/data-source-runtime.ts`

在 `createDataSourceController()` 内部替换散落变量：

```typescript
// 旧: 散落的 closure 变量
// let loading = false; let stale = false; let value = initialData; let error;

// 新: 集中的 state 对象 + reducer
type DataSourceAction =
  | { type: 'init'; initialData?: unknown }
  | { type: 'fetch' }
  | { type: 'success'; data: unknown }
  | { type: 'error'; error: unknown }
  | { type: 'failed'; failureCount: number; failureReason: unknown }
  | { type: 'invalidate' }
  | { type: 'pause' }
  | { type: 'continue' };

function dataSourceReducer(
  state: DataSourceState,
  action: DataSourceAction
): DataSourceState {
  switch (action.type) {
    case 'init':
      return {
        ...state,
        status: action.initialData !== undefined ? 'success' : 'idle',
        data: action.initialData,
        dataUpdatedAt: action.initialData !== undefined ? Date.now() : 0,
      };
    case 'fetch':
      return {
        ...state,
        fetchStatus: 'fetching',
        ...(state.status === 'idle' && {
          status: 'pending',
          error: undefined,
        }),
      };
    case 'success':
      return {
        ...state,
        status: 'success',
        fetchStatus: 'idle',
        data: action.data,
        error: undefined,
        dataUpdatedAt: Date.now(),
        failureCount: 0,
        failureReason: undefined,
      };
    case 'error':
      return {
        ...state,
        status: 'error',
        fetchStatus: 'idle',
        error: action.error,
        errorUpdatedAt: Date.now(),
        failureCount: state.failureCount + 1,
        failureReason: action.error,
      };
    case 'failed':
      return {
        ...state,
        failureCount: action.failureCount,
        failureReason: action.failureReason,
      };
    case 'invalidate':
      return { ...state, /* isInvalidated flag if needed */ };
    case 'pause':
      return { ...state, fetchStatus: 'paused' };
    case 'continue':
      return { ...state, fetchStatus: 'fetching' };
  }
}
```

`runRequest()` 内部替换直接赋值为 `dispatch` 调用：

```typescript
// 旧:
// loading = true; stale = value !== undefined; error = undefined;

// 新:
dispatch({ type: 'fetch' });

// 旧:
// value = response.data; loading = false; stale = false; error = undefined;

// 新:
dispatch({ type: 'success', data: response.data });

// 旧:
// loading = false; error = caughtError; stale = value !== undefined;

// 新:
dispatch({ type: 'error', error: caughtError });
```

#### 1.3 statusPath 发布适配

文件：`packages/flux-runtime/src/data-source-runtime.ts`

当 `statusPath` 存在时，在每次 `dispatch()` 后更新 statusPath：

```typescript
function publishStatus() {
  if (!statusPath) return;
  const s = state;
  scope.update(statusPath, {
    loading: s.fetchStatus === 'fetching',
    ready: s.status === 'success',
    stale: s.fetchStatus === 'fetching' && s.status === 'success',
    error: s.error,
    dataUpdatedAt: s.dataUpdatedAt,
    failureCount: s.failureCount,
    failureReason: s.failureReason,
  });
}
```

**向后兼容**：`statusPath` DTO 的 `loading` / `ready` / `stale` / `error` 字段不变（Plan 42 已定义），只增加 `dataUpdatedAt` / `failureCount` / `failureReason`。

#### 1.4 Formula source 适配

文件：`packages/flux-runtime/src/source-registry.ts`

`createDependencyAwareFormulaController()` 同样替换散落变量为状态机。Formula source 不使用 `fetchStatus`（同步计算），简化为 `status: 'success' | 'error'`。

#### 1.5 测试

- **状态机单元测试**：`dataSourceReducer` 的每个 action → 预期 state
  - fetch from idle → pending + fetching
  - success → success + idle + dataUpdatedAt
  - error from pending → error + idle
  - error from success → error + idle (旧数据丢失语义已通过 status 体现)
  - fetch from success → success + fetching (后台刷新)
- **集成测试**：`createDataSourceController` 的 `getState()` 在各阶段返回正确状态
- **statusPath 发布测试**：dispatch 后 scope 中 statusPath 的值正确
- **向后兼容测试**：现有 data-source schema 功能不受影响
- **Formula source 测试**：formula controller 状态转换正确

**预估 LOC**：~250 行类型 + ~350 行逻辑改动 + ~500 行测试

---

### Phase 2: 结构共享

**前置条件**：Phase 1 完成（状态机已就位，dispatch 集中了写入逻辑）。

**目标**：API source 的数据写入 scope 前，对新旧数据执行 shallow equality 检查。

#### 2.1 实现 shallow equal 工具

文件：`packages/flux-core/src/utils.ts`（或 `packages/flux-runtime/src/` 如果 utils 不适合放纯函数）

```typescript
/**
 * Shallow structural sharing: 如果新旧值在第一层属性上完全相同，
 * 返回旧引用（避免引用变化触发不必要的 React 重渲染）。
 * 对于非对象值直接使用 Object.is。
 */
export function structuralShare<T>(prevValue: T | undefined, nextValue: T): T {
  if (Object.is(prevValue, nextValue)) return nextValue;
  if (prevValue === undefined || nextValue === undefined) return nextValue;
  if (typeof prevValue !== 'object' || typeof nextValue !== 'object') return nextValue;
  if (prevValue === null || nextValue === null) return nextValue;
  if (Array.isArray(prevValue) !== Array.isArray(nextValue)) return nextValue;

  if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
    if (prevValue.length !== nextValue.length) return nextValue;
    for (let i = 0; i < prevValue.length; i++) {
      if (!Object.is(prevValue[i], nextValue[i])) return nextValue;
    }
    return prevValue as T;  // 保留旧引用
  }

  const prevKeys = Object.keys(prevValue);
  const nextKeys = Object.keys(nextValue);
  if (prevKeys.length !== nextKeys.length) return nextValue;
  for (const key of prevKeys) {
    if (!Object.is((prevValue as any)[key], (nextValue as any)[key])) return nextValue;
  }
  return prevValue as T;  // 保留旧引用
}
```

#### 2.2 在 dispatch success action 中集成

文件：`packages/flux-runtime/src/data-source-runtime.ts`

在 reducer 的 `success` case 中应用结构共享：

```typescript
case 'success': {
  const sharedData = structuralShare(state.data, action.data);
  return {
    ...state,
    status: 'success',
    fetchStatus: 'idle',
    data: sharedData,
    // ...如果 structuralShare 返回旧引用，dataUpdatedAt 不需要更新
    ...(sharedData !== state.data && { dataUpdatedAt: Date.now() }),
    error: undefined,
    failureCount: 0,
    failureReason: undefined,
  };
}
```

关键点：`structuralShare` 在 **reducer 内部** 执行，确保 `scope.update` 只在数据真正变化时被调用（因为 `dispatch` 后的 `publishStatus` + `writeDataToScope` 会比较新旧 data）。

#### 2.3 在 scope.update 层增加跳过写入优化

文件：`packages/flux-runtime/src/data-source-runtime.ts`（`writeDataToScope` 调用处）

在调用 `scope.update(dataPath, newData)` 前检查：

```typescript
// 在 dispatch({ type: 'success', data }) 之后
if (state.data !== previousState.data) {
  // 引用变了才写入 scope
  writeDataToScope(scope, dataPath, state.data);
}
```

这利用了 `structuralShare` 的结果：如果数据相同，`state.data` 仍然是旧引用，`!==` 比较失败，跳过写入。

#### 2.4 配置化

结构共享默认开启，但提供关闭选项以应对极端场景：

在 `DataSourceSchema` 或创建 controller 的参数中增加可选：

```typescript
interface DataSourceControllerConfig {
  // ... existing ...
  structuralSharing?: boolean;  // default: true
}
```

#### 2.5 测试

- **structuralShare 单元测试**：
  - 相同对象引用 → 返回旧引用
  - shallow equal 但不同引用 → 返回旧引用
  - 不同属性值 → 返回新值
  - 数组 shallow equal → 返回旧引用
  - 数组长度不同 → 返回新值
  - primitive 值（string/number/boolean/null）→ Object.is 语义
- **集成测试**：
  - API 返回相同数据 → scope.update 不被调用（或被调用但 snapshot 不变）
  - API 返回不同数据 → scope.update 正常执行
  - 轮询场景：连续 5 次相同响应，验证 scope update 次数 = 1（仅首次）
  - `structuralSharing: false` 时行为退化为每次都写入

**预估 LOC**：~80 行工具函数 + ~60 行集成改动 + ~300 行测试

---

### Phase 3: Retryer 增强

**前置条件**：Phase 1 完成（状态机已增加 `failureCount` / `failureReason` 字段）。

**目标**：增强 `operation-control.ts` 的 `withRetry()`，支持指数退避和失败追踪。

#### 3.1 扩展 RetryOptions

文件：`packages/flux-runtime/src/operation-control.ts`

```typescript
// Before
export interface RetryOptions {
  times: number;
  delay?: number;
}

// After
export interface RetryOptions {
  times: number;
  delay?: number;
  /** 使用指数退避策略。delay 作为初始延迟。默认 false。 */
  exponentialBackoff?: boolean;
  /** 最大延迟（毫秒），仅 exponentialBackoff 模式生效。默认 30000。 */
  maxDelay?: number;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  failureCount: number;
  lastFailureReason?: unknown;
}
```

#### 3.2 增强 withRetry

文件：`packages/flux-runtime/src/operation-control.ts`

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  shouldStop: (result: T) => boolean
): Promise<RetryResult<T>> {
  const retryTimes = Math.max(0, options.times);
  const useExponential = options.exponentialBackoff ?? false;
  const maxDelay = options.maxDelay ?? 30000;
  const baseDelay = Math.max(0, options.delay ?? (useExponential ? 1000 : 0));

  let attempts = 0;
  let failureCount = 0;
  let lastFailureReason: unknown;
  let lastResult: T | undefined;

  while (attempts <= retryTimes) {
    attempts += 1;

    try {
      lastResult = await fn();
    } catch (error) {
      failureCount += 1;
      lastFailureReason = error;

      if (attempts > retryTimes) {
        throw error;  // 重试耗尽，抛出
      }

      // 计算延迟
      const delay = useExponential
        ? Math.min(baseDelay * (2 ** (failureCount - 1)), maxDelay)
        : baseDelay;

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      continue;  // 不检查 shouldStop，因为 fn() 抛了异常
    }

    if (shouldStop(lastResult)) {
      return { result: lastResult, attempts, failureCount, lastFailureReason };
    }

    if (attempts > retryTimes) break;

    const delay = useExponential
      ? Math.min(baseDelay * (2 ** attempts), maxDelay)
      : baseDelay;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { result: lastResult!, attempts, failureCount, lastFailureReason };
}
```

**向后兼容**：`RetryResult` 扩展了原来的 `{ result, attempts }`，增加了 `failureCount` 和 `lastFailureReason`。`exponentialBackoff` 默认 false 保持旧行为。

#### 3.3 DataSourceController 接入

文件：`packages/flux-runtime/src/data-source-runtime.ts`

在 `runRequest()` 中使用增强后的 `withRetry()`:

```typescript
// 当 schema.control.retry 配置存在时
const retryResult = await withRetry(
  () => executeApiSchema(...),
  {
    times: control.retry ?? 0,
    delay: control.retryDelay ?? 1000,
    exponentialBackoff: true,  // API 请求默认使用指数退避
    maxDelay: 30000,
  },
  (result) => true  // API 请求成功即停止
);
```

在 dispatch 中记录失败信息：

```typescript
// withRetry 的 onFail 回调或 catch 块中
dispatch({ type: 'failed', failureCount, failureReason });
```

#### 3.4 测试

- **指数退避计算测试**：
  - `delay=1000, exponentialBackoff=true`: 第 1 次重试延迟 1000ms, 第 2 次 2000ms, 第 3 次 4000ms
  - `maxDelay=10000`: 延迟不超过 10000ms
  - `exponentialBackoff=false`: 固定 delay
- **失败追踪测试**：
  - 3 次重试全失败 → `failureCount=3, lastFailureReason=最后一个错误`
  - 第 2 次重试成功 → `failureCount=1, lastFailureReason=第一次错误`
- **向后兼容测试**：
  - 不传 `exponentialBackoff` 时行为与旧 `withRetry` 一致
  - 不传 `maxDelay` 时默认 30000
- **DataSourceController 集成测试**：
  - API 请求失败 + retry 配置 → getState() 的 failureCount 递增
  - 最终成功 → failureCount 重置为 0

**预估 LOC**：~100 行改动 + ~250 行测试

---

### Phase 4: Action 链 onSettled 回调

**前置条件**：无。可与其他 Phase 并行。

**目标**：在 action schema 类型和 action-runtime 中增加 `onSettled` 回调。

#### 4.1 Schema 类型扩展

文件：`packages/flux-core/src/types/schema.ts`

在 `ActionSchema` 相关类型中增加 `onSettled`:

```typescript
// 在 action 相关字段定义处增加
onSettled?: ActionSchema;
```

#### 4.2 Schema Compiler 字段分类

文件：`packages/flux-runtime/src/schema-compiler/fields.ts`

将 `onSettled` 加入 action 字段分类（与 `then`、`onError` 同类）。

#### 4.3 Action Runtime 执行逻辑

文件：`packages/flux-runtime/src/action-runtime.ts`

在 `dispatch()` 的成功和失败路径都执行 `onSettled`:

```typescript
// 成功路径（then 之后）
if (normalizedAction.then) {
  await dispatch(normalizedAction.then, nextCtx, ...);
}
// 无论成功失败，如果有 onSettled，执行之
if (normalizedAction.onSettled) {
  await dispatch(normalizedAction.onSettled, {
    ...nextCtx,
    event: {
      ...result,
      settledAt: Date.now(),
    },
  }, ...);
}

// 失败路径（onError 之后）
if (normalizedAction.onError) {
  await dispatch(normalizedAction.onError, errorCtx, ...);
}
// 无论成功失败，如果有 onSettled，执行之
if (normalizedAction.onSettled) {
  await dispatch(normalizedAction.onSettled, {
    ...errorCtx,
    event: {
      ok: false,
      error: result.error,
      settledAt: Date.now(),
    },
  }, ...);
}
```

**重要**：`onSettled` 不应该再次触发 `onError` 递归保护（它本身不是错误处理），但应该有 depth tracking 以防止无限链。

#### 4.4 测试

- **成功路径测试**：action 成功 → then 执行 → onSettled 执行 → onSettled 的 event.ok === true
- **失败路径测试**：action 失败 → onError 执行 → onSettled 执行 → onSettled 的 event.ok === false
- **无 then/onError 时的 onSettled**：action 无 then → 成功 → onSettled 仍然执行
- **onSettled 链深度保护**：onSettled 内的 action 也有 onSettled → 不会无限递归
- **与 Plan 42 Phase 3 的 onError depth 保护兼容**：onSettled 不增加 onError depth

**预估 LOC**：~30 行类型 + ~80 行逻辑 + ~200 行测试

---

## Execution Order

```
Phase 4 (onSettled) ──────────────────────────── 可立即执行，无前置依赖
Phase 1 (状态机) ─────────────────────────────── Plan 42 Phase 1 已完成后可开始
Phase 2 (结构共享) ──────────────────────────── 等待 Phase 1 完成
Phase 3 (Retryer 增强) ─────────────────────── 等待 Phase 1 完成（需要 failureCount 字段）
```

Phase 4 可以与 Phase 1 并行推进。

---

## Risk Assessment

| 风险 | 影响 | 缓解 |
|---|---|---|
| Phase 1 状态机改造影响现有 statusPath 发布格式 | 高 | statusPath DTO 的 `loading/ready/stale/error` 保持不变，只增加新字段。现有消费 statusPath 的 schema 不受影响 |
| Phase 1 改变了 `DataSourceController.getState()` 的返回类型 | 高 | `getState()` 的返回类型从 `{ started, loading, stale, value, error }` 变为 `DataSourceState`。需要同步更新所有消费 `getState()` 的代码（statusPath 发布、debugger snapshot、测试）。搜索所有 `getState()` 使用点确保覆盖 |
| Phase 2 structuralShare 的 shallow equal 判断对深层嵌套数据不敏感 | 中 | 这是设计意图——shallow equal 足以避免 API 返回完全相同对象时的无效写入。深层变化一定是 shallow 也变化的（新对象）。如果 future 需要更精细控制，可以在 `structuralSharing` 选项中支持自定义函数 |
| Phase 3 指数退避改变 retry 时机 | 低 | 默认 `exponentialBackoff=false`，只有显式配置时才启用。旧行为完全保留 |
| Phase 4 onSettled 与 onError 的交互 | 中 | onSettled 在 onError 之后执行，不在 onError 的递归保护范围内。需要独立的 depth tracking 防止 onSettled 链无限递归 |

---

## Estimated Total Effort

| Phase | 新增/修改 LOC | 测试 LOC | 合计 |
|---|---|---|---|
| Phase 1 (状态机) | ~600 | ~500 | ~1,100 |
| Phase 2 (结构共享) | ~140 | ~300 | ~440 |
| Phase 3 (Retryer 增强) | ~100 | ~250 | ~350 |
| Phase 4 (onSettled) | ~110 | ~200 | ~310 |
| **合计** | **~950** | **~1,250** | **~2,200** |

---

## Verification Criteria

计划完成的标准：

1. **状态机**：`DataSourceController.getState()` 返回 `DataSourceState`（含 `status`, `fetchStatus`, `dataUpdatedAt`, `errorUpdatedAt`, `failureCount`, `failureReason`）。所有状态转换经过 `dispatch(action)` 集中处理。`statusPath` 发布的 DTO 包含新增字段且向后兼容。
2. **结构共享**：轮询 source 连续返回相同数据时，`scope.update` 不被调用（或调用但 snapshot 引用不变）。`structuralSharing: false` 时退化为每次写入。
3. **Retryer**：`withRetry()` 支持 `exponentialBackoff: true` 时使用指数退避延迟。`RetryResult` 包含 `failureCount` 和 `lastFailureReason`。不传 `exponentialBackoff` 时行为与旧版一致。
4. **onSettled**：action schema 支持 `onSettled` 字段，成功和失败路径都会执行。onSettled 有独立的 depth tracking。

---

## Related Documents

- `docs/analysis/tanstack-query-comparison.md` — 本计划的完整分析依据
- `docs/architecture/api-data-source.md` — data-source/reaction 架构设计
- `docs/plans/42-design-convergence-and-runtime-improvement-plan.md` — 前置计划（已完成）
- `packages/flux-runtime/src/data-source-runtime.ts` — 主要改动文件
- `packages/flux-runtime/src/source-registry.ts` — source 注册表（formula controller 适配）
- `packages/flux-runtime/src/operation-control.ts` — retry 增强文件
- `packages/flux-core/src/types/runtime.ts` — 状态类型定义

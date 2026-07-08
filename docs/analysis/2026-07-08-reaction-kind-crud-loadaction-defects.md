# kind:'reaction' CRUD loadAction 实现缺陷分析

> Status: active analysis（经独立对抗性审查修订）
> Date: 2026-07-08
> Source: `docs/plans/2026-07-07-loadAction-reaction-kind-plan.md` 执行后的代码审查
> Review: 独立子 agent `ses_0c1327897ffemNgCoawi6mHCx7` 对抗性审查（逐条验证源码 + 边界情况分析）
> Related: `docs/architecture/dependency-tracking.md`

## 摘要

`kind: 'reaction'` 基础设施已端到端落地（Phase 1-7），CRUD `loadAction` 迁移到 `kind: 'reaction'` 后 6 个原始测试 + 4 个回归测试全绿。但进一步审查 + 独立对抗性验证发现 3 个需修复的缺陷 + 2 个额外问题：

- **缺陷 1（严重）**：响应式触发路径缺少 CRUD evaluationBindings —— 外部 binding 变化和手动刷新时 action 参数缺失
- **缺陷 2（中等）**：CRUD 内部状态变化未走显式 dispatch —— server-correction 导致冗余 fetch
- **缺陷 3（中等）**：`scope.update` 缺少值比较 —— 同值写入也触发变更通知
- **额外问题 4**：regression test "external binding triggers refetch" 是空测试，无法捕获缺陷 1
- **额外问题 5**：`force()`/`reload()` 路径同样缺少 CRUD bindings（与缺陷 1 同源）

---

## CRUD 触发模型

先明确 CRUD 有三类触发源，分别走不同路径：

| 触发源                              | 路径                                                           | evaluationBindings 来源                                     | 典型场景                  |
| ----------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| **用户交互**（翻页/查询/排序/筛选） | handler 显式调 `loadReaction.dispatch({ evaluationBindings })` | CRUD 注入 `{ pagination, query, sort, filters, selection }` | 点"下一页"、提交查询      |
| **外部 binding 变化**               | scope change → reaction wrapper → `force()` → `runReaction()`  | **应注入 CRUD 当前状态，但目前缺失**                        | `routeParams.deptId` 变化 |
| **手动刷新**                        | `reload()` → `force()` → `runReaction()`                       | **同样缺失**（与上同源）                                    | `component:refresh` 调用  |
| **server-correction**               | `scope.update(pagination, corrected)` → **不应触发 dispatch**  | 不适用                                                      | 服务器纠正分页            |

设计原则：

- `dependsOn` **只声明外部 binding**（如 `routeParams`），不声明 CRUD 内部状态（`pagination`/`query` 等）
- 翻页/查询由 **handler 显式 dispatch**
- 排序/筛选由 TableRenderer 写 scope → CRUD useEffect 检测变化 → dispatch（**无 CRUD handler 可挂显式 dispatch**）
- server-correction 只写 scope，不在监听范围内，不会引发重新 dispatch

---

## 缺陷 1（严重）：响应式触发路径 + 手动刷新路径缺少 CRUD evaluationBindings

### 现象

两条路径都缺少 CRUD 上下文：

**响应式路径**：当 `dependsOn` 声明的外部 binding（如 `routeParams.deptId`）变化时，reaction wrapper 自动触发 action 执行。但 action 表达式中的 `${pagination.currentPage}` 解析为 `undefined`。

**手动刷新路径**：`reload()` → `loadReaction.force()` → `runReaction()` → dispatch，同样缺少 CRUD bindings。

### 根因追踪

两条路径最终都经过 `runReaction`（`reaction-runtime.ts:247-262`），其 dispatch 调用的 `evaluationBindings` 硬编码为 reaction 事件上下文：

```ts
// reaction-runtime.ts:257-262
evaluationBindings: {
  value: nextValue,       // SYNTHETIC_WATCH 下恒为 true
  prev,                   // 旧 watch 值
  changed,                // boolean
  changedPaths,           // 触发路径
}
// 没有 pagination / query / sort / filters / selection
```

两条路径都经过 wrapper 的 `dispatchWithAbortChain`（`renderer-reaction-handle.ts:143-178`），但 ctx 来自 `runReaction`，不含 CRUD 状态。

### 修复方案（经审查修订）：`dispatchWithAbortChain` 合并方案

~~原方案：修改 `ForceableReactionRegistration.force` 签名加 evaluationBindings 参数，线程化传递到 `runReaction`。~~

**审查结论**：此方案需要改 4 层调用链（`force` 签名 → `reaction-runtime.ts` force 闭包 → `runReaction` dispatch → registry wrapper），过于复杂。

**修订方案**：在 `dispatchWithAbortChain`（两条路径的共同瓶颈点）中合并 callback bindings。只改 `renderer-reaction-handle.ts` 一个文件：

```ts
const dispatchWithAbortChain = async (action, ctx?) => {
  const callbackBindings = getEvaluationBindings?.() ?? {};
  return await input.dispatch(action, {
    ...ctx,
    signal: combinedSignal,
    scope: ctx?.scope ?? input.scope,
    // 合并优先级：显式 bindings（命令式路径传入的）> callback bindings（响应式/force 路径注入的）
    evaluationBindings: { ...callbackBindings, ...ctx?.evaluationBindings },
  });
};
```

**合并优先级**（审查指出的关键点）：

- 命令式路径（`handle.dispatch({ evaluationBindings: { pagination, ... } })`）：ctx 已含 CRUD bindings，`{ ...callbackBindings, ...ctx.evaluationBindings }` 中显式 bindings 覆盖 callback bindings ✅
- 响应式路径（`runReaction` dispatch）：ctx 的 evaluationBindings 是 `{ value, prev, changed, changedPaths }`，callback 注入 `{ pagination, query, ... }`，两者键不冲突，合并后 action 拿到全部 bindings ✅
- 手动刷新路径（`force()` → `runReaction`）：同响应式路径 ✅

### callback 数据源要求（审查指出的关键点）

callback **必须从 scope 直读**（`scope.readOwn()` + `getIn(snapshot, path)`），不能从 React state 闭包读取。

原因：`handleScopeChange` 是 `scope.store.subscribe` 回调，在 scope 更新时**同步**触发。如果 callback 从 React state 闭包读取（`useScopeSelector` 返回值），拿到的是上一次 commit 的渲染值——如果 server-correction 刚写了 pagination 而组件尚未 re-render，闭包值就是过时的。从 scope 直读则总是拿到最新值。

### callback 覆盖的路径

| 路径                             | 经过 `dispatchWithAbortChain`？ | callback 生效？                |
| -------------------------------- | ------------------------------- | ------------------------------ |
| 命令式（`handle.dispatch`）      | ✅                              | ✅（但显式 bindings 优先覆盖） |
| 响应式（scope change → `force`） | ✅                              | ✅                             |
| 手动刷新（`reload` → `force`）   | ✅                              | ✅                             |
| dispose 后                       | `handleScopeChange` 直接 return | 不调用                         |

### 边界情况

- **空 dependsOn**：`createRootDependencySet` 返回 `undefined`，`scopeChangeHitsDependencies` 对 `undefined` 返回 `true`——任何 scope 变化都触发。callback 仍被调用，行为正确。
- **StrictMode 双 mount**：proxy dispose → reactivate，新的 `createRendererReactionHandle` 创建新的 callback。callback 通过 scope 直读保证数据正确。

---

## 缺陷 2（中等）：CRUD 内部状态变化未走显式 dispatch

### 现象

当前 `useCrudLoadAction` 的 useEffect deps 包含所有 CRUD 内部状态（`pagination, query, sort, filters, selection`）。server-correction 写 pagination → useEffect 重跑 → 冗余 fetch。

### 审查发现的关键疏漏

**排序/筛选变更没有 CRUD handler，完全依赖 useEffect 检测。**

追踪 sort/filter 变更的实际来源：

- `crud-renderer.tsx:409-410`：table schema 设置 `sortOwnership: 'scope'` + `sortStatePath`
- TableRenderer **直接通过 `scope.update(sortStatePath, ...)` 写入 sort 变更**——CRUD 没有回调机制接收通知
- 当前完全依赖 useEffect 检测 sort/filters 变化来触发 refetch

如果从 deps 中移除 `sort` 和 `filters`，排序/筛选触发的 refetch 会**静默失效**。

**handleLoadMore（infinite scroll）也依赖 useEffect**：`crud-renderer.tsx:303-321` 更新 pagination 后当 `useLoadAction=true` 时只做 `scope.update` 不调 dispatch。

### 修复方案（经审查修订）：分类处理 + 最小改动

| 状态         | 当前在 deps 中 | 修复后   | 理由                                                                                                                                                |
| ------------ | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pagination` | 是             | **移除** | 翻页/pageSize 有显式 handler（`handleToolbarPageChange`/`handleToolbarPageSizeChange`）；server-correction 不应触发；handleLoadMore 加显式 dispatch |
| `query`      | 是             | **移除** | query submit 有显式 handler（`submitQueryValues`）                                                                                                  |
| `sort`       | 是             | **保留** | sort 变更来自 TableRenderer，无 CRUD handler 可挂显式 dispatch                                                                                      |
| `filters`    | 是             | **保留** | filter 变更来自 TableRenderer，同上                                                                                                                 |
| `selection`  | 是             | **移除** | selection 不应触发 refetch（regression test 设计意图）                                                                                              |

修复后 server-correction 路径：

```
dispatch(page=5) → server 返回 { page: 3 }
  → scope.update(pagination, { currentPage: 3 })
  → pagination 不在 useEffect deps → 不触发重跑 ✅
  → 零冗余 fetch
```

需要加显式 dispatch 的 handler：

- `handleToolbarPageChange`：scope.update 后调 dispatch
- `handleToolbarPageSizeChange`：同上
- `handleLoadMore`（infinite scroll）：同上

useEffect 保留 `sort`、`filters` 在 deps 中，继续通过隐式检测触发 refetch。

### 关于 sort/filters 的设计矛盾

审查指出：pagination/query 走显式 dispatch 而 sort/filters 走 useEffect 隐式监听，破坏了"内部状态统一走显式 dispatch"的设计原则。

替代方案：为 sort/filter 添加从 TableRenderer 到 CRUD 的回调通道（如 `onSortChange` 回调）。但这需要修改 TableRenderer 的接口，超出当前修复范围。当前采用最小改动方案（保留 sort/filters 在 deps 中），将 TableRenderer 回调通道列为 follow-up。

---

## 缺陷 3（中等）：`scope.update` 缺少值比较

### 现象

`scope.update(path, value)` 即使 `value` 与当前值相同，也会通知所有订阅者。而 `scope.merge` 和 `scope.replace` 都有 `Object.is` 值比较。

### 审查发现的关键疏漏

**Page scope 和 Form scope 使用自定义 `update` override，`scope.ts` 的修复对它们无效。**

`scope.ts:484-487` 有分支：

```ts
if (input.update) {
  input.update(path, value, scope);
  return; // ← 跳过默认逻辑
}
```

生产代码中两个最常用的 scope 类型使用了自定义 `update`：

- `page-runtime.ts:73-80`：`store.updateData(path, value)` —— 无值比较
- Form scope 的 `setValue` —— 无值比较

报告原方案只修复 `scope.ts` 默认路径，对 page/form scope **完全无效**。

### 修复方案（经审查修订）

1. 将值比较逻辑提取为共享 helper
2. 在 `scope.ts:update`、`page-runtime.ts:update`、form scope 的 update 三处都调用

```ts
function shouldSkipScopeUpdate(
  snapshot: Record<string, any>,
  path: string,
  value: unknown,
): boolean {
  const oldValue = path ? getIn(snapshot, path) : snapshot;
  return Object.is(oldValue, value);
}
```

### 审查指出的影响评估修正

`Object.is` 只处理**引用相等**和**原始值相等**，不处理**内容相等**。

- `scope.update('query', sameRef)` → `Object.is` 返回 `true` → 跳过 ✅
- `scope.update('count', 42)` 当 count 已为 42 → `Object.is` 返回 `true` → 跳过 ✅
- `scope.update('query', { keywords: 'foo' })` 当 query 内容相同但是新对象 → `Object.is` 返回 `false` → **仍然触发** ⚠️

这意味着：server-correction 每次构造新对象 `{ currentPage: 3, pageSize: 10 }`，即使内容相同 `Object.is` 也判为不等。缺陷 3 的修复**不能**解决 server-correction 的冗余通知——那需要缺陷 2 的修复（移除 pagination deps）。

缺陷 3 的价值在于：与 `merge`/`replace` 的行为对齐，阻止"同引用同值"的无意义通知，减少其他场景的冗余触发。

---

## 额外问题 4：regression test 是空测试

`crud-loadaction-reaction-regression.test.tsx:98-137` 的测试名为"external binding change triggers refetch via kind:reaction scope subscription"，但测试体只验证了初始 mount 加载（`expect(calls).toHaveLength(1)`），**没有在 mount 后改变 `deptId` 来验证 refetch 触发**。

即使缺陷 1 存在，此测试也会通过。需要补充：mount 后修改外部 binding scope 值，验证产生了第二次 load 调用。

---

## 额外问题 5：`force()`/`reload()` 路径缺少 CRUD bindings

`reload()` → `loadReaction.force()` → `runReaction()` → dispatch。action 拿到的是 reaction 事件 bindings，不含 CRUD 状态。

与缺陷 1 同源。修复方案（`dispatchWithAbortChain` 合并）自动覆盖此路径——因为 `force()` → `runReaction()` → `helpers.dispatch` 即 `dispatchWithAbortChain`，callback 会在该处注入 bindings。

---

## 影响评估汇总

| 缺陷/问题                           | 严重性                | 用户可见影响                         | 数据正确性       |
| ----------------------------------- | --------------------- | ------------------------------------ | ---------------- |
| 1. 响应式 + 手动刷新路径缺 bindings | **严重**              | 外部 binding 变化/手动刷新时参数缺失 | 可能返回错误数据 |
| 2. pagination 在 useEffect deps     | **中等**              | server-correction 一次冗余 fetch     | 无错乱           |
| 3. `scope.update` 无值比较          | **中等**              | 同引用同值的无意义通知               | 无错乱           |
| 4. regression test 空测试           | **中等**              | 缺陷 1 无法被测试捕获                | 无直接影响       |
| 5. force/reload 路径缺 bindings     | **严重**（与 1 同源） | 手动刷新参数缺失                     | 可能返回错误数据 |

---

## 修复方案

### 修复 1：`dispatchWithAbortChain` 合并 CRUD bindings

改动范围：仅 `renderer-reaction-handle.ts` + `node-renderer-resolved.tsx` + `crud-renderer-state.ts`

- `renderer-reaction-handle.ts`：`createRendererReactionHandle` 增加 `getEvaluationBindings?: () => Record<string, unknown>` 参数；`dispatchWithAbortChain` 合并 callback bindings（显式 > callback 优先级）
- `node-renderer-resolved.tsx`：`registerRendererReaction` 调用时传入 CRUD bindings provider（从 scope 直读）
- `crud-renderer-state.ts`：CRUD 向 reaction handle 注册 bindings provider callback

覆盖路径：命令式 dispatch ✅、响应式 force ✅、手动刷新 force ✅

### 修复 2：移除 pagination/query/selection 从 useEffect deps

改动范围：仅 `crud-renderer-state.ts` + `crud-renderer.tsx`

- 从 useEffect deps 移除 `pagination`、`query`、`selection`
- 保留 `sort`、`filters`（来自 TableRenderer，无 CRUD handler）
- `handleToolbarPageChange`/`handleToolbarPageSizeChange`/`handleLoadMore` 加显式 dispatch
- useEffect 只保留 mount 初始加载 + sort/filters 变化触发

### 修复 3：`scope.update` 加值比较（覆盖 page/form scope）

改动范围：`scope.ts` + `page-runtime.ts` + form scope update

- 提取共享 helper `shouldSkipScopeUpdate`
- 三处 update 调用点都调用
- 注意：`Object.is` 只处理引用/原始值相等，不处理深比较

### 修复 4：补充 regression test

改动范围：`crud-loadaction-reaction-regression.test.tsx`

- "external binding triggers refetch" 测试补充：mount 后修改外部 binding scope 值 → 验证第二次 load 调用

### 修复顺序（经审查修订）

~~原顺序：3 → 2 → 1~~

**修订顺序：1 → 2 → 3**（或 1+2 并行 → 3+4）

理由：缺陷 2 的修复引入显式 dispatch，但 `reload()`/`force()` 路径仍缺 CRUD bindings（缺陷 1）。如果缺陷 1 未修复，缺陷 2 的 `reload()` 路径的 action 参数仍然缺失。缺陷 1 必须在缺陷 2 之前或同时修复。

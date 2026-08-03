# 79 CRUD loadAction includeScope 失效与 dependsOn 反应式触发死路径（结果被反应注册表丢弃）

## Problem

两个同根缺陷（C4.2 crud 审计维度 7/11 实证，test-first）：

1. **`includeScope` 契约失效**（CONTEXT.md 契约漂移）：
   - `includeScope: '*'` 时请求 `data` 为 `{ '$_crud': { '<id>': {pagination, query, sort, filters, selection} } }` ——CRUD scope 变量被 `$_crud.<id>` 嵌套包装，而非契约声明的扁平 CRUD scope 变量；作者无法按文档消费。
   - `includeScope: ['pagination', 'query']` 时请求 `data` 为 `undefined`——string[] 形式**完全静默失效**（`extractScopeData` 在 node scope 上 `has('pagination')` 恒 false，CRUD scope 变量不在 node scope 的 own 数据里）。
   - 根因：`extractScopeData(scope, includeScope)` 只读 dispatch scope 的 `readOwn()`；CRUD 的 loadAction dispatch scope 是 node scope，CRUD scope 变量只存在于 `evaluationBindings` 与 `$_crud.<id>` 存储路径中。

2. **`dependsOn` 反应式触发死路径**（bug 73 模式：单测绿但真实链路死）：
   - `loadAction: { action, dependsOn: ['deptId'] }` 下，外部 `deptId` 变更触发反应式 dispatch（`registration.force` → `runReaction` → `input.helpers.dispatch`），但**结果被反应注册表丢弃**——CRUD 的 `useCrudLoadAction` effect 是唯一捕获 rows/total 的路径，反应式触发不经过它 → fetch 发出但新数据永不渲染（行集陈旧）。
   - 既有测试（`crud-loadaction-reaction-regression.test.tsx`）只断言「bindings 注入」与「fetch 次数」，**从不断言反应式触发后 rows 是否渲染**（假绿面）。

## Diagnostic Method

1. **test-first 复现**（`crud-loadaction-includescope.test.tsx`）：真实 schema + ajax fetcher 捕获请求，断言 `includeScope: '*'`/`string[]` 按 CONTEXT.md 契约提取——先红（实测 `{$_crud: {...}}` 与 `undefined`）。
2. **test-first 复现**（`crud-loadaction-depends-on-reactive.test.tsx`）：page 内 scope-writer 400ms 后写 `deptId='d7'`，断言新行渲染 + args payload 携带 `d7`——先红（修复前 RowsFord7 永不出现）。
3. **实测分层**：probe 记录显示反应式 fetch 确实发出（count=2），但结果未进入 React state——定位到 `registerReaction` 的 `runReaction` 只 `settleRun` 结果，渲染器无任何 result 通道。

## Root Cause

- 反应式 `force()` 路径的 dispatch 结果没有任何渲染器可见的回传通道——`RendererReactionHandle.dispatchWithAbortChain` 是唯一 dispatch 漏斗（effect 路径与 force 路径都经过它），但 force 路径的结果在 `runReaction` 内被吞掉。
- `includeScope` 提取基于 dispatch scope 的 own 数据；CRUD 的 scope 变量是「虚拟 scope」（evaluationBindings + `$_crud.<id>` 存储），不在 node scope own 数据中。
- 附带发现：无 `dependsOn` 时反应注册对**所有** scope 变更触发（`scopeChangeHitsDependencies(undefined)` 恒 true），CRUD 自身状态写（`$_crud.<id>`、`__crudLoadRevision` revision bump、statusPath 发布）都会触发冗余 fetch——修复前结果被丢故无循环；修复后若不加自写忽略，会形成 fetch → setRows → revision bump → force → fetch 无限循环（实测 heap OOM）。

## Fix

- **`renderer-reaction-handle.ts`（flux-runtime，公共层）**：
  - `dispatchWithAbortChain` 支持 `scopeOverride ?? ctx?.scope ?? input.scope`（新内部扩展 `__setScopeOverride`）；
  - 新增 `__setLoadCallbacks({onStart, onSettle})`——每次 dispatch（含 force 反应式触发）前后回调，结果不再被吞；
  - `dispatch()` 公共方法 honor `ctx.scope`；
  - 新增 `__setIgnoreWritesTo(paths)`——渲染器声明自持写路径，与 plan 级 `ignoreWritesTo` 合并过滤，自写不触发反应。
- **`reaction-handle-proxy.ts`（flux-react）**：转发三个新扩展方法（激活前缓存，激活时灌入 real handle）。
- **`crud-renderer-state.ts`（useCrudLoadAction）**：
  - 经 `helpers.createScope` 建 per-instance CRUD scope 投影 child scope（own 数据 = pagination/query/sort/filters/selection），bindings provider 每次 dispatch 前 `replace()` 刷新；
  - 注册 scope override + load callbacks（sink 统一处理 effect 路径与 force 路径的结果：rows/total/error/loading/server-page 校正/totalField）；
  - 注册 ignore roots（`$_crud.<id>`、`__crudLoadRevision`、statusPath、dataStatePath）阻断自写循环；
  - effect 简化：只 dispatch，结果处理全部下沉 sink。
- **`crud-renderer.tsx`**：`totalField`/`statusPath`/`dataStatePath` 透传；`useCrudLoadAction` 新参数接线。
- **`flux-core`**：`ReactionHandle.dispatch` ctx 类型补可选 `scope`（兼容增量）。

## Tests

- `crud-loadaction-includescope.test.tsx`（新）：`'*'` 扁平提取 5 个 CRUD scope 变量 + 无 `__crudLoadRevision` 泄漏；`string[]` 精确提取（先红后绿）。
- `crud-loadaction-depends-on-reactive.test.tsx`（新）：dependsOn 外部变更 → 新行渲染 + args 携带新值（先红后绿）。
- `crud-c4-2-schema-contract.test.tsx`（新）：totalField/autoJumpToTopOnPagerChange/ownership scope 组合/loading overlay 契约冻结。
- 既有 705 个 data 包测试全绿（712 总）+ flux-runtime 1396 + flux-react 458 + flux-core 507 全绿。

## Protection

- 回归测试断言**真实行为**（fetcher 请求 payload、渲染出的行、overlay DOM），非 not-throw；
- 循环防护断言：无 dependsOn CRUD 翻页不产生无限 fetch（既有 auto-pagination/loadaction 测试全绿即为回归面）；
- 宿主场景 `c4-2-host-surfaces.spec.ts`（Phase 3）真机覆盖 includeScope 注入与 queryForm→loadAction 链路。

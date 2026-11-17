# M1 稳定性与快照地基（StabilityTracker + store 写观察者 + DOM 影子 + 日志总线升级）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-debugger-roadmap.md（M1 节）· docs/research/2026-11-17-flux-devtools-design.md §3、§4、§5.1
> Related: M0（协议冻结，completed）；M2–M5 消费本阶段能力

## Purpose

把 Cypress 两大原语（whenStable、惰性快照）+ diff 日志总线落进 flux 运行时与 nop-debugger：`StabilityTracker`、`RendererPlugin` 新钩子、store 写观察者 + ForestSnapshot 环形历史、DOM 影子、`__NOP_DEBUGGER_API__` V2。全部插桩仅经三个既有 seam，无监听者零成本（P2）。

## Current Baseline（live repo 核对）

- `RendererPlugin`（flux-core `src/types/renderer-plugin.ts:7-15`）现有 beforeCompile/afterCompile/wrapComponent/beforeAction/onError，**无 afterAction/onRender/onExpressionEval**；调用点在 flux-compiler（schema-compiler-helpers.ts:24）与 flux-action-core（action-execution.ts:215，仅 beforeAction）。
- `createScopeStore`（flux-runtime `src/scope.ts:22-68`）唯一写入点 `setSnapshot`（:42），revision 已存在；**无 StoreWriteObserver，无 live scope 注册表**（仅 ownedScopeDisposers 部分追踪，runtime-factory.ts:102）。
- `NopDebuggerStore.append`（nop-debugger `src/store.ts:4-21`）平铺事件环，**无嵌套 Log 树、无 diff 触发、无 4ms 节流、无 display/full 分层**；仅 100ms render-pairing 节流（:101）。
- `__NOP_DEBUGGER_API__` V1（automation.ts:36-87，挂载 :157）约 40 方法，无 getStability/getSnapshotAt。
- decorateDebuggerEnv（adapters.ts:105）已包装 fetcher/notify；测试 adapters.test.ts 三处。
- debugger-lab 页已存在（apps/playground/src/pages/debugger-lab-page.tsx，路由 #/debugger-lab）。
- scripts/**tests** 为治理 vitest 测试（`pnpm test:scripts`），无微基准先例；scripts/three-perf/bench-scene-graph.mjs 是唯一 bench 样式参考。

## Goals

- `StabilityTracker`（flux-runtime）：fetch/stream/transition/suspense/scopeDebounce 计数，`isStable()` / `whenStable(timeoutMs)` / `onChange(cb)`。
- `RendererPlugin` 扩展契约（flux-core）+ flux-action-core `afterAction` 调用点 + flux-runtime `onRender`/`onExpressionEval` 发射（采样默认关）。
- flux-runtime `registerStoreWriteObserver` + live scope 注册表；nop-debugger 按 epoch 收口构造 `ForestSnapshot`（revision 向量对齐 + 结构共享，环形上限默认 200）。
- DOM 影子模块（nop-debugger）：importNode 克隆 + 剥 script + CSS 内容去重 + 惰性 attach。
- 日志总线升级：嵌套 Log 树（parentId 插入）+ diff 触发 + 4ms 节流。
- `__NOP_DEBUGGER_API__` V2 向后兼容扩展：`getStability()` / `getSnapshotAt(epoch)`。
- 性能红线：无监听者时渲染路径开销 ≤ 基线噪声（微基准入 scripts/**tests**）。

## Non-Goals

- 时间旅行 UI / 预览协议（M2）；断言 waitFor API（M3，本阶段只交付 StabilityTracker 原语与 Log 总线）；录制回放（M5）；网关镜像（M6，经 M0 协议）。
- `ScopeStore.setSnapshot` 签名/语义变更（观察者只经新增注册口，不改写入点契约）。
- onExpressionEval 的依赖收集器完整接线（dependencyPaths 先给 runtime 可得的路径子集，完整依赖图归 M4）。

## Scope

### In Scope

- flux-core：`RendererPlugin` 契约扩展 + `RenderSpan`/`EvalTrace`/`ActionOutcome` 类型（src/types/renderer-plugin.ts 或新 types 文件）
- flux-action-core：action 执行管线 `afterAction` 调用点
- flux-runtime：stability-tracker 新模块、live scope 注册表、`registerStoreWriteObserver`、plugin 钩子发射（onRender/onExpressionEval 采样）
- nop-debugger：ForestSnapshot 采集器（环形+结构共享）、DOM 影子模块、Log 树 + diff + 4ms 节流 + display/full 分层、automation V2 两方法
- playground debugger-lab 页：快照采集与稳定性指示演示
- 测试：单测（本计划 Test Strategy）、微基准（scripts/**tests**）、debugger-lab e2e
- 文档：quick-reference 新 RendererPlugin 钩子节；`docs/architecture/flux-core.md`/`renderer-runtime.md` 若契约描述受影响则同步

### Out Of Scope

- 面板时间轴 UI 改造（M2）
- Suspense 计数的完整 React 边界埋点（先以 transition/span phase 承载，React Suspense 精确计数在 M2 预览接线时补）

## Failure Paths

| 场景                   | 触发                | 行为                                                                            | 可重试 | 用户可见表现               |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------- | ------ | -------------------------- |
| whenStable-timeout     | 超时仍有在途计数    | Promise resolve，返回 `{stable:false, degraded:true}` 语义（不 reject）         | 是     | 面板稳定性指示保持"进行中" |
| observer-throw         | 写观察者回调抛错    | 运行时吞掉并 `console.error` 一次（不落 business 写入路径），不中断 setSnapshot | 否     | 调试器事件流缺失该 epoch   |
| tracker-double-release | settle 计数为负请求 | 计数钳制为 0 并忽略                                                             | 否     | —                          |

## Test Strategy

档位选择：`必须自动化`（核心回归路径 + 零成本红线）

Proof 先行：StabilityTracker 计数/等待/超时、ForestSnapshot 一致性（含 owner 派生 scope）、环形淘汰与结构共享、零监听者快速路径判别基准先于消费代码落地。

## Execution Plan

### Phase 1 - 契约扩展（flux-core）

Status: completed
Targets: `packages/flux-core/src/types/`

- Item Types: `Decision | Proof`

- [x] `RendererPlugin` 新增可选 `afterAction?(outcome: ActionOutcome, ctx: ActionContext): void`、`onRender?(span: RenderSpan): void`、`onExpressionEval?(trace: EvalTrace): void`（默认无实现=零成本，与设计 §3.1 对齐；ctx 形状以现有调用点实际可用信息为准，不虚构 CompileContext）
- [x] 新类型：`ActionOutcome`（action schema + result/error + durationMs）、`RenderSpan`（cid/nodeId/instancePath/phase/durationMs/dependencyPaths）、`EvalTrace`（expressionSource/nodeId/cid/readPaths/resultPreview/error）
- [x] focused typecheck + flux-core 既有测试零回归

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core typecheck` 通过，`pnpm --filter @nop-chaos/flux-core test` 全绿
- [x] 新类型从 flux-core 公共入口导出且被后续 Phase 引用

### Phase 2 - 运行时插桩（flux-action-core + flux-runtime）

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/`、`packages/flux-runtime/src/`

- Item Types: `Fix | Proof`

- [x] flux-action-core：action 执行 settle 后调用 `afterAction`（plugin 数组为空快速路径，P2）
- [x] flux-runtime 新模块 `stability-tracker.ts`：计数器 {fetch, stream, transition, suspense, scopeDebounce}、`isStable()`、`whenStable(timeoutMs?)`（超时 resolve + degraded 标记）、`onChange(cb)` 返回取消函数；fetch/stream 计数接入点由 `registerStabilitySource` 暴露（decorateDebuggerEnv 在消费 Phase 接入）
- [x] flux-runtime：live scope 注册表（createChild/owned scope 创建与 dispose 时登记）+ `registerStoreWriteObserver(obs): () => void`（setSnapshot 内广播，空观察者数组直接跳过）+ `getLiveScopeIds(): string[]`
- [x] flux-runtime：`onRender` span 发射（resolve/commit 计时，dependencyPaths 给 runtime 可得子集）、`onExpressionEval`（采样率配置，默认 0=关）
- [x] `RendererRuntime` 公共面新增 `getStabilityTracker()` / `registerStoreWriteObserver` / `getLiveScopeIds`（flux-core types/renderer-core.ts 同步）

Exit Criteria:

- [x] StabilityTracker 单测：计数增减/等待队列/超时 degraded/onChange 判别性用例（旧无 tracker 实现必挂——无 whenStable 可调用）
- [x] store 写观察者单测：写入广播 revision/paths 正确（零监听者快速路径的判别基准归 Phase 4 微基准）
- [x] afterAction 单测：成功与抛错路径均回调且 outcome 正确；零插件时零额外开销（现有 action 测试全绿即判别）

### Phase 3 - 内核消费（nop-debugger + automation V2 + debugger-lab）

Status: completed
Targets: `packages/nop-debugger/src/`、`apps/playground/src/pages/debugger-lab-page.tsx`

- Item Types: `Fix | Proof`

- [x] `snapshot-repository.ts`：订阅 registerStoreWriteObserver，microtask epoch 收口遍历 `getLiveScopeIds()` 构造 `ForestSnapshot{epoch, revisions, scopes(结构共享), capturedAt}`；环形上限默认 200 可配；淘汰最旧
- [x] `dom-shadow.ts`：`captureDomShadow(root)` = importNode(true) 克隆 + 剥 script + link[stylesheet] 外联转内联标记 + CSS 按 href 内容 ID 去重 + 惰性 attach（`attachShadowDom(shadow)` 挂覆盖层）
- [x] 日志总线升级：NopDebugEvent 增加嵌套插入（parentEventId 已有字段，补树构建插入语义）、emit 前 diff（同 id 变更才 notify）、4ms 同 id 尾帧合并；**display/full 分层**（现仓库无此机制——`NopDebugEvent` 仅 `detail?` 平铺）：事件新增 `display` 小投影（列表渲染所需 summary/level/kind/refs 子集），`getFullEvent(id)` 惰性取全量，面板列表订阅 display 投影（对应设计 §4.2 技巧 3）
- [x] decorateDebuggerEnv fetcher 计数接入 StabilityTracker（进入 +1 / settle −1）
- [x] automation V2：`getStability()` / `getSnapshotAt(epoch)` 挂到既有 `__NOP_DEBUGGER_API__`（向后兼容，V1 测试不变）
- [x] debugger-lab 页：挂 ForestSnapshot 采集 + 稳定性指示（stable/counters）+ DOM 影子演示入口

Exit Criteria:

- [x] ForestSnapshot 单测：多 scope（含 owner 派生 child scope）epoch 一致性、revision 向量对齐、未变 scope 引用复用（structural sharing 判别断言）、环形 200 淘汰
- [x] DOM 影子单测：script 剥除、CSS 去重、惰性 attach 后可查询
- [x] 日志总线单测：嵌套插入顺序、diff（未变不发）、4ms 合并（fake timers）、display 投影存在且 getFullEvent 返回全量
- [x] automation V2 单测：getStability 返回计数、getSnapshotAt 命中/未命中；V1 全部既有 automation 测试不改动仍绿（向后兼容判别）
- [x] store 写观察者零监听者快速路径判别基准落 Phase 4 微基准（此处仅保证实现含空数组快速路径，代码可观测）
- [x] e2e：debugger-lab 页快照采集与稳定性指示（playwright spec，程序化 page.evaluate 断言）

### Phase 4 - 性能红线 + 文档 + 收口

Status: completed
Targets: `scripts/__tests__/`、docs

- Item Types: `Proof | Follow-up`

- [x] 微基准：`scripts/__tests__/nop-debugger-zero-cost-bench.test.ts`——无监听者 plugin/observer/tracker 路径 vs 基线（同进程对照，断言开销 ≤ 基线噪声倍数阈值）；入 `pnpm test:scripts`
- [x] docs：quick-reference.md 新增 RendererPlugin 钩子与 stability/snapshot API 节；若 `docs/architecture/flux-core.md` / `renderer-runtime.md` 现有描述与契约冲突则同步
- [x] daily log + roadmap M1 行就地标注

Exit Criteria:

- [x] `pnpm test:scripts` 含新微基准且绿
- [x] quick-reference 节存在且与 live 契约一致
- [x] daily log / roadmap 标注落盘

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）
  round 2 pass-with-minors（0 Blocker / 0 Major，2 cosmetic Minor 执行时顺手修）。round 1：1 Major——display/full 分层误述为已存在并静默 de-scope，已改回 Phase 3 In Scope 并修正 baseline 描述；3 Minor——微基准跨相表述、Suspense Deferred 需 roadmap 就地标注闭环、行号漂移不处理）
- Rounds: 2
- Findings addressed: Major×1（display/full 分层归位 Phase 3）；Minor×2（Phase 2 微基准表述收口到 Phase 4、roadmap M1 标注为 closure 必需项已在 Phase 4 exit）

## Closure Gates

- [x] 所有 in-scope live defect / contract drift 已收敛（含 M0 后发现的协议面冲突）
- [x] StabilityTracker / ForestSnapshot / DOM 影子 / 日志总线 / automation V2 行为达成且有判别性测试
- [x] 零监听者零成本微基准落 scripts/**tests** 且绿（红线：渲染路径开销 ≤ 基线噪声）
- [x] 受影响 owner docs 已同步（quick-reference；architecture 文档按需）
- [x] 独立子 agent closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Suspense 计数精确化（React Suspense 边界埋点）

- Classification: `optimization candidate`
- Why Not Blocking Closure: M1 交付 whenStable 语义（fetch/stream/transition/scopeDebounce 四源）已满足 roadmap M1 验收"计数器=在途 fetcher/stream + scope 变更去抖窗 + Suspense 状态"中的前三源；Suspense 边界精确计数需 M2 预览协议接线时在 React 层埋点，独立演进不阻塞本阶段消费方（StabilityTracker 计数器结构已预留 suspense 槽位）。
- Successor Required: `yes`
- Successor Path: M2 计划（预览协议接线时补 React Suspense 边界计数）

### dependencyPaths 完整依赖收集器接线

- Classification: `optimization candidate`
- Why Not Blocking Closure: M1 onRender 的 dependencyPaths 提供 runtime 可得子集；完整 ScopeDependencyCollector 反查归 M4 依赖图，本阶段消费方（快照/日志）不依赖完整路径。
- Successor Required: `yes`
- Successor Path: M4 计划（依赖图）

## Non-Blocking Follow-ups

- DOM 影子跨域 iframe 占位/阴影 DOM 展开的增强（采集设计 §5 限制项，M2 时间旅行消费时按需）
- 网关 log.emit 镜像（M0 协议已冻结，M6 接线）

## Closure

Status Note: M1 全部四 Phase 落地：插件三钩子 + StabilityTracker + store 写观察者（host-global 注册表防模块副本分裂）+ ForestSnapshot 环形采集 + DOM 影子 + 日志总线（树/diff/4ms/display-full）+ automation V2 + 零成本微基准 + debugger-lab 演示与 e2e。Deferred（Suspense→M2、dependencyPaths→M4）已记账并在 roadmap 附注中就地声明。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-11-18）
- Evidence: verdict approved（0 Blocker / 0 Major；2 Minor 非阻塞：afterAction ctx 形状按计划许可收敛、lastDegraded 粘滞语义留 M2/M3 waitFor 消费时复审）。实跑 focused tests 全绿（flux-runtime 11、nop-debugger 16、flux-action-core 3、scripts bench 3）；debug 脚手架 grep 零残留；runtime-factory 682 行（700 门禁绿）。

Follow-up:

- （见 Non-Blocking Follow-ups）

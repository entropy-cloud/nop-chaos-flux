# 617 xlang 调试编辑器扩展包（roadmap item 16，@nop-chaos/flux-xlang-debug Phase A：state + 扩展）

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: xlang-web-debugger roadmap item 16（owner 仓 nop-entropy）；设计权威 = nop-entropy `ai-dev/design/xlang-web-debugger/05-frontend-architecture.md` §3.4（debug store 下行 schema/上行动作/Effect 分类一次定死）+ `01-ws-protocol.md`（事件形状）
> Related: docs/plans/616（item 15，flux-xlang-lang 已交付；本包与其互不依赖——gutter 对任何语言可用）

## Purpose

交付 `@nop-chaos/flux-xlang-debug` 包的调试域基座：zustand debug store（下行状态 schema + 上行动作，D5 §3.4 一次定死）+ 三个 CodeMirror 扩展（breakpoint-gutter/suspended-line/exception-squiggle，经 Effect 消费 store 下行、gutter 点击 dispatch 上行动作）。WS 客户端（item 17）与面板（item 18）后续在同包内交付，只消费本 plan 定死的 store 契约。

## Current Baseline

- plan 616 已交付 `@nop-chaos/flux-xlang-lang`（与 flux-code-editor 的 registerLanguage 链路）；本包对 CE 的依赖形态与之同构（devDep + 运行时消费 extensions 注入点）。
- flux-code-editor 的 `useCodeMirror` compartment 注入机制（已核清，F5 修订——quick-reference.md 无此内容，权威 = `src/use-code-mirror.ts` + `src/shared/editor-compartments.ts`）：options.extensions 经 compartment 初始注入，`extensionsReconfigure` 对身份变化做**全量替换**；StateField 同实例跨 reconfigure 存活、扩展工厂每次重建实例则重置——**item 19 必须对 extensions 数组 memoize**（本包扩展交付稳定工厂 + 单例 state field）。
- zustand 惯例：vanilla store（仓内 `packages/*/src/**/store*.ts` 先例——执行时对照）；vitest + `@codemirror/state` 可直接单元测试 StateField/Effect。
- 协议事实源：D1 §3.5 事件形状（evt.suspended {reason,threadId,stackInfo,location{sourcePath,line}}/evt.exception {sourcePath?,line?,message,errorCode?}）与 debugger.\* 方法参数。

## Goals

- `src/state/debug-store.ts`：zustand vanilla store——下行状态 `{ breakpoints: Breakpoint[], suspended: SuspendedState[], lease: {expiresAtMs}|null, exceptions: ExceptionItem[] }`（Breakpoint = {sourcePath,line,condition?,logExpr?}；SuspendedState = {threadId,sourcePath,line}；ExceptionItem = {sourcePath?,line?,message,errorCode?}）+ 上行动作 `toggleBreakpoint/addBreakpoint/removeBreakpoint/step(kind)/resume()/suspend()/runToPosition(bp)/muteBreakpoints(muted)/evalExpr(threadId,frameIndex,expr)`。动作为纯状态变更 + 可选 transport 钩子（`setTransport(transport)` 注入——item 17 的 WS 客户端实现 transport 接口；无 transport 时动作只改本地状态，单测友好）。
- `src/extension/breakpoint-gutter.ts`：断点 Effect（family: breakpoints）→ StateField 持有断点行集合 → `gutter({ lineMarker })`/`lineNumberMarkers` 渲染 GutterMarker；gutter 点击处理器读 state.field + 调 `store.toggleBreakpoint(sourcePath, line)`（点击是无状态 DOM 事件，不消费 store 下行——下行统一走 Effect）。
- `src/extension/source-path.ts`：`sourcePathFacet`（F3 修订：CM 文档无内建元数据，锚点默认实现 = 包内导出 Facet，装配层 item 19 经 extensions 提供值）。
- `src/extension/suspended-line.ts`：挂起行 Effect（family: suspended-line）→ StateField → Decoration.line 高亮。
- `src/extension/exception-squiggle.ts`：异常 Effect（family: exception）→ StateField → Decoration.mark 波浪线。
- `src/extension/sync.ts`：`syncStoreToExtensions({ store, view, getSourcePath })`（F3 修订：dispatch 需 view、过滤需与 gutter 同源锚点）——store.subscribe → 按 schema 变更派发三族 Effect；返回 dispose——清理 = dispose 单层 + apply 内 dom.isConnected 守卫（EditorView 6.x 无 isDestroyed 属性；Compartment reconfigure 场景守卫不生效，泄漏边界 = dispose 必须被调用——B2 勘正：包内无 ViewPlugin）。**Effect 三族（F1 修订——回归 D5 §3.4 权威：suspended-line/exception/breakpoint 三族 + 命名常量一次定死；初版的 gutter 直连 store 不走 Effect 系对权威的失实引用且技术上不自洽——CM gutter 重绘仅由事务驱动，store 变化无 dispatch 则陈旧）。**
- 测试：store 动作语义（toggle 幂等/transport 调用参数/applier 语义）、gutter 点击→上行动作、suspended-line/exception 装饰随 store 变化（`view.dispatch({effects})` 后 `state.field(...)` 断言——EditorState 无 dispatch，F7 API 形状修正）、Effect 三族命名常量。

## Non-Goals

- WS 客户端/续期/重连（item 17）；面板组件（item 18）；装配 renderer（item 19）；真实后端联调（item 21/22）；flux-xlang-lang 依赖（gutter/装饰语言无关）。

## Scope

### In Scope

- 新包 `packages/flux-xlang-debug/`（package.json/tsconfig×2/vitest.config/scripts 同 616 模板；deps：@codemirror/state/view/language、zustand、@nop-chaos/flux-code-editor(devDep for 类型)——依赖方向与 616 同红线：CE 零反向依赖）
- 根配置：vite alias + root tsconfig project reference + knip-baseline 登记（store/扩展仓内无消费者）
- 测试

### Out Of Scope

- item 17/18/19/21/22；后端仓改动；playground；D5 §3.1 依赖图的 flux-core 边（env.openSocket 消费）归 item 17 client 模块引入——本包 deps 不含 flux-core（防 closure audit 按 D5 图误报，F8）

## Failure Paths

| 场景                | 触发                                 | 行为                                 | 可重试 | 用户可见表现                  |
| ------------------- | ------------------------------------ | ------------------------------------ | ------ | ----------------------------- |
| store-no-transport  | 上行动作在无 transport 时调用        | 本地状态照常变更，transport 调用跳过 | 是     | gutter/装饰照常，无网络副作用 |
| doc-source-mismatch | 挂起行 sourcePath 与当前文档锚点不符 | 装饰不落地（过滤）                   | 是     | 无高亮                        |
| dup-breakpoint      | toggle 已存在断点                    | remove（幂等）                       | 是     | 标记消失                      |

## Test Strategy

本档选择：`必须自动化`（store 契约是 item 16/17/18 的共享 API；CodeMirror StateField/Effect 行为是扩展核心）——store 动作单测先行、gutter 点击→动作、装饰 Effect 单测（EditorState.create + dispatch）。

## Execution Plan

### Phase 1 - 包骨架 + debug store

Status: completed
Targets: `packages/flux-xlang-debug/`（骨架 + src/state/debug-store.ts）

- Item Types: `Feature`

- [x] 包骨架（照 616 模板：package.json（deps zustand/@codemirror/state/@codemirror/view/@codemirror/language；devDeps flux-code-editor **仅在确有 import 时声明**（616 曾因未用 devDep 吃 knip hit，F4）+ vitest；**src/index.ts 公共入口**（F8：导出 store 工厂/三扩展工厂/sync 桥/sourcePathFacet/Effect 常量——item 17/19 消费面）/tsconfig×2/vitest.config/根 alias + project reference；knip 新 hit 处置在 Phase 1 内即消（移除未用声明）或 --update-baselines 登记，不留 Phase 3）
- [x] `src/state/debug-store.ts`：类型（Breakpoint/SuspendedState/ExceptionItem/LeaseState）+ zustand vanilla **工厂函数**（仓内先例一律 `createStore` from 'zustand/vanilla' 工厂形态，非 module 单例——多实例 + 单测隔离）+ 上行动作九个（与 D5 §3.4 上行动作清单逐项一致：toggleBreakpoint/addBreakpoint/removeBreakpoint/step/resume/suspend/runToPosition/muteBreakpoints/evalExpr——evalExpr 映射 getExprValue 异名，F6 措辞修正）+ **下行 applier（F2 修订补齐契约下半边）**：setBreakpoints(bps)（rebind 全量镜像）/setSuspended(states)（rebind 重建）/addSuspended(state)（evt.suspended）/removeSuspended(threadIds)（evt.resumed/evt.leaseExpired）/addException(e)（evt.exception）/clearExceptions()/setLease(expiresAtMs|null)（lease.renew 回执/rebind）——item 17 收到事件即调 applier 无 API 空档 + `setTransport(transport)`（接口九方法与上行动作同名同参；无 transport 时动作只改本地状态）。形状裁定（审计 m1）：evalExpr 为对象形参 `(args:{threadId,frameIndex,expr})`，D5 记法为位置参数——以实现为准。
- [x] 根配置：alias + project reference
- [x] store 单测：动作语义（toggle 幂等/断点表镜像/transport 注入后调用参数与次数/无 transport 跳过）

Exit Criteria:

- [x] store 单测绿（动作语义 + transport 注入两形态 + applier 语义/dedup——debug-store.test 5 用例）
- [x] 包内 typecheck/lint 通过；根配置生效（alias 可解析）

### Phase 2 - 三个扩展 + store↔编辑器同步

Status: completed
Targets: `packages/flux-xlang-debug/src/extension/`

- Item Types: `Feature`

- [x] `breakpoint-gutter.ts`：gutter 工厂 `createBreakpointGutter(store)`（审计 m2 签名同步；锚点经 sourcePathFacet）——断点 Effect→StateField→GutterMarker + gutter 自带 domEventHandlers 点击 toggle（B1 修复：EditorView.domEventHandlers 注册在 contentDOM，gutter 事件不可达）；泄漏面=dispose+isConnected 守卫（B2 勘正：无 ViewPlugin，reconfigure 场景守卫不生效）
- [x] `suspended-line.ts` + `exception-squiggle.ts` + `breakpoint-gutter.ts` 的 Effect 三族（Effect 类型/命名常量导出，供 item 17/19 派发）；`syncStoreToExtensions({ store, view, getSourcePath })` 桥（subscribe→dispatch，返回 dispose；isConnected 守卫（单层））
- [x] 扩展单测：gutter 点击→store.toggle（EditorView + happy-dom dispatchEvent）、装饰随 store 变化（`view.dispatch({effects})` 后 `state.field(...)` 断言——EditorState 无 dispatch，F7）、sourcePath 过滤（Facet 值不匹配不落地）、清理函数后无残留订阅

Exit Criteria:

- [x] 扩展单测绿（点击→动作/装饰/过滤/清理/idempotent dispose——extensions.test 4 用例；执行中修复：sync 桥销毁态守卫以 dom.isConnected 判定（EditorView 6.x 无 isDestroyed 属性）、测试视图须真实挂载 document.body）
- [x] Effect 分类命名与 D5 §3.4 一致（导出常量）
- [x] 包内 typecheck/lint/test 通过

### Phase 3 - 独立 closure audit

Status: planned
Targets: 全部

- Item Types: `Proof`

- [x] 独立子代理 closure audit：store 契约与 D5 §3.4 schema 逐字段对账、扩展行为单测真实性抽查、订阅清理（泄漏面）、knip 登记核实、Anti-Hollow——第一轮 **issues**（agent_9715023c：B1 Blocker gutter 点击上行链死代码/B2 文档失实/B3 预打勾 + m1-m3）
- [x] 修复审计发现（B1 改 gutter 自带 domEventHandlers + 抽出可测核心 handleGutterClick + 承重断言；B2 勘正"ViewPlugin.destroy 双保险"失实文档→dispose+isConnected 守卫单层（sync.ts docstring/plan L26/L84 三处）；m1 evalExpr 对象形参裁定注记；m2 plan 签名同步）
- [x] flux docs/logs 更新；roadmap item 16 → done（owner 仓，复审 approved 后）
- [x] 提交

Exit Criteria:

- [x] audit 发现全修复（复审 approved——agent_9715023c R2：B1 经 CM 源码+端到端 mousedown 探针实证 add/remove 全链连通；B3 回退到位；门禁 9/9+typecheck/lint/knip 干净 HEAD worktree 全绿；B2 残留 3 处文档行已勘正）
- [x] `pnpm typecheck/build/lint/test/check` 全绿（debug 包 18/18 + check exit 0）
- [x] roadmap item 16 `done`

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_34da0599（fresh session）
- Verdict: revised（1 Blocker / 2 Major / 5 Minor 全部修订）
- Rounds: 1
- Findings addressed: F1 Effect 分类回归 D5 三族权威（breakpoints 也走 Effect→StateField→marker/装饰，gutter 点击读 state+调 store，下行统一 Effect；订阅泄漏面收敛为单一 sync 桥）；F2 下行 applier 契约补齐（setBreakpoints/setSuspended/addSuspended/removeSuspended/addException/clearExceptions/setLease）；F3 sync 桥签名补 view+getSourcePath/sourcePathFacet/清理双保险；F4 knip 处置落 Phase 1；F5 权威引用改 use-code-mirror.ts+editor-compartments.ts 并写死全量替换语义与 item 19 memoize 结论；F6 上行动作措辞；F7 测试 API 形状；F8 flux-core 边归属与 index 入口

## Closure Gates

- [ ] 所有 in-scope 行为实现且有测试
- [ ] Anti-Hollow：store→扩展→上行动作→transport 链运行时连通
- [ ] owner docs：D5 §3.4 store schema 与实现一致；flux docs/logs 更新
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（或仅既有红——stash 验证）
- [ ] `pnpm check`（零新增红）

## Deferred But Adjudicated

### 面板组件与 WS 客户端

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap item 17/18 独立 plan 承接，本包只定 store 契约（D5 §3.4 裁定）
- Successor Required: `yes`
- Successor Path: item 17/18 的 flux plan

## Non-Blocking Follow-ups

- gutter DOM 渲染性能（大文件断点多时的虚拟化）——按需优化

## Closure

Status Note: 调试扩展包全量落地并通过两轮独立审计（R1 issues：B1 gutter 点击上行链死代码/B2 文档失实/B3 预打勾；R2 approved：B1 修复经 CM 源码 + 端到端 mousedown 探针实证、B3 回退到位、B2 三处文档行勘正）。store 契约（四域 schema + 九上行 + 七下行 applier + transport 注入）与 D5 §3.4 逐字段一致。
Completed: 2026-10-16

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_9715023c（fresh session 两轮）
- Evidence:
  - 落地核对 PASS（store/extension/index 逐文件对照 plan Goals）
  - D5 §3.4 一致性 PASS（schema 四域逐字段/上行九动作/Effect 三族；m1 evalExpr 对象形参裁定注记）
  - 变异探针 2/2 R1 实测（sync sourcePath 过滤→锚点断言红；toggle remove 分支→幂等双用例红）md5 恢复复绿；R2 端到端 mousedown 探针实证 B1 修复 add/remove 全链连通
  - 门禁实跑 PASS（typecheck/test 9→18/lint/check exit 0；knip 零登记属实）
  - B1/B2/B3 修复经 R2 复审 approved（3 处 B2 文档残留勘正后通过）
  - Anti-Hollow：下行 store→sync→Effect→StateField→装饰/marker + 上行 gutter 点击→handleGutterClick→toggle 双向连通（探针+直测）

Follow-up:

- breakpointsField 行号不做 changes 映射（v1 简化，docstring 登记；sync 桥 store 变更重派收敛）

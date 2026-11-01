# 841 失败态类型诚实性与运行时错误可观测性（628 收编代码债 GV6 + 错②④⑤）

> Plan Status: completed
> Last Reviewed: 2026-11-02
> Source: `docs/audits/deep-audit-2026-11-02.md` §2 GV6/GV8；`docs/plans/628-deep-audit-remediation-plan.md` A 轨 + `flux-guide/15-error-handling.md` 已知缺口②④⑤（经 2026-11-02 治理审计复核仍在）
> Related: plan 840（628 supersession 收编）、`docs/architecture/flux-monitor.md`（本计划按其迁移路径阶段 1 落地最小通道后重写为最终设计文档）、`flux-guide/15-error-handling.md`

## Purpose

清偿 628 A 轨中仍成立的类型债两处 + 错误处理已知缺口三处，使"失败态在类型系统里可见、运行时错误可达遥测面"。flux-core 源码属 Protected Area（plan-first），本计划即其 required plan。

## Current Baseline

- **失败态类型伪造**：`packages/flux-react/src/schema-renderer.tsx:230,247,254,259,266` 五处 `return undefined as unknown as <Runtime>` 建模创建失败，下游 6 个消费点经 `creationErrorRef` 旁路判空（:246,:258,:271,:283,:309,:470）——类型系统对失败态失明。
- **`renderSurface => any`**：`packages/flux-core/src/types/runtime.ts:590`（`SurfaceRendererProps`）。
- **错②**：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:127-131`——`onActionError` 诊断钩子自失败仅 `console.warn`（:130），无遥测上报。
- **错④**：`packages/flux-react/src/node-error-boundary.tsx`——两处 `componentDidCatch`（:103,:140）仅 console.error + fallback 渲染，无遥测上报。
- **错⑤**：`action-execution.ts:185-188`——合成事件名单（`actionError`/`actionSettled`/`actionSettledError`）硬编码在分支逻辑里。
- **GV8（评审发现，勘正初稿）**：`docs/architecture/flux-monitor.md` 描述的 Monitor（`<SchemaRenderer monitor>` 独立 prop、`MonitorEvent` union、`action:start/end` 变体）是**目标设计而非 live 契约**——flux-react src 零处 monitor、无 `MonitorEvent` 类型、`runtime-host-reporting.ts:9` 明文「monitor 已移除」；唯一存活面是 `ExpressionExecutionEnv.monitor?.onError`（flux-core/src/types/expression-env-types.ts:14-16，formula 侧为空操作 stub）。该文档含迁移路径节（:444-458），违反 Minimum Rule 14（architecture 文档只写最终状态），本计划落地后须重写。**错②④ 的遥测面因此需要先建最小通道，不存在可复用的既有 action:\* emit 通道。**
- **文档失真**：`flux-guide/15-error-handling.md:226-233` 三处声称过期（错①「事实上无效」已由 plan 595 解决；错②「空 catch」实为 console.warn；错③「完全静默」已 notify）。

## Goals

- schema-renderer 创建失败路径有真实类型表达（消除 5 处 `undefined as unknown as` + creationErrorRef 旁路），失败 fallback 渲染行为不变。
- `renderSurface` 返回类型不再 `any`。
- 建立 flux-monitor.md 迁移路径阶段 1 的**最小遥测通道**：`SchemaRenderer` 增加可选 `monitor` prop（additive 公共面），线程化送达 error boundary 与 action 诊断路径。
- 错②④：诊断钩子自失败与渲染期 throw 各产生恰一个 monitor 事件（fire-and-forget、monitor throw 被捕获不影响业务，契约同 flux-monitor.md 原则 3）。
- 错⑤：合成事件名单提为具名常量并在 owner doc 记录。
- `flux-guide/15-error-handling.md` 与 live 行为逐条一致；`flux-monitor.md` 重写为已实现子集的最终设计文档（Rule 14）。

## Non-Goals

- 不实现 flux-monitor.md 中的完整 `MonitorEvent` union（navigate、api:request/response、action:start/end 全家族等）——只落本计划需要的最小变体集，其余仍列已知缺口；不改 action 聚合/取消语义（plan 832 已收口）；不做 628 的宽门面拆分/依赖集归一/factory 瘦身（840 已裁定为 residual）；不改渲染 fallback 的视觉/交互。

## Scope

### In Scope

- schema-renderer 失败态类型改造（含 6 个消费点）；runtime.ts:590 类型收紧；monitor 最小通道（SchemaRenderer prop → runtime/context 线程化 → error boundary + action 诊断）；错②④⑤ 代码修复；flux-guide/15 与 flux-monitor.md 回写。

### Out Of Scope

- RendererRuntime/FormRuntime 门面拆分；surface lifecycle 实现；i18n 运行时翻译；完整 MonitorEvent union；nop-debugger 自有 event store（另一套机制，不触碰）。

## Failure Paths

| 可测场景编号        | 触发                               | 行为（含错误语义）                                                             | 可重试        | 用户可见表现          |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ------------- | --------------------- |
| runtime-create-fail | RendererRuntime 创建抛错           | 返回失败态（新类型），渲染 fallback 与现状一致；monitor 收到 render-error 事件 | 否            | 现状 fallback UI 不变 |
| hook-self-failure   | 宿主 onActionError 钩子自身 throw  | console.warn（现状保持）+ monitor 诊断事件；不中断动作错误主链路               | 否            | 无额外表现            |
| render-throw        | 子树渲染 throw 进入 error boundary | fallback 渲染 + monitor 事件（含 nodeId/message）；不重渲染死循环              | 走既有重试 UI | 现状 fallback UI 不变 |
| monitor-self-throw  | 宿主 monitor 回调自身 throw        | 被 try/catch 捕获 + console.warn；业务逻辑零影响（flux-monitor.md 原则 3）     | 否            | 无额外表现            |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：必须自动化（错误上报是遥测契约；失败态类型改造需判别测试证明行为不变）。

- 错②④ 判别测试：旧实现（无通道）下无法断言 monitor 事件——判别机制为「prop 未传时零事件、传入且缺陷发生时恰一事件」，并以反向验证（注释掉 emit 调用的 stash diff）证明测试真实覆盖 emit 点。
- 失败态类型项：创建失败 → fallback 渲染 + 无异常泄漏的回归测试（行为不变性以既有 fallback 测试 + 新增类型级断言共同钉住）。

## Execution Plan

### Phase 1 - 失败态类型诚实性（schema-renderer + runtime.ts）

Status: completed
Targets: `packages/flux-react/src/schema-renderer.tsx`、`packages/flux-core/src/types/runtime.ts`

- Item Types: `Fix | Proof`

- [x] Decision：失败态表达选型（按 `creationErrorRef` 全部消费点实况定）：优先 discriminated result（`{ runtime } | { failure: … }`）；若消费面改造过大，退而求其次用带类型品牌的失败哨兵对象，禁止保留 `undefined as unknown as`
- [x] Fix：5 处伪造与 6 处旁路消费点改造为选型落地；`renderSurface` 返回类型以真实 surface 渲染结果类型收紧（沿用 `SurfaceEntry` 相关既有类型，不新增 any）
- [x] Proof：`grep -n "undefined as unknown as" packages/flux-react/src/schema-renderer.tsx` 零命中；创建失败路径 focused 测试（fallback 渲染、无异常泄漏）通过；flux-react 包测试全绿

Exit Criteria:

- [x] 判别/回归测试通过；flux-react、flux-core 局部 typecheck 绿（Rule 18 例外：flux-core 公共类型被 flux-react 立即依赖）

### Phase 2 - monitor 最小通道（GV8 接线）

Status: completed
Targets: `packages/flux-core/src/types/`（RendererMonitor 类型与 SchemaRendererProps 扩展）、`packages/flux-react/src/`（prop 接线 + context/参数线程化）

- Item Types: `Decision | Fix | Proof`

- [x] Decision：最小通道形态——按 flux-monitor.md 迁移路径阶段 1 的口径定 `monitor?: (event: …) => void` 的类型落点（flux-core types 新文件或既有文件内）与事件变体集（本计划仅需 render 错误 + action 诊断错误两类；变体命名沿用 flux-monitor.md 文稿的 union 风格）；线程方式（React context vs runtime 创建参数注入）按 error boundary 与 action 路径的实况取最小改造
- [x] Fix：SchemaRenderer 接受可选 monitor prop 并线程化到 NodeErrorBoundary/SchemaRootBoundary 与 action 诊断路径；monitor 回调 throw 统一 try/catch + console.warn
- [x] Proof：focused 测试——未传 prop 时全链零事件；传入 + 触发 render throw / 钩子自失败时恰收到对应事件；monitor 自身 throw 不影响 fallback 渲染与动作主链路（Failure Paths 全表覆盖）

Exit Criteria:

- [x] 通道测试全绿；flux-core/flux-react 局部 typecheck 绿（公共面 additive 变更，本计划授权）

### Phase 3 - 错误可观测性落点（错②④⑤）

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`、`packages/flux-react/src/node-error-boundary.tsx`

- Item Types: `Fix | Proof`

- [x] Fix（错④）：两处 componentDidCatch 经 Phase 2 通道上报（含 nodeId、message）
- [x] Fix（错②）：onActionError 钩子自失败经通道上报诊断事件
- [x] Fix（错⑤）：合成事件名单提为具名导出常量（单一事实源）
- [x] Proof：错②④ 判别测试（prop 未传零事件 / 传入且缺陷发生恰一事件）；反向验证一次（stash 掉 emit 后测试必挂）；flux-action-core、flux-react 包测试全绿

Exit Criteria:

- [x] 判别测试反向验证通过；两包测试全绿

### Phase 4 - owner doc 重写

Status: completed
Targets: `flux-guide/15-error-handling.md`、`docs/architecture/flux-monitor.md`、`docs/architecture/renderer-runtime.md`

- Item Types: `Fix`

- [x] Fix：15-error-handling.md 错①②③④⑤ 五条逐条更新为 live 终态（①已解决〔plan 595〕、②③已解决、④⑤本计划落地后的行为描述）；「已知缺口」节只保留仍真实成立的条目
- [x] Fix：flux-monitor.md 按 Rule 14 重写为已实现子集的最终设计文档（删除迁移路径/Proposed 叙事；未实现的事件族列「已知缺口」并保持诚实）
- [x] Fix：`docs/architecture/renderer-runtime.md` Root Entry Contract 节同步 `SchemaRendererProps.monitor` prop（含 fire-and-forget 契约注记）——Phase 2 公共契约变更的 normative owner 文档

Exit Criteria:

- [x] 三份文档逐条对照 live 码可复核；无「Proposed/迁移路径」残留；已知缺口清单与 live 一致；Root Entry Contract interface 与 live `SchemaRendererProps` 一致

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_be1828c2-90b0-4848-83de-e0d30f179a0a）
- Verdict: **pass（最终）**——round-1 fail（1 Major：初稿把 flux-monitor.md 目标设计误作 live 契约）→ 修订（新增 Phase 2 最小通道、GV8 勘正、Phase 4 改 Rule 14 重写）→ round-2 fail（1 Major：公共契约变更漏列 renderer-runtime.md Root Entry Contract owner-doc 义务）→ 补丁（Phase 4 增第三项 Fix、Closure Gate 同步扩）→ 评审者按 round-2 声明的确认制直接核验补丁落地，判定零 Blocker/Major、pass
- Rounds: 2 + 1 行级补丁
- Findings addressed: round-1 Major-1（monitor 通道前提不成立）→ Phase 2 重写；round-2 Major-1（owner-doc 漏记）→ Phase 4/Closure Gates 补 renderer-runtime.md；Minor（flux-guide 行号 :226）已修正

## Closure Gates

- [x] Phase 1-4 全部 Exit Criteria 达成
- [x] 5 处类型伪造与 renderSurface any 清零（grep 可证）
- [x] 错②④ 判别测试反向验证
- [x] flux-guide/15-error-handling.md、flux-monitor.md、renderer-runtime.md Root Entry Contract 均与 live 一致（Rule 14 终态形态）
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（round-1 issues 1 Major + 2 Minor → 处置 → round-2 approved 零 Blocker/Major，agent_18e1d0f3-2059-4c45-bc92-0e43f69a4aa8）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### SurfaceRendererProps 死接口的处置方式

- Classification: `optimization candidate`（接口删除）
- 说明：`renderSurface => any` 所在的 `SurfaceRendererProps` 全仓零实现零调用（死接口）；本计划按 Goals 以 `unknown` 收紧（零风险诚实化，as-any 31→30）。整接口删除属公共导出面收缩，留作后续基线 sync 事件时的 optimization candidate。
- Successor Required: `no`

### flux-monitor.md 重写的范围裁定

- Classification: `Decision`（已落地）
- 说明：按 Rule 14 整文件重写为「已实现子集（仅 error 变体）的最终设计」；原稿的完整 MonitorEvent union / 迁移路径叙事删除，未实现事件族移入「已知缺口」并回链本 plan Follow-up。原稿的 applyMonitor/env 装饰路径未采用（实现走 SchemaRendererProps.monitor + ActionDispatcherContext.monitor + MonitorContext 三点线程化，更小且无 env 装饰副作用）。

## Non-Blocking Follow-ups

- flux-monitor.md 完整 MonitorEvent union（navigate/api 全家族）与「约 20 个内部调用点」全量接线：本计划只落最小通道；扩展属独立 feature 节奏，roadmap 复审时再裁决。

## Closure

Status Note: 四 Phase 全部落地（失败态判别联合 + 全消费点守卫、monitor 最小通道三点线程化、错②④⑤、三份 owner doc 终态回写）；判别测试反向验证（creation-failure 旧实现 3/3 必挂、monitor-channel stash 3 failed ×2、审计变异验证坐实）；全量门禁 typecheck/build/lint exit 0、turbo test 88/88 exit 0、check exit 0（p841-\*3.log）。执行期新增裁定两项（死接口处置、Rule 14 重写范围）与 oversized 拆分（诊断切片 → action-diagnostics.ts）当场记账。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子代理（agent_18e1d0f3-2059-4c45-bc92-0e43f69a4aa8），2026-11-02，两轮
- Evidence: round-1 issues（Major-1 Failure Paths row-1 monitor 事件未实现〔3/4 覆盖却称全表〕+ Minor-1 grep 注释字面 + Minor-2 两处文档锚点）→ 处置（monitor-emit.ts 共享 emit + 失败分支一次性守卫 effect + 判别测试第 4 条 + 注释措辞 + 锚点修正）→ round-2 approved；审计独立复现 stash 反向验证与变异验证（emit 中和 → 恰新增测试挂）；19 字段 Root Entry Contract 逐字段一致；flux-monitor.md 无 Proposed/迁移路径残留

Follow-up:

- Monitor 完整事件族（action/api/render lifecycle、navigate、stream 等）与内部调用点全量接线：roadmap 复审时再裁决（Non-Goals 已声明）
- SurfaceRendererProps 死接口整删：optimization candidate，随下次基线 sync 裁决

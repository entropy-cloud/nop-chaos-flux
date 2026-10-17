# 618 xlang WS 调试客户端与租约续期（roadmap item 17，@nop-chaos/flux-xlang-debug Phase B：client）

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: roadmap item 17；设计权威 = nop-entropy `ai-dev/design/xlang-web-debugger/01-ws-protocol.md`（协议/事件/鉴权）+ `02-lease-lifecycle.md`（续期/重连语义）+ `05-frontend-architecture.md` §3.4（client 模块归本包，消费 617 store 契约）
> Related: docs/plans/617（store 契约 + transport 接口 + 下行 applier 已定死）

## Purpose

交付 WS 调试客户端：经 `env.openSocket` 连接 `/ws/xlang-debugger?nopDebugToken=<token>`（D1 §3.2），实现 `DebugTransport` 接口（617 定死的九方法 ↔ JSON-RPC `debugger.*`）、租约续期心跳（页面可见性感知，D2 §3.2 不与 ping/pong 合帧）、断连重连 + `session.rebind` 会话恢复（D2 §3.5）、事件→store applier 派发。

## Current Baseline

- 617 已交付：`DebugTransport` 九方法接口、store 下行 applier（setBreakpoints/setSuspended/addSuspended/removeSuspended/addException/clearExceptions/setLease）、`createDebugStore` 工厂。
- `env.openSocket` 契约（已核验 flux-core renderer-api.ts L162-231）：`WebSocketOpener = (url, options?, ctx?) => WebSocketConnection`；`WebSocketConnection` = 结构化 readyState/send/close/onopen/onmessage/onclose/onerror；capability check `if (env.openSocket)`。
- 协议（D1）：envelope JSON-RPC 2.0 文本帧；id 必带（pong 豁免）；`session.open {clientInfo?, protoVersion:'1.0'}` → `{sessionId, protoVersion, lease:{ttlMs, renewIntervalMs}}`；`session.rebind {sessionId}` → `{sessionId, breakpoints, suspendedThreads, lease}`（快照，含错误 `ERR_XLANG_DEBUGGER_SESSION_BOUND_ELSEWHERE`）；`lease.renew {}` → `{lease:{expiresAtMs, suspendedThreadIds}}`；`tokenRefresh {accessToken}`；事件（D1 §3.5 登记八 method：suspended/log/logs/exception/resumed/leaseExpired/completed/sessionClosed——client 派发其中四类到 store applier，log 族/completed 显式忽略，M2）。
- 续期语义（D2 §3.1/§3.2）：renew 间隔 = 服务端授予 `renewIntervalMs`（前端按它排程）；页面不可见停止 renew（租约自然到期放行）+ 可选"保持续期"开关；`expiresAtMs` 为服务端时钟仅作展示；RATE_LIMITED 按退避重试非致命。

## Goals

- `src/client/debug-client.ts`：`createDebugClient({ store, openSocket, serverUrl, getToken, onSessionClosed })` → client 句柄 `{ connect(), dispose(), sessionId(), connectionState() }`（F3 修订：onSessionClosed 回调进契约——payload `{reason: 'closed'|'authFailed'|'rebindRejected'|'protocolUnsupported', detail?}`，触发后客户端停心跳/停重连/撤挂起计时器；F3 同时移除误植的 getSourcePath 参数——那是 617 扩展层的文档锚，client 无渲染职责）：
  - **连接/鉴权**（F6 修订：类型锚 = type-only `import type { WebSocketOpener, WebSocketConnection } from '@nop-chaos/flux-core'` + devDep 声明——兑现 617 F8"FC 边归 item 17"，零运行时边，测试注入不受影响；偏差不回写 D5，因 D5 图的边以本形式兑现）：`connect()` 经注入的 openSocket 建连（URL 查询参数 `?nopDebugToken=`，D1 §3.2；**getToken 为 per-attempt**——每次连接尝试重取，避免长会话重连拿过期 token 撞 4401，M3）→ 发 `session.open`（protoVersion '1.0'）→ **结果回填：记录 renewIntervalMs 供心跳排程（F2 修订：open 的 lease 是 LeasePolicy{ttlMs,renewIntervalMs} 无 expiresAtMs，不经 setLease；setLease 的数据源 = lease.renew 回执与 rebind 的 lease——renew 回执接线见下）**。
  - **transport 实现 + 注册（F7 修订）**：`connect()` 内 `store.setTransport(transportImpl)`（dispose 时置 null——store 上行动作到达 WS 的唯一通路）；9 方法 → JSON-RPC 映射表（M5）：toggleBreakpoint → 读 `store.getState().breakpoints` 派生 add/remove（协议无 toggle method）、step(kind) → debugger.stepInto/stepOver/stepOut 三分、其余七方法同名直映（evalExpr → debugger.getExprValue）；自增 id 以 **String(++n) 序列化**（M1：D1 id 线上必须 string），pending map by id + 30s reject 计时器。
  - **事件派发（M2 修订）**：evt.suspended→addSuspended、evt.resumed/evt.leaseExpired→removeSuspended(threadIds)、evt.exception→addException、evt.sessionClosed→onSessionClosed；**evt.log/evt.logs/evt.completed 及未知事件本 item 显式忽略**（store 无 log/completed 状态——item 18 面板接入时扩展）；入站 ping/pong 显式忽略（M6：基座不追踪 pong，静默协议安全）。
  - **renew 心跳**（F5 修订）：session.open 结果的 renewIntervalMs 排程 setInterval；页面不可见暂停（visibilitychange），恢复可见**立即 renew 一次并重置 interval 相位**（D2 §3.1）；**renew 回执 → store.setLease(lease.expiresAtMs)**（F2）；RATE_LIMITED → 退避（间隔 ×2，上限 3×）重试非致命。
  - **断连重连**：onclose → 停心跳 + 指数退避重连（500ms×2^n，上限 15s，jit；**4400/4403/4401 均终态不重连**，M4）→ 重连成功（session.open 过渡会话）→ `session.rebind{sessionId}` → 成功：applier 回放快照（**setBreakpoints(快照 breakpoints)/setLease(快照 lease.expiresAtMs)**）+ **挂起位置恢复 = 对 store 断连前 suspended 本地副本按 threadId 对账，未知线程经 debugger.getStackInfo(threadId) 补取位置（D2 §3.6）**（F1 修订：快照 suspendedThreads 为 ThreadInfo{threadName,threadId,suspended} 无位置字段，不可直接转换）→ **rebind 成功后立即 renew 一次（D2 §3.1 首豁免）+ 重置心跳相位**（F5）→ rebind 被拒（SESSION_BOUND_ELSEWHERE）：**按新会话重建（D2 §3.5）**——采纳过渡会话 sessionId/lease、恢复 renew 心跳、从 store 断点副本重发 debugger.setBreakpoints、onSessionClosed 通知（reason: 'rebindRejected' 但非终态）（F4 修订）。
  - **dispose()**：尽力发 `session.close`（M7 知情声明：close = 中止挂起线程语义；组件卸载不 dispose 则由服务端宽限 15s 兜底——取舍归 item 19 装配层）→ `store.setTransport(null)`（F7）→ 清 timers/listeners/pending reject 计时器/sockets。
- 测试（MockConnection 实现 WebSocketConnection 契约 + vi.useFakeTimers + visibilityState stub）：连接握手与 token 参数、renew 心跳排程/可见性暂停恢复、事件→applier 映射、断连重连矩阵（1 次重连成功/重连后 rebind 快照回放/BOUND_ELSEWHERE 路径）、dispose 清理。

## Non-Goals

- 面板组件（item 18）；装配 renderer（item 19）；真实后端联调（item 21/22）；一次性调试票据（item 25）；flux-core 依赖（openSocket 经参数注入 openSocket 函数——客户端不直接 import flux-core，保持包纯净并便于测试注入）。

## Scope

### In Scope

- `packages/flux-xlang-debug/src/client/`（debug-client.ts）+ `src/index.ts` 导出扩充 + 测试
- knip 新 hit 处置（Phase 1 内消）

### Out Of Scope

- item 18/19/21/22；flux-core 改动；后端仓改动

## Failure Paths

| 场景                    | 触发                         | 行为                                        | 可重试               | 用户可见表现     |
| ----------------------- | ---------------------------- | ------------------------------------------- | -------------------- | ---------------- |
| openSocket-missing      | env 无 openSocket capability | connect() reject 明确错误                   | 否（装配层裁断）     | 错误提示         |
| auth-fail-4401          | token 无效（onclose 4401）   | 不重连；onSessionClosed 回调（区分 reason） | 否（需重新取 token） | 会话关闭提示     |
| rebind-rejected         | 重连后 rebind 属主不符       | onSessionClosed 回调 + 停止重连             | 否                   | 按新会话重建提示 |
| renew-rate-limited      | RATE_LIMITED 错误响应        | 退避重试非致命                              | 是                   | 无               |
| request-pending-timeout | 请求 30s 无响应              | pending reject                              | 是（下次动作）       | 动作失败提示     |

## Test Strategy

本档选择：`必须自动化`（连接生命周期/重连矩阵/续期排程是本 item 核心资产且无法手工可靠验证）——MockConnection + fake timers 全覆盖 Failure Paths 与 D2 §3.5 时序。

## Execution Plan

### Phase 1 - debug client 实现

Status: completed
Targets: `packages/flux-xlang-debug/src/client/debug-client.ts`

- Item Types: `Feature`

- [x] `createDebugClient` 句柄：connect/openSocket 鉴权 URL、session.open/protoVersion 校验、JSON-RPC pending map（id 自增 + 30s reject 计时器）、evt.\*→applier 派发、DebugTransport 九方法实现、renew 心跳（renewIntervalMs 排程 + visibilitychange 暂停/恢复 + RATE_LIMITED 退避）、断连重连（指数退避+jit 上限 15s）+ rebind 快照回放、BOUND_ELSEWHERE/4401 终态回调、dispose 清理
- [x] 单测：MockConnection + fake timers——握手（URL token/session.open 帧）、renew 排程与可见性（含恢复可见立即 renew + 相位重置）、事件→applier、**上行方向（F7）：store 动作→transport 方法→JSON-RPC 帧（九方法逐一，含 toggle 派生 add/remove 与 step 三分）**、重连矩阵（重连成功快照回放含 getStackInfo 位置补取/rebind 拒绝按新会话重建——恢复心跳+重发断点）、request 超时 reject、dispose（session.close 帧断言/pending 计时器清理无 unhandled rejection/setTransport(null)）

Exit Criteria:

- [x] 客户端单测绿（D2 §3.5 重连时序）——debug-client.test 9 用例：握手 token/session.open/transport 注册、九方法映射（toggle 派生+step 三分）、renew 排程+回执 setLease、可见性暂停恢复、事件→applier、重连快照回放、F4 重建、4401 终态、dispose 清理；执行中修复：sendRequest 门槛 state→connection（session.open 在 connecting 态发送）。**618 审计勘正（M2）**：初版声称"Failure Paths 全表+超时 reject+getStackInfo 断言已测"不实——timeout/4400/4403/sessionClosed/RATE_LIMITED 用例已在本轮补齐（22/22），getStackInfo 位置补取断言仍在重连用例中未显式断言（登记 follow-up）
- [x] 包内 typecheck/lint/test 通过

### Phase 2 - 独立 closure audit 与收口

Status: planned
Targets: 全部 + roadmap（owner 仓）

- Item Types: `Proof`

- [x] 独立子代理 closure audit：D1 协议形状对账（envelope/方法名/事件映射）、D2 续期与重连语义对账、transport 接口实现完整性（9/9）、单测真实性抽查、Anti-Hollow（client→store applier 链连通）——R1 **issues**（agent_39fdf056：B1 typecheck 红 TS2554/B2 过渡会话 id 自赋值/M1 退避未作用于运行 interval/M2 预打勾与失实声明/m1-m4）
- [x] 修复审计发现（B1 toHaveLength 多参 TS2554 修复；B2 rebuild 采纳过渡会话 id+sessionId 断言；M1 退避重启运行 interval+用例；m1 可见性恢复相位重置；m2 死探针清理；m3 4400/4403/sessionClosed/RATE_LIMITED 用例补齐）
- [x] flux docs/logs 更新；roadmap item 17 → done（owner 仓）；提交（R2 approved 后）
- [x] 独立子代理 closure audit：D1/D2 对账、transport 9/9、探针 3/3、Anti-Hollow 抽查、门禁实测——R2 **approved**（agent_39fdf056：B1/B2/M1/m1/m3 修复确认 + 第三探针证明承重；门禁于 HEAD 实测 typecheck 0/test 全绿/knip 无新 hit）

Exit Criteria:

- [x] audit 发现全修复（R2 approved）
- [x] `pnpm typecheck/lint/test/check` 全绿（typecheck 0/lint 0/check 0/test 29 全绿；pnpm typecheck 仓库级红 = playground 既有 + flux-compiler 既有，stash 验证非本 plan）
- [x] roadmap item 17 `done`

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_52008571（fresh session）
- Verdict: revised（0 Blocker / 8 Major / 7 Minor 全部修订）
- Rounds: 1
- Findings addressed: F1 rebind 快照 ThreadInfo 无位置字段——改为本地副本对账 + getStackInfo 补取（D2 §3.6）；F2 session.open lease 是 LeasePolicy 不经 setLease——renew 回执/rebind 接 setLease；F3 onSessionClosed 契约进工厂参数（reason 四值）+ 移除误植 getSourcePath；F4 BOUND_ELSEWHERE 按新会话重建（采纳过渡会话/恢复心跳/重发断点）非终态；F5 rebind 成功立即 renew + 相位重置；F6 类型锚 = type-only import @nop-chaos/flux-core + devDep（兑现 617 F8）；F7 connect 内 setTransport + dispose 置 null + 上行方向测试九方法；F8 交付 query 面留 item 18 且 Deferred 记 Successor。M1-M7：String id/事件忽略清单/getToken per-attempt/4400+4403 终态/映射表含 toggle 派生与 step 三分/ping-pong 显式忽略/dispose close 语义知情声明

## Closure Gates

- [ ] 所有 in-scope 行为实现且有测试
- [ ] Anti-Hollow：client→transport 方法→JSON-RPC 帧、事件→applier 链运行时连通
- [ ] owner docs：D1/D2 与实现一致（偏差回写）；flux docs/logs 更新
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（或仅既有红——stash 验证）
- [ ] `pnpm check`（零新增红）

## Deferred But Adjudicated

### 多标签页共享租约的跨页协调

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: D2 §3.4 裁定服务端共享租约天然支持，前端无需跨页协调
- Successor Required: `no`

### 面板 query 面（getStackInfo/getFrameVariables/evalExpr 结果通路）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 item 交付 transport+事件面；query 公共 API 归 item 18 面板接入时扩充本包导出（Deferred 记账，guide 关闭规则 9）
- Successor Required: `yes`
- Successor Path: item 18 的 flux plan

## Non-Blocking Follow-ups

- "保持续期"开关（页面不可见仍续期，D2 §3.2 前端策略项）——按 UI 需求随 item 18/19 演进
- 一次性调试票据（item 25）

## Closure

Status Note: WS 调试客户端全量落地并通过两轮独立审计（R1 issues：B1 typecheck 红/B2 过渡会话 id 自赋值/M1 退避未作用/M2 预打勾失实；R2 approved：B1/B2/M1/m1/m3 修复确认 + 第三探针证明 M1 承重 + 门禁于干净 HEAD 隔离实测）。D1/D2 对账全绿。
Completed: 2026-10-16

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_39fdf056（fresh session 两轮 R1/R2）
- Evidence: R1 六项发现全部于 HEAD 核实修复（B1 typecheck 0/B2 rebuild 采纳过渡会话 id + F4 sessionId 断言/M1 RATE_LIMITED 重启 interval + 判别用例/m1 相位重置无冗余/m2 死探针删/m3 用例齐/M2 预打勾回退）；探针 3/3 红→md5 恢复→绿；Anti-Hollow 4 用例抽查 PASS（重连快照/4401 终态/上行链/事件→applier）；R2 复审 approved（一行结论："B1/B2/M1/m1/m3 修复全部属实且经第三个变异探针证明承重……完成后可自证收口"）——R2 遗留 3 项收尾（getStackInfo follow-up 登记/logs 回写/m4 记录）已于收口提交补齐

Follow-up:

- getStackInfo 位置补取的显式断言（重连用例覆盖路径但未显式断言位置字段）

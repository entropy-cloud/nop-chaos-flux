# 650 xdbg item 27 前端域 remediation（item 26 审计 F-1/F-2/F-3 + F-4/F-19 消化）

> Plan Status: active
> Last Reviewed: 2026-10-18
> Source: xlang-web-debugger roadmap item 27（entropy ai-dev/backlog/xlang-web-debugger-roadmap.md）；审计报告 entropy ai-dev/audits/xlang-web-debugger/2026-10-18-item26-frontend-integration-audit.md；协议基准 entropy ai-dev/design/xlang-web-debugger/01-ws-protocol.md（D1）/02-lease-lifecycle.md（D2）
> Related: entropy plans/2478（安全域，completed 0ef850c1da）、2479（并发域，completed——C-3 fan-out 已使多标签页事件对等，本 plan 为其消费端配套）；flux plans/618（WS client）、620（panel）、621（装配）
> Draft Review: R1 agent_a4ed2ffb（2B/3M/6m 全消化后 active——裁定记录见各条目与 Failure Paths）

## Purpose

消化 item 26 前端集成审计的三项 P1：F-1（`evt.sessionClosed` 无会话失效处理）、F-2（rebind 被拒重建路径残留旧会话挂起态）、F-3（`expandExprValue` keys 参数误用——懒展开对真实引擎必然失效），并顺带消化门禁级 P2：F-4（陈旧 socket 回调无连接身份守卫 + 活连接重连泄漏）、F-19（mock 服务器协议放松使 e2e 对语义失真不设防）。

## Current Baseline

- 审计基线 @ entropy 84fea0df6c；FE 逻辑面（client/panel）自 24b991f3a/6cdad5a92 未改（cd29f8ee1 为 2474 收口测试适配级改动）。
- **F-1（P1）**：`debug-client.ts:139-141` `evt.sessionClosed` 仅折叠 reason='closed' 转发回调——心跳继续（renew 撞 NO_SESSION 静默吞）、挂起行残留、连接/transport 未撕卸（BE 实况：他端 close 后本端 WS 保持打开——AsyncOutbound 只关出站队列不关 socket）。
- **F-2（P1）**：`debug-client.ts:368-376` `rebuildOnNewSession` 重发断点+心跳但 **suspended/lease 不复位**（对照 applyRebindSnapshot 全量重建）——断连超宽限重连后幽灵高亮 + 死 threadId 请求。
- **F-3（P1）**：`variables-tree.tsx:79-81` 发送 `keys:[{name: node.name}]`——引擎语义 keys 为 expr 求值后的导航步，等价取 `<expr>.<name>` 恒空；正确形态 = `keys: []`（根与子节点均适用——子节点 expr 已是 `buildChildrenExpr` 复合形态，展开即"求值复合表达式后列子项"，与引擎 DebugValueHelper 一致）。既有 `panel.test.tsx:130-135` 断言旧形态必红，须同步修订。
- **F-4（P2 门禁级）**：connect 三 handler 闭包共享可变 `connection` 无身份守卫（StrictMode 旧连接 onclose 晚到践踏新连接）；rebind catch（:451）对存活连接 scheduleReconnect 开第二条 socket（R-9 path B）。
- **F-19（P2）**：mock 服务器对未知 method 落 `default: reply({})`（:175-176；**无 expandExprValue case**——审计引 :147-149 实为 getExprValue，勘正）——e2e 对协议漂移不设防；stepInto/resume 现靠 default 空 reply（其错误被 transport catch 吞、用例只轮询出站帧——改 -32601 不破坏既有 5 用例，已核）。
- 既有测试面：flux-xlang-debug vitest（panel.test.tsx 懒展开断言 keys 旧形态；debug-client.test.ts:383-409 断言折叠 reason 'closed'——**四值透传后必红，修订入执行项**；MockConnection 桩 close() 不触发 onclose——晚到 onclose 用例可手工注入，无需扩桩）+ tests/e2e/xlang-debug.spec.ts 5 用例（**零 expandExprValue/零树展开点击**——keys 语义守门在 panel.test.tsx 单测层，非 e2e）。
- 后端消费前提（已落地）：entropy 2479 C-3 fan-out（多标签页事件对等）+ sessionClosed 他端广播。

## Goals

- **F-1**：`evt.sessionClosed` 会话失效——新原语 `invalidateSession(reason)`：`resetSessionState()`（setSuspended([]) + setLease(null)）+ stopRenewHeartbeat + **关闭当前连接并置 `connection=null`/`state='disconnected'`** + setTransport(null) + onSessionClosed 回调（**D1 四值 reason 透传**：userClosed/graceExpired/serverShutdown/protocolError；'closed' 成员保留给 opener 失败路径——不删）。重连编排**单留 onclose 一条路**（关连接后由存活 onclose 触发，规避双 socket）；`scheduleReconnect` 加去重守卫（已有 reconnectTimer 则返回）。**currentSessionId 保留**（R1 B1.2 裁定）：重连后走既有 open→rebind→BOUND_ELSEWHERE→rebuildOnNewSession 环路，断点经 setBreakpoints 自然重放，不引入第二套重放逻辑。按因语义：graceExpired/serverShutdown → 重连（经 onclose）；userClosed → 失效 + UI 呈现，不自动重建；protocolError → 同 userClosed（**BE 一期无发射路径，前向兼容死分支**——注释登记）。
- **F-2**：`rebuildOnNewSession` 调用 `resetSessionState()` 共享子原语（**仅 suspended/lease 复位**——rebuild 场景连接与 transport 存活，不得撕连接/transport/currentSessionId——R1 B2 裁定）。
- **F-3**：`variables-tree.tsx` toggle 改发 `keys: []`。
- **F-4**：connect 三 handler `if (connection !== conn) return` 身份守卫；rebind catch 先 `connection?.close()` 再 scheduleReconnect（path B）。
- **F-19**：mock 服务器未知 `debugger.*` method → -32601；expandExprValue 按 keys 导航最小实现（getExprValue 结果上逐 key 下钻，keys=[] 即列子项——语义对齐引擎，使 e2e 具备暴露失真能力）。
- 既有测试修订（R1 M2）：panel.test.tsx keys 断言 → `[]`；debug-client.test.ts sessionClosed reason 断言 → 四值透传形态。

## Non-Goals

- F-5~F-18 未列入项（P2/P3）——Deferred（前端体验批 follow-up，entropy item 27 收口统一登记）。
- D1 rebind 快照增 muted 等 BE additive 演进；entropy 仓改动；新 e2e 用例（keys 语义守门在 panel 单测层——R1 M3 裁定：mock fixture 需复合值基建，成本不抵，登记知悉）。
- 数组元素子节点 `parent["0"]` 形态对真实引擎的可求值性验证（懒展开触达真引擎时的负载路径，登记知悉）。

## Failure Paths

| 场景                                        | 触发                          | 行为                                                                                         | 可重试 | 用户可见    |
| ------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- | ------ | ----------- |
| 他端 close 本端收 sessionClosed{userClosed} | invalidateSession             | 心跳停/挂起清/lease 空/连接关/transport 失效，UI 错误条；不自动重建（手动刷新触发重连）      | 手动   | 会话已关闭  |
| 服务端停机 {serverShutdown}                 | 同上 + socket 随进程退出 1006 | 失效后 onclose 触发重连（去重守卫）；重连后 rebind 旧 id 被拒 → rebuildOnNewSession 断点重放 | 自动   | 重连中→恢复 |
| 宽限过期 {graceExpired}                     | 同 serverShutdown             | 同上                                                                                         | 自动   | 同上        |
| {protocolError}                             | BE 一期无发射路径（前向兼容） | 失效 + 呈现，不重建                                                                          | 手动   | ——          |
| 重连期间旧 rebind 被拒                      | rebuildOnNewSession           | resetSessionState + 断点重发 + 心跳重建（连接存活）                                          | 是     | 短暂闪断    |

## Test Strategy

必须自动化：单测（vitest，sessionClosed 收敛/rebuild 复位/身份守卫/晚到 onclose）+ 既有 e2e 5 用例零回归（mock 语义化后）。

## Scope

### In Scope

- `packages/flux-xlang-debug/src/client/debug-client.ts`、`src/panel/variables-tree.tsx`、`tests/e2e/xlang-debug-mock-server.mjs`、`src/__tests__/debug-client.test.ts`（新增+修订）、`src/__tests__/panel.test.tsx`（keys 断言修订）。

### Out Of Scope

- entropy 仓；新 e2e 用例；F-5~F-18 未列入项；assembly 生产代码（onSessionClosed 已宽化 string reason，无需同步改）。

## Execution Plan

### Phase 1 - 会话状态机收敛 + keys 修正 + 守卫 + mock 语义化

Status: planned
Targets: `packages/flux-xlang-debug/src/client/debug-client.ts`、`src/panel/variables-tree.tsx`、`tests/e2e/xlang-debug-mock-server.mjs`、`src/__tests__/*`

- Item Types: `Fix`（F-1/F-2/F-3 已确认 live defect；F-4/F-19 门禁级加固）

- [ ] `resetSessionState()` 子原语（suspended/lease 复位）；`invalidateSession(reason)`（子原语 + 心停 + 关连接置空 + state 撕卸 + setTransport(null) + 回调四值透传）
- [ ] evt.sessionClosed 分支接 invalidateSession + 按因语义（重连单留 onclose 路）；scheduleReconnect 去重守卫
- [ ] rebuildOnNewSession 接 resetSessionState（F-2）
- [ ] variables-tree keys: []（F-3）+ panel.test.tsx 断言修订
- [ ] connect 三 handler 身份守卫 + rebind catch 先关旧连接（F-4 path A+B）
- [ ] mock 服务器 -32601 + expandExprValue keys 导航最小实现（F-19）
- [ ] 单测：sessionClosed 收敛（心跳停/挂起清/lease 空/transport 失效/reason 透传/不自动重建）；serverShutdown 后 onclose 驱动重连且重连后 rebind-reject 复位（rebuild 复位断言）；陈旧 onclose 晚到不践踏新连接（手工注入晚到 onclose——桩无需扩展）；debug-client.test.ts sessionClosed 用例修订
- [ ] 变异探针：invalidateSession 分支移除 → sessionClosed 收敛单测红；keys 改回 [{name}] → panel.test.tsx 红；恢复 grep 断言
- [ ] e2e 5/5 绿（mock -32601 语义化后）；flux-xlang-debug vitest 全绿

Exit Criteria:

- [ ] 新增/修订单测全绿 + 变异红证据入档（红→绿）
- [ ] **接线验证**：resetSessionState 被 invalidateSession 与 rebuildOnNewSession 两处真实调用；invalidateSession 被 evt.sessionClosed 分支真实调用（变异探针承载）
- [ ] e2e 5/5 绿；vitest 全绿；playground 定向用例零回归
- [ ] **无静默跳过**：未知 method 显式 -32601（mock 侧），不静默空 reply
- [ ] flux docs/logs 条目更新；entropy 侧 item 27 收口引用

## Closure Gates

- [ ] F-1/F-2/F-3（P1）全部落地且有判别性测试（变异红证据）
- [ ] F-4/F-19（P2）落地
- [ ] 既有测试面零回归（vitest + e2e 5/5 + playground 定向）
- [ ] 独立子 agent closure-audit 完成并记录证据（含 Anti-Hollow：resetSessionState 两处接线、keys [] 到达出站帧）
- [ ] pnpm lint / typecheck 零新增错误（包级）
- [ ] flux 侧无 checklist 工具——按 flux plan guide 文本一致性人工核对并记录于 Closure

## Deferred But Adjudicated

### F-5~F-9/F-10~F-18 未列入项（P2/P3）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 审计定级 P2 加固/P3 体验；roadmap item 27 收口 bar = P0/P1 清零（本 plan 覆盖 FE 全部 P1 + 门禁级 P2）；各项修复方向已在审计登记
- Successor Required: `yes`
- Successor Path: 前端体验批 follow-up（entropy item 27 收口统一登记）

### e2e 层 keys 语义守门（mock 复合值 fixture 基建）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: keys 语义守门已由 panel.test.tsx 单测承载（帧级断言）；e2e 层补建需 mock 复合值 fixture，成本不抵
- Successor Required: `no`
- Successor Path: e2e 增强批随需

## Non-Blocking Follow-ups

- D1 additive：rebind 快照增 muted 字段（BE 演进时同步）
- 数组元素子节点 `parent["0"]` 真引擎可求值性验证（懒展开触达真引擎时）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_a4ed2ffb（fresh session，R1）
- Verdict: revised（2B/3M/6m 全修订后 active）
- Findings addressed: B1 invalidateSession 复位面补 connection/state 撕卸 + currentSessionId 保留走 rebind-reject 环路 + scheduleReconnect 去重 + 按因闩锁语义表；B2 F-2 改共享子原语（transport/连接不撕）+ 接线验证措辞同步；M1 rebind catch 先关旧连接（path B）；M2 两个既有测试修订入执行项；M3 删"懒展开 e2e 断言修正"句（守门在单测层）；minor：mock 措辞勘正（default {} 非固定子树）/晚到 onclose 桩无需扩展/'closed' 成员保留/protocolError 死分支标注/格式四节补齐/baseline 勘正

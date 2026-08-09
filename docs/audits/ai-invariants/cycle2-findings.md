# Cycle 2 / I2 — 不变式驱动审计发现（Cycle 2 Findings）

> Status: active（Cycle 2 / I2 产出，供 I3 裁决与 Loop Rule 派生引用；零悬挂）
> Last Updated: 2026-08-09
> Source: `docs/plans/2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md` + `docs/audits/ai-invariants/invariant-catalog.md` §9（⑥-⑩）+ `docs/audits/ai-invariants/gates.md`（Cycle 2 注册红）+ `docs/audits/ai-invariants/cycle1-findings.md`（先例格式 + W1-W4 锚点）
> Produced By: plan `2026-08-09-2229-3-cycle2-i2-invariant-driven-audit.md`（纯文档计划）
> 探查记录：`docs/analysis/2026-08-09-i2-cycle2-adversarial-probe/round-01-executor.md`（执行 session）+ `round-02-independent.md`（独立 fresh session）
> 下游消费: Cycle 2 / I3（裁决表，族分类 → 工作项）、I6-Cycle2（Loop Rule 派生判定）、Loop Rule（新族触发证据）

## 1. Phase 1 — 门禁全量运行与 red list（注册面确定性确认）

### 1.1 运行记录

| 命令                                                               | exit code | 结果                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check:ai-engine-invariants`（standalone 复跑，含 ⑥⑧ 新规则） | 1         | **4 注册命中，与 Cycle 2 / I1 注册表逐条对应，零未注册**：⑧×1 `create-engine.ts:228`（connector-missing 早退）+ ⑥×3 `use-conversation.ts:280`（createConversation）/ `:370`（deleteConversation）/ `:427`（clearAll）——exit code 与注册面零差异                                                                                      |
| `pnpm --filter @nop-chaos/flux-renderers-ai test`                  | 0         | **67 files / 544 passed + 12 expected fail（556 tests）**——⑥-⑩ `it.fails` 门禁按预期失败（套件绿）、①-⑤ 全绿、既有回归全绿；零 unexpected-pass（无需走 Failure Paths）                                                                                                                                                               |
| `pnpm check`（14 项链）                                            | 1         | 唯一失败 = `check:audit-event-dispatch-ctx` 6 hits（industrial，**既有登记 red**，2026-08-09 已登记移交 industrial workstream）→ 链在工业 red 处中断（`check:ai-engine-invariants` 未跑到，standalone 复跑补证，对齐 Cycle 1 先例）；`check:oversized-code-files` 2 errors 均为既有豁免 locale；其余 11 项全绿，**零未注册新增命中** |
| `pnpm test`（全量，基线佐证）                                      | 0         | 60/60 tasks 全绿（纯文档计划，全量验证不属本 plan 门禁，仅作基线佐证）                                                                                                                                                                                                                                                               |

### 1.2 red list（确定性结论：门禁表达的违背面 == 注册面，零差异）

- **⑥ `scanDisplacementVersionBumps` ×3**：`use-conversation.ts:280`（createConversation 不 bump `switchVersionRef`）、`:370`（deleteConversation 不 bump）、`:427`（clearAll 不 bump）——与 gates.md 注册表逐条对应
- **⑧ `scanBranchStampReset` ×1**：`create-engine.ts:228`（connector-missing 早退，`runOnce` 之前 return，戳未消费）——与注册表对应
- **零未注册新命中**；⑧ 项静态可行性前提成立（Cycle 2 / I1 已裁决），注册面构成 = ⑥×3 + ⑧×1 与 plan 预期完全一致。

## 2. Phase 2 — 方法 × ⑥-⑩ 覆盖矩阵

> 12 目标方法（catalog §4.1）+ `runTurn` 间接行（I0 §4.2 裁定）。格值：covered / partial / uncovered / N/A（catalog 裁定不适用）。**uncovered = 0**；所有 partial 格均已探查（probe 编号见 §3，探查记录见 round-01/02）。

| 方法                 | ⑥ active 位移完整性                                                          | ⑦ bootstrap 列表合并                              | ⑧ branch 戳消费/清除                                                       | ⑨ plugin 错误隔离                                                       | ⑩ 失败轮产物清理                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `sendMessage`        | N/A                                                                          | N/A                                               | N/A                                                                        | partial（间接经 runTurn；P5 暴露面）                                    | partial（probe A：下一请求携带空残留；P6 零 chunk 轮） |
| `send`               | N/A                                                                          | N/A                                               | N/A                                                                        | partial（同 sendMessage 间接）                                          | partial（同 sendMessage 间接）                         |
| `abort`              | N/A                                                                          | N/A                                               | N/A                                                                        | partial（P5 触发侧：abort 使 onTurnEnd rejection 对 host 可见）         | partial（probe A：abort-before-first-chunk 产空残留）  |
| `regenerate`         | N/A                                                                          | N/A                                               | covered（设戳/消费面：注册泄漏已表达，round-02 复核零新泄漏路径）          | partial（间接经 runTurn）                                               | partial（P4：regenerate×失败 → 旧回答销毁 + 空残留）   |
| `clear`              | N/A                                                                          | N/A                                               | N/A（round-02 排除：仅防御面，无独立缺陷）                                 | N/A                                                                     | N/A（无 turn 产物）                                    |
| `setMessages`        | N/A                                                                          | N/A                                               | N/A                                                                        | N/A                                                                     | N/A                                                    |
| `setMessageEditing`  | N/A（⑥-⑩ 均不适用：无位移/戳/plugin/失败产物面）                             | N/A                                               | N/A                                                                        | N/A                                                                     | N/A                                                    |
| `createConversation` | partial（注册红已表达；probe C 同 tick 参与未表达）                          | covered（⑦ 两成员 it.fails 已表达，probe-2 同型） | N/A                                                                        | N/A                                                                     | N/A（P2 幽灵为 ④/K3 面，非 ⑥-⑩）                       |
| `switchConversation` | partial（5 注册成员 it.fails 已表达；probe C2 同 tick delete×switch 未表达） | N/A                                               | N/A                                                                        | N/A                                                                     | N/A                                                    |
| `deleteConversation` | partial（注册红已表达；probe C 幽灵 fixup 未表达）                           | N/A                                               | N/A                                                                        | N/A                                                                     | N/A（删除即清除，无残留面）                            |
| `renameConversation` | N/A                                                                          | N/A                                               | N/A                                                                        | N/A                                                                     | N/A（P1 幽灵为 ②/④ 面，非 ⑥-⑩）                        |
| `clearAll`           | partial（注册红已表达；probe C 参与未表达）                                  | partial（probe F：bootstrap 在途 clearAll 复活）  | N/A                                                                        | N/A                                                                     | N/A（P1/P2 为 ②/④ 面）                                 |
| `runTurn`（间接行）  | N/A                                                                          | N/A                                               | covered（注册泄漏面：connector-missing 早退已表达；runOnce :397 同步消费） | partial（gate ⑨ 三成员已表达；P5 abort 变体 + probe B hook 路径未表达） | partial（probe A/B + P4/P6 残留生产面未表达）          |

- **零 uncovered 悬空格**；N/A 格均为 catalog §9 覆盖面外（方法不触碰该不变式状态面），无需探查。
- ⑥ 的「镜像写面」（delete/clearAll 不同步维护 `conversationsRef`）与 ⑦ 的 clearAll 成员、⑨ 的 abort 变体、⑩ 的四个新成员（abort/hook/持久化/regenerate/零 chunk 成功轮）为本次探查新增的未表达面，全部落在 §3 发现清单。

## 3. 发现清单（族分类，零悬挂）

> 分类口径：**已知族（门禁漏覆盖 → Cycle 2 / I3 补门禁）** = 失败机制已被 catalog §2/§7/§9 不变式陈述覆盖但门禁未表达该路径；**新族（→ Cycle 3 / I1 触发证据）** = 需要新增不变式；**watch-only** = 低严重度/未确定性复现，附复触发条件。

### 3.1 已知族（门禁漏覆盖 → I3 裁决补门禁）— 13 条

#### K-⑩-1 — [⑩ 失败轮产物清理] abort-before-first-chunk 轮产空残留并进入下一请求历史

- **位置**：`create-engine.ts:432-483`（chunk 循环 per-iteration abort 检查 break → `:456-458` `!firstChunkReceived → loading=false` → `:469` commitAssistant 提交空 placeholder → `:471-482` aborted 终态）
- **问题**：`abort()` 在首个 chunk 到达前调用 → 循环首迭代即 break → 空 placeholder 以 `loading=false` commit → `buildContext`（`:511`）只排除 `loading===true` 尾消息 → **下一轮请求历史携带 `{role:'assistant', content:''}`**（严格后端会拒绝空块，N5/probe-D 同型后果）
- **族归属**：已知族 ⑩（失败轮产物清理）——⑩ 门禁 `it.fails` 只表达 connector-throw（失败轮）成员，**aborted 轮成员未表达**
- **复现**：probe A，RED（下一请求 `requests[n].messages` 含空 assistant；aborted 轮 messages 尾部 = `{content:'', loading:false}`）
- **信心**：确定（已复现）

#### K-⑩-2 — [⑩ 失败轮产物清理] onBeforeRequest rejection 留永久 loading 幽灵 placeholder

- **位置**：`create-engine.ts:407-410`（`await plugin.onBeforeRequest` 在 runOnce 的 try 之外）+ `:401-405`（placeholder 已 push）
- **问题**：`onBeforeRequest` reject → 异常直接冒泡到 runTurn catch（`:336`，requestState='error' 已落）→ placeholder **永不 commit**（try 内 catch 不执行）→ 消息列表残留 `loading:true` 幽灵（UI 永久 loading，且 `isStreamingAssistantPlaceholder` 使宿主只能靠 `clear()` 清除）
- **族归属**：已知族 ⑩（失败轮产物清理——「失败轮必须清理自身产物」成员）+ ⑨ 相邻（hook 在 try 外，⑨ 门禁只覆盖 onTurnStart try 外面）
- **复现**：probe B，RED（sendMessage 后 messages 尾部 `loading:true` 幽灵）
- **信心**：确定（已复现）

#### K-⑩-3 — [⑩ 失败轮产物清理] 残留经 autoSave 持久化（跨会话存活）

- **位置**：`create-engine.ts:484-486`（runOnce catch commit 空残留）× `use-conversation.ts:190`（autoSave `isDone` 含 'error'）→ `:203-209` `saveMessages` 落盘
- **问题**：失败轮空 placeholder（loading=false）被 autoSave 快照持久化到 storage——⑩ 门禁两成员只测**内存历史排除**（buildContext），**持久化臂未表达**——残留跨 eviction → rehydrate（switch 回该会话）存活
- **族归属**：已知族 ⑩（持久化臂）
- **复现**：round-02 P3，RED（`savedMessages[A]` 含空 assistant）
- **信心**：确定（已复现）

#### K-⑩-4 — [⑩ 失败轮产物清理] regenerate × connector-throw：旧回答销毁 + 空残留（数据丢失形态）

- **位置**：`create-engine.ts:594-596`（regenerate 截断旧 turn）→ `:484-486`（runOnce catch 空残留 commit）
- **问题**：regenerate 先截断（销毁旧 assistant 回答）再请求；connector-throw → 空 placeholder 残留——**原回答已销毁且新轮无内容**，仅剩 user 消息 + 空 assistant；`regenerate` 语义（重生成）叠加失败轮残留 = 数据丢失形态（⑩ 门禁成员未表达 regenerate 臂）
- **族归属**：已知族 ⑩（regenerate 臂）
- **复现**：round-02 P4，RED（messages = [user, assistant('', loading=false)]，原回答丢失）
- **信心**：确定（已复现）

#### K-⑩-5 — [⑩ 失败轮产物清理] 零 chunk connector「completed」轮同样产空残留

- **位置**：`create-engine.ts:456-458`（`!firstChunkReceived → loading=false`）+ `:325-335`（completed 终态）
- **问题**：connector 正常 settle 但零 chunk（空响应）→ 轮次标记 'completed' 但产物 = 空 assistant（loading=false）→ 下一请求历史携带空消息——⑩ 陈述只覆盖 failed/aborted 轮，**退化成功轮（空响应）未表达**
- **族归属**：已知族 ⑩（退化成功臂）
- **复现**：round-02 P6，RED（completed 后请求历史含空 assistant）
- **信心**：确定（已复现）

#### K-⑥-1 — [⑥ active 位移完整性] 同 tick clearAll+create+delete → 幽灵 activeId fixup

- **位置**：`use-conversation.ts:427-475`（clearAll 不写 `conversationsRef`）`:280-313`（createConversation 同步 prepend 镜像）`:382-388`（deleteConversation activeId fixup 读镜像）——**delete/clearAll 缺镜像同步写（K4/§7.4 写面只覆盖 create/rename）**
- **问题**：同 tick `clearAll()` + `createConversation(X)` + `deleteConversation(X)` → delete 的 fixup 从陈旧镜像（[X,A,B]）选 next → `activeConversationId='A'`（**已 clearAll 清除的幽灵**，列表为空）+ `activeEngine=null`——UI 显示 ghost active（⑥ 陈述「post-await 写入以 ref 为裁决面且目标必须仍存在」违背）
- **族归属**：已知族 ⑥（active 位移完整性——同 tick 组合成员 + 镜像写面）
- **复现**：probe C，RED（ids=[] 而 activeId='A'）
- **信心**：确定（已复现；窗口 = 同 tick，渲染 flush 后镜像自愈）

#### K-⑥-2 — [⑥ active 位移完整性] 同 tick delete+switch → switch 提升已删除目标

- **位置**：`use-conversation.ts:316`（switch `conversations.some` 闭包 exists 检查，首语句豁免面）× `:370-404`（deleteConversation 同 tick 不 bump version 且不写镜像）
- **问题**：同 tick `deleteConversation(X)` + `switchConversation(X)` → exists 检查读到渲染闭包（X 仍在）→ 重建引擎 + `await loadMessages` 后**无 displacement 校验**（delete 不 bump `switchVersionRef`——注册红成员）→ 提升已删除会话（dangling active：列表无 X 但 activeConversationId=X）
- **族归属**：已知族 ⑥（同 tick 位移组合——delete 缺 bump 的直接后果面，注册红的组合成员）
- **复现**：probe C2，RED（activeId=X 不在列表）
- **信心**：确定（已复现）

#### K-⑥-3 — [⑥ active 位移完整性] mount bootstrap 选中 active 但不建引擎

- **位置**：`use-conversation.ts:242-246`（bootstrap `setActiveId(current ?? convs[0].id)` 不 build/promote 引擎）
- **问题**：storage 模式首挂载 `activeConversationId='A'` 而 `activeEngine=null`（「null before first switch」契约面）→ ai-chat `engine-null-switch`（`ai-chat.tsx:343-352`）回退空态——**默认会话的存储消息在首次手动 switch 前不可见**——注册成员「delete active → build-on-demand」的镜像形态「select active → 无引擎」
- **族归属**：已知族 ⑥（mount-bootstrap 臂）
- **复现**：round-02 P7，RED（activeId='A' + activeEngine=null + 消息不可见）
- **信心**：确定（已复现）

#### K-⑦-1 — [⑦ storage bootstrap 合并] clearAll 在 bootstrap 在途时被迟到 resolve 复活

- **位置**：`use-conversation.ts:242-246`（bootstrap `setConversations(convs)` 整体覆盖，非 functional merge）× clearAll（`:444` 清空）
- **问题**：`loadConversations` 在途时 `clearAll()`（内存 + storage 均清）→ bootstrap 迟到 resolve → `setConversations(convs)` **整体覆盖** → 已清列表复活（[A,B] 回列表 + activeId=A）——⑦ 门禁 `it.fails` 只表达 create 成员，**clearAll 成员未表达**
- **族归属**：已知族 ⑦（bootstrap 合并——clearAll 成员）
- **复现**：probe F，RED（clearAll 后 conversations.length=2）
- **信心**：确定（已复现）

#### K-K4/②-1 — [② sync 闭包读取/镜像维护] 同 tick delete+rename → storage 幽灵重存

- **位置**：`use-conversation.ts:370-404`（deleteConversation 不同步写 `conversationsRef`）`:406-425`（renameConversation 读镜像 + `saveConversation`）
- **问题**：同 tick `deleteConversation(X)` + `renameConversation(X,'T2')` → rename 从镜像（delete 未清）找到 X → `saveConversation(X)` 重存 → **storage 幽灵重创建**（remount 复生已删会话）；内存镜像亦发散（含已删会话）
- **族归属**：已知族 K4/②（catalog §7.4 陈述「所有列表变更方法必须同步维护 ref mirror」——**delete 违背写面**；K4 扫描器为读侧规则，未表达写面成员）
- **复现**：probe D，RED（storage[X] 重存）
- **信心**：确定（已复现）

#### K-K4/②-2 — [② sync 闭包读取/镜像维护] 同 tick rename+clearAll → storage 元数据幽灵

- **位置**：`use-conversation.ts:422-424`（rename saveConversation fire-and-forget）× `:427-475`（clearAll 不同步写 `conversationsRef` + drain 只排 saveMessages 链）
- **问题**：同 tick `renameConversation('A','T2')` + `clearAll()` → rename 从镜像（clearAll 未清）找到 A 并重存元数据——storage 残留 `{A: title:'T2'}` 幽灵（clearAll 已清 storage 后重落盘）
- **族归属**：已知族 K4/②（probe D 兄弟——clearAll 写面成员）
- **复现**：round-02 P1，RED（gated saveConversation 晚于 storage.clearAll resolve → 幽灵落盘）
- **信心**：确定（已复现；依赖异步 storage——IndexedDB/服务端宿主真实可达）

#### K-K3/④-1 — [④ storage 时序守卫] 同 tick create+clearAll → create 元数据不在排空链

- **位置**：`use-conversation.ts:309-311`（createConversation saveConversation fire-and-forget）vs `:452-474`（clearAll drain 只排 `pendingSavesRef` 的 saveMessages 链）
- **问题**：同 tick `createConversation(X)` + `clearAll()` → X 的 `saveConversation`（不入排空链，K3/§7.3 类别清扫只纳入 saveMessages）晚于 `storage.clearAll` resolve → **storage 幽灵会话**（remount 列表复生 X）
- **族归属**：已知族 K3/④（storage 时序守卫——元数据写成员，K3 排空链只覆盖消息写）
- **复现**：round-02 P2，RED（storage.clearAll 之后 X 元数据落盘）
- **信心**：确定（已复现；同 P1 依赖异步 storage）

#### K-⑨-1 — [⑨ plugin 错误隔离] aborted turn 的 onTurnEnd rejection → host promise reject

- **位置**：`create-engine.ts:362-364`（finally `await plugin.onTurnEnd` 无守卫）
- **问题**：abort → 流结算 → finally `onTurnEnd` reject → 状态正确落 'aborted'（先于 finally）但 **host-facing `sendMessage` promise reject**——`void engine.sendMessage()` 场景 = **unhandled rejection**；⑨ 门禁成员 3 只覆盖「onTurnEnd rejection 遮蔽原错误」的**非 abort 面**，abort 变体未表达
- **族归属**：已知族 ⑨（plugin 错误隔离——abort 变体成员）
- **复现**：round-02 P5，RED（aborted 轮 + onTurnEnd reject → promise reject）
- **信心**：确定（已复现）

### 3.2 新族（→ Cycle 3 / I1 触发证据）— **零**

双轮探查全部发现均落入既有不变式族（⑥⑦⑨⑩ + K4/② + K3/④），**无需要新增不变式陈述的失败类**——本轮不触发 Cycle 3 派生。

### 3.3 新 watch-only residuals（复触发条件明确）

| #     | 观察（文件:行）                                                                                                                                                 | 分类                | 复触发条件 / 不阻塞理由                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-E   | `onAfterRequest` 对 abort-before-first-chunk 轮仍触发（`create-engine.ts:466-468`），回调收到空 assistant（`content:''`）——aborted 轮被当作「请求完成」通知插件 | watch-only residual | 触发：abort 于首 chunk 前 + 插件实现 onAfterRequest（计数/记录类插件把空轮记为完成）；结果：插件侧状态失真，engine 状态无损坏。随 K-⑩-1 修复面（aborted 轮空产物）一并评估 |
| W-⑨-a | connector-missing 早退（`create-engine.ts:210-229`）不触发 onTurnStart/onTurnEnd——`plugin.onError` 无配对 start/end（生命周期不对称）                           | watch-only residual | 触发：无 connector 的 engine + 实现生命周期计数/日志的插件；结果：插件计数失步。设计面（早退不入正常生命周期），低严重度                                                   |
| W-⑨-b | bootstrap-active 会话的 chat 面回退自建引擎不在 engineCache → 不挂 autoSave → 默认会话消息在首次 switch 前不持久化（`use-conversation.ts:242-246` 伴生）        | watch-only residual | 触发：storage 模式 + 首挂载直接发消息（不先 switch）；结果：消息仅内存。随 K-⑥-3 裁决评估（修复 K-⑥-3 时自然覆盖）                                                         |
| W-⑨-c | `clear()`/`setMessages()` 不重置 `lastError`（`create-engine.ts:146-158`/`:564-569`）——reset 后 stale 错误在下一 turn 启动（`:241` 清除）前可见                 | watch-only residual | 触发：错误轮后 host 调 clear/setMessages 再读 state.lastError；结果：UI 残留 stale 错误气泡。低严重度（下一 turn 自动清除）                                                |

## 4. Cycle 1 W1-W4 复核（以 I6 复查结论为锚，2026-08-09）

> 交接锚点：I6（plan `2026-08-09-2229-1` Phase 1）实证复跑 3/3——W1 维持 watch-only（K2 已收敛 generator 残留面；controller/processingState 窗口仍在）。新门禁面（⑥-⑩）下逐条复核：

| #    | 复核结论（新门禁面下）                                                                                                                                                                               | 复触发条件变更 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| W1   | **维持 watch-only**——⑥-⑩ 门禁均不表达 `abort()` 内部（controller/processingState 复位）；`abort→(clear\|setMessages)→再 abort` 窗口经本 plan 双轮探查未触及新变化，I6 结论保持                       | 无             |
| W2   | **维持 watch-only**——setMessageEditing 流式写入被 chunk 提交覆盖；⑥-⑩ 门禁未触及该面（⑩ 残留面为失败轮产物，非 editing 状态）                                                                        | 无             |
| W3   | **维持 watch-only**——delete 的 `await removed.abort()` 在 storage try/catch 外；K-⑨-1（onTurnEnd rejection）与本项相邻但为不同触发面（P5 为插件 reject，W3 为订阅者 throw），均病态低概率            | 无             |
| W4   | **维持 watch-only**——abort 于 onTurnStart 留未回答 user 消息；K-⑩-2（onBeforeRequest 幽灵）为其 hook 面兄弟（不同 hook、不同残留形态），已独立落档 §3.1                                              | 无             |
| 附带 | Cycle 1 round-02 #9 的「同 tick create+switch exists 检查静默 no-op」——本次在 probe C2 中确认其机制（首语句豁免闭包读取 + delete 不 bump）为 K-⑥-2 的组合根因之一，不再单列 watch-only（并入 K-⑥-2） | —              |

## 5. 未触发的登记候选族（保持登记，不派生）

| 候选族                          | Cycle 2 / I2 探查结论                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| streaming backpressure（I0 §3） | 未发现违背：chunk 原地替换内存有界；K-⑩-5（零 chunk 轮）为产物面非背压面。候选保持登记                            |
| tool-execution 并发（I0 §3）    | 未发现违背：per-call abort 检查存在；round-02 复核 executeToolCalls 仅 abort 返回 false，无新交错面。候选保持登记 |

## 6. Loop Rule 派生摘要（供 I3 / I6-Cycle2 消费）

- **已知族（门禁漏覆盖 → I3 裁决补门禁）**：**13 条**——K-⑩×5（abort-before-first-chunk / hook 拒绝幽灵 / autoSave 持久化臂 / regenerate 臂 / 零 chunk 成功臂）、K-⑥×3（同 tick 幽灵 fixup / 同 tick delete×switch / bootstrap 无引擎）、K-⑦×1（clearAll 成员）、K-K4/②×2（delete / clearAll 镜像写面）、K-K3/④×1（create 元数据不入排空链）、K-⑨×1（abort 变体 onTurnEnd rejection）
- **新族（Cycle 3 / I1 触发证据）**：**零**——本轮不派生 Cycle 3
- **watch-only**：新 4 条（W-E / W-⑨-a/b/c）+ Cycle 1 W1-W4 维持
- **red list**：注册面确定性确认（⑥×3 + ⑧×1 == Cycle 2 / I1 注册表，零差异零未注册）
- 全部发现均带 `文件:行` + 不变式族归属 + 复现证据（RED 测试记录，临时文件已删零残留），可直接支撑 I3 裁决表

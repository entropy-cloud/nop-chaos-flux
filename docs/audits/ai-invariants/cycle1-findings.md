# Cycle 1 / I2 — 不变式驱动审计发现（Cycle 1 Findings）

> Status: active（Cycle 1 / I2 产出，供 I3 裁决与 Loop Rule 派生引用；零悬挂）
> Last Updated: 2026-08-09
> Source: `docs/plans/2026-08-09-1826-3-i2-invariant-driven-audit.md` + `docs/audits/ai-invariants/invariant-catalog.md`（I0）+ `docs/audits/ai-invariants/gates.md`（I1）
> Produced By: plan `2026-08-09-1826-3-i2-invariant-driven-audit.md`（纯文档计划）
> 探查记录：`docs/analysis/2026-08-09-i2-cycle1-adversarial-probe/round-01-executor.md`（执行 session）+ `round-02-independent.md`（独立 fresh session，ses_019a8dbaeffeCjg3XMH7KqCUR2）
> 下游消费: I3（裁决表，族分类 → 工作项）、I6（新族 → Cycle 2 派生）、Loop Rule（新族触发证据）

## 1. Phase 1 — 门禁全量运行与 red list（预期零命中验证）

### 1.1 运行记录

| 命令                                                               | exit code | 结果                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`（14 项 check:\* 链，含 `check:ai-engine-invariants`） | 1         | 唯一失败 = `check:audit-event-dispatch-ctx` 6 hits（`flux-renderers-industrial/src/binding/` animator.ts:97/108/116/162 + point-store.ts:303 + refresh-pipeline.ts:423）——**既有登记 red**（`docs/logs/2026/08-09.md` 已移交 industrial workstream，非本 plan 引入）；`check:oversized-code-files` 2 errors 均为已登记豁免（en-US.ts/zh-CN.ts locale）；其余 11 项全绿，**零新增命中** |
| `pnpm check:ai-engine-invariants`（链尾，链中断未跑到，单独复跑）  | 0         | `[find-ai-engine-invariant-violations] No invariant violations found.` 静态扫描器零命中                                                                                                                                                                                                                                                                                                |
| `pnpm --filter @nop-chaos/flux-renderers-ai test`                  | 0         | 66 files / **536 tests passed**（含 `engine-invariants.test.ts` + `conversation-invariants.test.ts` 22/22 + 全部既有回归）                                                                                                                                                                                                                                                             |

### 1.2 red list

**空。** 预期「I1 门禁对 live 仓库零命中」验证通过：

- 不变式①⑤（参数化运行时测试）全绿；
- 不变式②③④（静态扫描器 + 参数化测试）零命中；
- 表完备性门禁（engine 12 键 ⊆ 测试表 ∪ 白名单；adapter 5 函数字段 ⊆ 测试表）零报警，无新增未入表方法。

`pnpm check` 的 exit 1 完全由既有登记 red 造成（industrial 6 hits + oversized 2 豁免基线），与本 plan 目标集（`flux-renderers-ai` engine + adapters）零交集。

## 2. Phase 2 — 方法 × 不变式覆盖矩阵

> 12 目标方法（catalog §4.1）+ `runTurn` 行（I0 §4.2 裁定：内部管道，间接覆盖）。格值：covered / partial / uncovered / N/A（catalog 裁定不适用）。

| 方法                 | ① 入口守卫                                         | ② await 后 ref 读取                       | ③ controller 身份守卫                                          | ④ storage 经 reportStorageError         | ⑤ abort 清理                        |
| -------------------- | -------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- | --------------------------------------- | ----------------------------------- |
| `sendMessage`        | covered（gate ①）                                  | N/A（engine 无闭包捕获，全程 live reads） | covered（间接：runTurn/runOnce 身份守卫）                      | N/A                                     | covered（间接）                     |
| `send`               | covered（gate ①）                                  | N/A                                       | covered（间接）                                                | N/A                                     | covered（间接）                     |
| `abort`              | N/A（终止路径本身，不启动并发 turn）               | N/A                                       | N/A                                                            | N/A                                     | covered（gate ⑤；残留窗口见 K2/W1） |
| `regenerate`         | covered（gate ①）                                  | N/A                                       | covered（间接）                                                | N/A                                     | covered（间接）                     |
| `clear`              | covered（gate ① sync 守卫）                        | N/A                                       | N/A                                                            | N/A                                     | partial（不触碰 controller，W1）    |
| `setMessages`        | covered（gate ① sync 守卫）                        | N/A                                       | N/A                                                            | N/A                                     | partial（同 clear 行）              |
| `setMessageEditing`  | **uncovered**（① scope 排除；已探查 → benign，W2） | N/A                                       | N/A                                                            | N/A                                     | N/A                                 |
| `createConversation` | N/A（sync）                                        | N/A（sync）                               | N/A                                                            | covered（gate ④ + scanner）             | N/A                                 |
| `switchConversation` | N/A                                                | covered（gate ② + 既有回归）              | N/A                                                            | covered（loadMessages catch + scanner） | N/A                                 |
| `deleteConversation` | N/A                                                | covered（gate ② + 既有回归）              | N/A                                                            | covered（gate ④ + scanner）             | covered（gate ⑤ + 既有回归）        |
| `renameConversation` | N/A                                                | **partial**（sync 闭包读取，K4）          | N/A                                                            | covered（gate ④ + scanner）             | N/A                                 |
| `clearAll`           | N/A                                                | N/A（sync）                               | N/A                                                            | covered（gate ④ + scanner）             | covered（gate ⑤）                   |
| `runTurn`（间接行）  | covered（间接：经 send/sendMessage/regenerate）    | N/A                                       | covered（直接：gate ③ 测试命中 runTurn/runOnce catch/finally） | N/A                                     | covered（间接）                     |

- **uncovered / partial 格 = 探查聚焦点**：①×setMessageEditing、②×renameConversation 均已探查并记录（W2 / K4）——矩阵无未探查的悬空格。
- `runTurn` 行按 I0 裁定以间接覆盖标注，其任何格不作为独立探查聚焦点（本 plan 遵守）。

## 3. 发现清单（族分类，零悬挂）

> 分类口径：**已知族（门禁漏覆盖 → I3 补门禁）** = 失败机制已被 catalog §2 五条不变式覆盖但门禁未表达该路径；**新族（→ Cycle 2 触发证据）** = 需要新增不变式（含 I0 §3 已登记候选族的触发）。

### 3.1 已知族（门禁漏覆盖 → I3 裁决补门禁）

#### K1 — [③ controller 身份守卫族] runTurn 成功路径完成 mutate 无身份守卫

- **位置**：`create-engine.ts:318-323`（`if (draft.requestState === 'aborted') return;` 仅状态字符串判据，无 controller 身份守卫）
- **问题**：abort 于 `await plugin.onTurnStart`（:240-242，try 之外）期间 → ⑤ 同步复位 isProcessing → 新 `sendMessage` 启动新 turn（新 controller）→ 陈旧 turn 从 onTurnStart 恢复，`while` 循环首迭代 `signal.aborted` break → 完成 mutate 看到 'processing'（新 turn 的）→ 写入 `'completed'`/`isProcessing=false` → **新 turn 仍在流式但状态已完成**；第三次 send 越过守卫 → 两个 turn 并发写 messages。
- **族归属**：已知族 ③（catch/finally 身份守卫的兄弟路径——成功路径完成写入漏守卫；门禁 ③ 的检测方法只扫 catch/finally 块）
- **复现**：probe-A，RED（`isProcessing=false, requestState='completed'` while turn-2 mid-stream）
- **为什么值得修**：abort→send 竞态是 catalog 记录的 1757 P1 同型路径（stale turn clobber new turn），本次在门禁盲区复活
- **信心**：确定（已复现）

#### K2 — [⑤ abort 清理族] abort 不强制终结在途 generator 消费

- **位置**：`create-engine.ts:417-429`（chunk 循环无 per-iteration signal 检查）、`abort()` :509-519（只 `controller.abort()` + 同步复位，不持有/调用 `generator.return()`）
- **问题**：signal-ignoring connector 的 generator 在 abort 后继续推进——迟到 chunk 仍被 apply/commit 到已 abort 轮的消息；永不 settle 的 generator 使 `for await` 永不返回 → catch/finally 永不执行 → **placeholder `loading=true` 永久 + abortController 永久残留**（isProcessing=false 但 controller 非空）。⑤ 门禁的运行时测试全部使用"会 settle 的 gated connector"，此路径盲区。
- **族归属**：已知族 ⑤（abort 清理族——「终止责任必须显式归属」的未尽面）
- **复现**：未脚本化复现（需永不 settle 的 generator；静态证据成立）
- **为什么值得修**：abort 后 UI 永久 loading ghost + controller 泄漏，破坏 host 侧「aborted 即终态」契约（F1.6 的成立前提）
- **信心**：很可能（代码路径确定，依赖 connector 行为）

#### K3 — [storage 幽灵族 / P1-b 兄弟路径] save-after-delete/clearAll 时序 → ghost 重落盘

- **位置**：`use-conversation.ts:183-196`（attachAutoSave saveMessages fire-and-forget）vs `deleteConversation` :348-372 / `clearAll` :390-423（storage delete 时序）；`clearAll` 的 abort 循环（:394-398）先于 `detachEngine`（:399）触发 autoSave 监听 → **aborted 快照在 storage fan-out 删除之前重新落盘**
- **问题**：in-flight `saveMessages` 在 `storage.deleteConversation`/`clearAll` 之后 resolve → 已删会话的消息被重新写入 storage → remount 时（conv 记录已删，消息还在）形成 orphan ghost；与 P1-b 修复的「ghost rehydration」同族逆序形态（P1-b 修了 clearAll 缺 delete 路径，本发现是 delete 后迟到 save 的漏网）
- **族归属**：已知族（storage 静默丢/幽灵族——P1-b 的兄弟路径）
- **复现**：probe-6，RED（delete 后 storage 仍含已删会话消息）
- **信心**：确定（已复现）

#### K4 — [② stale-closure 族（同步扩展）] renameConversation 读闭包 conversations

- **位置**：`use-conversation.ts:374-388`（`const updated = conversations.find(...)` :377 读 render 闭包）
- **问题**：同 tick `createConversation()` + `renameConversation(id, 'T2')` → 闭包 `conversations` 尚无新 id → `updated` undefined → `saveConversation` 永不调用 → **rename 静默不持久化**（内存列表已改，刷新后丢失）。② 不变式现仅约束「await 之后的读取」，sync 闭包读取不在门禁 scope。
- **族归属**：已知族 ②（stale-closure——同步变体的门禁 scope 缺口；I3 裁决是否把 ② 扩展至 sync 读取）
- **复现**：probe-K4，RED（persisted titles = ["initial"]，rename 丢失）
- **信心**：确定（已复现）

### 3.2 新族（→ Cycle 2 / I1 触发证据，按 Loop Rule 派生）

#### N1 — [未登记新族] active 提升/复水路径的位移完整性（switch/delete）

- **触发证据（文件:行）**：`use-conversation.ts:293-346`（switchConversation：post-await promotion `setActiveEngine(engine)` :325 无位移校验；hydration `engine.setMessages(stored)` :315 被 version guard 丢弃）；`use-conversation.ts:348-372`（deleteConversation 不 bump `switchVersionRef`）；`use-conversation.ts:390-423`（clearAll 不 bump `switchVersionRef`）；`use-conversation.ts:263-291`（createConversation 不 bump `switchVersionRef`）
- **不变式陈述**：adapter 的 post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）必须以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；**位移方法（delete/clearAll/create）必须 bump `switchVersionRef` 使在途 switch 失效**；删除 active 会话后的 next 引擎必须 build-on-demand（禁止 `setActiveEngine(null)` 悬挂）；同 id 快速重 switch 时 hydration 不得被 version guard 整体丢弃（应延迟到最新 switch 或标记 hydrated）
- **成员（全部复现 RED）**：
  - probe-1：switch A→B 在途 + delete B → `activeId='A'` 但 `activeEngine`=B 引擎（错位）
  - probe-1b：switch 在途 + clearAll → `activeId=null` 但 `activeEngine` 非空（错位）
  - probe-1c：switch 在途 + create X → `activeId=X` 但 `activeEngine` 被 B 引擎覆盖（错位）
  - probe-B：同 id 快速二次 switch → 存储消息永不 hydrate（0 条）+ 下轮 autoSave 覆盖存储（数据丢失风险）
  - probe-C：storage 模式 delete active → `activeId=next` 但 `activeEngine=null`（chat 面回退自建空引擎，持久化消息不可见）
- **为什么值得修**：全部是「await 间隙位移 → UI 显示与持久化状态错位」，其中 probe-B 含数据丢失面；现有 version guard（P1-3）只覆盖 switch-vs-switch 一个成员，delete/clearAll/create 均未接入
- **信心**：确定（5 成员全部复现）

#### N2 — [未登记新族] mount bootstrap 列表覆盖

- **触发证据**：`use-conversation.ts:221-229`（bootstrap `setConversations(convs)` :226 整体覆盖，非 functional merge）
- **不变式陈述**：storage bootstrap 的 post-await `setConversations` 必须合并当前状态（functional updater），不得覆盖加载期间由 `createConversation` 创建的会话
- **复现**：probe-2，RED（create X 后 bootstrap resolve → 列表=[A]，activeId=X 悬空出列）
- **信心**：确定

#### N3 — [登记候选族 branching/fork 触发] pendingBranchId 泄漏

- **触发证据**：`create-engine.ts:100`（pendingBranchId 声明）+ `:385`（runOnce 消费一次）+ `:542-566`（regenerate 设置戳 + `await runTurn([])`）；泄漏路径 = runTurn 的 connector-missing 早退（:202-222，在 runOnce 之前 return，戳未消费）
- **不变式陈述**：pendingBranchId 必须在使用前被消费或清除；任何 runTurn 提前返回路径不得遗留待消费的 branch 戳（防泄漏到无关 turn）
- **复现**：probe-3，RED（regenerate+connector-missing 后，下一正常 turn 的 assistant 被戳 `branchId:'branch-1'`）
- **族归属**：I0 §3 已登记候选族 branching/fork（触发条件「I2 发现 fork/分支状态不一致」成立）→ **Loop Rule 派生 Cycle 2 / I1**
- **信心**：确定

#### N4 — [登记候选族 plugin 生命周期触发] plugin hook 错误隔离缺失

- **触发证据**：
  - `create-engine.ts:240-242`：`await plugin.onTurnStart` 在 try 之外 → rejection 使 `requestState='processing'`/`isProcessing=true` 永久卡死（probe-4，RED）
  - `create-engine.ts:324-341` / `:459-478`：catch 内 `plugin.onError`（:326-328/:463-465）在状态写入 mutate 之前调用 → onError 抛错跳过 mutate → processing 卡死 + finally 清 controller 后 abort() 变 no-op（probe-E，RED）
  - `create-engine.ts:350-352`：`await plugin.onTurnEnd` 无守卫 → rejection 拒绝 sendMessage promise、无 onError/lastError、遮蔽原错误（静态证据）
- **不变式陈述**：plugin hook 的 rejection 不得使 turn 状态卡死或绕过状态写入：onTurnStart 必须纳入 try/finally 清理面；onError 调用不得先于状态写入（或写入不得被 hook 抛错跳过）；onTurnEnd rejection 不得遮蔽原错误（所有错误必须落在 `requestState`/`lastError`）
- **族归属**：I0 §3 已登记候选族 plugin 生命周期（触发条件「I2 发现 plugin hook 交错/错误传播违背」成立）→ **Loop Rule 派生 Cycle 2 / I1**
- **信心**：确定（2 复现 + 1 静态）

#### N5 — [未登记新族] failed-turn 残留消息污染后续请求

- **触发证据**：`create-engine.ts:459-478`（runOnce catch 提交 `loading=false, content=''` 的 placeholder）+ `:482-487`（buildContext 只排除 `loading===true` 的尾消息）
- **不变式陈述**：failed/aborted 轮的残留空 placeholder 不得进入后续请求历史（应移除或排除）；失败轮必须清理自身产物
- **复现**：probe-D，RED（请求 #2 携带 `{content:'', loading:false}` 空 assistant 消息——严格后端会拒绝空块）
- **信心**：确定

## 4. watch-only residuals（Deferred But Adjudicated，复触发条件明确）

> 按 plan「Deferred But Adjudicated」要求：疑似但低严重度/未确定性复现的发现，写清复触发条件，不允许静默丢弃。

| #   | 观察（文件:行）                                                                                                                                                                       | 分类                | 复触发条件 / 不阻塞理由                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1  | abort() 不重置 `processingState`/`abortController`（:509-519）；clear/setMessages 不 null controller（:145-150/:528-533）；窗口期二次 abort 把 clear()/idle 状态 clobber 回 'aborted' | watch-only residual | 触发：abort→(clear 或 setMessages)→再 abort 的窄窗口；自愈：陈旧轮 finally 身份守卫清理；新 turn 覆盖。低严重度，不阻塞 closure                                          |
| W2  | setMessageEditing 流式期间写入被 chunk 提交覆盖（:153-170 vs commitAssistant :401-409）                                                                                               | watch-only residual | 触发：isProcessing 期间 host 调 setMessageEditing 于流式 placeholder；结果：editing 状态丢失（内容零损坏）。设计面语义（host 不应在流式中编辑），矩阵 uncovered 格已探查 |
| W3  | deleteConversation 的 `await removed.abort()`（:353-355）在 storage try/catch 之外                                                                                                    | watch-only residual | 触发：engine 订阅者抛错使 abort() reject → activeId fixup 跳过；病态（listener throw），低概率                                                                           |
| W4  | abort 于 onTurnStart 期间留下未回答 user 消息（:227-235）                                                                                                                             | watch-only residual | 触发：K1 同触发面；语义上 abort 保留 user 消息供 regenerate 属设计行为；「未回答历史进下一请求」为轻微上下文污染                                                         |

## 5. 未触发的登记候选族（保持登记，不派生）

| 候选族                          | I2 探查结论                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| streaming backpressure（I0 §3） | 未发现违背：chunk 累积原地替换（assistantIndex 索引提交，messages 数组不增长），内存有界于内容；无丢 chunk。候选保持登记 |
| tool-execution 并发（I0 §3）    | 未发现违背：per-call abort 检查存在；abort 后至多追加 1 条 tool 消息（benign）。候选保持登记                             |

## 6. Loop Rule 派生摘要（供 I6 回写）

- **已知族（门禁漏覆盖，I3 补门禁）**：K1（③ 成功路径身份守卫）、K2（⑤ 强制终结）、K3（④ 时序/幽灵）、K4（② sync 读取扩展）
- **新族（Cycle 2 / I1 触发证据齐备）**：N1（active 位移完整性）、N2（bootstrap merge）、N3（branch 戳泄漏，候选族触发）、N4（plugin 错误隔离，候选族触发）、N5（失败轮残留污染）
- 全部发现均带 `文件:行` + 不变式陈述 + 复现证据（RED 测试记录），可直接支撑 I3 裁决表与 Loop Rule 自动派生

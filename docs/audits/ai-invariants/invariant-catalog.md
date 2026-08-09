# AI Engine 不变式目录（Invariant Catalog）

> Status: active（Cycle 1 / I0 产出 + I4 门禁补强扩展 + Cycle 2 / I1 §9 新族 ⑥-⑩ 沉淀，供 I5 验证与后续审计引用）
> Last Updated: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Cycle 1 / I0 + Cycle 2 / I1 派生）+ 4 轮 AI 审计（`docs/audits/2026-07-23-2141-*ai.md`、`2026-07-24-1757-*ai.md`、`2026-07-24-2151-*ai.md`、`2026-07-25-0707-*ai.md`）+ C8.1/8.2/8.3 + post-closure + Bug 07 note + I4 修复执行（K1-K4）+ Cycle 2 / I1 沉淀执行（N1-N5 → ⑥-⑩）
> Produced By: plan `docs/plans/2026-08-09-1826-1-i0-invariant-inventory-baseline.md`（纯文档计划）；扩展于 plan `docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`（K1-K4 + 门禁 ②③④⑤ 补强）；§9 沉淀于 plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`（⑥-⑩ 第二批门禁）
> 下游消费: I1（门禁沉淀 `check:ai-engine-invariants`）、I2（不变式驱动审计）、Loop Rule（新族派生）、I5（全量验证）、Cycle 2 / I2（⑥-⑩ 门禁运行审计）

## 1. 基线确认：当前零 engine 不变式门禁

（2026-08-09 live 核对）

| 事实                                                                                                               | 证据                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` 的 `check:*` 项均与 engine/conversation 无关                                                        | HEAD 口径 **28 项**（`git show HEAD:package.json` 实测）；working tree 合并中 **30 项**（实测 30 个 `check:*` 键，新增 `check:scada-symbol-keys`/`check:audit-canvas-wrapper-a11y` 等均非 engine 项）——两版本均无 `check:ai-engine-invariants` 或任何 engine/conversation 门禁，零门禁基线结论不受合并影响 |
| `check:audit-event-dispatch-ctx` 是 renderer 包等价先例（一类模式落一个 check + committed 回归，基线零命中防回退） | `package.json` → `node scripts/audit/find-event-dispatch-without-ctx.mjs`；扫描 renderer 事件派发 ctx 契约，engine 无等价物                                                                                                                                                                                |
| `scripts/audit/` 扫描器框架无 engine 扫描器                                                                        | 目录实况：`shared.mjs`/`rules.mjs` + `react19-rules.mjs`/`canvas-a11y-rules.mjs` + 14 个 `find-*.mjs` + `discover-audit-suspects.mjs`（共 15 个扫描器，async-failure-paths / event-dispatch / renderer-browser-io / suspects …），零 engine 相关                                                           |
| `docs/audits/ai-invariants/` 此前不存在                                                                            | 本文件为该目录首个产物（I0 前 glob 零命中）                                                                                                                                                                                                                                                                |
| `docs/components/flux-renderers-ai/engine.md` 无 §invariants 节                                                    | 章节为 7/8/9…（数据模型/引擎与适配器/Connector），无 invariants 节；该节由 **I1** 补写（本 plan Non-Goal）                                                                                                                                                                                                 |

## 2. 首批 5 类不变式

> 每条四字段：**不变式陈述 / 覆盖失败族 / 历史 bug 证据（live `文件:行` 或 bug note 编号）/ 检测方法**。所有行号均经 2026-08-09 live 复核。三大复发族当前终态均为「已修复」（§2.6 逐条核对记录），本目录把它们沉淀为**可执行契约**，防重构/新增方法回归（I1 落门禁）。

### 2.1 不变式 ① —— 异步变更入口 `isProcessing` 守卫

- **不变式陈述**：所有异步变更入口（`sendMessage`/`send`/`runTurn`/`regenerate`）在进入请求路径前必须检查 `adapter.getState().isProcessing`，in-flight 时立即返回（静默忽略 = host 侧"第二次调用被忽略的取消"，同 Bug 07 的 `submitting` gate 语义），禁止并发启动第二个 turn 覆盖 `abortController`/交错写 `messages`。同步变更入口（`clear`/`setMessages`）同用该守卫拒绝 in-flight 时替换/清空消息（防与流式累积器竞争），但**不适用**"串行化"语义（I1 门禁表须区分：① 只查异步变更族）。
- **覆盖失败族**：并发守卫族（跨 3 轮审计才完整修复的典型）。
- **历史 bug 证据**：
  - `docs/bugs/07-submit-concurrent-guard-fix.md`（Bug 07：submit 无并发守卫 → 双 API 调用 + finally 早复位；"all mutating async methods should have a concurrency guard" 是首次实例）
  - `docs/audits/2026-07-23-2141-multi-audit-ai.md` **[AI-01]**（P0：`sendMessage`/`send`/`runTurn` 缺并发守卫 = Bug 07 复发；仅 `clear`/`setMessages`/`regenerate` 有守卫，三个主 send 入口无）
  - `docs/audits/2026-07-24-1757-open-audit-ai.md` :21（F1.1 已修复实证）
  - live 终态（已修复，实证行号）：`create-engine.ts:199-201`（`runTurn` 入口守卫）、`:543-545`（`regenerate` 入口守卫）、`:525-527`（`clear` in-flight 守卫）、`:142-144`（`setMessages` in-flight 守卫）
- **检测方法**：静态 grep——`async function (sendMessage|send|runTurn|regenerate)\b` 的函数体首个状态读取必须出现 `isProcessing` 检查（`if (adapter.getState().isProcessing) return;`），缺失即违例；`clear`/`setMessages` 同理（守卫形式不同但必须存在）。运行时断言——in-flight 期间二次 `sendMessage` 不产生第二次 connector 请求、`requestState` 不被改写（I1 参数化方法表驱动）。

### 2.2 不变式 ② —— `await` 后状态读取用 `activeIdRef`/`versionRef`（非闭包捕获）

- **不变式陈述**：conversation adapter 的异步方法在 `await`（`loadMessages`/`abort`/`deleteConversation` storage 调用）之后的任何状态读取（activeId / conversations 列表 / engine 提升判断）必须读 ref mirror（`activeIdRef`/`conversationsRef`）或版本号（`switchVersionRef`），禁止读闭包捕获的 render 期快照——await 间隙内 `createConversation`/`switchConversation` 可能已位移 active 会话，闭包读取会以旧状态覆盖新状态。
- **覆盖失败族**：stale-closure 族（"same family, missed method"——先修 `switchConversation` 后 0707 才发现 `deleteConversation` 漏改）。
- **历史 bug 证据**：
  - `docs/audits/2026-07-25-0707-multi-audit-ai.md` **[P1-1]**（`deleteConversation` post-await stale-closure race；:56-82 含完整风险链：delete 流式会话 → abort await 间隙 create Y → post-await 闭包读取 `activeId==='X'` → `setActiveId(null)` 覆盖 `setActiveId('Y')`）
  - 先例（已修复）：`switchConversation` 的 P1-3 修复（version guard + activeIdRef，见 :117-129 注释块 + `:313`/`:324` version 检查）
  - live 终态（已修复，实证行号）：`use-conversation.ts:126-129`（`activeIdRef` mirror + effect）、`:133-136`（`conversationsRef` mirror）、`:121`（`switchVersionRef`）、`:313`/`:324`（switch post-await version guard）、`:339`（eviction 读 `activeIdRef.current`）、`:360-366`（deleteConversation post-await 读 `activeIdRef.current` + `conversationsRef.current`）
- **检测方法**：静态 grep——`async function` 体内 `await` 之后出现的 `activeId`/`conversations` 裸读取（非 `Ref.current`）即违例；运行时断言——delete-during-abort + 并发 create 交错后新会话保持 active（既有回归：`adapters/__tests__/use-conversation-delete-during-abort.test.ts`、`use-conversation-switch.test.ts`）。

### 2.3 不变式 ③ —— `catch`/`finally` 的 controller 写入做身份守卫

- **不变式陈述**：`runTurn` 的 `catch`/`finally`（含轮次内 `runOnce` 的 catch 与 post-stream abort 检查）内任何对 `abortController`/`requestState`/`isProcessing`/`processingState`/`lastError` 的 `adapter.mutate` 写入，必须以本 turn 创建的 controller 身份判断前置：`if (draft.abortController !== abortController) return;`（catch/完成路径）与 `if (draft.abortController === abortController) draft.abortController = null;`（finally 清理路径）。禁止无条件覆盖——abort→send 竞态下，stale turn 的迟到写入不得 clobber 新 turn 的 controller 与状态。
- **覆盖失败族**：controller 生命周期族（1757 发现：AI-01 守卫修了入口，未修出口）。
- **历史 bug 证据**：
  - `docs/audits/2026-07-24-1757-multi-audit-ai.md` **[P1] abort→send race clobbers the new turn's controller and requestState**（:34-62：finally 无条件 `abortController=null`（:39-53 证据）；场景 = Turn A 流式 → `abort()` 同步置 false → `sendMessage('next')` 过入口守卫装 controllerB → A 的 catch/finally 续跑 → clobber B；修复建议 :60；Planned Into `docs/plans/2026-07-24-1757-1-ai-message-snapshot-contract-remediation.md` P1#1）
  - live 终态（已修复，实证行号）：`create-engine.ts:334`（runTurn catch mutate 身份守卫）、`:346-348`（runTurn finally 只清自己的 controller）、`:451`（runOnce 轮次内 post-stream abort 检查身份守卫）、`:470`（runOnce catch 身份守卫）——全部标 `P1#1`
- **检测方法**：静态 grep——`runTurn`/`runOnce` 的 `catch`/`finally` 块内 `adapter.mutate` recipe 第一行必须是 `draft.abortController ===/!== abortController` 身份判断，缺失即违例；运行时断言——abort→send 紧邻交错后，新 turn 的 `requestState==='processing'` 且 `abortController` 为新控制器（既有回归：`engine/__tests__/engine-concurrency.test.ts`）。

### 2.4 不变式 ④ —— storage 变更经 `reportStorageError`

- **不变式陈述**：conversation adapter 的每个 storage 变更/加载调用点（`saveConversation`（create/rename）、`deleteConversation`（delete/clearAll fan-out）、`clearAll`、`loadConversations`、`loadMessages`、`saveMessages`）必须接 `.catch` → `reportStorageError({ phase, conversationId?, error })`，禁止裸 `void storage?.xxx?.(...)` 静默吞 rejection；无 `clearAll` 时 per-id fan-out 的每个 rejection 也必须单独上报（一个失败不掩盖其他）。storage 失败保持非致命（内存模型不受影响），但 host 必须可观察（`onStorageError`，AI-28）。
- **覆盖失败族**：storage 静默丢族（P1-2 修 create/rename → 0707 发现 clearAll 完全无 delete 路径，"precise inverse"）。
- **历史 bug 证据**：
  - `docs/audits/2026-07-25-0707-open-audit-ai.md` **[P1-1] `clearAll()` silently leaves every conversation in storage → ghost rehydration**（:41-68：`rg clearAll **/*.test.*` = 0 hits；失败链 = clearAll 后 remount 时 `loadConversations()` rehydrate 全部已清会话）
  - 先例（已修复）：`docs/audits/2026-07-25-0707-multi-audit-ai.md` :33（P1-2 storage bypass on create/rename → FIXED，经 `reportStorageError({phase:'saveConversation'})`）
  - `docs/audits/2026-07-23-2141-multi-audit-ai.md` **[AI-28]**（:660：bare `catch {}` 吞 storage 失败仅 console.warn → 引 `onStorageError` host 回调）
  - live 终态（已修复，实证行号）：`use-conversation.ts:97-105`（`reportStorageError` 定义）、`:287-289`（createConversation saveConversation `.catch`）、`:384-386`（renameConversation saveConversation `.catch`）、`:370`（deleteConversation storage delete `.catch`）、`:412-422`（clearAll：`storage.clearAll` 优先 + per-id fan-out，各自 `.catch`→`reportStorageError`）、`:234`（loadConversations catch）、`:318`（loadMessages catch）
- **检测方法**：静态 grep——`storage?.(saveConversation|deleteConversation|clearAll|loadConversations|loadMessages)` 调用点必须紧跟 `.catch(...reportStorageError...)`，裸 `void storage?....(` 即违例；运行时断言——mock storage 各操作 reject 时 `onStorageError` 收到对应 `phase` 事件且内存状态不损坏（既有回归：`adapters/__tests__/use-conversation-clear-all.test.ts`、`use-conversation-storage.test.ts`）。

### 2.5 不变式 ⑤ —— abort 路径清理 controller

- **不变式陈述**：① host 侧卸载（unmount）必须 abort 所有自建 engine 的 in-flight 流（孤儿流不残留连接）；② `engine.abort()` 必须同步置 `requestState='aborted'`/`isProcessing=false`（F1.6，不等流式 catch 解阻塞）并 abort 当前 controller；③ turn 终态（finally）只清理本 turn 创建的 controller（见 ③ 身份守卫）。任何在途流的终止责任必须显式归属（启动/取消/销毁/串行四语义一致建模，F2.2 审计建议）。
- **覆盖失败族**：unmount-abort 族（F2.2）+ 并发守卫族的终止面。
- **历史 bug 证据**：
  - `docs/audits/2026-07-23-2141-open-audit-ai.md` **[F2.2]**（:26/:102：卸载不 abort 在途流 → 孤儿流/连接不释放；:133 建议把 abort/turn-serialization/lifecycle 收敛进 engine 单一职责）
  - `docs/audits/2026-07-24-1757-open-audit-ai.md` :27（F2.2 已修复实证：`use-conversation.ts:223-235`、`use-message.ts:100-108` 均新增自建引擎 unmount-abort——旧行号，当前见下）
  - live 终态（已修复，实证行号）：`use-conversation.ts:249-261`（unmount effect：cache 中 `isProcessing` engine 逐一 `void engine.abort()` + 订阅清理）、`:353-355`（deleteConversation 对 in-flight engine abort）、`:394-398`（clearAll 对 in-flight engine abort）；`create-engine.ts:509-519`（`abort()` 同步置 `requestState='aborted'`/`isProcessing=false` + `controller.abort()`）、`:342-353`（finally 按身份守卫清理 controller）
- **检测方法**：静态 grep——创建/持有 engine 的组件卸载 effect 必须包含 `engine.getState().isProcessing → engine.abort()` 分支；`abort()` 实现必须同步 mutate `requestState`；运行时断言——unmount 后 connector 的 signal 已 aborted、无遗留订阅（既有回归：`adapters/__tests__/use-conversation-delete-during-abort.test.ts`、`use-conversation-clear-all.test.ts`）。

### 2.6 三大复发族「已修复」逐条核对记录（Proof）

（2026-08-09 live 逐行核对，全部一致）

| 族                                                      | 计划引用行号                                           | live 实测                                                                                                     | 结论   |
| ------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------ |
| 并发守卫族（controller 身份守卫）                       | `create-engine.ts:330-346`                             | catch mutate :329-341（守卫 :334）、finally :342-353（守卫 :346）                                             | ✓ 一致 |
| 并发守卫族（轮次内 runOnce 守卫）                       | `create-engine.ts:448-472`                             | post-stream abort mutate :447-455（守卫 :451）、catch mutate :466-477（守卫 :470）                            | ✓ 一致 |
| stale-closure 族（ref 读取）                            | `use-conversation.ts:122-128`                          | `activeIdRef` :126-129（注释 :122-125）                                                                       | ✓ 一致 |
| stale-closure 族（eviction / delete）                   | `use-conversation.ts:339` / `:360`                     | :339 `const currentActiveId = activeIdRef.current`；:360 `if (activeIdRef.current === id)`                    | ✓ 一致 |
| storage 静默族（clearAll fan-out + reportStorageError） | clearAll storage fan-out + per-id `reportStorageError` | :412-422（`storage.clearAll` 优先 + per-id `deleteConversation` fan-out，各自 `.catch`→`reportStorageError`） | ✓ 一致 |

## 3. 已知未覆盖族（Cycle 2+ 候选不变式，Cycle 1 不实现）

> roadmap I0 明示：以下族当前无已确认 live defect 处于 scope 内，登记管理预期；I2 若触及任一族即按 **Loop Rule** 派生 Cycle 2 / I1 新不变式（附触发证据 = 发现 `文件:行` + 不变式陈述）。

| 候选族                 | 已知形态（Cycle 1 不实现）                                                                                               | 触发条件（I2 触及则派生）             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| plugin 生命周期        | `registerPlugin` 的插件 hook 并发（onTurnStart/onBeforeRequest 序列化）、插件错误隔离、unregister 与 in-flight turn 交错 | I2 发现 plugin hook 交错/错误传播违背 |
| tool-execution 并发    | `executeToolCalls` 与 abort 交错、多 tool_call 并发执行顺序、`maxToolRounds` 循环边界外的交错                            | I2 发现 tool 执行期状态污染/终止不达  |
| streaming backpressure | `connector.stream` 生成器推进速率、chunk 累积背压、慢消费者下的内存/丢失                                                 | I2 发现背压/丢 chunk 违背             |
| branching/fork         | `branching.ts` 分支序列与 `regenerate` 并发、branchId 戳记竞态                                                           | I2 发现 fork/分支状态不一致           |

## 4. 审计目标集枚举（变更型方法）

> 供 I1 表完备性门禁（断言测试表方法集 == 本表 + 白名单）与 I2 审计直接引用。行号经 2026-08-09 live 反查。

### 4.1 变更型判定准则（裁定）

**公共方法写入 {messages, requestState, processingState, isProcessing, lastError, abortController, activeId, conversation 列表/storage} 之一 ⇒ 入门禁目标集**。据此：

- **纳入**（12 项 = engine 7 + adapter 5）：

| #   | 方法                 | 声明（接口）                                             | 实现                      | 类型                                                               |
| --- | -------------------- | -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| 1   | `sendMessage`        | `engine/types.ts:290`                                    | `create-engine.ts:172`    | engine 异步变更                                                    |
| 2   | `send`               | `engine/types.ts:291`                                    | `create-engine.ts:185`    | engine 异步变更                                                    |
| 3   | `abort`              | `engine/types.ts:292`                                    | `create-engine.ts:509`    | engine 异步变更                                                    |
| 4   | `regenerate`         | `engine/types.ts:334`                                    | `create-engine.ts:542`    | engine 异步变更                                                    |
| 5   | `clear`              | `engine/types.ts:294`                                    | `create-engine.ts:521`    | engine 同步变更（in-flight 守卫行，非①适用面）                     |
| 6   | `setMessages`        | `engine/types.ts:311`                                    | `create-engine.ts:139`    | engine 同步变更（同 clear 行类）                                   |
| 7   | `setMessageEditing`  | `engine/types.ts:320`                                    | `create-engine.ts:153`    | engine **同步变更**（写 `message.state.editing`，纳入理由见 §4.3） |
| 8   | `createConversation` | `use-conversation.ts:52`（UseConversationReturn :47-59） | `use-conversation.ts:263` | adapter 变更（列表 + activeId + storage）                          |
| 9   | `switchConversation` | `use-conversation.ts:53`                                 | `use-conversation.ts:293` | adapter 变更（activeId + engine cache + storage）                  |
| 10  | `deleteConversation` | `use-conversation.ts:54`                                 | `use-conversation.ts:348` | adapter 变更（列表 + activeId + storage）                          |
| 11  | `renameConversation` | `use-conversation.ts:55`                                 | `use-conversation.ts:374` | adapter 变更（列表 + storage）                                     |
| 12  | `clearAll`           | `use-conversation.ts:56`                                 | `use-conversation.ts:390` | adapter 变更（列表 + activeId + engine cache + storage）           |

- **不入目标集但必须进 I1 显式非变更白名单**（配置/读取类，不写会话状态）：`setConnector`（`types.ts:295`/`create-engine.ts:106`）、`registerPlugin`（`types.ts:296`/`create-engine.ts:117`）、`getMessages`（`types.ts:305`/`create-engine.ts:125`）、`getState`（`types.ts:288`/`create-engine.ts:102`）、`subscribe`（`types.ts:289`/`create-engine.ts:81-82`）。
- **adapter 非函数字段**（不入运行时提取面，I1 表完备性门禁仍须断言存在性）：`conversations`、`activeConversationId`、`activeEngine`、`controller`（:425-430 为 4 方法组合桥，嵌套键 ⊆ 表 ∪ 白名单——I1 门禁对嵌套 `controller` 键断言 `Object.keys(controller)` ⊆ 变更表）。

### 4.2 `runTurn` 归属裁定（Decision）

- **裁定**：`runTurn`（`create-engine.ts:193`）为**内部共享管道**，不是 `MessageEngine` 公共成员——`engine/types.ts:287-334` 接口无 `runTurn`，engine 对象字面量（`create-engine.ts:78-93`）无 `runTurn` 键；`sendMessage`（:182）/`send`（:190）/`regenerate`（:565）均汇入 `runTurn`。
- **理由**：I1 表完备性门禁的断言面是"公共变更方法集"（运行时 `Object.keys(engine)`），`runTurn` 不在该面；其行为由三个公共入口的间接覆盖 + 不变式③（身份守卫）直接覆盖。若把内部管道塞进测试表，会与运行时枚举面不一致（门禁自相矛盾）。
- **供 I1 引用**：表完备性门禁测试表 = §4.1 的 12 项 + 白名单 5 项；`runTurn` 不进表，在 `engine-invariants.test.ts` 中以 `send`/`sendMessage`/`regenerate` 的驱动路径间接覆盖。

### 4.3 边界成员归属裁定（Decision）

- **`setMessageEditing` → 纳入目标集**：`types.ts:320` 声明、`create-engine.ts:153-170` 实现。同步变更方法，写 `message.state.editing`（经 `adapter.mutate('messages', ...)` 变更消息状态，属判定准则中的 `messages` 写入面）。与 `clear`/`setMessages` 同属"同步变更行"，供 in-flight 守卫与状态一致性不变式覆盖（§2.1/§2.4 的适用面扩展）。**理由**：它是公共接口上唯一"同步写单个消息状态"的变更面，漏出目标集 = 该状态面成为盲区。
- **`setConnector`/`registerPlugin`/`getMessages`/`getState`/`subscribe` → 不入目标集，进 I1 显式非变更白名单**：`setConnector` 写 connector 引用（配置面，非会话状态六元组）；`registerPlugin` 写插件数组（配置面）；`getMessages`/`getState` 为只读快照；`subscribe` 为订阅注册。**理由**：白名单化而非忽略——I1 表完备性门禁断言"测试表 ∪ 白名单 == 运行时公共面"（`Object.keys(createMessageEngine())` + UseConversationReturn 函数字段 + 嵌套 `controller` 键），任一**新增**公共方法既不在表也不在白名单 ⇒ 门禁红，防新方法静默成盲区。

## 5. 目标集 × live 类型交叉验证（Proof，零 diff）

- **提取源**（按计划钉死）：`create-engine.ts:78-93` engine 对象字面量的可枚举函数键（= 运行时 `Object.keys(createMessageEngine())` 返回值）+ `use-conversation.ts:47-59` UseConversationReturn 接口函数字段。
- **一次性自动化反查**：`node /var/folders/lv/yfm8thx903d6bnjjz9c4m_mm0000gn/T/opencode/ai-invariant-proof.mjs`（2026-08-09，I0 执行轮）——提取键集 → 按 §4.1 判定准则过滤 → 与 §4.1 目标集比对。
- **结果**（零 diff，pass）：
  - engine 字面量键（12）：`getState, subscribe, sendMessage, send, abort, clear, setConnector, registerPlugin, getMessages, setMessages, setMessageEditing, regenerate` → 变更面过滤后 = `sendMessage, send, abort, clear, setMessages, setMessageEditing, regenerate`（7）；白名单 = `getState, subscribe, setConnector, registerPlugin, getMessages`（5）；**零未覆盖**
  - UseConversationReturn 函数字段（5）：`createConversation, switchConversation, deleteConversation, renameConversation, clearAll` → 全部入变更面；**零未覆盖**
  - 目标集 12 项 == 期望 12 项，**DIFF = ZERO**
- **运行时双保险**：临时 vitest（`Object.keys(createMessageEngine())` 断言 = 上述 12 键，1/1 passed，执行后已删除临时文件，工作区零残留）——对象字面量 = 运行时键集的确定性来源，静态提取与真运行时一致。

## 7. Cycle 1 / I4 门禁补强（K1-K4 修复契约，②③④⑤ 陈述扩展）

> 2026-08-09 落地（plan `docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`）。I2 审计发现 §2 五条不变式存在四个门禁盲区（K1-K4，findings §3.1 全 RED），I3 裁决为 P0/P1 路由本 plan 修复并补强门禁。下列扩展为对 §2 对应陈述的**加性扩展**（原陈述不变），K1-K4 各自 RED→GREEN 回归测试在案（`engine-invariants.test.ts` / `conversation-invariants.test.ts`），bug notes 121-124 落档。

### 7.1 不变式 ③ 扩展 —— 成功路径完成 mutate 身份守卫（K1）

- **扩展陈述**：`runTurn` 成功路径的完成 mutate（写 `draft.requestState = 'completed'`）必须与 catch/finally 同构携带 controller 身份守卫（`if (draft.abortController !== abortController) return;`），且**保留**既有 `requestState === 'aborted'` 早退（加性守卫）。abort 于 try 外挂起（`plugin.onTurnStart`）→ 同步复位 → 新 turn 启动的竞态下，陈旧 turn 的完成写入不得 clobber 新 turn 的 in-flight 状态（probe-A）。
- **新增检测方法**：静态扫描器规则 `scanCompletionIdentityGuard`（全文件扫 `draft.requestState = 'completed'` recipe 的 ±3 行窗口必须出现 `draft.abortController !== abortController`）；committed 回归（违规 fixture exit 1 / 清洁 fixture exit 0）。
- **类别清扫结论**：engine 全部 8 处 `adapter.mutate('requestState')` 终态写入 recipe 逐条核对——connector-missing（同步早退，无 await 窗口）、tool-no-executor（runOnce 判定与 mutate 间无 await，无窗口）、abort() 同步复位（总是针对刚 abort 的当前 controller）三处记录「无并发窗口/安全」理由，其余全部携带身份守卫（bug note 121）。

### 7.2 不变式 ⑤ 扩展 —— abort 强制终结在途 generator（K2）

- **扩展陈述**：`abort()` 必须 best-effort 强制终结在途 generator——chunk 消费循环每迭代检查 `abortController.signal.aborted`（迟到 chunk 抑制；break 触发 AsyncIteratorClose → 协作式 generator 经 `.return()` 立即结算）；`abort()` 持在途 generator 句柄（`activeGenerator`）并调用 `generator.return()`，句柄在各出口置 null。**契约裁定**：永不 yield 的 generator（卡在自己内部 await）无法从外部抢占，属 **connector 契约违背**（engine.md §Invariants Failure Path），非 engine 缺陷。
- **新增检测方法**：运行时参数化测试（signal-ignoring 有限 yield connector：abort 后 settle + 迟到 chunk 不 commit）；纯行为不变式不静态化（沿用 I1 裁定，误报率高）。
- **附带收敛**：W1（abortController 残留 watch-only）预期被本修复的 finally 清理面部分收敛（不作承诺，I5/I6 复查）。

### 7.3 不变式 ④ 扩展 —— storage save-after-delete/clearAll 时序守卫（K3）

- **扩展陈述**：auto-save 与 storage 删除必须满足「排空→删除」顺序——每个会话的在途 `saveMessages` 链入 `pendingSavesRef`（per-conversation 串行化）；异步方法（`deleteConversation`）在 `storage.deleteConversation` **之前** `await Promise.allSettled` 该会话在途 save；同步方法（`clearAll`，`(): void` 签名不变）把 storage 清空**链到排空链之后**（`.then()` 追加，per-id fan-out 各自 `.catch` → `reportStorageError`，不变式④错误路由保持）；`clearAll` 必须 `detachEngine`（退订）**先于** abort 循环——abort 触发的 auto-save 回调不得再启动新 save（aborted 快照重落盘 = ghost）。
- **新增检测方法**：运行时参数化测试（mock storage 可控 resolve 顺序：乱序 resolve → 断言 storage 终态无 ghost / 终态为空）；**扫描器不扩展**（运行时时序，静态误报高——理由记录）。
- **类别清扫结论**：adapter 全部 storage 调用点（saveMessages / saveConversation×2 / deleteConversation / clearAll / load×2 / unmount）逐条核对——saveConversation（create/rename）为单次会话元数据写（无消息重落盘面，错误路由已就位）不入排空链；消息保存唯一入口 attachAutoSave 已串行化（bug note 123）。

### 7.4 不变式 ② 扩展 —— adapter 变更方法的 sync 闭包读取（K4）

- **扩展陈述**：不变式 ② 的适用范围从「await 之后」扩展至**全部 adapter 变更方法体内的状态读取**——列表/active 读取必须读 ref mirror（`conversationsRef.current`/`activeIdRef.current`），且所有列表变更方法（create/rename/delete/clearAll）必须**同步维护** ref mirror（不依赖 effect flush）；同 tick create+rename 场景 rename 的持久化不得静默丢失（probe-K4）。
- **新增检测方法**：静态扫描器规则 `scanAdapterSyncClosureReads`——**判别准则**：仅 flag adapter 变更方法（create/switch/delete/rename/clearAll）体内「首次状态变更语句（`setConversations`/`setActiveId`/`await`）**之后**」出现的裸 `conversations`/`activeId` 读取；方法**首语句**（状态变更前）的渲染快照读取为设计语义 → 豁免（`switchConversation:294` `conversations.some(...)` 显式豁免并记录理由）；committed 回归（违规 fixture exit 1 / 清洁 fixture 含豁免样例 exit 0）。
- **类别清扫结论**：create（同步 prepend `conversationsRef.current`）、rename（读 ref + 同步 map）、delete（post-await 已读 ref）、clearAll（同步置空 + `activeIdRef`）全部同步维护；`switchConversation` :294 首语句豁免（bug note 124）。

## 8. 引用索引（I4 追加）

- 审计产物：`docs/audits/ai-invariants/cycle1-findings.md`（K1-K4 RED 证据 + N1-N5/W1-W4）、`docs/audits/ai-invariants/cycle1-adjudication.md`（P0/P1 裁决 + 门禁补强契约 ③/⑤/④/②）
- Bug notes：`docs/bugs/121-ai-engine-completion-mutate-identity-guard-fix.md`（K1）、`docs/bugs/122-ai-engine-abort-force-terminates-inflight-generator-fix.md`（K2）、`docs/bugs/123-ai-conversation-save-after-delete-ghost-fix.md`（K3）、`docs/bugs/124-ai-conversation-rename-sync-closure-read-fix.md`（K4）
- 门禁登记处：`docs/audits/ai-invariants/gates.md`（I4 追加行）

## 9. Cycle 2 / I1 新增不变式（⑥-⑩，第二批门禁）

> 2026-08-09 落地（plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`）。由 Cycle 1 / I6 按 Loop Rule 派生（Cycle 1 新族 N1-N5，findings §3.2 触发证据 + adjudication §3 N 表）。**当前 live 代码违反 ⑥-⑩**（N1-N5 全部已复现 RED，probe 编号见 findings §3.2）——门禁以「预期失败」形态落库（vitest `it.fails` + 扫描器注册红），Cycle 2 / I4 修复后翻转/清零。每条四字段：陈述 / 覆盖失败族 / 历史 bug 证据 / 检测方法。

### 9.1 不变式 ⑥ —— active 位移完整性（N1）

- **不变式陈述**：adapter 的 post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）必须以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；**位移方法（delete/clearAll/create）必须 bump `switchVersionRef` 使在途 switch 失效**；删除 active 后的 next 引擎必须 build-on-demand（禁 `setActiveEngine(null)` 悬挂）；同 id 快速重 switch 时 hydration 不得被 version guard 整体丢弃。
- **覆盖失败族**：active 位移完整族（N1，findings §3.2 5 成员 probe 全部复现 RED——await 间隙位移 → UI 显示与持久化状态错位，probe-B 含数据丢失面）。
- **历史 bug 证据**：`use-conversation.ts:280-313`（createConversation 不 bump）、`:315-368`（switchConversation :322 唯一 bump 点）、`:370-404`（deleteConversation :382-388 fixup `setActiveEngine(next ? engineCache.get(next.id) ?? null : null)`——next 不在 cache 时 null 悬挂）、`:427-475`（clearAll 不 bump）；probe-1/1b/1c/B/C 全部 RED（findings §3.2 N1）。
- **检测方法**：参数化穷举测试（`conversation-invariants-cycle2.test.ts` Invariant ⑥ 块，`it.fails` × 5 成员场景——套件保持全绿，I4 翻转）+ 静态扫描器规则 `scanDisplacementVersionBumps`（位移方法 delete/clearAll/create 函数体必须含 `switchVersionRef.current` bump 语句，缺失即违例；**live 预期命中 3**：create/delete/clearAll，注册红待 I4 清零）。

### 9.2 不变式 ⑦ —— storage bootstrap 列表合并（N2）

- **不变式陈述**：storage bootstrap 的 post-await `setConversations` 必须合并当前状态（functional updater），不得覆盖加载期间由 `createConversation` 创建的会话（防列表回滚 + activeId 悬空出列）。
- **覆盖失败族**：bootstrap 覆盖族（N2，findings §3.2 probe-2 RED——create X 后 bootstrap resolve → 列表=[A]，activeId=X 悬空出列）。
- **历史 bug 证据**：`use-conversation.ts:234-257`（bootstrap effect `:243` `setConversations(convs)` 整体覆盖，非 functional merge）；probe-2 RED（findings §3.2 N2）。
- **检测方法**：运行时参数化测试（`conversation-invariants-cycle2.test.ts` Invariant ⑦ 块，`it.fails` × 2 场景）；**不静态化**（functional updater 为行为面，静态误报高，理由记录 gates.md）。

### 9.3 不变式 ⑧ —— branch 戳消费/清除（N3）

- **不变式陈述**：`pendingBranchId` 必须在使用前被消费或清除；runTurn 任一提前返回路径不得遗留待消费的 branch 戳（防泄漏到无关 turn）。
- **覆盖失败族**：branching/fork 族（N3，I0 §3 登记候选族正式触发，findings §3.2 probe-3 RED——regenerate+connector-missing 后，下一正常 turn 的 assistant 被戳 `branchId:'branch-1'`）。
- **历史 bug 证据**：`create-engine.ts:101`（`pendingBranchId` 声明）、`:210-229`（connector-missing 早退，runOnce 之前 return，戳未消费）、`:383-397`（runOnce 消费，`:397` `pendingBranchId = undefined`）、`:578-602`（regenerate 设戳 + `await runTurn([])`）；probe-3 RED（findings §3.2 N3）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑧ 块，`it.fails` 泄漏 ×1 + 消费控制 `it` ×1）+ 静态扫描器规则 `scanBranchStampReset`（runTurn 内 runOnce 调用前的提前 return 路径必须伴随 `pendingBranchId` 清除；**扫描/豁免面**：isProcessing 早退（`:206-208`）在设戳路径（regenerate→runTurn）不可达 → 豁免并记录理由；connector-missing 早退（`:210-229`）可达 → 扫描目标，**live 预期命中 1**，注册红待 I4 清零）。

### 9.4 不变式 ⑨ —— plugin 错误隔离（N4）

- **不变式陈述**：plugin hook 的 rejection 不得使 turn 状态卡死或绕过状态写入：onTurnStart 必须纳入 try/finally 清理面；onError 调用不得先于状态写入（或写入不得被 hook 抛错跳过）；onTurnEnd rejection 不得遮蔽原错误（所有错误必须落在 `requestState`/`lastError`）。
- **覆盖失败族**：plugin 生命周期族（N4，I0 §3 登记候选族正式触发，findings §3.2 probe-4/probe-E RED + onTurnEnd 静态证据）。
- **历史 bug 证据**：`create-engine.ts:247-249`（`await plugin.onTurnStart` 在 try 之外，rejection 卡死 processing）、`:336-340`（catch 内 `plugin.onError` 先于 mutate——onError 抛错跳过状态写入）、`:362-364`（finally 内 `await plugin.onTurnEnd` 无守卫——rejection 遮蔽原错误）；probe-4/probe-E RED（findings §3.2 N4）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑨ 块，`it.fails` × 3 场景）；**不静态化**（plugin 回调交错为行为面，误报高，理由记录 gates.md）。

### 9.5 不变式 ⑩ —— 失败轮产物清理（N5）

- **不变式陈述**：failed/aborted 轮的残留空 placeholder 不得进入后续请求历史（应移除或排除）；失败轮必须清理自身产物。
- **覆盖失败族**：失败轮残留污染族（N5，findings §3.2 probe-D RED——请求 #2 携带 `{content:'', loading:false}` 空 assistant 消息）。
- **历史 bug 证据**：`create-engine.ts:484-504`（runOnce catch `:485-486` `loading=false` + commitAssistant 保留空 placeholder）、`:507-528`（buildContext `:511` 仅排除 `isStreamingAssistantPlaceholder`（loading=true）尾消息）；probe-D RED（findings §3.2 N5）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑩ 块，`it.fails` 排除 ×1 + 正常轮控制 `it` ×1）；**不静态化**（buildContext 排除谓词为行为面，误报高，理由记录 gates.md）。

## 6. 引用索引

- 审计产物：`docs/audits/2026-07-23-2141-multi-audit-ai.md`（AI-01/AI-03/AI-19/AI-28）、`docs/audits/2026-07-24-1757-multi-audit-ai.md`（P1#1 abort→send race）、`docs/audits/2026-07-24-1757-open-audit-ai.md`（F1.1/F2.2 修复实证）、`docs/audits/2026-07-24-2151-open-audit-ai.md`（O-1 等）、`docs/audits/2026-07-25-0707-multi-audit-ai.md`（P1-1 deleteConversation stale-closure / P1-2 storage bypass）、`docs/audits/2026-07-25-0707-open-audit-ai.md`（P1-1 clearAll ghost rehydration / P1-2 no-storage eviction）
- Bug note：`docs/bugs/07-submit-concurrent-guard-fix.md`（Bug 07）
- 既有回归测试：`engine/__tests__/engine-concurrency.test.ts`、`adapters/__tests__/use-conversation-{switch,delete-during-abort,clear-all,storage,create}.test.ts`、`renderers/__tests__/ai-silent-drop-guards.test.tsx`
- 门禁沉淀（I1）：本目录 §2 五条 → `engine/__tests__/engine-invariants.test.ts` + `adapters/__tests__/conversation-invariants.test.ts` + `check:ai-engine-invariants` + `docs/audits/ai-invariants/gates.md`（棘轮登记处）

# AI Engine 不变式目录（Invariant Catalog）

> Status: active（Cycle 1 / I0 产出 + I4 门禁补强扩展 + Cycle 2 / I1 §9 新族 ⑥-⑩ 沉淀 + Cycle 2 / I4 §10 补强扩展 + 2026-08-10 双审计 P1 §11 扩展（⑩ dangling 成员 + ⑪ 新族 + ④ fan-out 源）+ 2026-08-10 契约/文档族 P2 §2/§4/§9 锚点行号校准（multi P2-16）+ 2026-08-11 双审计 P2 §11.2 扩展（⑪ 嵌套深度成员，R1-F2），供 I5 验证与后续审计引用）
> Last Updated: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Cycle 1 / I0 + Cycle 2 / I1 派生）+ 4 轮 AI 审计（`docs/audits/2026-07-23-2141-*ai.md`、`2026-07-24-1757-*ai.md`、`2026-07-24-2151-*ai.md`、`2026-07-25-0707-*ai.md`）+ C8.1/8.2/8.3 + post-closure + Bug 07 note + I4 修复执行（K1-K4）+ Cycle 2 / I1 沉淀执行（N1-N5 → ⑥-⑩）+ 2026-08-09-1826 双审计 P1 修复执行（plan `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`）
> Produced By: plan `docs/plans/2026-08-09-1826-1-i0-invariant-inventory-baseline.md`（纯文档计划）；扩展于 plan `docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`（K1-K4 + 门禁 ②③④⑤ 补强）；§9 沉淀于 plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`（⑥-⑩ 第二批门禁）；§11 扩展于 plan `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`（⑩ dangling 成员 + ⑪ 新族 + ④ fan-out 源）
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

> 每条四字段：**不变式陈述 / 覆盖失败族 / 历史 bug 证据（live `文件:行` 或 bug note 编号）/ 检测方法**。所有行号均经 **2026-08-10 live 复核**（multi P2-16 校准；此前 2026-08-09 记录值在 Cycle 2 / I4 与 2026-08-10 双审计修复后漂移 +108~+185，已全部修正为 live 值——**锚点随代码演化持续漂移，审计/维护者以 live 复核为准**，本节记录值仅为最近一次校准快照）。三大复发族当前终态均为「已修复」（§2.6 逐条核对记录），本目录把它们沉淀为**可执行契约**，防重构/新增方法回归（I1 落门禁）。

### 2.1 不变式 ① —— 异步变更入口 `isProcessing` 守卫

- **不变式陈述**：所有异步变更入口（`sendMessage`/`send`/`runTurn`/`regenerate`）在进入请求路径前必须检查 `adapter.getState().isProcessing`，in-flight 时立即返回（静默忽略 = host 侧"第二次调用被忽略的取消"，同 Bug 07 的 `submitting` gate 语义），禁止并发启动第二个 turn 覆盖 `abortController`/交错写 `messages`。同步变更入口（`clear`/`setMessages`）同用该守卫拒绝 in-flight 时替换/清空消息（防与流式累积器竞争），但**不适用**"串行化"语义（I1 门禁表须区分：① 只查异步变更族）。
- **覆盖失败族**：并发守卫族（跨 3 轮审计才完整修复的典型）。
- **历史 bug 证据**：
  - `docs/bugs/07-submit-concurrent-guard-fix.md`（Bug 07：submit 无并发守卫 → 双 API 调用 + finally 早复位；"all mutating async methods should have a concurrency guard" 是首次实例）
  - `docs/audits/2026-07-23-2141-multi-audit-ai.md` **[AI-01]**（P0：`sendMessage`/`send`/`runTurn` 缺并发守卫 = Bug 07 复发；仅 `clear`/`setMessages`/`regenerate` 有守卫，三个主 send 入口无）
  - `docs/audits/2026-07-24-1757-open-audit-ai.md` :21（F1.1 已修复实证）
  - live 终态（已修复，实证行号）：`create-engine.ts:206-208`（`runTurn` 入口守卫）、`:672-674`（`regenerate` 入口守卫）、`:654-656`（`clear` in-flight 守卫）、`:149-151`（`setMessages` in-flight 守卫）
- **检测方法**：静态 grep——`async function (sendMessage|send|runTurn|regenerate)\b` 的函数体首个状态读取必须出现 `isProcessing` 检查（`if (adapter.getState().isProcessing) return;`），缺失即违例；`clear`/`setMessages` 同理（守卫形式不同但必须存在）。运行时断言——in-flight 期间二次 `sendMessage` 不产生第二次 connector 请求、`requestState` 不被改写（I1 参数化方法表驱动）。

### 2.2 不变式 ② —— `await` 后状态读取用 `activeIdRef`/`versionRef`（非闭包捕获）

- **不变式陈述**：conversation adapter 的异步方法在 `await`（`loadMessages`/`abort`/`deleteConversation` storage 调用）之后的任何状态读取（activeId / conversations 列表 / engine 提升判断）必须读 ref mirror（`activeIdRef`/`conversationsRef`）或版本号（`switchVersionRef`），禁止读闭包捕获的 render 期快照——await 间隙内 `createConversation`/`switchConversation` 可能已位移 active 会话，闭包读取会以旧状态覆盖新状态。
- **覆盖失败族**：stale-closure 族（"same family, missed method"——先修 `switchConversation` 后 0707 才发现 `deleteConversation` 漏改）。
- **历史 bug 证据**：
  - `docs/audits/2026-07-25-0707-multi-audit-ai.md` **[P1-1]**（`deleteConversation` post-await stale-closure race；:56-82 含完整风险链：delete 流式会话 → abort await 间隙 create Y → post-await 闭包读取 `activeId==='X'` → `setActiveId(null)` 覆盖 `setActiveId('Y')`）
  - 先例（已修复）：`switchConversation` 的 P1-3 修复（version guard + activeIdRef，见 :117-129 注释块 + `:313`/`:324` version 检查）
  - live 终态（已修复，实证行号）：`use-conversation.ts:147-151`（`activeIdRef` mirror + effect）、`:154-157`（`conversationsRef` mirror）、`:136`（`switchVersionRef`）、`:464`/`:477`（switch post-await version guard）、`:492`（eviction 读 `activeIdRef.current`）、`:522-540`（deleteConversation post-await 读 `activeIdRef.current` + `conversationsRef.current`）
- **检测方法**：静态 grep——`async function` 体内 `await` 之后出现的 `activeId`/`conversations` 裸读取（非 `Ref.current`）即违例；运行时断言——delete-during-abort + 并发 create 交错后新会话保持 active（既有回归：`adapters/__tests__/use-conversation-delete-during-abort.test.ts`、`use-conversation-switch.test.ts`）。

### 2.3 不变式 ③ —— `catch`/`finally` 的 controller 写入做身份守卫

- **不变式陈述**：`runTurn` 的 `catch`/`finally`（含轮次内 `runOnce` 的 catch 与 post-stream abort 检查）内任何对 `abortController`/`requestState`/`isProcessing`/`processingState`/`lastError` 的 `adapter.mutate` 写入，必须以本 turn 创建的 controller 身份判断前置：`if (draft.abortController !== abortController) return;`（catch/完成路径）与 `if (draft.abortController === abortController) draft.abortController = null;`（finally 清理路径）。禁止无条件覆盖——abort→send 竞态下，stale turn 的迟到写入不得 clobber 新 turn 的 controller 与状态。
- **覆盖失败族**：controller 生命周期族（1757 发现：AI-01 守卫修了入口，未修出口）。
- **历史 bug 证据**：
  - `docs/audits/2026-07-24-1757-multi-audit-ai.md` **[P1] abort→send race clobbers the new turn's controller and requestState**（:34-62：finally 无条件 `abortController=null`（:39-53 证据）；场景 = Turn A 流式 → `abort()` 同步置 false → `sendMessage('next')` 过入口守卫装 controllerB → A 的 catch/finally 续跑 → clobber B；修复建议 :60；Planned Into `docs/plans/2026-07-24-1757-1-ai-message-snapshot-contract-remediation.md` P1#1）
  - live 终态（已修复，实证行号）：`create-engine.ts:369-371`（runTurn catch mutate 身份守卫）、`:381-385`（runTurn finally 只清自己的 controller）、`:569-571`（runOnce 轮次内 post-stream abort 检查身份守卫）、`:593-595`（runOnce catch 身份守卫）——全部标 `P1#1`
- **检测方法**：静态 grep——`runTurn`/`runOnce` 的 `catch`/`finally` 块内 `adapter.mutate` recipe 第一行必须是 `draft.abortController ===/!== abortController` 身份判断，缺失即违例；运行时断言——abort→send 紧邻交错后，新 turn 的 `requestState==='processing'` 且 `abortController` 为新控制器（既有回归：`engine/__tests__/engine-concurrency.test.ts`）。

### 2.4 不变式 ④ —— storage 变更经 `reportStorageError`

- **不变式陈述**：conversation adapter 的每个 storage 变更/加载调用点（`saveConversation`（create/rename）、`deleteConversation`（delete/clearAll fan-out）、`clearAll`、`loadConversations`、`loadMessages`、`saveMessages`）必须接 `.catch` → `reportStorageError({ phase, conversationId?, error })`，禁止裸 `void storage?.xxx?.(...)` 静默吞 rejection；无 `clearAll` 时 per-id fan-out 的每个 rejection 也必须单独上报（一个失败不掩盖其他）。storage 失败保持非致命（内存模型不受影响），但 host 必须可观察（`onStorageError`，AI-28）。
- **覆盖失败族**：storage 静默丢族（P1-2 修 create/rename → 0707 发现 clearAll 完全无 delete 路径，"precise inverse"）。
- **历史 bug 证据**：
  - `docs/audits/2026-07-25-0707-open-audit-ai.md` **[P1-1] `clearAll()` silently leaves every conversation in storage → ghost rehydration**（:41-68：`rg clearAll **/*.test.*` = 0 hits；失败链 = clearAll 后 remount 时 `loadConversations()` rehydrate 全部已清会话）
  - 先例（已修复）：`docs/audits/2026-07-25-0707-multi-audit-ai.md` :33（P1-2 storage bypass on create/rename → FIXED，经 `reportStorageError({phase:'saveConversation'})`）
  - `docs/audits/2026-07-23-2141-multi-audit-ai.md` **[AI-28]**（:660：bare `catch {}` 吞 storage 失败仅 console.warn → 引 `onStorageError` host 回调）
  - live 终态（已修复，实证行号）：`use-conversation.ts:112-120`（`reportStorageError` 定义）、`:421-431`（createConversation saveConversation `.catch` + 排空链）、`:573-585`（renameConversation saveConversation `.catch` + 排空链）、`:546-551`（deleteConversation storage delete `.catch`）、`:589-665`（clearAll：`storage.clearAll` 优先 + per-id fan-out，各自 `.catch`→`reportStorageError`）、`:344`（loadConversations catch）、`:280`/`:471`（loadMessages catch）
- **检测方法**：静态 grep——`storage?.(saveConversation|deleteConversation|clearAll|loadConversations|loadMessages)` 调用点必须紧跟 `.catch(...reportStorageError...)`，裸 `void storage?....(` 即违例；运行时断言——mock storage 各操作 reject 时 `onStorageError` 收到对应 `phase` 事件且内存状态不损坏（既有回归：`adapters/__tests__/use-conversation-clear-all.test.ts`、`use-conversation-storage.test.ts`）。

### 2.5 不变式 ⑤ —— abort 路径清理 controller

- **不变式陈述**：① host 侧卸载（unmount）必须 abort 所有自建 engine 的 in-flight 流（孤儿流不残留连接）；② `engine.abort()` 必须同步置 `requestState='aborted'`/`isProcessing=false`（F1.6，不等流式 catch 解阻塞）并 abort 当前 controller；③ turn 终态（finally）只清理本 turn 创建的 controller（见 ③ 身份守卫）。任何在途流的终止责任必须显式归属（启动/取消/销毁/串行四语义一致建模，F2.2 审计建议）。
- **覆盖失败族**：unmount-abort 族（F2.2）+ 并发守卫族的终止面。
- **历史 bug 证据**：
  - `docs/audits/2026-07-23-2141-open-audit-ai.md` **[F2.2]**（:26/:102：卸载不 abort 在途流 → 孤儿流/连接不释放；:133 建议把 abort/turn-serialization/lifecycle 收敛进 engine 单一职责）
  - `docs/audits/2026-07-24-1757-open-audit-ai.md` :27（F2.2 已修复实证：`use-conversation.ts:223-235`、`use-message.ts:100-108` 均新增自建引擎 unmount-abort——旧行号，当前见下）
  - live 终态（已修复，实证行号）：`use-conversation.ts:359-385`（unmount effect：**detach-before-abort**（multi P2-2）——先退订 autoSave 再 abort in-flight engine + 清空 `pendingSavesRef`）、`:515-519`（deleteConversation 对 in-flight engine abort）、`:611-615`（clearAll 对 in-flight engine abort）；`create-engine.ts:627-648`（`abort()` 同步置 `requestState='aborted'`/`isProcessing=false` + `controller.abort()` + generator.return()）、`:381-385`（finally 按身份守卫清理 controller）
- **检测方法**：静态 grep——创建/持有 engine 的组件卸载 effect 必须包含 `engine.getState().isProcessing → engine.abort()` 分支；`abort()` 实现必须同步 mutate `requestState`；运行时断言——unmount 后 connector 的 signal 已 aborted、无遗留订阅（既有回归：`adapters/__tests__/use-conversation-delete-during-abort.test.ts`、`use-conversation-clear-all.test.ts`）。

### 2.6 三大复发族「已修复」逐条核对记录（Proof）

（2026-08-10 live 逐行复核；行号已按 multi P2-16 校准——锚点随代码演化漂移，以 live 复核为准）

| 族                                                      | 计划引用行号                                                     | live 实测                                                                                                     | 结论   |
| ------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| 并发守卫族（controller 身份守卫）                       | `create-engine.ts:348-386`（K1 完成守卫 :351 + catch 守卫 :370） | 完成 mutate :348-358（守卫 :351）、catch mutate :367-378（守卫 :370）、finally :381-385（守卫 :382）          | ✓ 一致 |
| 并发守卫族（轮次内 runOnce 守卫）                       | `create-engine.ts:566-608`                                       | post-stream abort mutate :566-579（守卫 :570）、catch mutate :585-608（守卫 :594）                            | ✓ 一致 |
| stale-closure 族（ref 读取）                            | `use-conversation.ts:147-151`                                    | `activeIdRef` :147-151（注释 :143-146）                                                                       | ✓ 一致 |
| stale-closure 族（eviction / delete）                   | `use-conversation.ts:492` / `:522`                               | :492 `const currentActiveId = activeIdRef.current`；:522 `if (activeIdRef.current === id)`                    | ✓ 一致 |
| storage 静默族（clearAll fan-out + reportStorageError） | clearAll storage fan-out + per-id `reportStorageError`           | :589-665（`storage.clearAll` 优先 + per-id `deleteConversation` fan-out，各自 `.catch`→`reportStorageError`） | ✓ 一致 |

## 3. 已知未覆盖族（Cycle 2+ 候选不变式，Cycle 1 不实现）

> roadmap I0 明示：以下族当前无已确认 live defect 处于 scope 内，登记管理预期；I2 若触及任一族即按 **Loop Rule** 派生 Cycle 2 / I1 新不变式（附触发证据 = 发现 `文件:行` + 不变式陈述）。

| 候选族                 | 已知形态（Cycle 1 不实现）                                                                                               | 触发条件（I2 触及则派生）             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| plugin 生命周期        | `registerPlugin` 的插件 hook 并发（onTurnStart/onBeforeRequest 序列化）、插件错误隔离、unregister 与 in-flight turn 交错 | I2 发现 plugin hook 交错/错误传播违背 |
| tool-execution 并发    | `executeToolCalls` 与 abort 交错、多 tool_call 并发执行顺序、`maxToolRounds` 循环边界外的交错                            | I2 发现 tool 执行期状态污染/终止不达  |
| streaming backpressure | `connector.stream` 生成器推进速率、chunk 累积背压、慢消费者下的内存/丢失                                                 | I2 发现背压/丢 chunk 违背             |
| branching/fork         | `branching.ts` 分支序列与 `regenerate` 并发、branchId 戳记竞态                                                           | I2 发现 fork/分支状态不一致           |

## 4. 审计目标集枚举（变更型方法）

> 供 I1 表完备性门禁（断言测试表方法集 == 本表 + 白名单）与 I2 审计直接引用。行号经 **2026-08-10 live 反查**（multi P2-16 校准，锚点以 live 为准）。

### 4.1 变更型判定准则（裁定）

**公共方法写入 {messages, requestState, processingState, isProcessing, lastError, abortController, activeId, conversation 列表/storage} 之一 ⇒ 入门禁目标集**。据此：

- **纳入**（12 项 = engine 7 + adapter 5）：

| #   | 方法                 | 声明（接口）                                             | 实现                      | 类型                                                               |
| --- | -------------------- | -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------ |
| 1   | `sendMessage`        | `engine/types.ts:316`                                    | `create-engine.ts:179`    | engine 异步变更                                                    |
| 2   | `send`               | `engine/types.ts:317`                                    | `create-engine.ts:192`    | engine 异步变更                                                    |
| 3   | `abort`              | `engine/types.ts:318`                                    | `create-engine.ts:627`    | engine 异步变更                                                    |
| 4   | `regenerate`         | `engine/types.ts:360`                                    | `create-engine.ts:671`    | engine 异步变更                                                    |
| 5   | `clear`              | `engine/types.ts:320`                                    | `create-engine.ts:650`    | engine 同步变更（in-flight 守卫行，非①适用面）                     |
| 6   | `setMessages`        | `engine/types.ts:337`                                    | `create-engine.ts:146`    | engine 同步变更（同 clear 行类）                                   |
| 7   | `setMessageEditing`  | `engine/types.ts:346`                                    | `create-engine.ts:160`    | engine **同步变更**（写 `message.state.editing`，纳入理由见 §4.3） |
| 8   | `createConversation` | `use-conversation.ts:57`（UseConversationReturn :53-65） | `use-conversation.ts:385` | adapter 变更（列表 + activeId + storage）                          |
| 9   | `switchConversation` | `use-conversation.ts:58`                                 | `use-conversation.ts:436` | adapter 变更（activeId + engine cache + storage）                  |
| 10  | `deleteConversation` | `use-conversation.ts:59`                                 | `use-conversation.ts:501` | adapter 变更（列表 + activeId + storage）                          |
| 11  | `renameConversation` | `use-conversation.ts:60`                                 | `use-conversation.ts:554` | adapter 变更（列表 + storage）                                     |
| 12  | `clearAll`           | `use-conversation.ts:61`                                 | `use-conversation.ts:589` | adapter 变更（列表 + activeId + engine cache + storage）           |

- **不入目标集但必须进 I1 显式非变更白名单**（配置/读取类，不写会话状态）：`setConnector`（`types.ts:321`/`create-engine.ts:113`）、`registerPlugin`（`types.ts:322`/`create-engine.ts:124`）、`getMessages`（`types.ts:331`/`create-engine.ts:132`）、`getState`（`types.ts:314`/`create-engine.ts:109`）、`subscribe`（`types.ts:315`/`create-engine.ts:82-83`）。
- **adapter 非函数字段**（不入运行时提取面，I1 表完备性门禁仍须断言存在性）：`conversations`、`activeConversationId`、`activeEngine`、`controller`（**FIND-16 校准 2026-08-11**：对象字面量 live 于 `use-conversation.ts:666-671`，4 方法组合桥；嵌套键 ⊆ 表 ∪ 白名单——I1 门禁对嵌套 `controller` 键断言 `Object.keys(controller)` ⊆ 变更表）。

### 4.2 `runTurn` 归属裁定（Decision）

- **裁定**：`runTurn`（`create-engine.ts:200`）为**内部共享管道**，不是 `MessageEngine` 公共成员——`engine/types.ts:313-361` 接口无 `runTurn`，engine 对象字面量（`create-engine.ts:79-95`）无 `runTurn` 键；`sendMessage`（:179）/`send`（:192）/`regenerate`（:671）均汇入 `runTurn`。
- **理由**：I1 表完备性门禁的断言面是"公共变更方法集"（运行时 `Object.keys(engine)`），`runTurn` 不在该面；其行为由三个公共入口的间接覆盖 + 不变式③（身份守卫）直接覆盖。若把内部管道塞进测试表，会与运行时枚举面不一致（门禁自相矛盾）。
- **供 I1 引用**：表完备性门禁测试表 = §4.1 的 12 项 + 白名单 5 项；`runTurn` 不进表，在 `engine-invariants.test.ts` 中以 `send`/`sendMessage`/`regenerate` 的驱动路径间接覆盖。

### 4.3 边界成员归属裁定（Decision）

- **`setMessageEditing` → 纳入目标集**：`types.ts:346` 声明、`create-engine.ts:160-177` 实现。同步变更方法，写 `message.state.editing`（经 `adapter.mutate('messages', ...)` 变更消息状态，属判定准则中的 `messages` 写入面）。与 `clear`/`setMessages` 同属"同步变更行"，供 in-flight 守卫与状态一致性不变式覆盖（§2.1/§2.4 的适用面扩展）。**理由**：它是公共接口上唯一"同步写单个消息状态"的变更面，漏出目标集 = 该状态面成为盲区。
- **`setConnector`/`registerPlugin`/`getMessages`/`getState`/`subscribe` → 不入目标集，进 I1 显式非变更白名单**：`setConnector` 写 connector 引用（配置面，非会话状态六元组）；`registerPlugin` 写插件数组（配置面）；`getMessages`/`getState` 为只读快照；`subscribe` 为订阅注册。**理由**：白名单化而非忽略——I1 表完备性门禁断言"测试表 ∪ 白名单 == 运行时公共面"（`Object.keys(createMessageEngine())` + UseConversationReturn 函数字段 + 嵌套 `controller` 键），任一**新增**公共方法既不在表也不在白名单 ⇒ 门禁红，防新方法静默成盲区。

## 5. 目标集 × live 类型交叉验证（Proof，零 diff）

- **提取源**（按计划钉死）：`create-engine.ts:79-95` engine 对象字面量的可枚举函数键（= 运行时 `Object.keys(createMessageEngine())` 返回值）+ `use-conversation.ts:53-65` UseConversationReturn 接口函数字段。
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
- **类别清扫结论**：adapter 全部 storage 调用点（saveMessages / saveConversation×2 / deleteConversation / clearAll / load×2 / unmount）逐条核对——saveConversation（create/rename）为单次会话元数据写（无消息重落盘面，错误路由已就位）不入排空链；消息保存唯一入口 attachAutoSave 已串行化（bug note 123）。**（2026-08-10 Cycle 2 / I4 supersede：此结论被 K-K3/④-1 / K-K4/②-1/2 修复推翻——create/rename 元数据写现均入排空链 + settlement-time 镜像再校验，见 §10.5/§10.4。）**

### 7.4 不变式 ② 扩展 —— adapter 变更方法的 sync 闭包读取（K4）

- **扩展陈述**：不变式 ② 的适用范围从「await 之后」扩展至**全部 adapter 变更方法体内的状态读取**——列表/active 读取必须读 ref mirror（`conversationsRef.current`/`activeIdRef.current`），且所有列表变更方法（create/rename/delete/clearAll）必须**同步维护** ref mirror（不依赖 effect flush）；同 tick create+rename 场景 rename 的持久化不得静默丢失（probe-K4）。
- **新增检测方法**：静态扫描器规则 `scanAdapterSyncClosureReads`——**判别准则**：仅 flag adapter 变更方法（create/switch/delete/rename/clearAll）体内「首次状态变更语句（`setConversations`/`setActiveId`/`await`）**之后**」出现的裸 `conversations`/`activeId` 读取；方法**首语句**（状态变更前）的渲染快照读取为设计语义 → 豁免（`switchConversation:442` `conversationsRef.current.some(...)` 显式豁免并记录理由）；committed 回归（违规 fixture exit 1 / 清洁 fixture 含豁免样例 exit 0）。
- **类别清扫结论**：create（同步 prepend `conversationsRef.current`）、rename（读 ref + 同步 map）、delete（post-await 已读 ref）、clearAll（同步置空 + `activeIdRef`）全部同步维护；`switchConversation` :294 首语句豁免（bug note 124）。**（2026-08-10 Cycle 2 / I4 supersede：写面扩展至全部列表变更方法（delete/clearAll + bootstrap merge），`switchConversation` 首语句 exists 检查改读 `conversationsRef.current`（K-⑥-2），原「首语句渲染快照豁免」注释随之失效——见 §10.2/§10.4。）**

## 8. 引用索引（I4 追加）

- 审计产物：`docs/audits/ai-invariants/cycle1-findings.md`（K1-K4 RED 证据 + N1-N5/W1-W4）、`docs/audits/ai-invariants/cycle1-adjudication.md`（P0/P1 裁决 + 门禁补强契约 ③/⑤/④/②）
- Bug notes：`docs/bugs/121-ai-engine-completion-mutate-identity-guard-fix.md`（K1）、`docs/bugs/122-ai-engine-abort-force-terminates-inflight-generator-fix.md`（K2）、`docs/bugs/123-ai-conversation-save-after-delete-ghost-fix.md`（K3）、`docs/bugs/124-ai-conversation-rename-sync-closure-read-fix.md`（K4）
- 门禁登记处：`docs/audits/ai-invariants/gates.md`（I4 追加行）

## 9. Cycle 2 / I1 新增不变式（⑥-⑩，第二批门禁）

> 2026-08-09 落地（plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`）。由 Cycle 1 / I6 按 Loop Rule 派生（Cycle 1 新族 N1-N5，findings §3.2 触发证据 + adjudication §3 N 表）。**沉淀时 live 代码违反 ⑥-⑩**（N1-N5 全部已复现 RED，probe 编号见 findings §3.2）——门禁以「预期失败」形态落库（vitest `it.fails` + 扫描器注册红）。**2026-08-10 Cycle 2 / I4 已全部修复：12 处 `it.fails` 翻转 `it`、注册红清零、成员按 §10 扩展——本节的「当前违反」表述仅指 I1 沉淀时点，live 现状见 §10。**每条四字段：陈述 / 覆盖失败族 / 历史 bug 证据 / 检测方法。

### 9.1 不变式 ⑥ —— active 位移完整性（N1）

- **不变式陈述**：adapter 的 post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）必须以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；**位移方法（delete/clearAll/create）必须 bump `switchVersionRef` 使在途 switch 失效**；删除 active 后的 next 引擎必须 build-on-demand（禁 `setActiveEngine(null)` 悬挂）；同 id 快速重 switch 时 hydration 不得被 version guard 整体丢弃。
- **覆盖失败族**：active 位移完整族（N1，findings §3.2 5 成员 probe 全部复现 RED——await 间隙位移 → UI 显示与持久化状态错位，probe-B 含数据丢失面）。
- **历史 bug 证据**：`use-conversation.ts:385-434`（createConversation 不 bump）、`:436-499`（switchConversation :448-449 唯一 bump 点）、`:501-552`（deleteConversation :522-540 fixup `setActiveEngine(next ? engineCache.get(next.id) ?? null : null)`——next 不在 cache 时 null 悬挂）、`:589-665`（clearAll 不 bump）；probe-1/1b/1c/B/C 全部 RED（findings §3.2 N1）。
- **检测方法**：参数化穷举测试（`conversation-invariants-cycle2.test.ts` Invariant ⑥ 块，`it.fails` × 5 成员场景——套件保持全绿，I4 翻转）+ 静态扫描器规则 `scanDisplacementVersionBumps`（位移方法 delete/clearAll/create 函数体必须含 `switchVersionRef.current` bump 语句，缺失即违例；**live 预期命中 3**：create/delete/clearAll，注册红待 I4 清零）。

### 9.2 不变式 ⑦ —— storage bootstrap 列表合并（N2）

- **不变式陈述**：storage bootstrap 的 post-await `setConversations` 必须合并当前状态（functional updater），不得覆盖加载期间由 `createConversation` 创建的会话（防列表回滚 + activeId 悬空出列）。
- **覆盖失败族**：bootstrap 覆盖族（N2，findings §3.2 probe-2 RED——create X 后 bootstrap resolve → 列表=[A]，activeId=X 悬空出列）。
- **历史 bug 证据**：`use-conversation.ts:299-350`（bootstrap effect `:313-326` `setConversations` 整体覆盖，非 functional merge——现为合并实现）；probe-2 RED（findings §3.2 N2）。
- **检测方法**：运行时参数化测试（`conversation-invariants-cycle2.test.ts` Invariant ⑦ 块，`it.fails` × 2 场景）；**不静态化**（functional updater 为行为面，静态误报高，理由记录 gates.md）。

### 9.3 不变式 ⑧ —— branch 戳消费/清除（N3）

- **不变式陈述**：`pendingBranchId` 必须在使用前被消费或清除；runTurn 任一提前返回路径不得遗留待消费的 branch 戳（防泄漏到无关 turn）。
- **覆盖失败族**：branching/fork 族（N3，I0 §3 登记候选族正式触发，findings §3.2 probe-3 RED——regenerate+connector-missing 后，下一正常 turn 的 assistant 被戳 `branchId:'branch-1'`）。
- **历史 bug 证据**：`create-engine.ts:101`（`pendingBranchId` 声明）、`:219-237`（connector-missing 早退，runOnce 之前 return，戳未消费）、`:439-457`（runOnce 消费，`:457` `pendingBranchId = undefined`）、`:671-698`（regenerate 设戳 + `await runTurn([])`）；probe-3 RED（findings §3.2 N3）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑧ 块，`it.fails` 泄漏 ×1 + 消费控制 `it` ×1）+ 静态扫描器规则 `scanBranchStampReset`（runTurn 内 runOnce 调用前的提前 return 路径必须伴随 `pendingBranchId` 清除；**扫描/豁免面**：isProcessing 早退（`:206-208`）在设戳路径（regenerate→runTurn）不可达 → 豁免并记录理由；connector-missing 早退（`:210-229`）可达 → 扫描目标，**live 预期命中 1**，注册红待 I4 清零）。

> **2026-08-10 multi P2-1 扩面（plan `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`）**：⑧ 覆盖路径从「提前 `return`」扩展到「break/throw 早退」——abort while-head break 与 onTurnStart 抛错（catch）两条路径在 runOnce 消费前退出 turn，均曾残留 `pendingBranchId`（branch 误分组 + regenerate 序列偏移，metadata 级 defect）。修复：break 前置清戳 + catch 内清戳（live `create-engine.ts` 重置面 `:219`（connector-missing）/ `:264`（abort break）/ `:360`（catch，throw 路径），消费面 `:457`）。**检测方法扩展**：运行时成员 +3（break 臂 / throw 臂 / regenerate 序列臂，`it.fails` 落库 → 翻转 `it`，共 4 泄漏路径 + 消费控制全绿）；静态扫描器 `scanBranchStampReset` 扩三条规则（return / break / catch-clear，见 gates.md）。live 零命中维持。

### 9.4 不变式 ⑨ —— plugin 错误隔离（N4）

- **不变式陈述**：plugin hook 的 rejection 不得使 turn 状态卡死或绕过状态写入：onTurnStart 必须纳入 try/finally 清理面；onError 调用不得先于状态写入（或写入不得被 hook 抛错跳过）；onTurnEnd rejection 不得遮蔽原错误（所有错误必须落在 `requestState`/`lastError`）。
- **覆盖失败族**：plugin 生命周期族（N4，I0 §3 登记候选族正式触发，findings §3.2 probe-4/probe-E RED + onTurnEnd 静态证据）。
- **历史 bug 证据**：`create-engine.ts:248-252`（`await plugin.onTurnStart`——现已在 try 内，rejection 经 catch 落态）、`:363-365`（catch 内 `callPluginError` 先于 mutate——onError 抛错跳过状态写入）、`:395-405`（finally 内 `await plugin.onTurnEnd` 有隔离守卫——rejection 不再遮蔽原错误）；probe-4/probe-E RED（findings §3.2 N4）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑨ 块，`it.fails` × 3 场景）；**不静态化**（plugin 回调交错为行为面，误报高，理由记录 gates.md）。

### 9.5 不变式 ⑩ —— 失败轮产物清理（N5）

- **不变式陈述**：failed/aborted 轮的残留空 placeholder 不得进入后续请求历史（应移除或排除）；失败轮必须清理自身产物。
- **覆盖失败族**：失败轮残留污染族（N5，findings §3.2 probe-D RED——请求 #2 携带 `{content:'', loading:false}` 空 assistant 消息）。
- **历史 bug 证据**：`create-engine.ts:585-608`（runOnce catch `:586` `loading=false` + `commitOrDropResidue` 保留空 placeholder）、`:606-619`（buildContext `:608-616` 经 `buildEngineContext` 投影——现含 `isVacuousAssistantResidue` 排除 + wire 白名单）；probe-D RED（findings §3.2 N5）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑩ 块，`it.fails` 排除 ×1 + 正常轮控制 `it` ×1）；**不静态化**（buildContext 排除谓词为行为面，误报高，理由记录 gates.md）。

## 10. Cycle 2 / I4 门禁补强（13 条 K 修复契约，⑥⑦⑨⑩②④ 扩展）

> 2026-08-10 落地（plan `docs/plans/2026-08-10-0925-2-cycle2-i4-fix-execution.md`）。I2 审计发现 13 条 K finding（findings §3.1 全 RED），I3 裁决 P0 ×3 + P1 ×10 路由本 plan 修复并补强门禁。下列为对 §9（及 §7.3/§7.4）对应陈述的**加性/修订扩展**：13 条 K 全部 RED→GREEN（test-first 在案）、12 处 `it.fails` 全量翻转、注册红 ⑥×3 + ⑧×1 清零（`check:ai-engine-invariants` live 零命中）、bug notes 125-130 落档。**§7.3 与 §7.4 的类别清扫结论在此显式 supersede（见下）**。

### 10.1 不变式 ⑩ 扩展 —— 空产物清理统一谓词（K-⑩-1/2/3/4/5）

- **扩展陈述**：**空产物（`content:''` 且无 `finishReason`）的 assistant 消息不得进入请求历史与 autoSave 快照**——统一谓词 = `isVacuousAssistantResidue`（`engine/utils.ts`，`role==='assistant' && isEmptyContent(content) && !metadata.finishReason`）。失败/中止/退化成功轮（零 chunk）的残留 placeholder 在**终态提交层 drop**（`commitOrDropResidue`），而非以 `loading=false` 提交；`onBeforeRequest` rejection 不得留 `loading:true` 幽灵（纳入清理面）；autoSave 快照剥除尾部空残留（覆盖 `abort()` 同步翻 state 早于 engine 清理的窗口）；`buildContext` 尾部排除谓词扩展至空残留（纵深防御）。
- **覆盖失败族**：失败轮残留污染族（N5）五成员——aborted 轮（K-⑩-1）、hook 拒绝幽灵（K-⑩-2）、autoSave 持久化臂（K-⑩-3）、regenerate 臂（K-⑩-4，P0 数据丢失形态）、零 chunk 成功轮（K-⑩-5）。
- **历史 bug 证据**：`docs/bugs/125-ai-engine-failed-turn-residue-cleanup-fix.md`（K-⑩ 族全 5 条合并）。
- **检测方法**：运行时参数化测试（`engine-invariants-i4.test.ts` Invariant ⑩ 块 6 成员 + `conversation-invariants-i4.test.ts` autoSave 臂成员——I4 拆分新文件，对齐 cycle2 先例）；**不静态化**（行为面，沿用 I1/§9 裁定）。

### 10.2 不变式 ⑥ 扩展 —— 同 tick 组合 + bootstrap build-on-demand 成员（K-⑥-1/2/3）

- **扩展陈述**：位移方法（create/delete/clearAll）必须 bump `switchVersionRef` **并重置 `switchTargetRef = null`**（id-aware 守卫的健全性前提）；**delete/clearAll 必须同步写 `conversationsRef`**（镜像写面，K-⑥-1 幽灵 fixup 根因）；switch 入口 exists 检查读 `conversationsRef.current`（守卫须早于 `setActiveId`，K-⑥-2）；version guard 升级为 **id-aware**（`version !== myVersion && target !== id` 才 bail——同 id 快速重 switch 的 hydration 不得整体丢弃，注册成员 4）；**mount bootstrap 选中 active 必须 build-on-demand 建引擎 + loadMessages**（K-⑥-3，`ensureEngineAndHydrate`，镜像 switch 语义；删除 active 的 fixup 同用）。
- **覆盖失败族**：active 位移完整族（N1）3 新成员 + 5 注册成员。
- **历史 bug 证据**：`docs/bugs/126-ai-conversation-active-displacement-integrity-fix.md`（K-⑥ 族全 3 条合并）。
- **检测方法**：运行时参数化测试（`conversation-invariants-cycle2.test.ts` Invariant ⑥ 块 8 成员全 `it`）+ 静态扫描器 `scanDisplacementVersionBumps` 保持（bump 后 live 零命中）。

### 10.3 不变式 ⑦ 扩展 —— clearAll 成员（K-⑦-1）

- **扩展陈述**：bootstrap post-await 的 `setConversations` 必须**合并**（`[...loaded, ...加载期间创建且不在 loaded]`，按同步镜像计算）且带**「列表已被 clearAll 清空」守卫**（`listClearedRef`，clearAll 置位；守卫命中则不恢复列表、不建引擎）。create 成员与 clearAll 成员的判别：create 不抑制恢复（合并且保留创建项），clearAll 抑制（恢复即复活已清列表）。
- **覆盖失败族**：bootstrap 覆盖族（N2）clearAll 成员。
- **历史 bug 证据**：`docs/bugs/127-ai-conversation-bootstrap-cleared-list-restore-fix.md`（K-⑦-1）。
- **检测方法**：运行时参数化测试（`conversation-invariants-cycle2.test.ts` Invariant ⑦ 块 3 成员全 `it`）；**不静态化**（functional merge 行为面）。

### 10.4 不变式 ② 扩展 —— 镜像**写面**全方法 + 扫描器规则（K-K4/②-1/2）

- **扩展陈述**：**所有列表变更方法（create/rename/delete/clearAll + bootstrap merge）必须同步维护 `conversationsRef`**（§7.4 写面从 create/rename 扩展至全部列表变更方法）；rename 的 `saveConversation` **链入 `pendingSavesRef` 排空链** + **settlement-time 再校验**（写入时镜像目标仍存在，否则跳过）——rename-first × delete/clearAll 双序均无幽灵重存/元数据幽灵。
- **覆盖失败族**：K4/② sync 闭包读取/镜像维护族（delete/clearAll 写面成员 + rename 重存成员）。
- **历史 bug 证据**：`docs/bugs/128-ai-conversation-rename-resave-ghost-fix.md`（K-K4/②-1/2 合并）。
- **检测方法**：运行时参数化测试（`conversation-invariants-i4.test.ts` 镜像写面 + 双序幽灵成员）+ **新增静态扫描器规则 `scanMirrorWriteSurface`**（列表变更方法函数体必须含 `conversationsRef.current =` 写，缺失即违例——镜像写缺失静态可检性评估落地为 yes）+ committed 回归 fixtures。

### 10.5 不变式 ④ 扩展 —— create/rename 元数据写入排空链（K-K3/④-1）

- **扩展陈述**：**create 与 rename 的 `saveConversation` 元数据写均链入 `pendingSavesRef` 排空链**（K3 排空链从仅 saveMessages 扩展至全部 storage 写）+ settlement-time 镜像再校验——同 tick create+clearAll / rename+clearAll 均无幽灵会话/元数据。
- **覆盖失败族**：K3/④ storage 时序守卫族（create 元数据写成员；rename 同型兄弟一并覆盖）。
- **历史 bug 证据**：`docs/bugs/129-ai-conversation-create-metadata-drain-fix.md`（K-K3/④-1）。
- **检测方法**：运行时参数化测试（`conversation-invariants-i4.test.ts` create 与 rename 两个元数据排空臂成员）；**不静态化**（运行时序，沿用 §7.3 裁定）。

### 10.6 不变式 ⑨ 扩展 —— abort 变体 + hook 调用点全覆盖（K-⑨-1）

- **扩展陈述**：plugin hook 全部调用点（onTurnStart / onBeforeRequest / onError×4 / onCompletionChunk / onAfterRequest / onTurnEnd）纳入错误隔离面——onTurnStart 移入 try（rejection 经 catch 落态，不卡 processing）；`callPluginError` 包装全部 onError 调用点（onError 抛错不得跳过状态写入）；finally 的 onTurnEnd rejection **隔离**（不 reject host-facing promise，abort 变体 = K-⑨-1；错误经 `lastError` 记录仅在无先验错误时）。
- **覆盖失败族**：plugin 生命周期族（N4）abort 变体成员 + 3 注册成员。
- **历史 bug 证据**：`docs/bugs/130-ai-engine-plugin-error-isolation-fix.md`（K-⑨-1）。
- **检测方法**：运行时参数化测试（`engine-invariants.test.ts` Invariant ⑨ 块 4 成员全 `it`）；**不静态化**（plugin 回调交错行为面）。

### 10.7 注册红清零 + §7.3/§7.4 supersede 记录（Proof）

- **注册红清零**：⑥×3（create/delete/clearAll bump `switchVersionRef`）+ ⑧×1（connector-missing 早退清 `pendingBranchId`）→ `check:ai-engine-invariants`（扩展后）live **零命中**（2026-08-10 实测）。
- **显式 supersede §7.3**：「saveConversation（create/rename）不入排空链」结论被 K-K3/④-1 / K-K4/②-1/2 修复推翻 → 改为 **「create/rename 元数据写均入排空链 + settlement-time 镜像再校验」**（§10.4/§10.5 契约）。
- **显式 supersede §7.4**：写面范围从 create/rename 扩展至**全部列表变更方法**（delete/clearAll + bootstrap merge，§10.2/§10.4）；`switchConversation` 首语句 exists 检查改读 `conversationsRef.current`（原「渲染快照首语句豁免」注释随 K-⑥-2 修复失效——现在它是镜像读取，非闭包读取）。
- **watch-only 附带评估**：W-⑨-b 随 K-⑥-3 修复自然收敛（从 watch-only 移除，findings §3.3 已更新）；W-E 不收敛（维持登记，如实记录）。

## 11. 2026-08-10 双审计 P1 门禁扩展（⑩ dangling 成员 + ⑪ 新族 + ④ fan-out 源）

> 2026-08-10 落地（plan `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`）。源审计 = `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`（P1-2/P1-3/P1-4/P1-5）+ `docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`（P1-1 = 不变式 ⑪ 触发）。双审计触发 Loop Rule 新族派生：⑪ 为新族（I6-Cycle2 稳态暂停后复触发，条件①③）。全部 P1 修复 test-first（RED→GREEN 在案）+ 门禁扩展 live 零命中 + bug notes 131-133 落档。

### 11.1 不变式 ⑩ 扩展 —— dangling tool_calls 清理（P1-2）

- **扩展陈述**：assistant 消息携带 `tool_calls` 且其后**无配对 `role:'tool'` 响应**（`tool_call_id` 匹配）时，不得作为 tool_calls 携带者进入请求载荷 / autoSave / 后续轮次历史。判定 **content-agnostic**（交错文本+tool_calls 形状同覆盖）：内容非空 → strip `tool_calls` 保留文本；内容为空 → 整体 drop；**部分配对**（multi-call 部分 commit 后 abort）→ 仅 strip 无配对条目（不得整数组 strip 使已 commit 的 tool 消息孤儿化）。统一谓词 `isDanglingToolCallsMessage`/`cleanDanglingToolCalls`/`sanitizeDanglingToolCalls`（`engine/utils.ts`），**独立于** `isVacuousAssistantResidue`（后者要求 `!metadata.finishReason`；dangling 轮带 `finishReason:'tool_calls'`——故为新成员非合并）。
- **覆盖失败族**：失败轮残留污染族（N5）dangling 形状成员——abort-in-window / tool-no-executor / abort-mid-executor（runTurn `!shouldContinue` 返回兜底面）/ 载荷臂 / autoSave 臂 / 交错文本 strip 臂。
- **历史 bug 证据**：`docs/bugs/131-ai-engine-dangling-tool-calls-residue-fix.md`（P1-1/P1-2 合并族）。
- **检测方法**：运行时参数化测试（`engine-invariants-i4.test.ts` Invariant ⑩ dangling 块 5 成员 + `conversation-invariants-i4.test.ts` autoSave 臂成员）；**不静态化**（谓词组合行为面，沿用 §9.5 裁定）。

### 11.2 不变式 ⑪ —— plugin ctx 写隔离 + 请求载荷白名单（open P1-1 + P1-5，新族）

- **不变式陈述**：① 全部 plugin hook（onTurnStart/onTurnEnd/onBeforeRequest/onAfterRequest/onCompletionChunk）的 `ctx.request.messages` **不得是** engine 的 live message 数组——`buildContext` 无条件产出数组 + 元素双重隔离副本（`sanitizeDanglingToolCalls(...).map(projectWireMessage)`）；按 engine.md §8.3 文档模式 push system prompt 只能塑造出站请求，**不能写穿 engine 历史**（绕过 `mutate`/notify → 永久进历史 → 流向下轮载荷与 autoSave 快照）。② **请求载荷白名单**：`AiConnectorRequest.messages` 各消息不得携带渲染器私有 `state`（editing 草稿 / toolCall UI / thinking，design.md §11.5「不投影」）与内部工具 metadata（`toolError` Error stack / `toolStatus`）；剥离在 **engine 边界**（`buildContext`，非 connector 归一化层——engine 是唯一知道域内部字段的层）。
- **覆盖失败族**：plugin 生命周期族（N4 派生同族面）+ 载荷泄漏族（新，双审计触发）。
- **历史 bug 证据**：`docs/bugs/133-ai-engine-plugin-ctx-write-isolation-and-payload-hygiene-fix.md`（P1-5 + open P1-1 合并族）。
- **检测方法**：运行时参数化测试（`engine-invariants-p1.test.ts`：5 hook 穷举 `ctx.request.messages !== engine.getState().messages` + push 不写穿 + payload 元素隔离 + P1-5 白名单双用例）；**不静态化**（数组隔离为行为面，静态误报高——沿用 ⑦⑨⑩ 裁定）。
- **扩展（2026-08-11，R1-F2，plan `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`）**：**嵌套深度成员**——`projectWireMessage` 此前对 `tool_calls`/`content`（数组部件）/`reasoning_content` **按引用赋值**、`metadata` 仅浅拷贝（`{ ...message.metadata }` 嵌套值共享）→ plugin 对 `ctx.request.messages[i].tool_calls` 等 `push`/mutate 写穿 engine 历史 + wire payload（open P1-1 已修族的嵌套深度残留成员）。**扩展陈述**：写隔离覆盖**全部嵌套深度**——`projectWireMessage` 对白名单字段与 metadata 做元素级深克隆（`deepClone`，`engine/utils.ts`），wire payload 与 engine 历史彻底断引用。**检测方法**：运行时参数化成员 +3（tool_calls push / content parts push / metadata 嵌套值 in-place mutate，`engine-invariants-p1.test.ts` Invariant ⑪ nested 块），修复前全 RED 修复后全 GREEN；`types.ts` MessageEngineContext 注释与 `build-context.ts` 同步如实描述隔离深度（原「never write through」承诺现于全深度成立）。**评估结论**：⑪ 门禁测试成员**需补**嵌套成员（既有 8 成员仅覆盖数组 + element 层，不覆盖嵌套深度——不补则 R1-F2 面无防回归守卫）；已补 3 成员，`check:ai-engine-invariants` 不静态化面维持（行为面裁定不变）。

### 11.3 不变式 ④ 扩展 —— clearAll fan-out 源（P1-3/P1-4）

- **扩展陈述**：`clearAll` 的 storage 清空枚举源 = **完整 storage 会话集**（`[...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys(), ...conversationsRef.current.map(c => c.id)])]`），**不是**仅 `engineCache.keys()`——已 switch 逐出会话（在途 autoSave 仍 pending）与 bootstrap 加载但从未打开的会话不在 engine cache，cache-only 枚举使它们的 storage 记录逃过清空 → remount ghost 复活（FP-2）。配套：`saveMessages` settlement-time 镜像再检查（会话已不在 `conversationsRef` 则跳过落盘，与 create/rename 语义对齐）。
- **覆盖失败族**：storage 静默丢族（0707 clearAll 家族同源兄弟——P1-3 逐出会话在途 autoSave / P1-4 未打开会话）。
- **历史 bug 证据**：`docs/bugs/132-ai-conversation-clear-all-ghost-evicted-sessions-fix.md`（P1-3/P1-4 合并族）。
- **检测方法**：运行时参数化测试（`conversation-invariants-i4.test.ts` fan-out 源成员 ×2）+ **静态扫描器规则 `scanClearAllFanOutSource`**（clearAll 函数体必须含 `conversationsRef.current.map(` 枚举，缺失即违例——fan-out 源静态可检性落地为 yes，入 `check:ai-engine-invariants`）+ committed 回归 fixtures ×2（违规 exit 1 / 清洁 exit 0）。

## 6. 引用索引

- 审计产物：`docs/audits/2026-07-23-2141-multi-audit-ai.md`（AI-01/AI-03/AI-19/AI-28）、`docs/audits/2026-07-24-1757-multi-audit-ai.md`（P1#1 abort→send race）、`docs/audits/2026-07-24-1757-open-audit-ai.md`（F1.1/F2.2 修复实证）、`docs/audits/2026-07-24-2151-open-audit-ai.md`（O-1 等）、`docs/audits/2026-07-25-0707-multi-audit-ai.md`（P1-1 deleteConversation stale-closure / P1-2 storage bypass）、`docs/audits/2026-07-25-0707-open-audit-ai.md`（P1-1 clearAll ghost rehydration / P1-2 no-storage eviction）
- Bug note：`docs/bugs/07-submit-concurrent-guard-fix.md`（Bug 07）
- 既有回归测试：`engine/__tests__/engine-concurrency.test.ts`、`adapters/__tests__/use-conversation-{switch,delete-during-abort,clear-all,storage,create}.test.ts`、`renderers/__tests__/ai-silent-drop-guards.test.tsx`
- 门禁沉淀（I1）：本目录 §2 五条 → `engine/__tests__/engine-invariants.test.ts` + `adapters/__tests__/conversation-invariants.test.ts` + `check:ai-engine-invariants` + `docs/audits/ai-invariants/gates.md`（棘轮登记处）

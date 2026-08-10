# 1 Engine/Adapter 层 P1 修复（abort 残留 / 悬空 tool_calls / clearAll 幽灵 / 请求载荷卫生）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Last Reviewed: 2026-08-10
> Source: `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`（P1-1/P1-2/P1-3/P1-4/P1-5）、`docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`（P1-1）；live repo 核对 2026-08-10
> Source Audits: `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`、`docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`
> Related: `docs/plans/2026-08-10-1301-2-renderer-bubble-p1-remediation.md`（renderer 族 P1，独立 closure surface）

## Purpose

修复本轮双审计发现的 **engine/adapter 层 6 条 P1**（0 P0）：① abort 中途 tool 结果迟到 commit（P1-1）；② 悬空 `tool_calls` assistant 消息在 abort / tool-no-executor 路径被完整 commit 并流入下一轮请求与 autoSave（P1-2）；③ `clearAll` 排空链漏掉已逐出会话的在途 autoSave（P1-3）；④ `clearAll` per-id fan-out 只遍历 `engineCache.keys()`，未打开过的会话残留 storage（P1-4）；⑤ `buildContext` 把渲染器私有 `state` 与 `metadata.toolError` 送进连接器请求载荷（P1-5）；⑥ plugin hook context 暴露 engine 的 live 内部 message 数组，文档化的 `onTurnStart` 注入用法会直接污染 engine 历史（open P1-1）。每条修复带 test-first 回归断言；其中 ②⑥ 涉及不变式门禁盲区（⑩ 的 dangling-tool_calls 形状、plugin ctx 写隔离）→ 按 Loop Rule 同步扩展门禁（⑩ 新成员 + ⑪ 新族）。

收口状态：6 条 P1 全部修复（RED→GREEN）、门禁扩展落地（`check:ai-engine-invariants` 零命中）、AI 包测试全绿、engine.md 同步。

## Current Baseline

（live repo 核对，2026-08-10，HEAD `de36e8e9`；行号 = 审计时点）

- **P1-1（abort 中途 tool 结果迟到 commit）**：`engine/tool-execution.ts:41-108` `executeToolCalls` 只在循环顶部检查 `abortController.signal.aborted`（`:42`）；`await toolExecutor(...)`（`:52`）之后无二次检查，随后 `:78-95` mutate 提交 per-call UI state、`:105-107` push `role:'tool'` 结果消息。abort 发生在 executor 挂起期间时：signal-aware executor reject（AbortError → 记为 failed）或 signal-ignoring executor resolve（记为 success）——两者都会在轮次已达终态（`requestState='aborted'`）之后仍把 tool 消息 commit 进历史；autoSave 会持久化（K-⑩-3 strip 只滤 vacuous assistant，不滤 tool 消息）；下一轮 `buildContext` 携带孤儿 tool 消息给模型。
- **P1-2（悬空 tool_calls assistant 被完整 commit）**：`engine/create-engine.ts:531-547` commit 顺序为 `onAfterRequest` → `commitOrDropResidue()`（`:534`）→ abort 检查（`:536`）；`:289-308` tool-no-executor 分支直接 `requestState='error'` return，不清理本轮 assistant；`engine/utils.ts:156-162` `isVacuousAssistantResidue` 要求 `!metadata?.finishReason`——**content-agnostic** 问题：只要消息带 `tool_calls` 且 `finishReason:'tool_calls'`（无论 content 是否为空，含标准交错文本+tool_calls 形状），`isStreamingAssistantPlaceholder` / `isVacuousAssistantResidue` 两个谓词都不排除（前者要 `content===''`+loading，后者要 `!finishReason`）→ abort-in-window 与 tool-no-executor 路径都会 commit 一条"有 tool_calls 无配对 tool 响应"的消息；`buildContext`（`:579-583`）只排除 streaming placeholder / vacuous，不排除 dangling tool_calls → 该消息进入下一轮请求载荷与 autoSave（严格 OpenAI 兼容后端对无配对 tool 响应的 tool_calls 返回 400，重试环反复失败）。
- **P1-3（clearAll 漏掉已逐出会话的在途 autoSave）**：`adapters/use-conversation.ts:575-635` `clearAll` 的 `ids = [...engineCache.keys()]`（`:578`）不包含已 switch 逐出（`:479-484`）的会话；`:612-615` drain 只遍历 `ids`，`:615` `pendingSavesRef.current.clear()` 把在途条目直接丢掉不等其 settle；`saveMessages`（`:225-232`）settlement 时无 mirror 再检查（对比 create `:411-413` / rename `:565-567`）→ 逐出会话的在途 autoSave 在 storage 清空后落盘 → remount ghost 复活。
- **P1-4（clearAll fan-out 漏掉未打开会话）**：bootstrap 只为 active 会话建 engine（`:330-336`）；其他已加载会话从未进入 `engineCache`；`clearAll` 的默认 per-id fallback（storage 无 `clearAll` 实现时，`:622-633`）遍历 `engineCache.keys()` → 这些会话的 storage 记录残留 → remount ghost rehydration（FP-2 家族未覆盖成员）。`storage/types.ts:14,26` 将 `clearAll` 文档化为可选。
- **P1-5（请求载荷携带渲染器私有 state / toolError）**：`engine/create-engine.ts:572-599` `buildContext` 把 `requestMessages`（= 完整 message 数组，含 `message.state`：editing draft / toolCall UI / thinking 等）原样放入 `AiConnectorRequest.messages`；`metadata.toolError`（Error 对象带 stack）也随 metadata 原样携带；`apps/playground/src/ai/openai-connector.ts:48` 原样透传 `req.messages`。`design.md:541` 明确 state 是"域内部、不投影"。
- **open P1-1（plugin ctx 暴露 live 内部数组）**：`buildContext`（`:572-599`）中 `allMessages = adapter.getState().messages` 是 live 数组；`requestMessages` 仅在 `isPlaceholder` 时 `slice(0,-1)`，否则就是 `allMessages` 本身（同引用）；`onTurnStart`（`:253-256`）在 placeholder push 之前、`onTurnEnd`（`:376`）在轮次之后触发，两处 `ctx.request.messages === engine.getState().messages`（同引用）。host 按 `engine.md:186` §8.3 文档用 `onTurnStart` 注入 system prompt（`ctx.request.messages.push(...)`）时，直接改 live 数组、绕过 `mutate`/notify，永久进入 engine 历史并流向下一请求载荷与 autoSave 快照。`onBeforeRequest`/`onAfterRequest`/`onCompletionChunk` 因 placeholder 已 push 反而是副本——陷阱恰是文档推荐的两个 hook。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中（注册红 ⑥×3+⑧×1 已清零）；不变式 ⑩ 覆盖 vacuous assistant（empty content + no finishReason）三落地面，**不覆盖 dangling tool_calls 形状**；plugin 生命周期族（⑨）覆盖 hook 并发/错误隔离/unregister 交错，**无 ctx 写隔离成员**；④ 覆盖 `.catch → reportStorageError` 路由 + drain-before-delete 顺序，**不覆盖 fan-out 遍历源**（`engineCache.keys()` vs list mirror）。
- 既有测试锚点：`engine-tool-loop.test.ts:239-262`（tool loop 回归）、`conversation-invariants-i4.test.ts`（rename/delete/create × clearAll 排空链）、`use-conversation-clear-all.test.ts`（只有 engineCache 内会话）、`engine-invariants.test.ts` + `engine-invariants-i4.test.ts`、`conversation-invariants-cycle2.test.ts`；AI 包基线 **69 files / 572 tests 全绿**。
- Bug note 编号：live 最高 **130**，新增编号 **131+**。
- 授权：engine/adapter P0/P1 修复预授权自动（mission description）；**不改变公共 API 契约**（`MessageEngine`/`UseConversationReturn` 签名不变）→ 不触发结构性重构人工确认门。`AiConnectorRequest` 载荷字段裁剪属公共契约行为修正（白名单化），不属签名变更。

## Goals

- 6 条 P1 全部修复（test-first：每条先写 RED 回归测试 → 修复 → GREEN），强制类别清扫（修任一实例 grep 全部同类兄弟一并核对）。
- 门禁扩展（Loop Rule / 审计 cross-cutting pattern 3 建议）：
  - ⑩ → 新增 **content-agnostic** dangling-tool_calls 成员（消息携带 `tool_calls` 且其后无配对 `role:'tool'` 响应的 assistant **不得作为 tool_calls 携带者**进入请求载荷 / autoSave / 后续轮次历史；**内容非空时 strip `tool_calls` 保留文本，内容为空时整体 drop**——交错文本+tool_calls 形状同样覆盖，对齐审计 P1-2 fix 建议）；
  - ⑪（新族）→ plugin ctx 写隔离：`ctx.request.messages !== engine.getState().messages`（hook 内为浅拷贝数组）+ `MessageEngineContext` 字段文档化为 read-only。
- 请求载荷白名单化：`AiConnectorRequest.messages` 上的 `state` 与内部 `metadata` 字段在连接器边界剥离（或文档化 host 义务 + 从 wire 类型排除 `state`）。
- `engine.md` §8.3 / §Invariants 同步（plugin ctx read-only 文档 + 失败轮产物清理谓词扩展）；`invariant-catalog.md` + `gates.md` 登记 ⑪ 与 ⑩ 扩展；bug notes 131+。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants`（扩展后）live 零命中、类别清扫记录入档。

## Non-Goals

- 不处理 renderer 族 P1（P1-6/7/8/9）——已在 `docs/plans/2026-08-10-1301-2-renderer-bubble-p1-remediation.md`。
- 不处理 P2（26 条已入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog）。
- 不裁决优先级、不执行全量仓库验证（由本 plan Closure Gates 一次覆盖）。
- 不做结构性重构（不改变公共 API 签名 / adapter 契约）。
- 不做 autoSave 之外的持久化面扩展；不重写 streaming 背压。

## Scope

### In Scope

- `engine/tool-execution.ts`（P1-1）、`engine/create-engine.ts`（P1-2/P1-5/open P1-1）、`engine/utils.ts`（⑩ 谓词扩展）、`adapters/use-conversation.ts`（P1-3/P1-4）、`engine/plugins/*`（若 dangling tool_calls 清理影响 plugin 面）。
- 门禁扩展：`engine/__tests__/engine-invariants.test.ts` / `engine-invariants-i4.test.ts`（⑩ 新成员 + ⑪）、`adapters/__tests__/conversation-invariants*.test.ts`（④ 扩展 fan-out 源成员）、`scripts/audit/` 静态扫描器（如 ⑪ 可静态化则落规则 + committed 回归）。
- 文档：`engine.md`、`invariant-catalog.md`、`gates.md`、bug notes 131+、daily log。

### Out Of Scope

- renderer 族 P1、全部 P2、全量仓库验证（归 Closure Gates）、公共 API 重构。

## Failure Paths

| 场景               | 触发                                                                       | 行为                                                                                            | 可重试 | 用户可见表现                     |
| ------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | -------------------------------- |
| abort-tool-late    | abort 时 executor 已 resolve / reject 且无二次 abort 检查                  | 回归测试 RED（先红后绿）；修复后 aborted 轮无 `role:'tool'` 残留                                | 是     | 无 ghost 工具卡 / 下一轮请求干净 |
| dangling-toolcalls | abort-in-window / tool-no-executor 且消息带 tool_calls（content 空或非空） | 谓词扩展后该形状被排除出历史/载荷/autoSave（空内容 drop，非空内容 strip `tool_calls` 保留文本） | 是     | 无 400 重试失败环 / 历史无孤儿   |
| clearall-ghost     | clearAll 时存在逐出会话在途 autoSave 或未打开会话                          | drain 覆盖 `pendingSavesRef` + `conversationsRef` 全集                                          | 是     | 清空后 remount 无 ghost 复活     |
| payload-leak       | host 发送请求时消息含 state.draft / toolError                              | 载荷白名单化后 wire 上无内部字段                                                                | 是     | 模型侧无未提交草稿 / 无 stack    |
| plugin-ctx-write   | plugin 在 onTurnStart 按文档 push system prompt                            | ctx.request.messages 为浅拷贝，push 不进 engine 历史                                            | 是     | 历史不被插件污染 / 无持久化污染  |

## Test Strategy

本档选择：必须自动化

engine/adapter 行为 + 不变式门禁即测试（roadmap Rule）；每条 P1 的 Proof（RED 回归测试）先于 Fix；门禁扩展附 PROOF 用例（注入违背 → 红）。复杂并发 bug 按 guide 补 bug note（131+）。

## Execution Plan

### Phase 1 — abort 中途 tool 结果迟到 commit 修复（P1-1）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/tool-execution.ts`、`src/engine/__tests__/engine-tool-loop.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试——`executeToolCalls` 场景：abort 在 executor 挂起期间触发（signal-aware executor reject AbortError / signal-ignoring executor resolve 两种）→ 断言该轮 `requestState='aborted'` 后 messages 尾部**无** `role:'tool'` 消息（`engine-tool-loop.test.ts:239-262` 区域扩展）；修复前 RED
- [x] Fix: `executeToolCalls` 在 `await toolExecutor(...)` 返回后、两个 mutate commit（`:78-95` UI state / `:105-107` push tool 消息）之前加 abort 二次检查（或 catch 中特判 AbortError）；abort 时跳过该 call 的 commit 并短路返回 `false`（与循环顶部检查同语义）
- [x] Fix: 类别清扫——tool-execution 家族全部"commit 点"核对（UI state mutate / tool 消息 push / 返回路径），abort 语义在每一 commit 点成立；清扫记录入档
- [x] Fix: 若 P1-1 修复使 `executeToolCalls` 返回语义变化（返回 false 时中止后的 call 不再 commit；**此前已完成 call 的 commit 保留**），同步 `create-engine.ts:312-320` 调用点注释/行为核对

Exit Criteria:

- [x] P1-1 RED 回归测试转 GREEN（两种 executor 行为断言全绿）
- [x] 类别清扫记录入档（tool-execution 全部 commit 点核对结论）

### Phase 2 — 悬空 tool_calls 清理（P1-2）+ 不变式 ⑩ 扩展

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/engine/utils.ts`、`src/engine/__tests__/engine-invariants*.test.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（abort-in-window 场景）——`sendMessage` 中 abort 于 chunk 循环后（消息带 `tool_calls` + `finishReason:'tool_calls'`，无配对 tool 消息）→ 断言消息列表**无**该 dangling assistant；修复前 RED
- [x] Proof: RED 回归测试（tool-no-executor 场景）——`tool_calls` 到达但无 `toolExecutor` → 断言历史**无** dangling assistant 残留（`create-engine.ts:289-308` 分支）；修复前 RED
- [x] Proof: RED 回归测试（载荷 + autoSave 臂）——dangling 形状存在时断言下一 `sendMessage` 的请求历史**不含**该消息、mock storage 的 `savedMessages` **不含**该消息；修复前 RED
- [x] Proof: RED 回归测试（交错文本+tool_calls 形状）——消息 `content` 非空 + `tool_calls`（无配对 tool 响应）→ 断言历史中该消息保留但 `tool_calls` 被 strip（文本不丢）；修复前 RED
- [x] Proof: RED 回归测试（abort-mid-executor → 后续 sendMessage 臂）——abort 于 tool executor 挂起期间（Phase 1 修复路径：runTurn `shouldContinue===false` 返回，assistant 已 commit）→ 下一次 `sendMessage` → 断言请求历史与 autoSave 快照**不含** dangling `tool_calls` 形状；修复前 RED
- [x] Decision: 裁定 dangling-tool_calls 谓词为 **content-agnostic**——判定条件 = `role:'assistant'` + `tool_calls.length>0` + 后续无配对 `role:'tool'`（`tool_call_id` 匹配）；**处理策略 = 内容非空时 strip `tool_calls`（保留文本），内容为空时整体 drop**；**部分配对边界（multi-call 部分 commit 后 abort）**：仅 strip 无配对 `tool_call_id` 的条目（或同步 drop 孤儿 `role:'tool'` 消息），不得整数组 strip 使已 commit 的 tool 消息孤儿化；评估点 = 三个清理面：abort 分支 `create-engine.ts:536-547`、tool-no-executor 分支 `:296-308`、**runTurn abort-mid-executor 返回 `:317-320`（Phase 1 修复路径——assistant 已 commit 且 `commitOrDropResidue` 于 `:534` 因 finishReason='tool_calls' 保留，此路径唯一兜底面）**；**不在** `commitOrDropResidue` 内（其 `:534` 执行早于 `executeToolCalls`，naive 化会误删正常 tool 轮次的 owner 消息——`engine-tool-loop.test.ts:53` 已防该变体）；裁定理由入档
- [x] Fix: 谓词扩展——新增 `isDanglingToolCallsMessage` / `cleanDanglingToolCalls` / `sanitizeDanglingToolCalls`（content-agnostic）并在三个清理面统一走 drop/strip 语义（空内容 drop，非空内容 strip `tool_calls`）；`isVacuousAssistantResidue` 保持既有语义（不合并）
- [x] Fix: `buildContext` 尾部排除 + autoSave strip 谓词同源覆盖 dangling 形状（`create-engine.ts:579-583` + `use-conversation.ts:202-209` saveMessages 臂）
- [x] Fix: 门禁 ⑩ 扩展——`engine-invariants-i4.test.ts` / `conversation-invariants-i4.test.ts` 参数化表新增 dangling-tool_calls 成员（abort-in-window / tool-no-executor / abort-mid-executor 后续轮 / 载荷臂 / autoSave 臂 / 交错文本 strip 臂）；修复前 RED 实证（6 用例全红）→ 修复后全绿（套件保持全绿）
- [x] Fix: 类别清扫——engine 全部"产物提交/排除"路径核对（commitOrDropResidue 调用点 :453/:534/:551 + runTurn abort 返回 :317-320 + buildContext 排除谓词 + autoSave 臂），清扫记录入档

Exit Criteria:

- [x] P1-2 五条 RED 测试全部转 GREEN（abort-in-window / tool-no-executor / 载荷+autoSave 臂 / 交错文本 strip 臂 / abort-mid-executor 后续轮臂断言全绿）
- [x] 门禁 ⑩ 新增 dangling-tool_calls 成员 live 零命中（vitest 门禁命令：`pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants-i4.test.ts src/adapters/__tests__/conversation-invariants-i4.test.ts`；⑩ 为运行时门禁，不静态化）
- [x] 类别清扫记录入档

### Phase 3 — clearAll 幽灵面修复（P1-3 + P1-4）+ 不变式 ④ 扩展

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants*.test.ts`、`src/adapters/__tests__/use-conversation-clear-all.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（P1-3 逐出会话在途 autoSave）——switch 逐出会话 A 后 A 的 autoSave 在途 → clearAll → 断言 storage 清空后**无** A 的迟到 save 落盘（settlement 后 storage 记录为空）；修复前 RED
- [x] Proof: RED 回归测试（P1-4 未打开会话）——storage 预置 3 会话 → bootstrap（仅 active 建 engine）→ 不 switch 直接 clearAll → 断言 storage 记录清空、remount 列表为空；修复前 RED
- [x] Fix: `clearAll` 的 `ids` 枚举源改为 `[...new Set([...engineCache.keys(), ...pendingSavesRef.current.keys(), ...conversationsRef.current.map(c => c.id)])]`（list mirror = 完整 storage 会话集）；drain 与 per-id fallback 同源
- [x] Fix: `saveMessages` settlement-time mirror 再检查（`:225-232`）——settle 时若会话已不在 `conversationsRef` / `listClearedRef` 则跳过落盘（与 create `:411-413` / rename `:565-567` 语义对齐）
- [x] Fix: 门禁 ④ 扩展——`conversation-invariants-i4.test.ts` 参数化表新增 fan-out 源成员（逐出会话在途 autoSave × clearAll / 未打开会话 × clearAll）；静态扫描器新增 `scanClearAllFanOutSource` 规则（clearAll 函数体必须含 `conversationsRef.current.map(` 枚举，④ fan-out 源静态可检，入 `check:ai-engine-invariants`）+ committed 回归 fixtures ×2
- [x] Fix: 类别清扫——storage 写入面全部路径核对（create/rename/delete/switch/clearAll × saveConversation/saveMessages/deleteConversation/clearAll），清扫记录入档

Exit Criteria:

- [x] P1-3 / P1-4 RED 测试全部转 GREEN
- [x] 门禁 ④ 新成员 live 零命中（运行时参数化成员：vitest 门禁命令 `conversation-invariants*.test.ts`；新静态规则：`pnpm check:ai-engine-invariants` exit 0）
- [x] 类别清扫记录入档

### Phase 4 — 请求载荷卫生（P1-5）+ plugin ctx 写隔离（open P1-1）+ 不变式 ⑪

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/engine/__tests__/engine-invariants*.test.ts`、`src/engine/__tests__/plugins.test.ts`、`apps/playground/src/ai/openai-connector.ts`（如需）

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（P1-5 载荷卫生）——消息含 `state.editing.draft` / `state.toolCall` / `metadata.toolError` → 断言连接器收到的 `request.messages` 各消息**不含** `state` 与内部 `metadata`（白名单 `{id, role, content, tool_calls, ...}`）；修复前 RED
- [x] Proof: RED 回归测试（open P1-1 plugin ctx 隔离）——plugin `onTurnStart` 内执行 `ctx.request.messages.push({role:'system',...})` → 断言 push 后 `engine.getState().messages` 长度**不变**（live 数组未被污染）；修复前 RED
- [x] Fix: `buildContext` 无条件浅拷贝 `requestMessages`（`allMessages.slice()`，深拷贝 per-plugin 过度）；`MessageEngineContext` 的 `state` / `request.messages` 字段文档化为 read-only
- [x] Fix: 载荷白名单化——连接器边界剥离 `state` 与内部 `metadata`（wire 类型排除或序列化前过滤；裁定点：剥离发生在 `buildContext` 还是 `src/adapters/ai-connector-factory.ts:42-53` 归一化层，选择与既有 `createStreamBasedAiConnector` 结构一致处）
- [x] Decision: 记录载荷白名单裁定（`AiConnectorRequest.messages` 字段白名单 + `state` 从 wire 类型排除）供 Phase 5 写入 engine.md
- [x] Fix: 门禁 ⑪（新族）——`engine-invariants.test.ts` 参数化成员：hook 内 `ctx.request.messages !== engine.getState().messages`（onTurnStart / onTurnEnd / onBeforeRequest / onAfterRequest / onCompletionChunk 五 hook 穷举）；`it.fails` 落库 → 修复后翻转 `it`；`gates.md` 登记 ⑪（棘轮只增不减）
- [x] Fix: 类别清扫——engine 全部"引用隔离面"核对（`getMessages` O-2 / projection 克隆 / K-⑩ 快照面 / plugin ctx 面），清扫记录入档

Exit Criteria:

- [x] P1-5 / open P1-1 RED 测试全部转 GREEN
- [x] 门禁 ⑪ 落地 + ⑩ dangling 成员 live 零命中（⑪ 为运行时门禁：vitest 命令 `pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants.test.ts`；静态可检新增规则（如适用）由 `pnpm check:ai-engine-invariants` exit 0 覆盖）
- [x] 类别清扫记录入档（引用隔离面核对结论）

### Phase 4 裁定 + 类别清扫记录（引用隔离面）

**载荷白名单裁定（Decision，2026-08-10）**：剥离发生在 **`buildContext`（engine 边界）**——`AiConnectorRequest.messages` 是 wire 白名单投影（`projectWireMessage`，`engine/utils.ts`）：保留 `{id, role, content, reasoning_content, tool_calls, tool_call_id, name}` + 良性 metadata（createdAt/model/finishReason/host 字段），排除渲染器私有 `state`（editing 草稿 / toolCall UI / thinking，design.md §11.5「不投影」）与内部工具执行 metadata（`toolError`——Error 带 stack / `toolStatus`）。**理由**：engine 是唯一知道哪些字段是域内部的层（§11.5）；`ai-connector-factory` 是通用 chunk 映射 helper，无 engine 内部语义知识；若在 connector 归一化层剥离，每个 connector（含自定义实现与 playground `openai-connector.ts` 的 `req.messages` 直传）都要重复实现白名单 → 漏一处即泄漏。engine 边界剥离使**全部 connector 按契约收到干净载荷**。`state` 从 wire 类型排除按「行为修正」落地（序列化前过滤），不改 `ChatMessage` 类型签名（`state` 仍是引擎内部消息形状，`getMessages()` 仍返回带 state 的完整消息——渲染层需要）。

**open P1-1 隔离实现**：`buildContext` 的 `sanitizeDanglingToolCalls(...).map(projectWireMessage)` 无条件产出**新数组 + 新元素对象**（非别名）——`ctx.request.messages !== engine.getState().messages` 在全部五个 hook 成立（onTurnStart/onTurnEnd 修复前为 live 数组 RED；onBeforeRequest/onAfterRequest/onCompletionChunk 修复前因 placeholder 已 push 天然为 slice 副本——审计已注明此陷阱在文档推荐的两个 hook）。`MessageEngineContext.state`/`request.messages` 在 `engine/types.ts` 文档化为 **read-only**（插件只能塑造出站请求，不能写穿 engine 历史）。

**门禁 ⑪ 落地面**：新增 `src/engine/__tests__/engine-invariants-p1.test.ts`（对齐 `engine-invariants-i4.test.ts` 拆分先例——`engine-invariants.test.ts` 612 行已超 500 WARN 线，追加会越过 700 ERROR 线）——参数化 5 hook 穷举（`ctx.request.messages !== engine.getState().messages` + push 注入不写穿历史）+ 载荷元素隔离（host 原地改 payload 消息不写穿）+ P1-5 白名单双用例（state/toolError/toolStatus 剥离 + 白名单字段保留 + payload 非别名）。RED→GREEN 实证：修复前 5 failed / 3 passed（`onTurnStart`/`onTurnEnd` + 载荷两臂 + 元素隔离 RED；placeholder 三 hook 天然副本 GREEN），修复后 8/8 全绿。⑪ 为运行时门禁**不静态化**（数组隔离为行为面，静态误报高——沿用 ⑦⑨⑩ 裁定）。

**类别清扫记录（引用隔离面，engine 全部"对外给出引用"路径核对）**：

| 面                                    | 位置                                            | 隔离形态                                                            | 结论                                                     |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| `getMessages()`（O-2）                | `create-engine.ts:135-147`                      | 新数组 + per-message 浅拷贝（嵌套对象共享，文档化只读）             | 既有 ✓                                                   |
| `buildContext` 请求投影（⑪）          | `create-engine.ts:618-621`                      | sanitize+map → 新数组 + 新元素对象                                  | 本次修复 ✓                                               |
| plugin ctx（⑪）                       | 同 buildContext                                 | 同投影                                                              | 本次修复 ✓                                               |
| autoSave 快照（K-⑩-3）                | `use-conversation.ts:209-226`                   | `getMessages()` 拷贝 + `pop()` + `sanitizeDanglingToolCalls` 新数组 | 既有 ✓（P1-2 同源谓词覆盖）                              |
| `onResponseComplete` payload          | `ai-chat.tsx:283-288`                           | `cloneMessage(last)`（AI-09）                                       | 既有 ✓                                                   |
| engine 内部写入                       | 全部 `adapter.mutate` recipe                    | fresh refs（snapshot identity 契约）                                | 既有 ✓                                                   |
| renderer 视图（useSyncExternalStore） | `use-engine-view.ts:50` / `react-adapter.ts:50` | 订阅快照，渲染层只读契约                                            | 既有 ✓（渲染器侧投影克隆属 P2-5/P2-14 面，out-of-scope） |

零遗漏同类兄弟（渲染器侧 `cloneMessages`/`cloneMessage` 面属 renderer 族 P2，plan `2026-08-10-1301-2` + Follow-up Backlog 登记）。

### Phase 5 — 登记处同步 + 收口

Status: completed
Targets: `docs/components/flux-renderers-ai/engine.md`、`docs/audits/ai-invariants/invariant-catalog.md`、`docs/audits/ai-invariants/gates.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] Fix: `engine.md` §8.3 plugin 表格补 read-only 注记（`MessageEngineContext.request.messages` / `state` 只读，注入 system prompt 改走 `systemPrompt` 选项）；§Invariants 补 ⑪ + ⑩ dangling 成员 + 失败轮产物清理谓词扩展；§8.5/§9.5 接口清单如涉及载荷字段同步核对
- [x] Fix: `invariant-catalog.md` 追加 ⑪ 条目（陈述/覆盖失败族/检测方法/门禁）与 ⑩ 扩展成员；`gates.md` 门禁清单追加 ⑪（单调棘轮）
- [x] Fix: bug notes 131+（P1-1/P1-2 合并族 + P1-3/P1-4 合并族 + P1-5/open P1-1 族，按 guide：触发/根因/修复/类别清扫范围/回归测试）
- [x] Proof: AI 包全量测试 + `check:ai-engine-invariants` live 复跑 exit 0 + `pnpm typecheck/lint`（AI 包）
- [x] Follow-up: daily log `docs/logs/2026/08-10.md` 记录本 plan 收口（含 full-green 口径 if applicable）

Exit Criteria:

- [x] engine.md / invariant-catalog.md / gates.md / bug notes 全部同步到位（live 核对一致）
- [x] AI 包测试全绿零回归；`check:ai-engine-invariants` exit 0 零命中
- [x] daily log 收口记录落档

### Phase 5 收口注记

- **`check:oversized-code-files` 强制收口（Closure Gate「pnpm check 零新增命中」）**：Phase 1-3 新增守卫代码把 `create-engine.ts`（712 行）与 `use-conversation.ts`（701 行）推过 700 ERROR 线——按 AGENTS.md「split/register it before finishing」与仓库抽取先例（tool-execution.ts/branching.ts）**模块抽取而非豁免登记**：`buildContext` → `engine/build-context.ts`（纯工厂，create-engine 712→690）；`attachAutoSave` → `adapters/use-conversation-autosave.ts`（AutoSaveDeps 注入，use-conversation 701→644）。公共 API 签名零变化；静态扫描器 TARGET_FILES 扩面覆盖两个新文件（④ storage 调用面不缩水），`check:ai-engine-invariants` 复跑 exit 0；`test:scripts` 43/43 全绿。
- **§8.5/§9.5 核对结论**：接口清单面（UseMessageOptions/UseConversationOptions）不涉及载荷字段（白名单改的是 `AiConnectorRequest.messages` 行为，注记落 §9.2）；§8.1/§8.5/§8.6 的接口清单过期属 P2-10/11/12（Follow-up Backlog），不在本 plan 面。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_015ef8b03ffeQylWon2526vG1W`，复用同会话迭代 3 轮）
- Verdict: `pass-with-minors`（达成共识：零 Blocker / 零 Major；Minor 已就地修复或记录）
- Rounds: 3
- Findings addressed:
  - Round 1 Major-1（dangling-tool_calls 谓词必须 content-agnostic + strip/drop 策略）→ 已修（Phase 2 加第 4 Proof + Decision 裁定 + Goals/Failure Paths 同步）
  - Round 2 Major-2（abort-mid-executor 悬空 assistant 逃逸全部清理面——runTurn `:317-320` 兜底面）→ 已修（Phase 2 加第 5 Proof + Decision 三清理面 + 清扫面 + 门禁成员）
  - Round 1 Minor-1/2/4、Round 2 Minor-3/5、Round 3 Minor-1/2（评估点钉定、commit 保留语义、vitest 门禁命令引用、路径前缀、Goals 措辞、部分配对边界、saveMessages 行号）→ 已就地修复或记录

## Closure Gates

- [x] 6 条 P1（P1-1/P1-2/P1-3/P1-4/P1-5 + open P1-1）全部修复落地（test-first RED→GREEN 证据在案）
- [x] 门禁扩展（⑩ dangling 成员 + ⑪ 新族 + ④ fan-out 源成员）live 零命中
- [x] 请求载荷白名单化行为达成（wire 上无内部 state / metadata）
- [x] 类别清扫记录入档（tool-execution commit 面 / 产物提交排除面 / storage 写入面 / 引用隔离面）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（engine.md / invariant-catalog.md / gates.md / bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P2 全量（26 条，两审计）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全部为 P2（非阻断 polish / 文档腐化 / 残余清理），已按 mission-driver 规则入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（带源审计路径），不阻塞本 plan 的 6 条 P1 收口
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-1301 填充节）。
- P3/观察项（tiptap 聚焦丢弃、ChatToolCallUIState.result 孤儿字段等）保持在源审计记录中，不派生工作项。

## Closure

Status Note: 6 条 P1 全部修复落地（test-first RED→GREEN 证据在案：P1-1/P1-2 五条 RED + P1-3/P1-4 两条 RED + P1-5/open P1-1 五条 RED（本执行轮临时移除投影实证 5 failed/3 passed）→ 全 GREEN）；门禁扩展（⑩ dangling 成员 6 + ⑪ 新族 8 + ④ fan-out 源成员 2）live 零命中（`check:ai-engine-invariants` exit 0）；AI 包 70 files/591 tests 全绿；全仓 typecheck/build/lint 37/37 ×3 + `pnpm test` 66/66 tasks；`pnpm check` 仅既有登记红零新增（audit-event-dispatch-ctx 6 条 industrial + oversized 2 条 exempt locale——本 plan Phase 1-3 推过线的 create-engine.ts/use-conversation.ts 已模块抽取回 690/644，未豁免登记）；`test:scripts` 43/43；`check:docs-garbled` 零新增。2026-08-10 收口。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（task `ses_015b7e155ffe32USucC3s7pav2`）
- Evidence: verdict **approved**（零 Blocker / 零 Major / 3 Minor 非阻塞——① use-conversation 行数 645→644 off-by-one 已就地修正；② turbo 缓存 64/66 为既有成功结果、变更包 AI 已 fresh 全绿，非阻塞；③ Closure Audit Evidence 字段留待审计后回填——即本节）。G1-G8 全 PASS：零未勾选 item / 状态与 spot-check 真实 / 命令复跑 70 files-591 tests + check:ai-engine-invariants exit 0 + typecheck/build/lint 37/37 + test:scripts 43/43 + oversized 仅 2 exempt locale / 无静默降级 / docs 五处同步 / item 7 由本审计方确认 / 公共 API 零签名变更 / oversized 收口成立。

Follow-up:

- no remaining plan-owned work。Non-blocking：renderer 族 P1（P1-6/7/8/9）由 plan `2026-08-10-1301-2` 独立 closure surface 跟踪；26 条 P2 已在 roadmap Follow-up Backlog 登记（带源审计路径）。

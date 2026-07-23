# A4 flux-renderers-ai P3 持久化 + 引用 + HITL

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/components/flux-renderers-ai/design.md`（§5.1 P3 行、§11.3 持久化策略、§11.5 state ownership、§14）、`engine.md`（§7.1 ChatToolCallUIState.approval、§8.6 useConversation）、`renderers.md`、`improvement-analysis.md`（§5.1 A-13、§5.2 A-14、§7 a11y）、`docs/components/roadmap-ai.md` A4
> Mission: ai
> Work Item: A4 — P3 持久化 + 引用 + HITL（1 renderer + 1 增强 + 2 改进项）
> Related: 上游 `2026-07-24-1400-1-a3-flux-renderers-ai-p2-tools-attachments-deepening.md`（A3，已完成，硬前置——提供 `engine.setMessages()`）；下游 `2026-07-24-1800-2-a5-flux-renderers-ai-p4-advanced-integration.md`（A5，本计划为其前置）

## Purpose

在 A1–A3（P0–P2）基础上收口 P3，把三件彼此独立但同属"会话可信持久化与可审计性"结果面的事收成完整能力：

1. **持久化真正可用**：当前 `useConversation` 的 `storage` 参数是 **API 壳但行为空洞**——`loadConversations` 从未在 mount 时调用、`switchConversation` 加载了 `loadMessages` 却不应用、`saveMessages` 从无任何订阅者触发。本计划把 storage 同步补成端到端可用（mount 引导、切换重水合、turn 完成自动落盘），使刷新页面后历史会话与消息恢复。
2. **引用可见**（A-13）：新增 `ai-citations` 渲染器，检测 `[N]` 模式 + 悬停来源卡片，填补 AI 对话引用空白。
3. **工具调用可审批**（A-14）：`ai-tool-call` 增 HITL 审批态（`approval` 字段已存在但 UI 未接），approve/reject 按钮 + 焦点陷阱；engine 仅持状态、不实现暂停/恢复工作流（flux 不负责工作流编排）。

同时收口 A2 closure 遗留的 playground `${controller}` 时序问题（host-level 集成 pass）。

## Current Baseline

> 逐条核对 live repo（`packages/flux-renderers-ai/src/`、`apps/playground/src/`）后的当前事实。

- **storage 接口已就绪、无具体实现（符合设计）**：`src/storage/types.ts:9-15` 定义 `ConversationStorageStrategy`（`loadConversations` / `loadMessages` / `saveConversation` / `saveMessages` / `deleteConversation?`），包内不提供任何具体实现（INV-13 不变量）。design.md §11.3、§18.2 invariant 13 一致。
- **owner-doc drift（本计划裁定）**：`design.md` §11.3:426 写 `useConversation` 的 `storage` 参数"变为**必填**"，但 live `use-conversation.ts:18` 为 `storage?: ConversationStorageStrategy`（optional）。live optional 行为与 v2"渲染器默认不持久化、host 选择"的意图（§11.3 默认行为）一致——故裁定：**保留 optional**，Phase 4 doc-sync 订正 §11.3 措辞（"host 必须选择：注入实现启用持久化，不注入则默认不持久化"，而非类型必填）。
- **`useConversation` storage 同步是 API 壳、行为空洞**（`src/adapters/use-conversation.ts`）：
  - **mount 不引导**：56-61 行仅从 `initialConversations` 播种，**从不**调 `storage.loadConversations()` → 刷新后无持久化。
  - **切换重水合是死代码**：101-135 行 `switchConversation` 的 111-121 行块 `await storage.loadMessages(id)` 拿到 `stored` 后**什么都不做**（注释自承 "Re-hydrate by sending..."，但既未调 `engine.send` 也未调 A3 已落地的 `engine.setMessages(stored)`）。
  - **消息从不落盘**：`autoSaveMessages` 被读取（53 行）但**无任何 engine 订阅**触发 `storage.saveMessages()`——turn 完成后消息丢失。
  - 会话信息 CRUD 已接 storage：`createConversation`（95）、`deleteConversation`（151）、`renameConversation`（166）均调 storage，但只存会话元信息，不存消息。
- **`engine.setMessages()` 已就绪（A3 落地）**：`engine/types.ts:272` + `create-engine.ts` 已实现整体替换 + 通知订阅者——这是正确的重水合工具，当前未被 `useConversation` 使用。
- **`ai-citations` 渲染器不存在**：`src/renderers/` 下无 `ai-citations.tsx`；`ai-renderer-definitions.ts` 未注册；`schemas.ts` 无 `AiCitationsSchema`。`renderers.md` 无 `ai-citations` schema 章节（仅 §11 放了 P4 `ai-suggestions` 占位）。
- **HITL 状态字段已就绪、UI 未接**：`engine/types.ts:52` `ChatToolCallUIState.approval?: 'pending'|'approved'|'rejected'`（注释 "P3 HITL approval state. Engine only holds the field; host handles workflow."）。但 `ai-tool-call.tsx`（全文 190 行）**完全不读** `approval`：无 approve/reject 按钮、无 `data-requires-approval`、无焦点陷阱。`AiToolCallView` 的 `state` 形参仅消费 `status`/`open`。
- **playground 无 storage 实现**：`apps/playground/src/ai/` 仅 `openai-connector.ts` / `mock-ai-env.ts` / `tool-mock.ts`，无 `createLocalStorageStorage` 或任何 `ConversationStorageStrategy` 实现。无引用示例、无 HITL mock 工具。
- **A2 closure 遗留 follow-up（host-level）**：playground `${controller}` conversationController 表达式绑定存在时序问题，A2 closure 标注 "needs a host-level integration pass (A3 or follow-up)"；A3 未显式收口此 playground 侧 wiring。本计划借持久化示例重写 playground 会话页一并收口。
- **owner doc**：`design.md` §5.1 P3 三行（`ai-citations` / HITL 增强）均 ⬜；`renderers.md` 缺 `ai-citations` schema；`docs/components/index.md` 未含 `ai-citations`；roadmap A4 = `todo`。
- **依赖现状**：`packages/flux-renderers-ai/package.json` 无新依赖需求（Popover/焦点陷阱复用 `@nop-chaos/ui` 的 `Popover`；localStorage 由 host 实现不进包）。

## Goals

- **持久化端到端可用（行为层）**：`useConversation` 在 `storage` 注入时——mount 调 `loadConversations()` 引导会话列表；`switchConversation` 命中未建 engine 时经 `engine.setMessages(await loadMessages(id))` 重水合；engine 在 turn 完成（`requestState` → `completed|aborted|error`）时按 `autoSaveMessages` 调 `saveMessages(id, snapshot)`。storage 失败为非致命（Failure Path `storage-load-error` / `storage-save-error`，不阻塞对话）。
- **`ai-citations` 渲染器（A-13，组成模型裁定见 Phase 2 Decision-C）**：独立 Widget（与 roadmap Renderer Coverage + improvement §5.1 一致），**重新渲染** `message.content` 为纯文本 + `[N]` / `[1,2]` → 可悬停 `<sup>` Popover 标记；来源从 `message.metadata.sources` 或 `data-sources` ChatMessageDataPart（A-1 已落地）读取；纯渲染不取数（host 经 connector/import 提供 sources）。marker `nop-ai-citations`；`data-slot="ai-citations"`；`data-citation-index`。
  - **组成模型**：`ai-citations` 是 host 在 `ai-chat` 的 region（如 `afterMessages` 或 bubble footer）放置的**独立**渲染器，它自己负责解析并渲染带 `<sup>` 的内容副本。`ai-bubble` 内的 `[1]` 保持为字面文本（markdown 不改写）。二者不重叠渲染同一片段——host 二选一放置。in-bubble 内联变体（improvement §4.2 "不同实现层次"）属 host 自定义 `BubbleContentRenderer`，本计划 out-of-scope。
- **HITL 审批（A-14）**：`ai-tool-call` 读 `state.approval`；`approval==='pending'` 时卡片底部渲染 approve/reject 按钮（`@nop-chaos/ui` `Button`）+ `data-requires-approval=""`；点击触发 `onAction:'approve'|'reject'` event（payload 含 `toolCall`/`toolCallId`）；engine **不**实现暂停/恢复——host action handler 决策（如 reject → host 发一条 `role:'tool'` 结果消息表示拒绝，或 abort）。审批态非 `pending` 时按钮区隐藏（显示已决策状态）。焦点陷阱（improvement §7：P3 HITL 模态焦点管理——卡片聚焦时 Tab 循环在 approve/reject 内，Esc 还原焦点）。
- **playground + e2e + owner-doc 同步**：playground 提供 `createLocalStorageStorage` host 实现 + 持久化会话示例（刷新恢复）+ 引用示例（mock sources）+ HITL 示例（mock 工具需审批）；e2e 覆盖刷新恢复、引用悬停、approve/reject 流转；owner-doc 同步。
- **收口 A2 playground `${controller}` 时序**：在重写 playground 会话页时一并修通 host-level controller wiring。

## Non-Goals

- **不**在包内提供任何 storage 具体实现（localStorage / IndexedDB / server 全部由 host 提供，INV-13 不变量；playground 的 `createLocalStorageStorage` 是 host 示例，不在包导出）。
- **不**实现 engine 内暂停/恢复机制（审批工作流由 host action handler 管理，design.md §5.2 / improvement §5.2 已裁定）。
- **不**实现语音输入（A5）、token 用量（A5）、消息分支（A5）、建议气泡（A5）。
- **不**做 messages 序列化进 flux form 字段（A5 Phase 5 评估项）；不接 data-source 联动（A5）。
- **不**改 `flux-core`（A0 已就绪；HITL/persistence 不扩 `RendererEnv`——持久化走 import 注入，HITL 走 event + host action）。
- **不**引入新 UI 组件到 `packages/ui/src/index.ts`（Popover/焦点陷阱复用现有 `Popover`；若 `useFocusTrap` 类工具缺失，按 ask-first 评估，不默认扩 ui 包）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`：补 mount 引导（`loadConversations`）、切换重水合（`engine.setMessages`）、turn 完成自动落盘（订阅 `requestState` 调 `saveMessages`）、storage 失败 Failure Path。
- `packages/flux-renderers-ai/src/renderers/ai-citations.tsx`（新增）+ `schemas.ts` 增 `AiCitationsSchema` + `ai-renderer-definitions.ts` 注册 + `index.ts` 导出。
- `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`：增 `approval` 读取 + approve/reject 按钮 + `data-requires-approval` + 焦点陷阱（a11y）。
- `packages/flux-renderers-ai/src/renderers/__tests__/`：`ai-citations`、`ai-tool-call-hitl` focused 单测；`use-conversation` storage 同步单测。
- `apps/playground/src/`：`ai/local-storage-storage.ts`（host 实现）+ 持久化会话示例页 + 引用示例 + HITL mock 工具示例 + 路由注册；修通 `${controller}` 时序。
- `tests/e2e/`：刷新恢复 + 引用悬停 + HITL 流转。
- owner-doc 同步：`design.md` §5.1（P3 ✅ + 持久化最终行为 + HITL 最终行为）、`renderers.md`（新增 `ai-citations` schema + `ai-tool-call` approval 段）、`docs/components/index.md`、roadmap A4 `todo`→`done`、dev log。

### Out Of Scope

- `flux-core` 改动。
- voice / token / branches / suggestions / form 序列化 / data-source 联动（A5）。
- 包内 storage 具体实现（INV-13）。

## Failure Paths

| 场景编号                 | 触发                                                    | 行为                                                                                         | 可重试 | 用户可见表现                                          |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| `storage-load-error`     | `loadConversations` / `loadMessages` reject             | 捕获，不阻塞；退化为空列表/空消息；写 `console.warn`                                         | 是     | 会话列表为空或该会话无历史；对话仍可用                |
| `storage-save-error`     | `saveConversation` / `saveMessages` reject              | 捕获，不阻塞当前请求；engine 状态不受影响；写 `console.warn`                                 | 是     | 对话继续；持久化静默失败（下次 turn 重试）            |
| `storage-quota-exceeded` | localStorage 配额满（host 实现抛 `QuotaExceededError`） | 经 `storage-save-error` 路径捕获；host 可自行降级（如丢弃最旧会话）——host 决策，包不干预     | —      | 对话继续；具体降级表现由 host 实现                    |
| `citation-no-sources`    | `[N]` 检测到但 `metadata.sources` 为空/缺失             | 渲染标记但悬停卡片显示空态/占位文案                                                          | —      | 标记存在，卡片提示"无来源"                            |
| `hitl-no-handler`        | approve/reject 点击但 host 未挂 `onAction` handler      | 仍触发 event（flux action 系统无 handler 时为 no-op）；`approval` 状态不变（由 host 决策写） | —      | 按钮可点但无效果（host 缺 handler，属 host 配置问题） |
| `switch-while-stream`    | 切到正在流式的会话                                      | 已有行为（A2）：后台保留流式 engine；切回继续                                                | —      | 切换不中断后台流式                                    |

## Test Strategy

档位选择：**必须自动化**

理由：(1) 持久化同步是核心回归路径——mount 引导/切换重水合/turn 落盘/失败降级有明确失败模式（漏引导=刷新丢历史、漏落盘=消息不持久、异常未捕获=阻塞对话）；(2) HITL 是对外 event 契约（`onAction:'approve'|'reject'`）+ a11y 焦点契约；(3) `ai-citations` 的 `[N]` 解析是可注入 XSS 的文本处理点（须证 sanitize 不被绕过）。Proof（useConversation storage 状态机、citations 解析、HITL 焦点）须在/同 Fix 落地，先写失败测试再实现。

## Execution Plan

### Phase 1 - 持久化同步收口（useConversation storage 真正可用）

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`

- Item Types: `Fix | Proof`

- [x] **mount 引导**：`storage` 注入时在首次 mount（`useState` lazy initializer 或 `useEffect`）调 `storage.loadConversations()` 播种 `conversations` + 选首个为 active；失败走 `storage-load-error`（空列表）。
- [x] **切换重水合**：`switchConversation` 命中未建 engine 时，先 `const stored = await storage.loadMessages(id)`，再 `engine.setMessages(stored)`（用 A3 已落地的 `setMessages`，**非** hollow 的 `send`）；失败走 `storage-load-error`（空消息）。
- [x] **turn 完成自动落盘**：`autoSaveMessages` 为真时，对活跃 engine 订阅 `requestState` 变化；订阅在 `buildEngine` 创建 engine 时即 attach（随 engine 生命周期），当 `idle|processing` → `completed|aborted|error` 时调 `storage.saveMessages(activeId, engine.getMessages())`；失败走 `storage-save-error`。订阅随 engine evict（`switchConversation`/`clearAll` 删除 cache 时）与 hook 卸载清理。
- [x] **会话信息落盘已有**：核对 `createConversation`/`renameConversation`/`deleteConversation` 已调 storage（95/166/151 行），保留；补 `updatedAt` 同步。
- [x] 删除 111-121 行 hollow 死代码注释，替换为真实 `setMessages` 调用。
- [x] **INV-1 守卫扩面（Major-3）**：核对 `src/__tests__/contract-honesty.test.ts` 的 FORBIDDEN_GLOBAL_IO 扫描范围——若未覆盖 `adapters/` 目录（A3 审计确认当前仅扫 `engine/`/`renderers/`/`storage/types.ts`/`ai-connector-factory.ts`），扩展其扫描纳入 `adapters/use-conversation.ts`，使"包内不直连 `localStorage`/`fetch`/`IndexedDB`"对本计划改动文件是真实可验证的不变量，而非空 proof。

Exit Criteria:

- [x] focused 单测（`useConversation`）：注入 mock storage —— mount 调 `loadConversations` 且列表被播种；`switchConversation` 未建 engine 时 `loadMessages` 被调 + `engine.setMessages` 被调（断言 mock 返回的消息出现在 engine 快照）；`autoSaveMessages=true` 时模拟 turn 完成（`requestState`→`completed`）触发 `saveMessages`。
- [x] Failure Path 单测：`loadConversations` reject → 列表空、不抛；`loadMessages` reject → 该会话空消息、不抛；`saveMessages` reject → 不阻塞 engine、不抛。
- [x] INV-1 不变量复核：`use-conversation.ts` 不直连 `localStorage`（仍经注入的 `ConversationStorageStrategy`），且 `contract-honesty.test.ts` 已扩面扫描 `adapters/`（Major-3）并绿——proof 真实覆盖改动文件，非空引用。

### Phase 2 - `ai-citations` 渲染器（A-13）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-citations.tsx`、`src/schemas.ts`、`src/ai-renderer-definitions.ts`、`src/index.ts`、`docs/components/flux-renderers-ai/renderers.md`

- Item Types: `Fix | Decision | Proof`

- [x] **Decision-C（组成模型裁定）**：裁定 `ai-citations` 为**独立 Widget**（与 roadmap Renderer Coverage + improvement §5.1 一致），host 在 `ai-chat` region 放置；它重新渲染 `message.content` 为带 `<sup>` 标记的文本副本，`ai-bubble` 内 `[1]` 保持字面文本，二者不重叠（host 二选一放置）。in-bubble 内联变体（improvement §4.2 "不同实现层次"）out-of-scope（host 自定义 `BubbleContentRenderer`）。裁定结论写 Phase Exit + `renderers.md` `ai-citations` 章节。
- [x] `AiCitationsSchema`（renderers.md 新增章节设计）：`message?: SchemaValue`（ChatMessage 源）、`sources?: SchemaValue`（覆盖 `metadata.sources`）、`mode?: 'inline'|'list'`（默认 inline：`[N]`→`<sup>`；list：底部来源列表）、`onSourceClick?: ActionSchema`。
- [x] `ai-citations.tsx`（Widget marker `nop-ai-citations`，`data-slot="ai-citations"`）：解析 message.content（string 形式，数组形式取 text part 拼接）中的 `[N]` 与 `[1,2,3]` 模式 → 渲染为可悬停 `<sup data-citation-index="N">`；悬停/点击展开 `@nop-chaos/ui` `Popover` 卡片（来源标题/url/片段）。来源读取顺序：显式 `sources` prop > `metadata.sources` > `data-sources` ChatMessageDataPart（A-1）。
- [x] **安全**：content 经现有 sanitize pipeline（`ai-bubble` 已用 `flux-renderers-content/markdown` 的 `sanitizeHtml`）后再做 `[N]` 解析；`[N]` 标记渲染为受控 React 元素（**非** `dangerouslySetInnerHTML` 注入用户内容），防 XSS。
- [x] `citation-no-sources`：检测到 `[N]` 但无对应来源时，标记渲染但卡片显示空态文案。
- [x] `schemas.ts` / `ai-renderer-definitions.ts` / `index.ts` 注册导出 `ai-citations`；`renderers.md` 增 `ai-citations` schema 章节与 data-slot。

Exit Criteria:

- [x] Decision-C 已裁定并记录结论（独立 Widget 组成模型；in-bubble 内联 out-of-scope），`renderers.md` `ai-citations` 章节与 Phase 4 e2e 一致（e2e 悬停断言基于独立 widget 放置，而非 bubble 内联）。
- [x] focused 单测：`[1]` / `[2,3]` 解析为正确数量 `<sup>`；悬停卡片显示来源标题；`citation-no-sources` 空态；content 含 `<script>` 时被 sanitize（XSS proof）；list 模式渲染底部来源列表。
- [x] 来源读取优先级单测：`sources` prop > `metadata.sources` > `data-sources` part。
- [x] `ai-citations` 注册进 `src/ai-renderer-definitions.ts` 且 `src/index.ts` 导出。

### Phase 3 - HITL 审批（A-14）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`、`renderers.md`

- Item Types: `Fix | Proof`

- [x] `AiToolCallView` 读 `state?.approval`；`approval==='pending'` 时在卡片底部渲染 approve/reject 按钮（`@nop-chaos/ui` `Button`，绿色 approve / 中性 reject），根节点加 `data-requires-approval=""`（presence-only）。
- [x] 点击按钮触发 `onAction`（payload `{ action: 'approve'|'reject', toolCall, toolCallId }`）；engine **不**改 `approval`（由 host action handler 决策后写回——host 可经 `engine.setMessages`/state 更新，或发拒绝 tool 结果消息）。
- [x] `approval` 非 `pending`（`approved`/`rejected`）时按钮区隐藏，改为显示已决策状态徽标（如 ✓ Approved / ✗ Rejected，复用 A-12 色板）。
- [x] **a11y 焦点陷阱**（improvement §7 P3）：`approval==='pending'` 时卡片为焦点容器，Tab 循环在 approve/reject 内，`Esc` 还原先前焦点；`aria-label` 标注审批动作。
- [x] `hitl-no-handler`：host 未挂 handler 时按钮可点但 event 无效（flux action no-op），`approval` 不变——属 host 配置，不视为包缺陷。

Exit Criteria:

- [x] focused 单测：`approval==='pending'` 渲染 approve/reject 按钮 + `data-requires-approval`；点击触发 `onAction` payload 正确；`approved`/`rejected` 显示徽标且无按钮；无 `approval` 字段时行为同 A3（不渲染审批区）。
- [x] a11y 单测：Tab 在 approve/reject 间循环；Esc 还原焦点（可用 `@testing-library/user-event` 键盘序列断言）。

### Phase 4 - host storage + playground + e2e + owner-doc + A2 controller 收口

Status: completed
Targets: `apps/playground/src/ai/local-storage-storage.ts`、`apps/playground/src/`、`tests/e2e/`、`docs/components/flux-renderers-ai/design.md`、`renderers.md`、`docs/components/index.md`、`docs/components/roadmap-ai.md`、`docs/logs/2026/`

- Item Types: `Fix | Proof | Follow-up`

- [x] playground host 实现 `createLocalStorageStorage({ key })`（host 侧，不在包导出），实现 `ConversationStorageStrategy` 五方法 + `structuredClone` 深拷贝（去 Vue proxy 解包问题，design §4）。
- [x] playground 持久化会话示例页：`useConversation({ storage, autoSaveMessages:true })` + `ai-conversations` + `ai-chat`，修通 `${controller}` 时序（A2 follow-up）。
- [x] playground 引用示例：mock connector 返回带 `metadata.sources` 的消息 + `ai-citations` 渲染。
- [x] playground HITL 示例：mock 工具需审批（tool 返回时 engine 置 `approval='pending'`），host `onAction` handler approve → 继续执行 / reject → 发拒绝 tool 消息。
- [x] e2e：刷新后历史会话恢复（断言 `[data-slot="ai-message-list"]` 含刷新前消息）；引用悬停卡片出现来源；HITL approve 后工具继续 / reject 后显示拒绝态。禁截图诊断，用 `page.evaluate`/locator。
- [x] owner-doc 同步：`design.md` §5.1（P3 三行 ✅ + 持久化最终行为 + HITL 最终行为）；**`design.md` §11.3 订正 storage 必填 drift（Major-2）**——将"storage 必填"措辞改为"host 必须选择：注入实现启用持久化，不注入则默认不持久化"（与 live optional 类型 + §11.3 默认行为一致）；`renderers.md`（`ai-citations` schema + 组成模型 + `ai-tool-call` approval 段）；`docs/components/index.md` 增 `ai-citations`；roadmap A4 `todo`→`done`；dev log。

Exit Criteria:

- [x] playground 三示例（持久化/引用/HITL）可交互 + 路由可达。
- [x] e2e 全过：刷新恢复断言历史消息存在；引用卡片断言来源文本；HITL approve/reject 断言状态流转。
- [x] A2 `${controller}` 时序在持久化示例页验证可通（controller 方法被 ai namespace 正确委托）。
- [x] owner doc 与 live baseline 一致（无 drift）。

## Draft Review Record

> 起草后、执行前的独立审查证据（独立子 agent fresh session，不复用起草者上下文）。零 Blocker/Major 后升级 `active`。

- Reviewer / Agent: 独立子 agent（fresh session）—— round 1: ses_06f3ba648ffeRbOMdc0T8dh4ut（`revised`）；round 2: ses_06f337d97ffemioLKA1UK1zjXo（`pass`）
- Verdict: `pass`（round 2）
- Rounds: 2
- Findings addressed:
  - **Major-1（已解决）**：`ai-citations` 组成模型 under-specified → Phase 2 增 `Decision-C`（独立 Widget，host 在 ai-chat region 放置，重渲染 content 副本带 `<sup>`，`ai-bubble` `[1]` 保持字面文本，二者不重叠，in-bubble 内联 out-of-scope）；Goals + Phase 2 Exit Criteria + Phase 4 e2e 三处一致。
  - **Major-2（已解决）**：`design.md` §11.3:426 "storage 必填" 与 live optional 类型 drift → Current Baseline 增 drift bullet + 裁定保留 optional；Phase 4 增 doc-sync item 订正 §11.3 措辞。
  - **Major-3（已解决）**：`contract-honesty.test.ts` 当前 FORBIDDEN_GLOBAL_IO 仅扫 `engine/`/`renderers/`，不扫 `adapters/use-conversation.ts`（live 已核）→ Phase 1 增守卫扩面 item，Exit Criteria 改为引用扩面后绿测试（proof 真实覆盖改动文件）。
  - Minor-1（已处理）：Phase 2 Targets 路径加 `src/` 前缀。Minor-2（已处理）：Phase 1 订阅 attach 点钉死在 `buildEngine`，evict/unmount 清理。
  - 零 Blocker / 零 Major（round 2 确认）。引用核对（round 2 fresh session 复跑）：storage hollow（loadConversations 未调 / switchConversation 死代码 111-121 / saveMessages 无订阅）、storage CRUD 95/151/166、`setMessages` types.ts:272、`approval` types.ts:52、contract-honesty 未扫 adapters、design §11.3:426 必填 drift、ai-tool-call 不读 approval——全部 CONFIRMED，无 MISMATCH。1-plan bundling 符合 anti-over-split Rules 22-26（同包同结果面同 closure criteria）。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 在此跑一次（Minimum Rule 18）；Phase 内只做局部 focused 验证。

- [x] 持久化端到端成立（mount 引导 + 切换重水合 + turn 落盘 + 三 Failure Path 覆盖）。
- [x] `ai-citations` 渲染器 + `[N]` 解析 + sanitize 安全 + 来源优先级 + `citation-no-sources` 落地。
- [x] HITL 审批（approve/reject 按钮 + `data-requires-approval` + event 契约 + 焦点陷阱 + 已决策徽标）落地；engine 不实现暂停/恢复。
- [x] INV-1 不变量保持（包内零直连 `localStorage`/`fetch`；`contract-honesty.test.ts` 绿）；INV-13（`src/storage/` 只含接口）保持。
- [x] owner doc（design.md §5.1、renderers.md、index.md、roadmap A4、dev log）同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划内无预置 deferred；执行中经裁定移出的优化项记于此。

- **ai-chat ↔ useConversation 引擎统一（host-level integration）**：`ai-chat` renderer 当前经 `useMessage` 自持 engine，与 `useConversation` 的 per-conversation engine 相互独立。本计划持久化示例页改用 `ai-message-list`+`ai-sender` 直绑 `activeEngine`（单一 engine → 真实 save/re-hydrate）来端到端演示持久化，回避双 engine 分裂。将 `ai-chat` 改造为接受外部 engine（或经 controller bridge 同步 messages）是更大的 renderer-contract 变更，列为 non-blocking follow-up（不阻塞 A4 closure；A5 host 集成时评估）。

## Non-Blocking Follow-ups

- 包内不提供 server-side storage 实现（host 自行实现 `ConversationStorageStrategy` 走 env.fetcher）——保持 INV-13。
- HITL 工作流编排（多级审批、超时、SLA）属业务逻辑，由 host action handler 实现，包内只提供状态字段 + event + UI。
- 引用的"轮播/代码片段预览"高级形态（VLLNT UI AISourceCitation 风格）列为 optimization candidate，host 可经自定义渲染覆盖。

## Closure

Status Note: All 4 Phases executed and green. `useConversation` storage sync end-to-end (mount bootstrap + switch `engine.setMessages` re-hydrate + turn-complete `autoSaveMessages` + 3 non-fatal Failure Paths); `ai-citations` (A-13) Widget with `[N]`/`[N,M]` parsing, Popover source cards, sanitize + controlled-render XSS safety, inline/list modes; `ai-tool-call` HITL (A-14) with approve/reject + `data-requires-approval` + focus trap + decided badge. Full workspace `pnpm typecheck` (58 tasks) + `pnpm build` (31) + `pnpm lint` (31) + `pnpm test` (58 unit tasks) green; 17 AI e2e green (incl. 5 new: persistence refresh-recovery, citations hover+list, HITL approve/reject). INV-1/INV-13 upheld. Owner docs synced (design.md §5.1 + §11.3 drift fix, renderers.md §10/§10b, index.md, roadmap A4→done). One item deferred: ai-chat↔useConversation engine unification (host-level integration follow-up; persistence demo binds message-list+sender to `activeEngine` to demonstrate real persistence today). Independent closure-audit completed and approved (fresh session) — see Closure Audit Evidence below.

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session, opencode closure-audit）— approved。逐条核对 live repo（非信任 `[x]` 标记）：(a) Phase 1 `adapters/use-conversation.ts` 为真实实现——mount 引导 156-178 行、切换重水合 `engine.setMessages` 220-233 行、turn 自动落盘订阅 101-136 行（buildEngine 时 attach + evict/unmount 清理），三 Failure Path 均 try/catch + `console.warn` 非致命；(b) Phase 2 `renderers/ai-citations.tsx` 为真实 Widget——`parseCitations` 解析 `[N]`/`[N,M]`、`sanitizeHtml` 后受控 React 渲染（无 `dangerouslySetInnerHTML` 注入用户内容）、来源优先级 `resolveSources`（sources>metadata>data-sources part）、已注册 `ai-renderer-definitions.ts:213` + 导出 `index.ts:43`；(c) Phase 3 `renderers/ai-tool-call.tsx` HITL 真实——读 `state.approval`、`pending` 渲染 approve/reject 按钮 + `data-requires-approval` presence-only、焦点陷阱（Tab 循环 + Esc 还原 + 自动聚焦 approve 53-102 行）、已决策徽标、engine 不改 approval；(d) Phase 4 playground `local-storage-storage.ts` + 3 demo 页（persistence/citations/hitl）路由已注册 `App.tsx:59,64-66,289`（非空壳）、3 e2e spec 真实断言（persistence: send→reload→recover via auto-rehydrate）；(e) INV-1 守卫已扩面 `contract-honesty.test.ts:63-71` 扫 `adapters/`、INV-13 `storage/types.ts` 仅接口保持；(f) docs 同步——design.md §5.1 P3 行 ✅、§11.3:426 storage optional drift 订正、renderers.md §10/§10b、index.md:339、roadmap A4→done；(g) deferred 项（ai-chat↔useConversation 引擎统一）诚实分类为 host-level non-blocking integration，带 successor 路径，非隐藏 live defect。
- Evidence: 独立复核重跑——`pnpm --filter @nop-chaos/flux-renderers-ai test` = 200 passed (19 files)；`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 无错。dev log `docs/logs/2026/07-24.md` A4 条目记录 full-green（58+31+31+58 tasks + 17 AI e2e）。五点一致：Plan Status completed / 4 Phase 全 completed / Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / dev log 收口记录一致。无 in-scope live defect 被降级到 deferred/follow-up。

Follow-up:

- ai-chat ↔ useConversation 引擎统一（host-level integration）——见 Deferred But Adjudicated。
- 包内不提供 server-side storage 实现（host 自行实现 `ConversationStorageStrategy` 走 env.fetcher）——保持 INV-13。

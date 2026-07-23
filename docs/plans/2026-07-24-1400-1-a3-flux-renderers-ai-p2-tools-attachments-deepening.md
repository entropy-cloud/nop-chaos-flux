# A3 flux-renderers-ai P2 工具调用 + 附件 + 渲染器深化

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/components/flux-renderers-ai/design.md`（§5.1、§10.3-10.4、§11.1 Layer C、§11.5、§14.3）、`engine.md` §8.3、`renderers.md` §9-§10、`improvement-analysis.md` §3.3-§3.5/§4.5-§4.7、`docs/components/roadmap-ai.md` A3
> Mission: ai
> Work Item: A3 — P2 工具调用 + 附件 + 渲染器深化（2 renderer + 7 改进项 + 消息编辑 + LaTeX 评估）
> Related: 上游 `2026-07-23-2143-3-a2-flux-renderers-ai-p1-conversations-markdown.md`（A2，已完成，硬前置）；下游 A4（P3 持久化 + 引用 + HITL，HITL 扩展本计划的 `ai-tool-call`）

## Purpose

在 A1/A2 的 P0/P1 基础上，收口 P2：把当前仅做"状态占位"的工具调用补成**端到端 agentic 闭环**（engine 执行工具 + `requestNext` 多轮 + 结果回显）；新增 `ai-attachments` 多模态附件渲染器；落地 Layer C ComponentHandle（跨组件命令式控制）；补齐 `ai-bubble` 缺失的 `tools`/`reasoning`/`image` content renderer；并完成 7 项组件级深化（A-6~A-12）+ 消息编辑 + LaTeX/Streamdown 评估。完成后 LLM 可调用工具并回显结果、图片可作为 `image_url` 发送、1000+ 消息性能不退化。

## Current Baseline

> 逐条核对 live repo（`packages/flux-renderers-ai/src/`）后的当前事实。

- **引擎工具循环未实现**：`src/engine/create-engine.ts` 的 `runTurn`（121-255 行）只做**单轮**请求——流式累积完成后直接置 `requestState='completed'`，**不**处理 `finish_reason:'tool_calls'`、**不**执行工具、**无 `requestNext`**。`MessageEngine` 接口（`engine/types.ts:229`）也无 `toolExecutor` / `tools` 注入口。`engine.md` §8.3 已规定 `toolPlugin` 应在 `onBeforeRequest` 聚合 tools、在 `onAfterRequest` 处理 tool_calls→执行→`requestNext()`，但代码未落地。
- **`tool-plugin.ts` 是 P0 占位**（46 行）：仅在 `onCompletionChunk`/`onAfterRequest` 把 `state.toolCall[id].status` 置 `running`→`success`，**无** `resolveTools`、**无** 工具执行、**无** failed/cancelled 分支。文件头注释自承"P0 only tracks status transitions; actual tool execution + follow-up requests is a P2/P3 concern and is intentionally NOT implemented here"。
- **类型已就绪**：`ChatToolCall`/`ChatToolCallFunction`/`ChatToolCallUIState`（含 P3 `approval` 字段）/`AiToolSchema`/`AiConnectorDeltaToolCall`/`AiConnectorRequest.tools` 均已在 `engine/types.ts` 定义；`RequestProcessingState` 已含 `'calling-tools'`（types.ts:99）；`combineDeltaData` 已支持按 `index` 合并流式 tool_calls（engine.md §8.4）。
- **`ai-tool-call` 渲染器不存在**：`src/renderers/` 下无 `ai-tool-call.tsx`；`ai-renderer-definitions.ts` 未注册；`renderers/__tests__` 无对应测试。
- **`ai-bubble` content renderer 缺三项**：`src/renderers/ai-bubble/renderers/default-renderers.ts`（1-48 行）仅注册 `loading`/`markdown`/`text`/`data-part`。`renderers.md` §3.3 规划的 `tools`（渲染 `tool_calls`→`<AiToolCallRenderer>` 列表）、`reasoning`（`reasoning_content` 可折叠面板）、`image`（`image_url` 网格）**均未实现**。`ai-bubble/index.tsx:50` 的 `isError` 硬编码 `false`（A-5 错误态实际未接 engine error）。
- **`ai-attachments` 渲染器不存在**；`AiAttachment`/`AiAttachmentsSchema` 类型未在 `schemas.ts` 定义（renderers.md §9 已设计）。
- **Layer C ComponentHandle 未注册**：`ai-chat.tsx` 仅做 Layer A（`AiChatProvider`）+ Layer B（`useNamespaceRegistration`，A2 落地）；**未**调 `runtime.componentRegistry?.register`。`design.md` §11.1/§14.3 规定 handle 暴露 `sendMessage`/`abort`/`clear`/`getMessages`/`setMessages`。
- **`useAutoScroll` 已导出但契约未最终化**：`src/adapters/use-auto-scroll.ts` 已被 `index.ts:72` 导出，但 A-9（公开为 host utility 的稳定契约 `scrollToBottom`/`isAtBottom` + `ai-message-list` 复用同一 hook）尚未完成；A2 显式 deferred 至 A3。
- **深化项全部未落地**：A-6（`BubbleToolRendererMatch` 按工具名注册）、A-7（Streamdown/core 适配，A2 deferred）、A-8（虚拟滚动）、A-9、A-10（推理持续时间）、A-11（流式光标）、A-12（工具状态颜色）、消息编辑（§4.7）、LaTeX/KaTeX 评估（§4.2）均未实现。
- **依赖未引入**：`packages/flux-renderers-ai/package.json` 无 `@tanstack/react-virtual`（工作区多包已用，content 用 `^3.11.0`、form/form-advanced/data/scheduling 用 `^3.13.24`，可加）、无 `jsonrepair`、无 `remark-math`/`rehype-katex`、无 `streamdown`。A-7/LaTeX 为 Decision 项。
- **A2 deferred 至本计划**：streamdown/core 适配（optimization candidate）、useAutoScroll 公开（A-9）、A-10/A-11/A-12、`ai-tool-call` 根 `aria-label`（roadmap 标 P1 a11y，随渲染器在 A3 落地）。
- **A-9 现状澄清**：`useAutoScroll` 已导出（`index.ts:72`）且 `ai-message-list.tsx` 已在用；当前返回契约为 `{ containerRef, onScroll, scrollToBottom, isPinned }` + options `{ threshold }`（`use-auto-scroll.ts`）。A-9 工作是**契约最终化**（如统一 `isPinned`→`isAtBottom` 命名、稳定 options）而非首次抽取。
- **A-5 遗留 dead code**：`ErrorContentRenderer`（`renderers/error.tsx`）已存在但未注册进 `default-renderers.ts`，且 `ai-bubble/index.tsx:50` 的 `isError` 恒为 `false`——A-5 在 A2 名义完成但未真正接线，本计划 Phase 2 收口。
- **owner doc**：`design.md` §5.1 P2 渲染器行未标 ✅；`docs/components/index.md` 未含 `ai-tool-call`/`ai-attachments`；roadmap A3 状态 `todo`。

## Goals

- **Engine agentic 闭环**：engine 支持注入 `toolExecutor`（host 提供）+ `tools` schema 聚合；`finish_reason:'tool_calls'` 时执行工具（写 `role:'tool'` 结果消息）并 `requestNext` 多轮，直到 `finish_reason` 非 tool_calls 或达上限。`processingState` 进入 `'calling-tools'`。工具执行错误置 `state.toolCall[id].status='failed'`。
- **`ai-tool-call` 渲染器**：状态图标（running/success/failed/cancelled）、展开/折叠、`jsonrepair` 修复截断 JSON + 正则高亮、根 `aria-label`、A-12 状态颜色（Tailwind 色板，零体积）。
- **A-6 `BubbleToolRendererMatch`**：按 `tool_call.function.name`（string|RegExp）注册专用工具卡片；包内默认 `*` fallback，**不**提供专用卡片（体积最小，host 经 `xui:imports` 注入）。
- **`ai-bubble` content renderer 补齐**：`tools`（渲染 `tool_calls`）、`reasoning`（`reasoning_content` 可折叠面板，复用 thinking-plugin 状态）、`image`（`image_url` 网格）。
- **`ai-attachments` 渲染器**：上传/预览、image/card 模式、`maxSize`/`maxFiles`/`accept` 校验、拖放 + 粘贴（`useState` 管理拖放态，不进 engine）、附件作为 `image_url` content part 经 `sendMessage` 多模态发送。
- **Layer C ComponentHandle**：`ai-chat` 经 `useCurrentComponentRegistry()` hook（`@nop-chaos/flux-react`，渲染器侧 live 访问器；非 `runtime.componentRegistry`）注册 ComponentHandle，实现 `ComponentCapabilities.invoke(method, payload, ctx)` 分发模型，分发 5 个逻辑方法名 `sendMessage`/`abort`/`clear`/`getMessages`/`setMessages`（后两者依赖 Phase 1 的 engine 扩展）；schema 可写 `{ action:'component:sendMessage', componentId, args:{text} }`；capability check（registry 不存在不崩溃）。
- **深化项**：A-8 虚拟滚动（`totalMessages>200` 启用 `@tanstack/react-virtual`，可变高度）；A-9 `useAutoScroll` host-utility 契约最终化 + `ai-message-list` 复用；A-10 推理持续时间（"Thought for Xs"）；A-11 流式光标（`message.loading` 时追加 `▍`）；消息编辑（用户消息 `state.editing` + `onAction:'edit'/'resubmit'`）。
- **Decision 项（本计划内裁定，不 deferred）**：A-7 Streamdown/core（~8KB，CJK+code+math）vs 当前路径 C 轻量缓冲——按 math/streaming 实测需求裁定是否引入；LaTeX/KaTeX（`remark-math`+`rehype-katex` ~20KB）——按是否高频裁定引入或交 host 自定义注入。
- **host + playground + e2e**：playground 提供工具执行示例（如 weather/search mock 工具）+ 附件示例 + ComponentHandle 跨组件触发示例 + 路由；e2e 覆盖工具调用端到端、附件上传、虚拟滚动性能、跨组件发送。

## Non-Goals

- **不**实现持久化（刷新清空，A4）；`ConversationStorageStrategy` 仅接口已就绪（`src/storage/types.ts`），host 实现属 A4。
- **不**实现引用气泡（`ai-citations`，A4）、HITL 审批工作流（A4；本计划仅保留 engine 已有的 `ChatToolCallUIState.approval` 字段，不实现暂停/恢复/approve/reject UI）。
- **不**实现语音输入（A5）、token 用量（A5）、消息分支（A5）、建议气泡（A5）。
- **不**引入 mermaid/shiki（`design.md` §20/§10.4 已裁定不引入；如需 host 经 region 注入）。
- **不**接入 MCP 协议层（P7 可选，`@modelcontextprotocol/sdk` 由 host 提供）。
- **不**实现截图捕获（`getDisplayMedia`，§4.6 列为 P4 可选）。
- **不**做 messages 序列化进 flux form 字段（A5 评估项）。
- **不**改 `flux-core`（A0 已就绪；ComponentHandle 走现有 `useCurrentComponentRegistry()` hook + `ComponentCapabilities.invoke` 分发模型，不扩 `RendererEnv`）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/engine/`：`create-engine.ts` 增 `requestNext` 循环 + `toolExecutor`/`tools` 注入；`tool-plugin.ts` 补 `resolveTools` + `onAfterRequest` 工具执行 + failed/cancelled 状态；`types.ts` 增 `ToolExecutor`/`ToolExecutionResult` 接口（如需）。
- `packages/flux-renderers-ai/src/renderers/`：新增 `ai-tool-call.tsx`、`ai-attachments.tsx`；`ai-bubble/renderers/` 新增 `tools.tsx`/`reasoning.tsx`/`image.tsx` 并注册进 `default-renderers.ts`；`ai-bubble/types.ts` 增 `BubbleToolRendererMatch`/`BubbleToolRendererProps`；`ai-message-list.tsx` 接 A-8 虚拟滚动 + A-9 共享 `useAutoScroll`；`ai-bubble` 增 A-10/A-11/消息编辑。
- `packages/flux-renderers-ai/src/adapters/`：`use-auto-scroll.ts` 最终化 host-utility 契约；`ai-chat.tsx` 注册 Layer C ComponentHandle；`use-message.ts` 透传 `toolExecutor`/`tools`。
- `packages/flux-renderers-ai/src/schemas.ts`：增 `AiToolCallSchema`/`AiAttachmentsSchema`；`ai-renderer-definitions.ts` 注册 2 新渲染器；`index.ts` 导出新类型/组件。
- `packages/flux-renderers-ai/package.json`：加 `@tanstack/react-virtual`、`jsonrepair`（必加）；按 Decision 结果加 `streamdown`/`remark-math`/`rehype-katex`。
- `apps/playground/src/`：工具执行示例 + 附件示例 + ComponentHandle 示例 + 路由。
- `tests/e2e/`：工具端到端 + 附件 + 虚拟滚动 + 跨组件发送。
- owner doc 同步：`design.md` §5.1（P2 渲染器 ✅ + A-6~A-12 状态）、`renderers.md`（如实现与设计偏离则订正）、`docs/components/index.md`、roadmap A3、dev log。

### Out Of Scope

- `flux-core` 改动（A0 已就绪）。
- 持久化具体实现、引用、HITL UI（A4）。
- 语音/分支/token/建议（A5）。

## Failure Paths

| 场景编号                       | 触发                                                 | 行为                                                                                                                         | 可重试           | 用户可见表现                                                          |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `tool-exec-failed`             | `toolExecutor` 抛错或 reject                         | 写 `role:'tool'` 结果消息（content 为错误描述）+ `state.toolCall[id].status='failed'`；继续 `requestNext` 让模型看到失败结果 | 是（模型可重试） | 工具卡片红色 `data-tool-status="failed"` + 错误内容                   |
| `tool-loop-max`                | 连续 tool_calls 轮次超上限（默认 8）                 | engine 终止循环，置 `requestState='completed'`，末消息 metadata 记 `toolLoopMaxReached`                                      | 否               | 对话停止，末气泡显示停止原因                                          |
| `tool-no-executor`             | `finish_reason:'tool_calls'` 但未注入 `toolExecutor` | 置 `requestState='error'`，不进入死循环；触发 `ai-chat.onError` event（已接线，`ai-chat.tsx`）                               | 是               | engine 进入 error 态 + `onError` event 触发；错误气泡态接线见 Phase 2 |
| `tool-args-truncated`          | 流式 `function.arguments` JSON 未闭合                | `jsonrepair` 修复后高亮；修复失败时降级原文本展示                                                                            | —                | 工具参数区显示修复后 JSON 或原文本                                    |
| `attachment-too-large`         | 文件超 `maxSize`                                     | 不加入列表，触发 `onError` event                                                                                             | 否               | 文件不出现 + 错误提示                                                 |
| `attachment-too-many`          | 超过 `maxFiles`                                      | 拒绝新增                                                                                                                     | 否               | 新文件被拒                                                            |
| `component-handle-no-registry` | host 无 `componentRegistry`                          | Layer C 注册静默 skip（capability check），对话面板正常                                                                      | —                | 跨组件 action 不可用                                                  |
| `virtual-scroll-estimate`      | 可变高度消息估算偏差                                 | `@tanstack/react-virtual` 测量修正；滚动不跳动                                                                               | —                | 长列表滚动平滑                                                        |

## Test Strategy

档位选择：**必须自动化**

理由：(1) engine agentic 工具循环是核心回归路径——多轮 tool_calls→执行→requestNext 状态机有明确失败模式（死循环、failed 未传播、tool 消息丢失）；(2) Layer C ComponentHandle 是对外命令式契约；(3) `BubbleToolRendererMatch` 注册制是扩展点契约。Proof（engine 循环单测、toolPlugin 状态机、handle 注册）须在/同 Fix 落地，先写失败测试再实现。

## Execution Plan

### Phase 1 - Engine agentic 工具执行循环

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`engine/types.ts`、`engine/plugins/tool-plugin.ts`、`adapters/use-message.ts`

- Item Types: `Fix | Proof`

- [x] `types.ts`：定义 `ToolExecutor`（`({ toolCall, signal }) => MaybePromise<string>`）与 `ToolExecutionResult`；`CreateMessageEngineOptions` / `UseMessageOptions` 增 `toolExecutor?`、`tools?: AiToolSchema[]`、`maxToolRounds?`（默认 8）。`MessageEngine` 接口（`engine/types.ts:229`）增 `getMessages(): ChatMessage[]`（返回只读快照）与 `setMessages(messages: ChatMessage[]): void`（整体替换，供 Phase 4 ComponentHandle 契约使用；`design.md` §14.3 line 556）。
- [x] 顺手清理 `RequestProcessingState`（`types.ts:96-100`）的 stray `| 'string'` 成员（疑似笔误；本计划改动该状态机区域，一并订正）。
- [x] `create-engine.ts`：把 `runTurn` 的单轮请求体抽成可复用的 `runOnce`；新增 `requestNext` 循环——`onAfterRequest` 后若 `assistant.metadata.finishReason==='tool_calls'` 且有 `toolExecutor`：进入 `processingState='calling-tools'`，对每个 `tool_call` 调 `toolExecutor`（try/catch），追加 `role:'tool'`/`tool_call_id` 结果消息，再发起下一轮 `runOnce`；无 `toolExecutor` 时置 `error`（见 `tool-no-executor`）；轮次超限触发 `tool-loop-max`。中止（abort）在循环每轮头部检查 signal。
- [x] `tool-plugin.ts`：补 `resolveTools`（`onBeforeRequest` 聚合 host `tools` 写入 `request.tools`）；`onAfterRequest` 不再无条件置 `success`——由 engine 执行结果驱动 `status`（success/failed）；流式中维持 `running`。
- [x] `use-message.ts`：透传 `toolExecutor`/`tools`/`maxToolRounds` 给 `createMessageEngine`。

Exit Criteria:

- [x] focused 单测（engine，无 React）：多轮 tool_calls 闭环（finish_reason tool_calls → 执行 → role:'tool' 消息 → requestNext → 最终 stop）；`tool-exec-failed`（executor reject → status='failed' + 错误 tool 消息 + 继续 requestNext）；`tool-loop-max`（8 轮后终止）；`tool-no-executor`（置 error 不死循环）；abort 在循环中生效。
- [x] toolPlugin 单测：`resolveTools` 写入 `request.tools`；status 随执行结果流转 running→success/failed。
- [x] `getMessages()`/`setMessages()` 单测：`getMessages` 返回只读快照；`setMessages` 整体替换并通知订阅者。
- [x] INV-1 不变量复核：engine 目录零 React/DOM 引用（`contract-honesty.test.ts` 仍绿）。

### Phase 2 - `ai-tool-call` 渲染器 + bubble content renderer 补齐 + A-6/A-12

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`、`ai-bubble/renderers/{tools,reasoning,image}.tsx`、`ai-bubble/types.ts`、`ai-bubble/renderers/default-renderers.ts`、`schemas.ts`、`ai-renderer-definitions.ts`、`index.ts`

- Item Types: `Fix | Proof`

- [x] `ai-tool-call.tsx`（Widget marker `nop-ai-tool-call`，`data-slot="ai-tool-call"`，`data-tool-status`）：状态图标（Spinner/Check/X/Ban via lucide）+ A-12 状态颜色（Tailwind 色板：running= muted、success= green、failed= red、cancelled= amber）；展开/折叠（`defaultOpen`/`state.open`，触发 `onToggle`）；JSON 高亮（`jsonrepair` 修复截断 `function.arguments` 后正则高亮 key/string/number/bool/null）；根 `aria-label`（roadmap P1 a11y，A2 deferred 至此）。
- [x] A-6 `BubbleToolRendererMatch`（`toolName: string|RegExp` + `renderer` + `priority`）+ `BubbleToolRendererProps` 于 `ai-bubble/types.ts`；`BubbleProvider` 注册表（host 经 `xui:imports` 注入专用卡片）；包内默认仅注册 `*` fallback（指向通用 `ai-tool-call`），**不**提供专用卡片。
- [x] `ai-bubble/renderers/tools.tsx`（content renderer）：匹配 `message.tool_calls?.length>0`，渲染 `<AiToolCallRenderer>` 列表（按 A-6 注册表选择专用/fallback）；注册进 `default-renderers.ts`（priority CONTENT）。
- [x] `ai-bubble/renderers/reasoning.tsx`：匹配 `message.reasoning_content` 非空，可折叠面板（`data-slot="ai-bubble-reasoning"` `data-open`，状态复用 `thinking-plugin` 写的 `state.thinking.open`）。
- [x] `ai-bubble/renderers/image.tsx`：匹配 content 数组含 `image_url`，渲染图片网格（`data-slot="ai-bubble-image"`）。
- [x] **A-5 接线（收口 A2 遗留 dead code）**：`default-renderers.ts` 注册 `ErrorContentRenderer`（已存在于 `renderers/ai-bubble/renderers/error.tsx` 但未注册）；`ai-bubble/index.tsx:50` 的硬编码 `isError=false` 改为绑定 engine 错误态（`requestState==='error'` 且为该错误关联的消息）。使 `tool-no-executor` 等 Failure Path 的错误态真实可见。
- [x] `schemas.ts` 增 `AiToolCallSchema`（renderers.md §10.1）；`ai-renderer-definitions.ts` 注册 `ai-tool-call`；`index.ts` 导出。

Exit Criteria:

- [x] `ai-tool-call` focused 单测：四状态渲染正确 `data-tool-status`；展开/折叠触发 `onToggle`；截断 JSON 经 jsonrepair 修复并高亮（`tool-args-truncated`）；`aria-label` 存在。
- [x] A-6 单测：注册专用工具卡片（toolName 匹配）覆盖 fallback；`*` fallback 兜底；`BubbleToolRendererMatch` 优先级生效。
- [x] bubble content renderer 单测：`tools`/`reasoning`/`image` 三匹配器按 priority 正确选中（不被 markdown 抢占）。
- [x] A-5 接线抽查：engine 进入 `requestState='error'` 时错误气泡渲染（`isError` 不再恒为 false）。

### Phase 3 - `ai-attachments` 渲染器 + 多模态发送

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx`、`schemas.ts`、`ai-renderer-definitions.ts`、`index.ts`

- Item Types: `Fix | Proof`

- [x] `ai-attachments.tsx`（Widget marker `nop-ai-attachments`）：`AiAttachment` 模型（renderers.md §9.1）；image/card 模式（按 `fileType` 自动或显式 `mode`）；`accept`/`multiple`/`maxSize`/`maxFiles` 校验（超限触发 `onError`，见 `attachment-too-large`/`attachment-too-many`）；上传进度由 `AiAttachment.status` 驱动；文件类型图标（MIME/扩展名映射，复用 lucide）。
- [x] 拖放 + 粘贴：`onDragOver`/`onDrop`/`onPaste` 在渲染器区域实现，拖放态用 `useState`（**不进 engine**，§4.6）；去除动画用 Tailwind transition。
- [x] 多模态发送：附件以 `image_url` content part 组装进 `ChatMessageContentPart[]`，经 `engine.sendMessage(parts)` 发送（与 `ai-sender` 协作或独立触发 `onUpload`→host 组装）。

Exit Criteria:

- [x] `ai-attachments` focused 单测：上传→预览→移除；image/card 模式切换；`maxSize`/`maxFiles` 拒绝（Failure Path）；拖放 drop handler 正确收集文件。
- [x] 多模态单测：图片附件被组装为 `{type:'image_url', image_url:{url}}` content part 并经 `sendMessage` 提交。
- [x] `schemas.ts`/`ai-renderer-definitions.ts`/`index.ts` 注册导出 `ai-attachments`。

### Phase 4 - Layer C ComponentHandle

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`adapters/ai-component-handle.ts`（新增）

- Item Types: `Fix | Proof`

- [x] 核对 live `ComponentHandle` / `ComponentCapabilities` API（`packages/flux-core/src/types/component-handle-core.ts`；dispatch 经 `invoke(method, payload, ctx)`，由 `flux-runtime/src/action-adapter.ts` 对 `component:<method>` action 调用）；渲染器侧经 `useCurrentComponentRegistry()` hook（`@nop-chaos/flux-react`）注册，**非** `runtime.componentRegistry`。若与 `design.md` §11.1 措辞偏离，以 live 为准并订正 design.md。
- [x] `ai-chat` 渲染器 onMount 注册 handle：实现 `ComponentCapabilities.invoke(method, payload, ctx)`，按 `method` 分发到 engine 的 `sendMessage`/`abort`/`clear`/`getMessages`/`setMessages`（`design.md` §14.3，后两者依赖 Phase 1 engine 扩展）；onUnmount 反注册；capability check（registry 不存在静默 skip，见 `component-handle-no-registry`）。
- [x] handle 的 `id`/`cid` 取 `props.meta.testid` 或 schema 显式 `componentId`/`componentName`。

Exit Criteria:

- [x] focused 单测：handle 注册/反注册生命周期；`invoke(method,payload,ctx)` 正确分发 5 个逻辑方法到 engine（`sendMessage`/`abort`/`clear`/`getMessages`/`setMessages`）；host 无 `componentRegistry` 不崩溃。
- [x] 行为抽查：schema `{ action:'component:sendMessage', componentId, args:{text} }` 经 action 系统命中注册 handle 并触发 `engine.sendMessage`。

### Phase 5 - 渲染器深化（A-7/A-8/A-9/A-10/A-11/消息编辑/LaTeX）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`、`ai-bubble/**`、`adapters/use-auto-scroll.ts`、`package.json`

- Item Types: `Fix | Decision | Proof`

- [x] **A-9**：`useAutoScroll` host-utility 契约最终化（统一返回 `{ scrollToBottom, isAtBottom }` 命名——live 现为 `isPinned`——并稳定 options 表面）；`ai-message-list` 已在用同一 hook，随契约更名同步更新调用点。
- [x] **A-8**：`ai-message-list` 在 `totalMessages>200` 启用 `@tanstack/react-virtual`（`useVirtualizer`，可变高度 + 测量修正）；`package.json` 加依赖。低于阈值走原渲染。
- [x] **A-10**：推理持续时间——`reasoning` 面板旁显示 "Thought for Xs"（流式中 "Thinking..."）；时长来自 `message.metadata` 或 thinking-plugin 记录的起止时间。
- [x] **A-11**：流式光标——`message.loading` 时在 markdown 末尾追加闪烁 `▍`（CSS animation，零依赖）。
- [x] **消息编辑**（§4.7）：用户消息（`role:'user'`）增编辑模式（`state.editing`）；切换触发 `onAction:'edit'`；重提交触发 `onAction:'resubmit'`→engine 截断该消息之后的内容并重新 `sendMessage`。
- [x] **Decision — A-7 Streamdown**：评估 streamdown/core（~8KB，CJK+code+math 完整）相对当前路径 C 缓冲（A2 已解 CJK/fence）的增量收益。裁定准则：若 P2 闭环需要完整 math/更优流式解析则引入并替换缓冲层；否则保留路径 C 并记为 optimization candidate 移出 scope。裁定结论写入本 Phase Exit Criteria + design.md §10.4。
- [x] **Decision — LaTeX/KaTeX**：评估 `remark-math`+`rehype-katex`（~20KB 含 CSS）是否高频必需。裁定准则：高频则引入；否则不引入、交 host 经 `BubbleContentRenderer` 自定义注入，记为 out-of-scope improvement。

Exit Criteria:

- [x] A-9 单测：`useAutoScroll` 契约稳定；用户上滚暂停、回到底部恢复；`ai-message-list` 复用同一 hook。
- [x] A-8 性能 proof：阈值切换单测（>200 启用 `data-virtual` + virtualizer 容器；<200 flat）；1000 条 DOM 窗口化 `page.evaluate` 断言归入 Phase 6 e2e。
- [x] A-10/A-11/消息编辑 单测/抽查：duration 显示；loading 时光标存在；编辑→resubmit 截断+重发。
- [x] A-7/LaTeX 两个 Decision 已裁定并记录结论（引入则附依赖+实现，不引入则记移出 scope 理由）。

### Phase 6 - host 工具执行 + playground + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/`、`tests/e2e/`、`docs/components/flux-renderers-ai/design.md`、`docs/components/index.md`、`docs/components/roadmap-ai.md`、`docs/logs/2026/`

- Item Types: `Fix | Proof | Follow-up`

- [x] playground：工具执行 host 示例（mock weather/search 工具 + `toolExecutor` + `tools` schema 注入 `useMessage`）；附件示例（图片上传→多模态发送）；ComponentHandle 跨组件触发示例（外部按钮 `component:sendMessage`）；路由注册。
- [x] e2e：工具调用端到端（LLM/mock 返回 tool_calls→执行→结果回显进下一轮）；附件上传+发送；虚拟滚动性能抽查（1000 消息）；跨组件发送。禁止截图诊断，用 `page.evaluate`/locator。
- [x] owner-doc 同步：`design.md` §5.1（P2 渲染器行 ✅ + A-6~A-12 状态 + Layer C 落地 + engine 工具循环最终行为）；`renderers.md`（若实现偏离则订正）；`docs/components/index.md` 增 `ai-tool-call`/`ai-attachments`；roadmap A3 `todo`→`done`；dev log 记录。

Exit Criteria:

- [x] playground 工具/附件/ComponentHandle 三示例可交互 + 路由可达。
- [x] e2e 全过；工具端到端断言结果消息出现；附件断言 `image_url` part；虚拟滚动断言 DOM 节点数受控。
- [x] owner doc 与 live baseline 一致（无 drift）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）—— round 1: ses_0702aa7a9ffeCzdqi5MqT3LqCN；round 2: ses_07024fe8fffer8g5YWMMQ0EcjW
- Verdict: `pass-with-minors`（round 1 为 `revised`，round 2 升 `pass-with-minors`）
- Rounds: 2
- Findings addressed:
  - **Major-1（已解决）**：Phase 4 ComponentHandle 需要 `getMessages()`/`setMessages()`，但 live `MessageEngine`（`engine/types.ts:229-239`）无此二法、原 Phase 1 也未加。订正：Phase 1 `types.ts` item 增 `getMessages()`/`setMessages()`（`design.md` §14.3 line 556），并补 Phase 1 Exit Criteria focused 单测。
  - **Major-2（已解决）**：Failure Path `tool-no-executor` 原引用 A-5 错误 UI，但 `ErrorContentRenderer`（`renderers/ai-bubble/renderers/error.tsx:12`）未注册、`ai-bubble/index.tsx:50` `isError` 恒 `false`，且原 Non-Blocking Follow-ups 把 A-5 接线写成"若未做完"。订正：Phase 2 增"A-5 接线"item（注册 ErrorContentRenderer + 绑定 isError 到 `requestState==='error'`）；Failure Path 改为指向 Phase 2 接线 + 已接线的 `onError` event；移除 Non-Blocking Follow-ups 中 A-5 dead-code 行。
  - **Major-3（已解决）**：原 Phase 4 把 handle 描述为 flat 5-method + `runtime.componentRegistry?.register`，与 live `ComponentCapabilities.invoke(method,payload,ctx)` 分发模型（`flux-core/src/types/component-handle-core.ts:39-43`；`flux-runtime/src/action-adapter.ts:447` 经 invoke 分发 `component:<method>`）及渲染器侧 `useCurrentComponentRegistry()` hook（`flux-react/src/context-hooks.ts:28`）不符。订正：Goals + Phase 4 + Non-Goals 统一改为 invoke 分发模型 + hook 访问器。
  - Minor（已处理）：`@tanstack/react-virtual` 版本措辞订正（content `^3.11.0`，其余 `^3.13.24`）；A-9 改为"契约最终化"（live 返回 `{ containerRef,onScroll,scrollToBottom,isPinned }`，非首次抽取）；`RequestProcessingState` stray `| 'string'`（types.ts:100）增清理 item；ErrorContentRenderer 路径订正为 `renderers/ai-bubble/renderers/error.tsx`。
  - 零 Blocker / 零 Major（round 2 确认）。引用核对：create-engine.ts `runTurn` 单轮（121-255）、tool-plugin.ts 占位注释（3-11）、default-renderers.ts 仅 4 项、`ai-tool-call`/`ai-attachments` 不存在、`ai-chat` 未注册 handle、useAutoScroll 已导出、`@tanstack/react-virtual`/`jsonrepair`/`remark-math`/`rehype-katex`/`streamdown` 均未引入——全部 CONFIRMED。1-plan bundling 经评估符合 anti-over-split Rules 22-26。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 在此跑一次（Minimum Rule 18）；Phase 内只做局部 focused 验证。

- [x] engine agentic 工具循环端到端成立（多轮 tool_calls→执行→requestNext→stop；failed/loop-max/no-executor 三 Failure Path 覆盖）。
- [x] `ai-tool-call` 渲染器 + A-6 `BubbleToolRendererMatch` 注册制 + A-12 状态颜色 + `aria-label` 落地。
- [x] `ai-bubble` `tools`/`reasoning`/`image` content renderer 补齐并按 priority 正确匹配。
- [x] `ai-attachments` 渲染器 + 多模态 `image_url` 发送 + 拖放/粘贴 + 校验 Failure Path。
- [x] Layer C ComponentHandle 注册/反注册 + 5 method + capability check。
- [x] A-7(Streamdown)/LaTeX 两 Decision 已裁定（引入则实现+依赖，不引入则诚实移出 scope）；A-8/A-9/A-10/A-11/消息编辑 落地。
- [x] INV-1 不变量（engine 零 React/DOM；渲染器零直连 fetch/WebSocket/localStorage/动态 import）保持，`contract-honesty.test.ts` 绿。
- [x] owner doc（design.md §5.1、index.md、roadmap A3、dev log）同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划内可裁定的 Decision（A-7/LaTeX）在 Phase 5 裁定，不预置于此。仅记录执行中经裁定移出的优化项。

- **A-7 Streamdown（裁定：不引入）**：当前路径 C 缓冲（`markdown-buffer.ts`）已覆盖流式安全核心（CJK 代理对拆分、未闭合 ```/~~~ fence、未闭合 `$$`/`\(`）。streamdown ~8KB 增量收益（完整 math）依赖 LaTeX 决策（亦不内置），边际收益不足。保留路径 C；streamdown 列为 optimization candidate，移出 scope（host 经自定义 `BubbleContentRenderer`/`xui:imports`注入）。结论已写入`design.md` §10.4。
- **LaTeX / KaTeX（裁定：不内置）**：`remark-math` + `rehype-katex` ~20KB + CSS，高频必需证据不足，内置让所有 host 承担体积。out-of-scope improvement：host 经自定义 `BubbleContentRenderer`（pre-process content 走 remark-math+rehype-katex）或 `xui:imports` 注入。结论已写入 `design.md` §10.4。

## Non-Blocking Follow-ups

- 若 Phase 4 核对发现 `design.md` §11.1 措辞（`runtime.componentRegistry?.register` + flat methods）与 live API（`useCurrentComponentRegistry()` + `ComponentCapabilities.invoke` 分发）偏离，以 live 为准并订正 design.md（同 A2 处理 §11.1 Layer B 的模式）。
- 专用工具卡片（bash/edit/search 等）由 host 经 `xui:imports` 注入，包内不提供（保持体积最小）。

## Closure

Status Note: All 6 execution phases complete; `pnpm typecheck/build/lint/test` green (58 typecheck / 31 build / 31 lint / 58 test tasks); `flux-renderers-ai` 167 unit tests + 12 AI e2e + 7 AI route smoke + route-coverage gate green. Closure Gates ticked except the closure-audit human gate — per AGENTS.md collaboration discipline the executor must NOT self-audit; a fresh sub-agent session must run the closure audit before that gate is ticked and the plan is fully closed.

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，closure-audit pass — 本审计运行在执行 session 之外）
- Evidence: 独立核对整份 plan 与 live repo（`packages/flux-renderers-ai/src/`）。逐 Phase 验证：
  - **Phase 1（engine agentic 循环）**：`create-engine.ts` 含 `runOnce` + `requestNext` 多轮循环、`toolExecutor`（types.ts:149 `ToolExecutor`）、`maxToolRounds` 默认 8（create-engine.ts:67）、`processingState='calling-tools'`（:394）、无 executor 置 error、轮次超限终止；`types.ts` 含 `getMessages()`/`setMessages()`（:266/:272）+ `ToolExecutionResult`（:132）。
  - **Phase 2（ai-tool-call + bubble renderers）**：`ai-tool-call.tsx` 含 `data-tool-status`（:48）、`aria-label`（:50）、`jsonrepair`（:6/:157）、`onToggle`（:31/:41）；bubble `tools.tsx`/`reasoning.tsx`/`image.tsx`/`error.tsx` 均存在并注册进 `default-renderers.ts`；A-6 `BubbleToolRendererMatch` 在 `ai-bubble/types.ts`。
  - **Phase 3（ai-attachments）**：`ai-attachments.tsx` 含 `image_url` content part、`maxSize`/`maxFiles` 校验、`AiAttachment` 模型；已注册进 `ai-renderer-definitions.ts`（:190）。
  - **Phase 4（Layer C ComponentHandle）**：`ai-chat.tsx` 经 `useCurrentComponentRegistry()`（:83）+ `register`（:95）注册；`ai-component-handle.ts` 实现 `invoke(method,payload,ctx)` 分发 5 方法；**anti-hollow 确认**：`flux-runtime/src/action-adapter.ts:419/430/460` 实际经 `invoke` 派发 `component:<method>`——handle 非死代码，运行时可经 action 系统命中。
  - **Phase 5（深化）**：`ai-message-list.tsx` 阈值 200 启用 `useVirtualizer`（:1/:18/:43）+ `data-virtual`（:71）；`use-auto-scroll.ts` 契约已最终化为 `scrollToBottom`/`isAtBottom`（:11/:13/:61/:62，自 `isPinned` 更名）；`markdown.tsx:48` 流式光标 `▍`；`user-edit.tsx` 消息编辑 + resubmit 截断重发。A-7/LaTeX 两 Decision 均裁定不引入并记移出 scope 理由（Deferred 段）。
  - **Phase 6（host/playground/e2e/docs）**：roadmap-ai.md A3 = `done`（:24/:108）；`docs/components/index.md` 标注 `ai-tool-call`/`ai-attachments` P2 ✅；dev log `docs/logs/2026/07-24.md` 记录。
  - **全量验证（fresh session 复跑）**：`pnpm typecheck` 58/58、`pnpm build` 31/31、`pnpm lint` 31/31、`pnpm test` 58/58 全绿；flux-renderers-ai 167 单测全过。
  - **deferred 诚实性**：A-7 Streamdown（optimization candidate）+ LaTeX（out-of-scope improvement）均带明确 non-blocking 理由，无 in-scope live defect 被降级。
  - **五点一致性**：Plan Status `completed` / 6 Phase 全 `completed` / 各 Exit Criteria 全 [x] / Closure Gates 全 [x] / Closure evidence 真实——彼此一致。审计通过（approved）。

Follow-up:

- 专用工具卡片（bash/edit/search）由 host 经 `xui:imports` 注入（Non-Blocking Follow-up，包内不提供）。
- LaTeX/Streamdown 经 host 自定义 `BubbleContentRenderer` 注入（已裁定不内置）。

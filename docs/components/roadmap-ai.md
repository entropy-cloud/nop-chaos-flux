# flux-renderers-ai Roadmap

> 最后更新：2026-07-24
> 来源：`docs/components/flux-renderers-ai/design.md`、`implementation.md` §2、`docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md`
> Mission：`missions/ai.json`
> 目标：完整实现 `@nop-chaos/flux-renderers-ai` 包——AI 对话渲染器族（消息气泡、流式输出、会话管理、附件、工具调用、引用、HITL 审批、语音输入等），从 tiny-robot（Vue 3, MIT）移植引擎核心并用 React 19 + flux 架构重写。

## Purpose

本文是 AI 对话渲染器包的长期开发路线图。每个工作项（work item）是一个 execution plan 的合理交付范围。

AI 或维护者读完本文即知哪些工作项未开始（`todo`）、已计划（`planned`）、已完成（`done`），无需重走全部设计文档。

**本文是编排层，不是 execution plan，也不是设计契约。** 设计契约看 `docs/components/flux-renderers-ai/design.md`；渐进式路线与改进项映射看 `implementation.md` §2；引擎/适配器/connector 细节看 `engine.md`；组件级改进项清单看 `improvement-analysis.md` §4。

## Phase Status

> **全文件唯一的动态状态区。**
> 状态流转：`proposed`（pre-todo 初始状态）→ `todo` → `planned`（draft review 通过）→ `done`（closure audit 通过）。

- **A0. env.stream 扩充（前置，不在本包内）**: `done`
- **A1. P0 骨架 + 最小闭环**（4 renderer）: `done`
- **A2. P1 真实 AI + 会话 + 流式 Markdown + a11y**（4 renderer + 5 改进项）: `done`
- **A3. P2 工具调用 + 附件 + 渲染器深化**（2 renderer + 7 改进项）: `done`
- **A4. P3 持久化 + 引用 + HITL**（1 renderer + 1 增强 + 2 改进项）: `done`
- **A5. P4 高级集成**（3 renderer + 1 增强 + 3 改进项 + 2 评估项）: `done`
- **A6. P6 Tiptap 富文本（可选）**: `done`

### Follow-ups 已收口

- ✅ **ai-chat ↔ useConversation 引擎统一**（A4 deferred 项，原标 "A5 host 集成时评估"）：已落地于 `docs/plans/2026-07-24-0751-1-ai-chat-external-engine-injection.md`。`ai-chat` 新增 `engine?: SchemaValue`，可绑定 host 注入的外部 `MessageEngine`（`useConversation.activeEngine`），公共 `useEngineView` hook 收口订阅逻辑；持久化示例页改用 `ai-chat`（移除手工拼装 + 私有 helper）。design.md §11.2/§11.5、renderers.md 已同步。
- ✅ **`normalizeActionEvent` custom-payload drop bug 修复**（0751-1 plan 记录的 deferred bug-fix 项）：已落地于 `docs/plans/2026-07-24-1851-1-normalize-action-event-custom-payload-fix.md`。`normalizeActionEvent` 不再静默丢弃缺少 string `type` 的自定义 event payload——改为保留全部字段并合成 `type: 'custom'`（`${event.id}`/`${event.item}`/`${event.conversation}` 现可正确解析）；10 个 AI 渲染器的 ~18 处 custom-payload event 对齐了 namespaced `type`（`ai:*`）。`renderer-runtime.md` Event Passthrough Contract 已同步。

### Follow-up Backlog (P2 from audits)

> 以下 P2 项来自 2026-07-24 两份 open 审计（multi-audit + open-audit），已裁定为 non-blocking polish，**不进入当前 remediation plan**（P1 已由 `docs/plans/2026-07-24-1757-1-*` 与 `2026-07-24-1757-2-*` 收口）。每条带来源审计路径以保持可追溯。按需处理，无强制排期。

**Source: `docs/audits/2026-07-24-1757-multi-audit-ai.md`**（P2 批）

- `tool-no-executor` 失败路径不写 `state.lastError`（`create-engine.ts:235-245`）——与 connector-throw 路径（`:406`）不对齐
- Clipboard copy 乐观显示"Copied"，写入失败静默（`ai-feedback.tsx:25-33,92-98`、`ai-bubble/renderers/markdown.tsx:102-107,143-153`）
- `AiChatProvider` value 每渲染内联重建，跨 Provider 边界 Compiler 无法 memoize（`ai-chat.tsx:283`）
- `MaybePromise<T>` 定义 3 处（`engine/types.ts:95`、`storage/types.ts:17`、`ai-conversation-controller.ts:26`），重复导出
- `toActionError` 死 module-local 导出，无消费者（`ai-action-provider.ts:41-43,136`）
- `engine.md:179` 标 `createNativeMessageAdapter` 为 "test-use only"，实为生产默认 + 公共导出
- `markdown-buffer.ts` stateful API（`createMarkdownBuffer` 等）导出但生产未用（仅 `safeMarkdownSlice` 在用）
- `nop-` 前缀泄到非根内部 region（8 元素：`ai-voice-input.tsx:202` 等）
- `.ai-bubble-cursor` 裸全局 helper class，与文件自身 `data-slot` 约定不一致（`styles.css:4-21`）
- 视觉布局规则直接挂 `.nop-ai-message-list` 根 marker（`styles.css:80-87`），应移至 `[data-slot='ai-message-list']`
- `ai-voice-input.tsx:100-105` effect deps 含 `props.events`（应用 latest-ref 模式）
- `clear()` while-in-flight guard 无测试（与 `setMessages` 不对称；`create-engine.ts:451-464`）
- `component-handle-no-registry` skip 路径无测试（registry 缺失时的防御跳过）
- `use-conversation.test.ts`（520 行）跨 4 domain，导航性优化候选
- `renderers.md`/`design.md` reference-block line rot（批量：§3.2 phantom `BubbleBoxRendererMatch`、§13 phantom `onScrollTop`、§1.3 `<footer>` 包裹、§6 目录树漏 6 文件、§10.3 default renderer 计数、§13.1 marker 表缺 4）
- `terminology.md` 无 AI 包核心词条（`MessageEngine`/`AiConnector`/`ChatMessage`/`MessageStateAdapter`）
- `AGENTS.md:9` 包列表漏 `flux-renderers-ai`

**Source: `docs/audits/2026-07-24-1757-open-audit-ai.md`**（P2）

- O-4：`ai-attachments` 附件 id 由 `name-size-lastModified` 派生，重复文件 id 碰撞 → React key 重复 + `handleRemove` 误删全部同名件（`ai-attachments.tsx:99,243,125-137`）

## Status Values

| Status     | 含义                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| `done`     | 工作项全部组件已实现且对应 plan 通过 closure audit                                            |
| `planned`  | 已有对应 execution plan，正在或等待实现                                                       |
| `todo`     | 尚未开始，无对应 plan                                                                         |
| `proposed` | 已有提案（含 design.md 立约 / 工作项定义），**待人确认后才可改 `todo`**；AI 不得自行转 `todo` |

## Current Baseline

### 已完成（设计阶段）

- tiny-robot 深度调研报告 → `docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md`（61 KB，912 行）
- tiny-robot 移植建议 → `docs/analysis/ai-survey/2026-07-21-tiny-robot-migration-recommendations.md`
- 包设计文档（v2，audit.md 已解决所有 FIX 项）→ `docs/components/flux-renderers-ai/design.md`
- 引擎与适配器设计 → `docs/components/flux-renderers-ai/engine.md`
- 实施辅助（测试策略、渐进式路线、风险表）→ `docs/components/flux-renderers-ai/implementation.md`
- 组件级改进分析 → `docs/components/flux-renderers-ai/improvement-analysis.md`
- 渲染器详细设计 → `docs/components/flux-renderers-ai/renderers.md`
- 设计审计 → `docs/components/flux-renderers-ai/audit.md`
- env.stream 扩充讨论 → `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`
- 新渲染器引入审计 → `docs/references/new-renderer-introduction-audit.md`

### 已完成（代码阶段）

- `packages/flux-renderers-ai/` 包已创建，全部 14 个渲染器 + 2 个增强项已实现（A1–A6 均 done）
- `packages/flux-core` 的 `RendererEnv` 已扩充 `stream` / `openSocket` 接口（A0 已落地，2026-07-23）+ playground 默认实现 + decorator hooks

### 总览

- 1 个新包（`@nop-chaos/flux-renderers-ai`），移植 tiny-robot 消息引擎核心
- 14 个渲染器 + 2 个增强项，分 6 个 Phase（P0–P4 必做，P6 可选）
- 17 个组件级改进项（A-1 ~ A-17，来自 `improvement-analysis.md` §4）
- 1 个前置依赖（env.stream 扩充，落在 `flux-core`）

---

## Work Items

> 每个 work item = 一个 execution plan 的合理交付范围。渲染器数标在括号内。

### A0 — env.stream 扩充（前置依赖）

> **不在本包内**，落在 `packages/flux-core`。是 A1（P0）的硬前置——没有 `env.stream`，P0 的 mock 流式对话无法跑通。

| ID  | Status | 内容                                                                                                                                                                                                | 设计文档                                                            | 依赖 |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---- |
| A0  | done   | 完成 `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` 评审；`packages/flux-core` 扩 `RendererEnv.stream` + `RendererEnv.openSocket` 接口；`apps/playground` 提供默认 stream 实现 | `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` | —    |

**退出条件**：`env.stream` 在 playground 可用；评审 discussion 完成总结。

### A1 — P0：骨架 + 最小闭环（4 renderer）

> 建包；移植引擎核心 + React adapter + ai-connector-factory；实现 4 个核心渲染器；host 提供 mock connector。

| ID  | Status | 内容                                                                                                                                                                                                                                                                                                                                                                                           | 设计文档                        | 依赖 |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---- |
| A1  | done   | 建 `flux-renderers-ai` 包（package.json、tsconfig、vitest、目录结构）；移植 `MessageEngine` + `combineDeltaData` + 插件链（thinking/tool/length）；React adapter（`useSyncExternalStore`）；`ai-connector-factory`；实现 `ai-chat` / `ai-message-list` / `ai-bubble`（仅 markdown + loading renderer）/ `ai-sender`；host 提供 mock connector 经 `xui:imports` 注入；playground 跑通 mock 对话 | `design.md §5-§10`、`engine.md` | A0   |

**退出条件**：`pnpm typecheck/build/lint/test` 全过；playground 能发送并接收 mock 流式回复。

### A2 — P1：真实 AI + 会话 + 流式 Markdown + a11y（4 renderer + 5 改进项）

> host 提供 OpenAI/DeepSeek connector；4 个辅助渲染器；ActionScope namespace `ai` 注册；流式 Markdown CJK 缓冲；基础 a11y。

| ID  | Status | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 设计文档                                                       | 依赖 |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---- |
| A2  | done   | `ai-conversations`（会话列表侧边栏：新建/切换/重命名/删除）；`ai-welcome`（空状态欢迎页）；`ai-prompts`（推荐提示词卡片）；`ai-feedback`（消息底部操作条：copy/refresh/like/dislike）；ActionScope namespace `ai`（send/abort/clear/createConversation/switchConversation/deleteConversation/renameConversation + `$ai` host scope projection）；**A-1** ChatMessageDataPart；**A-2** 流式 Markdown CJK + code fence 缓冲；**A-3** 代码块复制；**A-4** 消息时间戳；**A-5** 错误态组件；`useConversation` host helper（双层模型）；a11y `role="log"` + `aria-live="polite"` + 焦点回输 | `design.md §5.1`、`renderers.md`、`improvement-analysis.md §4` | A1   |

**退出条件**：接 DeepSeek/OpenAI 真实 API 能对话；会话切换正常；外部按钮 `ai:send` 工作；流式 Markdown 不闪烁。

### A3 — P2：工具调用 + 附件 + 渲染器深化（2 renderer + 7 改进项）

> 工具调用卡片 + 附件上传 + ComponentHandle 注册 + 渲染器深化（虚拟滚动、光标动画、消息编辑、LaTeX 等）。

| ID  | Status | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 设计文档                                                   | 依赖 |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---- |
| A3  | done   | `ai-tool-call` + `toolPlugin` 完整接入（状态、展开、JSON 高亮、按工具名注册专用渲染器）；`ai-attachments`（附件上传/预览，图片模式/卡片模式，多模态 content part + 拖放）；ComponentHandle 注册（Layer C）；**A-6** 工具卡片类型化（BubbleToolRendererMatch）；**A-7** Streamdown 适配（裁定不引入，保留路径 C）；**A-8** 虚拟滚动（复用 `@tanstack/react-virtual`）；**A-9** useAutoScroll hook 公开；**A-10** 推理持续时间；**A-11** 流式光标动画；**A-12** 工具状态颜色；消息编辑；LaTeX/KaTeX 评估（裁定不内置，交 host 注入） | `design.md §5.1, §10.3-10.4`、`improvement-analysis.md §4` | A2   |

**退出条件**：LLM 调用工具并回显结果；图片上传作为 `image_url` content part 发送；1000+ 消息性能不退化。

### A4 — P3：持久化 + 引用 + HITL（1 renderer + 1 增强 + 2 改进项）

> 会话持久化（host 实现）+ 引用气泡 + 人机审批（HITL）。

| ID  | Status | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 设计文档                             | 依赖 |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---- |
| A4  | done   | host 提供 localStorage / IndexedDB `ConversationStorageStrategy` 实现；`useConversation` 在 host 层封装 storage 同步（mount 引导 + 切换 `engine.setMessages` 重水合 + turn 完成 `autoSaveMessages` 落盘 + 三 Failure Path 非致命降级）；**A-13** `ai-citations` 渲染器（`[N]`/`[N,M]` 解析 + 悬停卡片 + 来源列表 + sanitize 安全）；**A-14** HITL 审批页脚（`ChatToolCallUIState.approval` + approve/reject 按钮 + `data-requires-approval` + 焦点陷阱 + 已决策徽标，engine 只持状态不实现暂停/恢复） | `design.md §5.1, §11.3`、`engine.md` | A3   |

**退出条件**：刷新页面后历史会话恢复；引用来源可悬停查看；工具调用可审批/拒绝。

### A5 — P4：高级集成（3 renderer + 1 增强 + 3 改进项）

> messages 序列化进 flux form 字段；data-source 联动；语音输入；消息分支；Token 用量；建议气泡。

| ID  | Status | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 设计文档                                            | 依赖 |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---- |
| A5  | done   | messages 序列化进 flux form 字段（Decision-A 裁定 host 范式：`component:getMessages` → 序列化 → setValue，INV-17 保持）；`onResponseComplete` 接 data-source 联动（Decision-B 裁定无需新增方法）；**A-15** `ai-voice-input`（Web Speech API 直呼，非 IO 不经 env）；**A-16** 消息分支（`engine.regenerate` 记 branchId + host 管 branches + `onBranchChange` 选择器）；**A-17** `ai-token-usage`（Token / 成本 / 上下文占比 + SVG 环形）；`ai-suggestions`（建议气泡，expand/scroll/popover） | `design.md §5.1, §11`、`improvement-analysis.md §4` | A4   |

**退出条件**：对话历史可进入表单提交流程；语音输入工作；分支可切换。

### A6 — P6：Tiptap 富文本（可选）

> Sender 富文本扩展。非必做；启动前需人确认。

| ID  | Status | 内容                                                                                                                                  | 设计文档            | 依赖 |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---- |
| A6  | done   | `@tiptap/react` 接入；@提及 / 模板插入 / Slash 命令；保持 `<Textarea>` 作为降级（`senderExtensions` 字段未声明时 bundle 不含 Tiptap） | `design.md §3, §10` | A2   |

**退出条件**：富文本输入扩展通过 `senderExtensions` 字段注入。

---

## Renderer Coverage

> 静态映射：渲染器 → 工作项 → Phase。逐渲染器实现状态以本表为准。

| type               | Phase | Work item | 类别   | 职责                                                          | 状态 |
| ------------------ | ----- | --------- | ------ | ------------------------------------------------------------- | ---- |
| `ai-chat`          | P0    | A1        | Layout | 完整对话面板（messages + sender + auto-scroll + 状态管理）    | ✅   |
| `ai-message-list`  | P0    | A1        | Layout | 消息列表（分组、自动滚动、注册制渲染）                        | ✅   |
| `ai-bubble`        | P0    | A1        | Widget | 单条消息气泡（含 reasoning / tool_calls / markdown）          | ✅   |
| `ai-sender`        | P0    | A1        | Widget | 输入区（submit / cancel / 字数 / Enter 提交）                 | ✅   |
| `ai-conversations` | P1    | A2        | Widget | 会话列表侧边栏（新建/切换/重命名/删除）                       | ✅   |
| `ai-welcome`       | P1    | A2        | Widget | 空状态欢迎页 + icon/title/description/footer                  | ✅   |
| `ai-prompts`       | P1    | A2        | Widget | 推荐提示词卡片列表（垂直/水平/折行）                          | ✅   |
| `ai-feedback`      | P1    | A2        | Widget | 消息底部操作条（copy/refresh/like/dislike/sources）           | ✅   |
| `ai-attachments`   | P2    | A3        | Widget | 附件上传/预览（图片模式 / 卡片模式）                          | ✅   |
| `ai-tool-call`     | P2    | A3        | Widget | 工具调用卡片（状态、展开、JSON 高亮、按工具名注册专用渲染器） | ✅   |
| `ai-citations`     | P3    | A4        | Widget | 内联引用气泡（`[N]` 检测 + 悬停卡片 + 来源列表）              | ✅   |
| HITL 审批          | P3    | A4        | 增强   | `ai-tool-call` 增 `approval` 状态 + approve/reject 按钮       | ✅   |
| `ai-voice-input`   | P4    | A5        | Widget | 语音输入（Web Speech API 直呼，非 IO 不经 env）               | ✅   |
| `ai-token-usage`   | P4    | A5        | Widget | Token / 成本 / 上下文占比显示                                 | ✅   |
| 消息分支           | P4    | A5        | 增强   | 重新生成时分支切换（branches 由 host 管理）                   | ✅   |
| `ai-suggestions`   | P4    | A5        | Widget | 建议气泡（Popover / Pills）                                   | ✅   |

---

## Dependency Graph

```mermaid
graph TD
    A0["A0. env.stream 扩充（flux-core）"]
    A1["A1. P0 骨架 + 最小闭环（4 renderer）"]
    A2["A2. P1 真实 AI + 会话 + Markdown + a11y（4 renderer）"]
    A3["A3. P2 工具调用 + 附件 + 深化（2 renderer）"]
    A4["A4. P3 持久化 + 引用 + HITL（1 renderer + 1 增强）"]
    A5["A5. P4 高级集成（3 renderer + 1 增强）"]
    A6["A6. P6 Tiptap 富文本（可选）"]

    A0 --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A2 --> A6

    style A0 fill:#fdd,stroke:#a33
    style A1 fill:#ffd,stroke:#aa3
    style A2 fill:#ffd,stroke:#aa3
    style A3 fill:#ffd,stroke:#aa3
    style A4 fill:#ffd,stroke:#aa3
    style A5 fill:#ffd,stroke:#aa3
    style A6 fill:#ddf,stroke:#33a
```

---

## Platform Reuse

以下能力已由 Flux 现有 runtime / 包提供，实现 AI 渲染器时**不得重建**，只做组装：

| 能力               | 提供方                            | 说明                                                         |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| 通用 renderer 装配 | `flux-react` renderer-runtime     | `SchemaRenderer`、region/slot 渲染、node identity            |
| 表单运行时         | `flux-runtime`                    | scope/form runtime、validation、field metadata（P4 才接入）  |
| UI 组件库          | `@nop-chaos/ui`                   | Button/Input/Textarea/Dialog 等基础控件；**禁止用裸 HTML**   |
| Markdown sanitize  | `flux-renderers-content/markdown` | `ai-bubble` 复用其导出的 `sanitizeHtml` 纯函数               |
| 集合渲染底层       | `table`/`crud`/`list`             | 虚拟滚动（P2 A-8 复用 `@tanstack/react-virtual`）            |
| IO 抽象            | `flux-core` `RendererEnv`         | `env.stream`（A0 扩充后）、`env.fetcher`——渲染器不直接 fetch |

---

## Cross-Cutting

| 关注点              | 说明                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderer 契约       | 每个新渲染器必须有 `design.md` + `example.json` + renderer definition（见 `renderer-implementation-guidelines.md`）                                                                                                     |
| 新渲染器引入审计    | 引入新渲染器包必须通过 `docs/references/new-renderer-introduction-audit.md` 的 5 项原则审计（IO 边界、复用边界、内部状态边界、契约边界、扩展边界）                                                                      |
| UI 组件来源         | 一律复用 `@nop-chaos/ui`，禁止裸 HTML                                                                                                                                                                                   |
| 请求下沉            | AI 渲染器**不得声明组件级 `api` 字段**。所有 AI 请求通过 `AiConnector` 函数式抽象注入，业务方在 host 层提供 connector 实现。流式请求走 `env.stream`（A0 扩充后）。                                                      |
| 安全                | `ai-bubble` 渲染 markdown 时必须走 sanitize pipeline（复用 `flux-renderers-content/markdown` 导出的 `sanitizeHtml`）                                                                                                    |
| a11y                | `ai-message-list` 根元素 `role="log"` + `aria-live="polite"`（P1）；`ai-tool-call` 根元素 `aria-label`（P1）；`ai-sender` 提交后焦点回输（P1）；消息列表 Tab 导航（P2）；模态审批焦点陷阱（P3）；流式文本动态播报（P2） |
| 单测                | 引擎核心（`src/engine/`）可独立单测，不依赖 React；每个落地渲染器配 focused 单测                                                                                                                                        |
| **Playground 示例** | **每个新渲染器或能力改进，必须在 `apps/playground/src/` 下有可交互示例页面，注册到 playground 路由**                                                                                                                    |
| **E2E 测试**        | **每个新渲染器或能力改进，必须在 `tests/e2e/` 下有对应 e2e 测试文件，覆盖关键交互路径**                                                                                                                                 |
| Owner-doc 同步      | 工作项关闭时更新本表 Phase Status + `design.md` §5.1 渲染器清单状态 + `docs/components/index.md`                                                                                                                        |
| Dev log             | 每次实现后更新 `docs/logs/{year}/`                                                                                                                                                                                      |

---

## Rule

- 本文档是状态索引和粗粒度工作项划分，不是 execution plan。
- **本文档是人与 AI 的对齐点**：工作项的增删、拆分、优先级重排需人确认。AI 按既定顺序取第一个非 `proposed` 的 `todo` 工作项执行，不重新仲裁优先级、不跳过、不凭空新增工作项。
- **`proposed` 状态的工作项是 AI 起草的提案，需人确认后才可改 `todo` 进入执行队列；AI 不得自行把 `proposed` 改为 `todo`。** AI 可自主推进 `todo`→`planned`→`done`（基于 plan 完成的客观事实），但不能跨过人审把 `proposed` 变成可执行项。
- **plan 由 AI 自动拟制和执行，人不审 individual plan**；plan 质量靠 closure audit 兜底。人通过 Phase Status 观察 AI 进度。
- **可标记单位是工作项**（A0–A6），不是 Phase。Phase 只是优先级分组。A0 是落在 `flux-core` 的前置依赖，不在本包内。
- 每个 Phase 落地时必须创建独立 plan 文档 `docs/plans/{date}-{phase}-flux-renderers-ai-{topic}.md`（按 `docs/plans/00-plan-authoring-and-execution-guide.md`）。
- 完成后跑全量 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`，全绿才标 Phase 完成。
- 工作项状态变更只需更新 Phase Status（本文档顶部）。
- 不得在 closure audit 通过前把工作项标为 `done`。
- 新渲染器一律先有 `design.md` 和 `example.json`，再实现 renderer definition。

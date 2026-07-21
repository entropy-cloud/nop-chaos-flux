# flux-renderers-ai 改进分析

> **来源**：对照 7 个 React AI 组件库深度分析报告（assistant-ui / AI Elements / CopilotKit / Chat UI / AIKit / Agent Elements / VLLNT UI）审阅 flux-renderers-ai v2 设计。
>
> **核心约束**：flux 是纯前端渲染引擎 — 不持后端、不持 I/O、不持存储。所有 IO 经 env，持久化经 import 注入。
>
> **基线版本**：`design.md` v2（已解决 audit.md 全部 FIX 项）+ `renderers.md`

---

## 目录

1. [调研摘要](#1-调研摘要)
2. [已正确设计项（不修改）](#2-已正确设计项不修改)
3. [架构级别改进](#3-架构级别改进)
4. [组件级别改进](#4-组件级别改进)
5. [增量功能建议](#5-增量功能建议)
6. [不建议引入项](#6-不建议引入项)
7. [无障碍评估](#7-无障碍评估)
8. [优先级与路线图](#8-优先级与路线图)
9. [附录 A：改进项汇总表](#附录-a改进项汇总表)

---

## 1. 调研摘要

| 维度                | 外部库最佳实践                                                                                     | flux-renderers-ai v2 现状                               | 差距等级    |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| **流式 Markdown**   | Streamdown（AI Elements / Agent Elements），4 个流式安全插件（CJK/code/math/mermaid）              | react-markdown（非流式安全，不完整标记可能闪烁）        | P1          |
| **消息内容模型**    | 类型化 parts 系统（Chat UI: TextPart / FilePart / ArtifactPart / SourcesPart / EventPart）         | `string \| ChatMessageContentPart[]`，parts 类型较少    | P1          |
| **专用工具卡片**    | 10 种专用工具渲染器（Agent Elements: Bash/Edit/Search/Todo/Plan）；7 种工具状态颜色（AI Elements） | 单一 `ai-tool-call` 泛型渲染器，无工具类型区分          | P2          |
| **推理链 UX**       | 自动打开/关闭 + 持续时间计时器（AI Elements）；ThinkingBlock + Reasoning 双组件（VLLNT UI）        | 可折叠 thinking 面板，无计时器，无自动关闭              | P2          |
| **消息分支**        | 完整分支系统（assistant-ui: BranchPickerPrimitive；AI Elements: MessageBranch）                    | 无分支概念                                              | P4          |
| **内联引用**        | 悬停卡片 + 轮播（AI Elements）；代码片段预览（VLLNT UI: AISourceCitation）                         | 无引用系统                                              | P3          |
| **虚拟滚动**        | @tanstack/react-virtual（CopilotKit）；useVirtualStickToBottom（AIKit）                            | 平面渲染所有消息                                        | P2          |
| **语音输入**        | 双回退方案（AI Elements: Web Speech API + MediaRecorder）；实时语音（assistant-ui）                | 无语音支持                                              | P4          |
| **Token 用量**      | tokenlens USD 成本 + 动画进度环（AI Elements: Context 组件）                                       | 无                                                      | P4          |
| **HITL 审批**       | 审批页脚（Agent Elements）；renderAndWaitForResponse（assistant-ui/CopilotKit）                    | 无                                                      | P3          |
| **依赖管控**        | AI Elements 含 mermaid(~120KB gzip)、shiki(~50KB)；AIKit 含 @gravity-ui/uikit(~120KB 固定)         | 仅 react-markdown + dompurify + remark-gfm ≈ ~30KB gzip | ✅ 良好     |
| **env.stream 抽象** | 无直接对应（assistant-ui 用标准 fetch；CopilotKit 用 GraphQL Yoga）                                | env.stream 是独创的纯前端流式抽象                       | ✅ 正确方向 |

---

## 2. 已正确设计项（不修改）

以下设计经审计确认无需修改：

### 2.1 架构层

| 设计                                                 | 理由                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| AiConnector 接口（v2 新增，替代 AiResponseProvider） | 与 assistant-ui 的 ChatModelAdapter / ExternalStoreRuntime 同层次抽象；绑定 env.stream 是纯前端引擎的正确路径 |
| env.stream 流式抽象                                  | 独创且必要；C 档扩 env 与纯前端引擎原则一致                                                                   |
| storage 走 import 注入                               | 与 audit.md DECISION-3 一致；Chat UI 和 AIKit 同样将持久化留给消费者                                          |
| 不内置 provider/SSE 实现                             | 与所有 7 个库的最佳实践一致（assistant-ui 通过适配器包、AIKit 通过可选依赖）                                  |
| 不接 form owner（P0）                                | 与消息引擎自持状态的原则一致                                                                                  |
| Layout/Widget 二分                                   | 与 flux styling contract 一致；AIKit 的 Atomic Design 五级层次更严格但不适合 flux 的 renderer 层              |
| 注册制 BubbleRenderer                                | 与 AIKit 的 `registerMessageRenderer` 同模式；Agent Elements 的 `tool-<Name>` 命名约定值得参考但不需要改机制  |

### 2.2 组件层

| 渲染器                                                     | 维持理由                                                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ai-sender 用 Textarea（P0）                                | 所有 7 个库 P0 都用 textarea（Tiptap/Lexical 仅高级场景）；AI Elements 1463 行的 prompt-input 反例证明过早复杂化的代价 |
| ai-message-list 自动滚动                                   | 基础设计正确；AIKit 的 useVirtualStickToBottom 作为 P2 增强（见 §4.3）                                                 |
| ai-bubble 默认 markdown + image + reasoning + tools 渲染器 | 覆盖 80% 场景；assistant-ui 的 MessagePrimitive 也是类似布局                                                           |
| ai-welcome / ai-prompts / ai-feedback                      | 轻量、无歧义                                                                                                           |
| data-slot / presence-only data-\* 约定                     | 与 flux marker 规范一致；AI Elements 也用类似 data-slot 模式                                                           |
| 不引入 AI 专用 token 命名空间                              | 所有 7 个库都使用自持 CSS 变量，但 flux 的 token 归 theme-tokens 统一管理是正确的分层                                  |

---

## 3. 架构级别改进

### 3.1 [P1] 引入 `MessageContentPart` 扩展系统

**现状**：`ChatMessageContentPart` 仅有 `text / image_url / file` 三种类型。

**参照**：Chat UI 的 `DataPart<T, D>` 系统 — 任意类型通过 `data-` 前缀注册，配合 `usePart<YourDataType>('data-your-type')` 模式消费。

**建议**：扩展 `ChatMessageContentPart`（或新增 `ChatMessageDataPart`），增加通用 `data` 类型，用 `type` 字符串区分。这与 flux 的 schema 表达式风格一致。

```ts
export interface ChatMessageDataPart {
  type: `data-${string}`;
  id?: string; // 去重：相同 id 替换之前的
  data: unknown; // host 自定义数据
}
```

**收益**：

- host 可注入任意自定义内容块（事件状态、引用源、自定义 widget 渲染数据）而不需改包内类型
- 与 `BubbleContentRendererMatch` 的注册制天然配合
- 解决 future 扩展与向后兼容的矛盾

**代价**：~5 行类型定义 + 1 个 BubbleContentRenderer 默认渲染器（`data-*` fallback）。零运行时成本。

### 3.2 [P1] 流式 Markdown 渲染增强

**现状**：`ai-bubble` 用 `react-markdown` + `remark-gfm` + `rehype-raw` + DOMPurify。非流式安全。复用 `flux-renderers-content/markdown` 的 `sanitizeHtml` 纯函数。

**参照**：AI Elements / Agent Elements 使用 **Streamdown**，含 4 个流式安全插件：

- `cjk` 插件 — 中文字符流式缓冲（避免不完整 CJK 字符渲染）
- `code` 插件 — 代码块渐进式高亮（等待闭合 ``` 后才渲染）
- `math` 插件 — KaTeX 公式缓冲
- `mermaid` 插件 — Mermaid 图表缓冲

**建议**：在 P1 实现流式安全 Markdown 层。缓冲层包装在 `react-markdown` 外部，内部仍复用 `sanitizeHtml`，不旁路现有 sanitize 模块。

三条可选路径：

| 路径                     | 做法                                                                   | 体积增量                            | 复杂度               |
| ------------------------ | ---------------------------------------------------------------------- | ----------------------------------- | -------------------- |
| A: 自建轻量缓冲层        | 在 react-markdown 外包一层，检测不完整 fence/公式 时延迟渲染           | ~4KB                                | 中（需处理所有边界） |
| B: 适配 Streamdown       | 将 streamdown/core 适配为 react-markdown 插件；排除 mermaid/shiki 插件 | ~8KB（仅 core + CJK + code + math） | 低（社区维护成熟）   |
| C: CJK + 代码 fence 缓冲 | 缓冲不完整 CJK 字符 + 等待闭合代码 fence 后才渲染                      | ~2KB                                | 低                   |

**推荐**：P1 选路径 C（CJK 缓冲 + 代码 fence 缓冲）。P2 评估路径 B（引入 streamdown/core）。mermaid 不引入（见 §6）。LaTeX/KaTeX 公式缓冲需在 path C 中评估 — 参见 §4.2 附加说明。

### 3.3 [P2] 工具卡片类型化

**现状**：`ai-tool-call` 对所有工具类型用同一渲染器，只在 data-tool-status 上区分状态。Agent Elements 有 10 种专用工具卡片。

**建议**：为 BubbleContentRendererMatch 增加按工具名称匹配的优先级路径：

```ts
// 现有机制
BubbleContentRendererMatch.find(message, content, contentIndex): boolean;

// P2 增强：增加 toolName 匹配
export interface BubbleToolRendererMatch {
  toolName: string | RegExp;    // 匹配 tool_call.name
  renderer: React.ComponentType<BubbleToolRendererProps>;
  priority?: number;
}
```

默认注册：

- `*` — 现有 `ai-tool-call` 通用渲染器作为 fallback
- 包内不提供任何专用工具渲染器（保持包体积最小）；专用实现由 host 经 `xui:imports` 注入

**收益**：与 Agent Elements 的 `tool-<Name>` 命名约定 + shadcn 注册表模式对齐。host 可自由注册 `ai-tool-bash`、`ai-tool-edit` 等自定义渲染器。

### 3.4 [P2] 消息列表虚拟滚动

**参照**：CopilotKit（@tanstack/react-virtual）/ Chat UI（无虚拟滚动，列为严重不足）。

**建议**：`ai-message-list` 在 `totalMessages > 200` 时自动启用虚拟滚动。

**重要澄清**：虚拟滚动不能仅靠 IntersectionObserver 实现。完整的虚拟滚动需要：滚动容器高度管理、离屏 spacer 偏移计算、可变行高估算和测量、滚动位置在 item 回收时的保持。`@tanstack/react-virtual` 是解决此问题的标准库，且**已在工作区中存在**（flux-renderers-data / flux-renderers-form / flux-renderers-form-advanced 均直接依赖）。因此：

**推荐路径 A（推荐）**：复用工作区内已有的 `@tanstack/react-virtual`。体积增量 ~8KB gzip（与 CopilotKit 同栈）。直接使用 `useVirtualizer` 处理可变高度消息。

**推荐路径 B（备选）**：仅在 `totalMessages > 200` 时惰性加载 `@tanstack/react-virtual`（动态 import），P0-P1 场景（<200 条消息）零开销。

> AIKit 的 `useVirtualStickToBottom`（15.6KB）不是虚拟滚动实现，而是粘性底部自动滚动 hook。真实的虚拟滚动参照是 CopilotKit 的 `@tanstack/react-virtual` 集成。

**收益**：防止长对话中 DOM 节点膨胀（Chat UI 的已知痛点，1000+ 消息时严重卡顿）。

### 3.5 [P2] 公开 `useAutoScroll` hook

**现状**：自动滚动逻辑内嵌在 `ai-message-list` 渲染器内。

**参照**：AIKit 的 `useVirtualStickToBottom` hook（15.6KB，IntersectionObserver 实现），提供粘性底部 + 用户向上滚动时暂停 + 内容变化保持滚动位置。

**建议**：从 `ai-message-list` 提取 `useAutoScroll` hook，放入 `src/adapters/` 作为 host utility 导出。

```ts
export function useAutoScroll(
  containerRef: RefObject<HTMLDivElement>,
  options: {
    enabled?: boolean;
    threshold?: number; // 距底部多少 px 内触发自动滚动
    stickToBottom?: boolean; // 用户滚动到接近底部时粘性
  },
): {
  scrollToBottom: () => void;
  isAtBottom: boolean;
};
```

**收益**：host 可在自定义聊天布局中复用；`ai-message-list` 自身也使用同一 hook 减少重复。

---

## 4. 组件级别改进

### 4.1 ai-chat（P0 → P1 渐变）

| 改进项           | 阶段 | 参照来源                           | 说明                                                                        |
| ---------------- | ---- | ---------------------------------- | --------------------------------------------------------------------------- |
| 推理持续时间显示 | P2   | AI Elements / VLLNT UI             | `message.state.thinking.open` 旁显示 "Thought for Xs"，流式时 "Thinking..." |
| 错误态提升       | P1   | assistant-ui / CopilotKit          | 专用 `<ErrorMessage>` 渲染器（目前靠 `onError` 事件）；属于基本能力，不延后 |
| 空状态丰富化     | P1   | AI Elements ConversationEmptyState | ai-welcome 已满足 P1；P2 可增加 `emptyState` 的 `icon/badge/footer` 配置    |

### 4.2 ai-bubble（P0 → P2 渐变）

| 改进项         | 阶段 | 参照来源                                              | 说明                                                                                                                                                                    |
| -------------- | ---- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 流式光标动画   | P2   | VLLNT UI AIStreamingText / Agent Elements TextShimmer | `message.loading` 时追加闪烁光标 "▍"                                                                                                                                    |
| 消息时间戳     | P1   | AIKit ChatDate / VLLNT UI AIMessageMeta               | `data-slot="ai-bubble-time"` 显示相对时间（Today/Yesterday）                                                                                                            |
| 代码块复制按钮 | P1   | AI Elements / Agent Elements / Chat UI                | 代码块右上角 `CopyButton`；使用 `navigator.clipboard.writeText()`（与 flux-renderers-content 中 json-view 的已有模式一致，属用户手势触发的浏览器 API，不需要 env 封装） |
| 消息操作       | P1   | assistant-ui ActionBarPrimitive                       | `ai-feedback` 已覆盖 P1；P2 增加编辑/重试按工具类型                                                                                                                     |
| 引用渲染       | P3   | AI Elements InlineCitationCard                        | 检测 `[1], [2]` 模式，悬停显示引用详情；与 §5.1 `ai-citations` 渲染器为同一功能的不同实现层次                                                                           |

**LaTeX/数学公式**：AI Elements（Streamdown math 插件）、VLLNT UI、Chat UI 均支持数学公式渲染（`$$...$$`, `\(...\)`）。当前设计使用 `react-markdown` + `remark-gfm` + `rehype-raw`，可通过添加 `remark-math` + `rehype-katex` 插件（~20KB gzip，含 KaTeX CSS）支持。因 KaTeX 体积较大且非核心场景，**建议在 P2 再评估**：若数学场景高频出现则引入，否则由 host 通过 BubbleContentRenderer 自定义注入。

### 4.3 ai-message-list（P0 → P2 渐变）

| 改进项            | 阶段           | 参照来源                    | 说明                     |
| ----------------- | -------------- | --------------------------- | ------------------------ |
| 自动滚动暂停/恢复 | P0（已有描述） | AIKit useScrollPreservation | 设计文档已提及，确认实现 |
| 虚拟滚动          | P2             | CopilotKit / AIKit          | §3.4                     |

### 4.4 ai-sender（P0）

**无变动建议。** 当前设计已是最小可行方案，与所有 7 个库的 P0 一致。Tiptap 延后到 P6 是正确的。

### 4.5 ai-tool-call（P2）

| 改进项           | 阶段 | 参照来源                    | 说明                                                       |
| ---------------- | ---- | --------------------------- | ---------------------------------------------------------- |
| 工具状态颜色编码 | P2   | AI Elements（7 种状态图标） | 当前 `data-tool-status` 仅用 Lucide 图标；增加颜色辅助区分 |
| JSON 高亮        | P2   | —                           | 设计文档已规划；确认用 `jsonrepair` + JSON 正则高亮        |

### 4.6 ai-attachments（P2，补充分析）

**现状**：AiAttachment 模型包含 `status: 'uploading' | 'success' | 'error'` + `url` / `rawFile` 字段。设计文档未详细描述拖放交互和进度展示。

**外部库对照**：

- AI Elements PromptInput 支持拖放、剪贴板粘贴、截图捕获，附带头部进度环
- AIKit FileDropZone 支持拖放区域、文件类型图标、去除动画
- assistant-ui AttachmentAdapter 是完整的可插拔抽象

**建议**：P2 设计 `ai-attachments` 时参照以下模式：

- 拖放区域通过 `onDragOver`/`onDrop` 在 `ai-sender` 或 `ai-chat` 区域实现（状态由 `useState` 管理，不进 engine）
- 上传进度通过 `AiAttachment.status` 字段驱动 UI 展示（环形进度 / 线性进度）
- 文件类型图标通过 MIME 或扩展名映射（与 AIKit FileIcon 原子组件类似）
- 去除（删除）动画使用 Tailwind transition，无需额外依赖
- **不实现** 截图捕获（`getDisplayMedia`）（P4 可选，见 §5.3）

### 4.7 消息编辑（补充分析）

**参照**：assistant-ui EditComposer 合成器允许用户点击已发送的用户消息并编辑内容后重新提交。

**建议**：P2 在 `ai-bubble` 中为用户消息（`role: 'user'`）增加编辑模式。设计要点：

- 编辑态通过 `message.state.editing` 控制（`boolean`）
- 切换编辑模式触发 `onAction: 'edit'` event
- 编辑后重新提交触发 `onAction: 'resubmit'` → engine 清空原消息后的消息并重新 `sendMessage`
- 编辑状态是域内部（`message.state`），由 engine 持有

---

## 5. 增量功能建议

以下功能值得新增（以新渲染器或新 Hook 形式），但均非 P0，评估后纳入路线图。

### 5.1 [P3] `ai-citations` 渲染器

**功能**：内联引用气泡 + 引用来源列表。参照 AI Elements 的 `sources` 复合组件（SourcesTrigger / SourcesContent / Source）。

**设计要点**：

- 检测 `message.content` 中的 `[N]` 模式 → 渲染为 `<sup>` 气泡
- 悬停显示 `SourcesTrigger`（弹出卡片）
- 源数据从 `message.metadata.sources` 或 `ChatMessageDataPart` 的 `data-sources` 部分读取
- 纯渲染，不处理源数据获取（host 通过 connector 或 import 提供）

**收益**：填补 AI 对话中引用来源的空白；VLLNT UI（AISourceCitation）和 AI Elements 都提供此功能。

### 5.2 [P3] 消息操作确认（HITL）

**功能**：工具调用前的二次确认（"Approve/Skip"）。参照 Agent Elements 的审批页脚（Bash/Edit/Plan 工具卡片）和 assistant-ui 的 `renderAndWaitForResponse`。

**设计要点**：

- `ai-tool-call` 渲染器增加 `data-requires-approval` 属性
- 审批态通过 `message.state.toolCall[id].approval` 控制：`pending / approved / rejected`
- 确认/拒绝按钮触发 `onAction: 'approve' | 'reject'` event → host action handler 决策

**引擎影响**：此方案需要扩展 `ChatToolCallUIState`（`engine.md` §7.1），增加可选的 `approval` 字段。这是对 engine 状态类型的变更，不是纯 UI 变更。但 engine 的流程逻辑（暂停/等待/恢复）**不**在 engine 内实现 — engine 只负责提供状态字段和触发 `onAction` event；暂停/恢复工作流由 host 的 action handler 管理。这与 flux 纯渲染引擎的定位一致。

**不引入 engine 内暂停机制**的原因：flux 不负责工作流编排。工具调用的暂停/审批/恢复是业务逻辑决策，由 host 在 action handler 中实现（例如：点击拒绝后，host 调用 `engine.send(...)` 发送一条 tool 结果消息表示拒绝）。

### 5.3 [P4] `ai-voice-input` 渲染器

**功能**：语音输入按钮 + 波形动画。参照 AI Elements 的双回退方案。

**设计要点**：

- 独立渲染器（不是 ai-sender 的内置功能）
- P4 仅实现基本 `SpeechRecognition` API（Web Speech API）
- `MediaRecorder` 回退留给 host 自定义

**INV-1 说明**：`SpeechRecognition` 是用户手势触发的浏览器 API（麦克风输入），不属于 network I/O，与 `fetch`/`WebSocket`/`EventSource`/`localStorage`/`IndexedDB` 性质不同。因此不需要 env 封装，渲染器可直呼。这一判断与 AI Elements 的双回退方案（同样在组件内直呼 Web Speech API）一致。

### 5.4 [P4] 消息分支

**功能**：重新生成响应时创建分支，用户可在分支间切换。参照 assistant-ui `BranchPickerPrimitive` 和 AI Elements `MessageBranch`。

**设计要点**：

- 分支元数据不存储在 engine 内，由 host 管理
- engine 只负责"重新生成时记录新分支 ID"
- 渲染器通过 schema 注入的 branches 数据渲染分支选择器

### 5.5 [P4] `ai-token-usage` 渲染器

**功能**：显示 token 使用量 / 成本 / 上下文占比。参照 AI Elements 的 `Context` 组件。

**设计要点**：

- 纯展示组件，数据来自 `message.metadata.usage`（connector 负责填充）
- 环形进度显示已用/总计 token

---

## 6. 不建议引入项

以下能力来自外部库，但不符合 flux 设计定位（纯前端渲染引擎），明确**不引入**：

| 能力                                                  | 库来源                                          | 不引入理由                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **后端运行时**（GraphQL Yoga 服务器、运行时类）       | CopilotKit @copilotkit/runtime                  | flux 无后端；back-for-front 归 host                                                                                                                                                                                                              |
| **Babel standalone 浏览器编译**                       | Chat UI @llamaindex/dynamic-ui                  | ~1.4MB（400KB gzip）的浏览器编译器；`new Function()` 存在 XSS 风险                                                                                                                                                                               |
| **MCP SDK 客户端**                                    | assistant-ui / CopilotKit                       | P7 可选（见 §8）；但 flux 不应直接依赖 `@modelcontextprotocol/sdk`，应走 import 注入                                                                                                                                                             |
| **mermaid 图表**                                      | AI Elements Streamdown                          | ~500KB raw / ~120KB gzip 依赖，与 flux 纯前端渲染定位不符；若需图表能力，由 host 用 `iregion` 注入                                                                                                                                               |
| **Shiki 语法高亮**                                    | AI Elements / Agent Elements                    | ~50KB gzip 依赖；flux 的 code block 使用简单正则高亮 + `jsonrepair` 足够                                                                                                                                                                         |
| **Cloud / 付费托管**                                  | assistant-ui assistant-cloud / CopilotKit Cloud | 许可证和定价模型完全超出 flux 范围                                                                                                                                                                                                               |
| **全栈聊天框架**（非 composable 组件）                | VLLNT UI                                        | flux-renderers-ai 自身也是 React 19 独占（`peerDependencies: react@^19`），这不是 VLLNT UI 的不足。真正的排除原因是 VLLNT UI 是完整的全栈聊天框架（含 AISidebar/AIArtifact/ConversationThread 等全局布局组件），与 flux 的组合式渲染器设计不兼容 |
| **LLM 提供商适配器**（OpenAI SDK / Anthropic SDK 等） | 所有 7 个库                                     | 经 AiConnector 抽象 + env.stream；不内嵌任何 SDK                                                                                                                                                                                                 |

---

## 7. 无障碍评估

> 来自 7 个外部库的 a11y 模式分析。flux-renderers-ai 自身无障碍设计另见 `docs/architecture/renderer-markers-and-selectors.md`。

### 7.1 外部库的 a11y 最佳实践

| 模式                          | 库来源                                                    | 说明                                                         | 建议                                                                     |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `aria-live="polite"` 消息区域 | CopilotKit / Chat UI / AIKit                              | 聊天区域标记为实时区域，新消息到达时屏幕阅读器自动播报       | P1 在 `ai-message-list` 根元素添加 `role="log"` + `aria-live="polite"`   |
| 流式文本播报                  | AI Elements / VLLNT UI                                    | 流式 token 更新时触发 `aria-live` 通知                       | P2 在 `ai-bubble` 内容流式期间动态插入 `aria-live="polite"` 占位元素     |
| 焦点管理                      | AI Elements（模态审批）/ assistant-ui（Composer）         | 发送后焦点回输；模态审批使用焦点陷阱                         | P1 `ai-sender` 提交后 `ref.current?.focus()`；P3 HITL 模态需焦点陷阱     |
| 工具状态语义                  | VLLNT UI（AIToolCallDisplay）/ AI Elements（Tool）        | 工具调用状态（running/success/failed）使用 `aria-label` 传达 | P1 `ai-tool-call` 根元素加 `aria-label="Tool: {name}, status: {status}"` |
| 键盘导航                      | AI Elements（分支选择器方向键）/ assistant-ui（原语组合） | Tab 键 + 方向键导航消息列表和操作按钮                        | P2 消息列表支持 `Tab` / `Shift+Tab` 在消息间导航                         |

### 7.2 结论

flux-renderers-ai 基础 a11y 已在 `renderers.md` 中规划了 `data-slot` 和 `data-*` 属性，但缺少 `aria-live` 区域定义和屏幕阅读器通知机制。P1 应补充 `role="log"` + `aria-live="polite"` 在 `ai-message-list` 上（~3 行代码变更）。更完整的 a11y 审计应在 P2 实施。

---

## 8. 优先级与路线图

### P0（保持现状）

- `ai-chat` / `ai-message-list` / `ai-bubble`（仅 markdown + loading）/ `ai-sender`
- 基础 engine + createMessageEngine + useMessage hook
- createStreamBasedAiConnector（env.stream host helper）
- 现有 `ChatMessageContentPart`（text / image_url / file）

### P1（架构注入）

- §3.1 `ChatMessageDataPart` 扩展系统（为所有 future 扩展提供基础）
- §3.2 流式 Markdown 缓冲层（路径 C：仅 CJK + 代码 fence 缓冲）
- §4.2 代码块复制按钮、消息时间戳
- §4.1 错误态提升（专用 ErrorMessage 组件）
- `ai-conversations` / `ai-welcome` / `ai-prompts` / `ai-feedback`（按现有设计）

### P2（组件深化）

- §3.3 工具卡片类型化（BubbleToolRendererMatch 注册模式）
- §3.4 消息列表虚拟滚动（推荐路径 A：复用工作区内 `@tanstack/react-virtual`；备选路径 B：>200 条消息时动态 import）
- §3.5 `useAutoScroll` hook 提取公开
- §3.2 流式 Markdown 路径 B（评估 Streamdown 适配）
- §4.1 推理持续时间显示
- §4.2 流式光标动画、LaTeX/KaTeX 数学公式评估
- §4.5 工具状态颜色编码
- `ai-attachments` / `ai-tool-call`（按现有设计）

### P3（能力补全）

- §5.1 `ai-citations` 渲染器
- §5.2 消息操作确认（HITL / 审批页脚）
- §4.2 引用渲染（与 §5.1 同功能，见 §5.1）

### P4（高级/可选）

- §5.3 `ai-voice-input` 渲染器
- §5.4 消息分支
- §5.5 `ai-token-usage` 渲染器
- `ai-suggestions` 渲染器（从 design.md 原 P2 降级至此：因为 P1-P2 已有 `ai-prompts` 覆盖推荐提示词场景，`ai-suggestions`（Popover/Pills 弹出态建议）需求较弱，P4 再评估）

### P7（可选）

- `ai-mcp-manager` 渲染器（依赖 host 注入 MCP 客户端）

---

## 附录 A：改进项汇总表

> 所有体积为 **gzip** 估算（压缩后）。源码体积约为 3-5x。

| ID   | 改进                                                      | 类型 | 阶段 | 体积影响 (gzip)                         | 外部库参照                    | 依赖                                   |
| ---- | --------------------------------------------------------- | ---- | ---- | --------------------------------------- | ----------------------------- | -------------------------------------- |
| A-1  | ChatMessageDataPart 类型                                  | 类型 | P1   | ~0KB                                    | Chat UI                       | —                                      |
| A-2  | 流式 Markdown CJK + code fence 缓冲                       | 渲染 | P1   | +~2KB                                   | Streamdown                    | —                                      |
| A-3  | 代码块复制按钮                                            | 功能 | P1   | +~0.5KB                                 | 通用                          | —                                      |
| A-4  | 消息时间戳                                                | 功能 | P1   | +~0.5KB                                 | AIKit / VLLNT UI              | —                                      |
| A-5  | 错误态组件                                                | 渲染 | P1   | +~1KB                                   | assistant-ui                  | —                                      |
| A-6  | 工具卡片类型化（BubbleToolRendererMatch 注册模式）        | 架构 | P2   | +~2KB（仅注册机制，不含具体渲染器实现） | Agent Elements                | xui:imports                            |
| A-7  | 流式 Markdown 适配 Streamdown（core + CJK + code + math） | 渲染 | P2   | +~8KB                                   | Streamdown                    | streamdown/core（排除 mermaid）        |
| A-8  | 虚拟滚动（@tanstack/react-virtual）                       | 功能 | P2   | +~8KB                                   | CopilotKit                    | @tanstack/react-virtual（已在工作区）  |
| A-9  | useAutoScroll hook                                        | 架构 | P2   | +~3KB                                   | AIKit                         | —                                      |
| A-10 | 推理持续时间                                              | 功能 | P2   | +~0.5KB                                 | AI Elements / VLLNT UI        | —                                      |
| A-11 | 流式光标动画                                              | 功能 | P2   | +~0.5KB                                 | VLLNT UI / Agent Elements     | —                                      |
| A-12 | 工具状态颜色                                              | 样式 | P2   | +~0KB                                   | AI Elements                   | —                                      |
| A-13 | ai-citations 渲染器                                       | 渲染 | P3   | +~4KB                                   | AI Elements / VLLNT UI        | A-1 (data-sources part)                |
| A-14 | HITL 审批页脚                                             | 功能 | P3   | +~2KB                                   | Agent Elements / assistant-ui | ChatToolCallUIState 扩展               |
| A-15 | ai-voice-input 渲染器                                     | 渲染 | P4   | +~3KB                                   | AI Elements / assistant-ui    | SpeechRecognition API                  |
| A-16 | 消息分支                                                  | 功能 | P4   | +~3KB                                   | assistant-ui / AI Elements    | —                                      |
| A-17 | ai-token-usage 渲染器                                     | 渲染 | P4   | +~2KB                                   | AI Elements                   | connector 需填充 usage                 |
| A-18 | ai-mcp-manager                                            | 渲染 | P7   | +~5KB                                   | assistant-ui / CopilotKit     | @modelcontextprotocol/sdk（host 提供） |

> 体积估算基于 gzip 压缩后的生产构建增量。源码体积约为 3-5x。A-1 (ChatMessageDataPart) 和 A-12 (工具状态颜色) 为零体积增量因为前者为纯类型定义，后者仅使用现有 Tailwind 色板。

**合计额外体积（max）**：~40KB gzip（全量引入所有 P1-P7 改进）
**实际典型场景（P0-P2）**：~16KB gzip

# tiny-robot 设计调研报告（面向 React 19 + flux 移植）

> **生成日期**：2026-07-21
> **调研对象**：`C:\can\nop\tiny-robot`（OpenTiny 团队开源的 Vue 3 AI 组件库，MIT 许可）
> **调研目的**：为新建 `flux-renderers-ai` 包提供设计参考，识别可移植的资产（思路与源码）与必须重写的部分
> **配套文档**：`docs/components/flux-renderers-ai/design.md`（基于本报告的综合设计方案）
> **关键发现**：项目核心的消息引擎**已是框架无关的**，移植成本远低于一个典型 Vue 库

---

## 0. 总体架构（一句话先说清）

```
┌─────────────────────────────────────────────────────────────┐
│ packages/components (Vue 组件，纯 UI)                       │
│   Bubble / Sender / Container / History / Attachments ...   │
└─────────────────────┬───────────────────────────────────────┘
                      │ 通过 props/composables 注入
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ packages/kit/src/vue (Vue 适配层)                           │
│   useMessage / useConversation                              │
│   vue/message/adapters/vue.ts (Vue 响应式 adapter)          │
└─────────────────────┬───────────────────────────────────────┘
                      │ 调用
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ packages/kit/src/message (★ 框架无关核心)                  │
│   core/engine.ts   ← MessageEngine (状态机 + 插件链)        │
│   adapters/native.ts ← 纯 TS adapter                        │
│   plugins/ (thinking/tool/length/skill)                     │
│   types.ts (ChatMessage / MessageEnginePlugin 接口)         │
└─────────────────────────────────────────────────────────────┘
```

**这是移植时最重要的认知**：你不应该从 `useMessage`/`useConversation` 这种 Vue composable 去重写逻辑，而是直接复用 `kit/src/message/core/engine.ts` + `kit/src/message/adapters/native.ts`，或者自己写一个 React adapter。

---

## 1. 组件清单和职责

下表按"用途簇"组织，标注了关键源文件、职责、状态归属：

### 1.1 核心簇（4 个最重要的组件）

#### Bubble（含 BubbleList、BubbleProvider）—— 最有移植价值

- **职责**：把一组 `BubbleMessage[]` 渲染成可分组、可分块、可注册自定义渲染器的聊天气泡列表
- **源文件**：`packages/components/src/bubble/`
- **关键 props**（`packages/components/src/bubble/index.type.ts`）：
  - `BubbleProps`（行 47-56）：`hidden` / `avatar` / `placement: 'start'|'end'` / `shape: 'corner'|'rounded'|'none'` / `contentRenderMode: 'single'|'split'` / `contentResolver` / `fallbackBoxRenderer` / `fallbackContentRenderer`
  - `BubbleListProps`（行 159-196）：`messages: BubbleMessage[]` / `groupStrategy: 'consecutive'|'divider'|Function`（默认 `'divider'`，按用户消息切割） / `dividerRole`（默认 `'user'`） / `roleConfigs: Record<string, BubbleRoleConfig>` / `autoScroll`
- **关键事件**：
  - `state-change`（携带 `key/value/messageIndex/contentIndex`）—— 子渲染器（如 Reasoning 折叠状态、Tool 展开状态）通过此事件回传到上层
  - `bubble-event`（自定义事件通道，名字为 `state:update` 或任意）
- **关键 slot**（行 138-143）：`prefix` / `suffix` / `after` / `content-footer`，全部带 `slotProps: { messages, role, contentIndex?, messageIndexes? }`
- **状态**：
  - 自身无独立状态；分组算法是 `computed`
  - **全局 store** 通过 `BubbleProvider` 的 `provide(BUBBLE_STORE_KEY)` 注入，用 `useBubbleStore<T>()` 读取。这是一个 reactive 对象，用于跨组件共享配置（如 `toolCallResults`、`mdConfig`、`dompurifyConfig`）
- **渲染器注册制**（核心设计，强烈推荐移植）：
  - `BubbleProviderProps.boxRendererMatches / contentRendererMatches`（`index.type.ts:211`）
  - 每个 match = `{ find(messages, content, contentIndex): boolean, renderer, priority?, attributes? }`
  - 优先级常量 `BubbleRendererMatchPriority`：`LOADING: -1 / NORMAL: 0 / CONTENT: 10 / ROLE: 20`（数字越小越优先）
  - **box 渲染器**包住整条消息（容器、边框、阴影）；**content 渲染器**渲染消息体内部（文本、图、工具调用、推理）
  - 默认渲染器（`renderers/defaultRenderers.ts`）：Box、Loading、Reasoning、Tools、Tool（单条）、ToolRole（role='tool' 的内容卡）、Image、Text、Markdown
- **关键模型**：
  - `BubbleMessage<T, S>`（`index.type.ts:38-45`）= `ChatMessage & { id?, loading?, state?: S }`
  - `BubbleMessageGroup`（行 58-67）：`{ role, messages, messageIndexes }`，`messageIndexes` 是为了把组内 local index 映射回全局 message index（事件冒泡时用）
- **配合使用**：被 `Container` 内部使用；通常配 `Sender`、`History`

#### Sender —— 强 Vue 绑定，移植需替换编辑器层

- **职责**：富文本输入框，处理提交、清空、停止、附件、@提及、模板、语音等
- **源文件**：`packages/components/src/sender/`
- **关键依赖**：**Tiptap 3** + `@tiptap/vue-3`（这是移植到 React 时必须替换的部分；可换 `@tiptap/react`）
- **关键 props**（`sender/index.type.ts:31`）：`modelValue` / `defaultValue` / `placeholder` / `disabled` / `loading`（true 时显示"停止"按钮）/ `mode: 'single'|'multiple'` / `autoSize` / `maxLength` / `showWordLimit` / `clearable` / `extensions`（Tiptap 扩展数组，用于 Mention/Suggestion/Template）/ `submitType: 'enter'|'ctrlEnter'|'shiftEnter'` / `defaultActions` / `hasExternalContent`（用于"附件未挂进编辑器但要允许提交"的场景）
- **关键 emits**（行 254-329）：
  - `update:modelValue`、`submit(textContent, structuredData?)`、`cancel`、`clear`、`focus`、`blur`、`input`
  - **`submit` 第二个参数 `StructuredData`**（`types/base.ts:216`）是设计亮点：当用 Template 扩展时返回 `TemplateItem[]`（含 `type: 'text'|'block'|'select'`），用 Mention 扩展时返回 `MentionStructuredItem[]`。这样调用方能拿到结构化输入，不只是纯文本
- **关键 slots**（行 338-381）：`header` / `prefix` / `content` / `actions-inline`（单行模式的内联按钮区）/ `footer` / `footer-right`
- **状态**：内部用 `useSenderCore`（`composables/useSenderCore.ts`）聚合多个子 composable：`useEditor` / `useModeSwitch`（单/多行切换）/ `useAutoSize` / `useKeyboardShortcuts`，然后通过 `provide(SENDER_CONTEXT_KEY, context)` 暴露给子组件（按钮们通过 `useSenderContext()` 读）
- **可拆解组件**：`sender-actions/` 提供 `ActionButton` / `SubmitButton` / `ClearButton` / `UploadButton` / `VoiceButton` / `WordCounter` / `DefaultActionButtons`
- **`sender-compat`**（`sender-compat/index.type.ts`）：v0.3.0 旧版 API 兼容层，移植可完全丢弃

#### Container —— 简单，移植容易

- **职责**：浮窗外壳（带顶部拖拽条、标题、操作按钮、全屏切换、关闭）
- **源文件**：`packages/components/src/container/index.vue`（仅 138 行）
- **关键 props**（`index.type.ts:1`）：`show`（v-model）/ `fullscreen`（v-model）/ `title`
- **关键 emits**：`close`
- **关键 slots**：`default` / `title` / `operations` / `footer`
- **状态**：完全无状态，纯展示
- **配合**：作为 `Layout` 的浮窗载体，或独立定位

#### Conversations —— ⚠️ 实际是空壳

- **职责**（声称）：会话列表 UI
- **现状**：`packages/components/src/conversations/index.vue` **只有 3 行占位代码**（`<template>conversations</template>`），**没有实现**
- **真正管理会话的逻辑在 `packages/kit/src/vue/conversation/useConversation.ts`**（详见第 3 节）
- **移植启示**：你不需要"移植 Conversations 组件"，需要的是"基于 `useConversation` 的状态模型，自己写一个 React 侧边栏"——可能是 `History` 组件（见下）才是 tiny-robot 真正用的会话列表 UI

### 1.2 其他组件（按簇）

#### 会话/导航簇

| 组件                                             | 文件                    | 职责                                                                                    | 关键 API                                                                                                                                                                                   |
| ------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **History**                                      | `history/index.type.ts` | 真正的会话/历史列表 UI（含分组、右键菜单、重命名）                                      | `data: HistoryData<T>` (扁平或分组)、`selected`、`menuItems: HistoryMenuItem[]`、`showRenameControls`；emits `item-click` 等。**这才是 Conversations 应有的实现**                          |
| **Anchor**                                       | `anchor/index.type.ts`  | 浮动锚点导航（带搜索、tooltip、滚动定位）                                               | `items: AnchorItem[]`、`scrollContainer`、`activeId`、`placement: 'left'\|'right'`、`expandTrigger: 'hover'\|'manual'`                                                                     |
| **Layout**                                       | `layout/index.type.ts`  | 完整布局容器：左/右 aside（dock/drawer）、floating 模式（可拖拽可缩放）、ProxyScrollbar | `mode: 'normal'\|'floating'`、`leftAside/rightAside: LayoutAsideOptions`、`floatingState`；大量 emits（drag/resize/aside-open-change）；slots: `left-aside/header/main/footer/right-aside` |
| **LayoutAsideToggle** / **LayoutProxyScrollbar** | 同上                    | aside 折叠按钮、滚动条代理                                                              | 简单                                                                                                                                                                                       |

#### 输入辅助簇

| 组件                                 | 文件                               | 职责                                                                                                                                                                       |
| ------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Attachments**                      | `attachments/index.type.ts`        | 附件列表 UI（图片模式 / 卡片模式自动切换）；`Attachment = UrlAttachment \| RawFileAttachment`；状态：`'uploading'\|'success'\|'error'`；自定义 `fileMatchers` 和 `actions` |
| **DragOverlay** + **vDropzone** 指令 | `drag-overlay/index.type.ts`       | 拖拽上传覆盖层；`DropzoneBinding` 配置 `accept/multiple/maxSize/maxFiles/onDrop/onError`                                                                                   |
| **Prompts**                          | `prompts/index.type.ts`            | 推荐提示词卡片列表（垂直/水平/折行），`PromptProps: { label, description, icon, badge, size }`                                                                             |
| **SuggestionPills**                  | `suggestion-pills/index.type.ts`   | 横向流式按钮条（自动溢出收纳到"更多"），`overflowMode: 'expand'\|'scroll'`                                                                                                 |
| **SuggestionPopover**                | `suggestion-popover/index.type.ts` | 弹出式建议浮层，支持分组、加载态、点击外部关闭                                                                                                                             |
| **Welcome**                          | `welcome/index.type.ts`            | 空状态欢迎页，极简：`title/description/align/icon` + footer slot                                                                                                           |
| **Feedback**                         | `feedback/index.type.ts`           | 消息底部的操作条（copy/refresh/like/dislike + sources 链接）                                                                                                               |

#### 操作/工具簇

| 组件                  | 文件                                | 职责                                                                         |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| **IconButton**        | `icon-button/index.type.ts`         | 纯 SVG 图标按钮，`icon/size/svgSize/rounded`                                 |
| **DropdownMenu**      | `dropdown-menu/index.type.ts`       | 触发式下拉菜单，`trigger: 'click'\|'hover'\|'manual'`，`items: {id, text}[]` |
| **ActionGroup**       | `action-group/index.type.ts`        | 按钮组（超出 `maxNum` 自动收纳到下拉"更多"）                                 |
| **FlowLayoutButtons** | `flow-layout-buttons/index.type.ts` | 流式布局按钮组（`linesLimit` 控制最大行数，超出收纳）                        |
| **BasePopper**        | `base-popper/`                      | 基于 `@floating-ui/dom` 的底层弹出层（被多个组件复用）                       |
| **ThemeProvider**     | `theme-provider/`                   | 主题/颜色模式提供者（详见第 9 节）                                           |

#### MCP / Skills 簇

| 组件                | 文件                              | 职责                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **McpServerPicker** | `mcp-server-picker/index.type.ts` | 插件市场 UI（"已安装"/"市场"两个 Tab），支持搜索、分类筛选、启用/禁用插件、启用/禁用单个工具；`PluginInfo = { id, name, icon, description, enabled, tools: PluginTool[], category }`；触发 `plugin-toggle/plugin-add/plugin-create/tool-toggle` 等事件 |
| **McpAddForm**      | `mcp-add-form/index.type.ts`      | 添加 MCP server 表单（两种 addType: `'form'` 填表 / `'code'` 配置代码）；表单字段 `name/description/type:'sse'\|'streamableHttp'/url/headers/thumbnail`                                                                                                |

> ⚠️ **重要发现**：组件名叫 `McpServerPicker`，但组件本身**只是 UI**——它只 emit 事件，**完全不包含 MCP 协议客户端代码**。"AI 调用 MCP 工具"的实际逻辑不在 components 包里，而在 `kit/src/skills/` 和 `kit/src/message/plugins/skillPlugin.ts` + `toolPlugin.ts`（详见第 7 节）。

---

## 2. 消息数据模型（ChatMessage）

tiny-robot 中存在 **3 处 ChatMessage 定义**，容易混淆，列清：

### 2.1 三处定义对照

| 位置                                                 | 用途                          | 字段                                                                                                                                                                                        |
| ---------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/kit/src/types.ts:36-45`                    | kit 公共 API 层（最早、最简） | `role: string`、`content: string`、`reasoning_content?: string`、`metadata?: MessageMetadata`、`tool_calls?: ToolCall[]`、`tool_call_id?: string`、`[key: string]: any`                     |
| `packages/components/src/bubble/index.type.ts:25-32` | 组件层（让 content 支持数组） | `role: string`、`content?: ChatMessageContent`（= `string \| ChatMessageContentItem[]`）、`reasoning_content?: string`、`tool_calls?: ToolCall[]`、`tool_call_id?: string`、`name?: string` |
| `packages/kit/src/message/types.ts:23-32` ⭐         | **核心引擎层（最重要）**      | 继承 OpenAI SDK 的 `ChatCompletionMessageParam`，再加 `tool_calls?`、`loading?: boolean`、`metadata?: Metadata`、`state?: State`、`[key: string]: any`                                      |

### 2.2 字段汇总（以核心引擎层为准）

```ts
// packages/kit/src/message/types.ts:23
interface ChatMessage<
  Metadata extends object = Record<string, unknown>,
  State extends object = Record<string, unknown>,
> extends ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant' | 'tool'; // 来自 OpenAI SDK
  content: string | ChatMessageContentPart[]; // 来自 OpenAI SDK，支持多模态数组
  reasoning_content?: string; // DeepSeek/Anthropic 风格的"思考过程"
  tool_calls?: Array<ChatCompletionMessageToolCall>; // 来自 OpenAI SDK
  tool_call_id?: string; // role='tool' 时关联到对应 tool_call
  name?: string; // 来自 OpenAI SDK
  loading?: boolean; // 引擎写入：true 表示等待首个 chunk
  metadata?: Metadata; // 含 createdAt/updatedAt/model 等
  state?: State; // 渲染层用的 UI 状态（见 2.7）
  [key: string]: any;
}
```

### 2.3 内容字段：string 还是结构化？

**两层模型并存**：

- **核心引擎层**（`message/types.ts`）：`content` 跟随 OpenAI SDK 规范，可以是 `string` 或 `ChatMessageContentPart[]`（多模态，每项是 `{ type: 'text', text } | { type: 'image_url', image_url } | ...`）。流式 chunk 累积出的 `content` 在简单文本场景下就是 string。
- **组件层**（`bubble/index.type.ts:18-20`）：
  ```ts
  type ChatMessageContentItem = { type: string; [key: string]: any };
  type ChatMessageContent = string | ChatMessageContentItem[];
  ```
  并通过 `BubbleProps.contentResolver: (message) => ChatMessageContent | undefined`（行 53）允许业务方自定义"如何从 message 解析出可渲染内容"。
- **默认 resolver**：`(message) => message.content`（`Bubble.vue:20`、`BubbleList.vue:13`）

**markdown / 富文本**：内容是 markdown 字符串，由 `renderers/Markdown.vue` 用 `markdown-it` + `DOMPurify` 渲染（`Markdown.vue:14-33`）。配置可通过 `BubbleProviderProps.store.mdConfig / dompurifyConfig` 注入。

### 2.4 role 取值

来自 OpenAI SDK 的 `ChatCompletionMessageParam`：

- `'system' | 'user' | 'assistant' | 'tool'`
- kit 公共层（`types.ts:11`）定义 `MessageRole = 'system' | 'user' | 'assistant'`，但引擎实际接受 `'tool'`（用于工具结果回显）

### 2.5 tool_calls / tool_results 模型

- **请求侧**（assistant 发起调用）—— 来自 OpenAI SDK：
  ```ts
  // 来自 openai/resources，等价于 kit/types.ts:13 的简化版
  interface ToolCall {
    index: number;
    id: string;
    type: 'function';
    function: { name: string; arguments: string /* JSON string */; result?: string };
  }
  ```
- **结果侧**（tool 执行结果）：作为**独立的下一条 message** 入队，`role: 'tool'`，带 `tool_call_id` 关联（见 `engine.ts:184` 追加 `{ role: 'assistant', content: '', loading: true }`；`toolPlugin.ts:379-389` 追加 `{ role: 'tool', tool_call_id, content: '' }` 后流式累加 content）
- **结果回显**：见 `renderers/Tool.vue`，通过 `useToolCall` composable 从 `message.state.toolCall[toolCallId]` 读取状态、从 `BubbleProvider.store.toolCallResults[toolCallId]` 读取结果（见 7.4）

### 2.6 附件（attachments）如何建模

**关键：附件不在 ChatMessage 标准字段里**，而是：

- **UI 层独立建模**（`attachments/index.type.ts:20-43`）：
  ```ts
  type Attachment = UrlAttachment | RawFileAttachment;
  interface BaseAttachment {
    id?;
    name?;
    status?: 'uploading' | 'success' | 'error';
    fileType?;
    message?;
  }
  interface UrlAttachment extends BaseAttachment {
    url;
    size?;
    rawFile?: File;
  }
  interface RawFileAttachment extends BaseAttachment {
    rawFile: File;
    url?;
    size?;
  }
  ```
- **与 Sender 的关系**：Sender 通过 `hasExternalContent` prop（`sender/index.type.ts:147`）告诉组件"虽然编辑器文本为空，但有附件，可以提交"
- **与消息的关系**：附件由业务方自己决定如何序列化进 message（如转成 OpenAI 的 `image_url` content part）；tiny-robot 本身没把附件直接挂到 ChatMessage 上

### 2.7 推理内容（reasoning / thinking）建模

**双轨**：

1. **协议字段**：`reasoning_content?: string`（在 ChatMessage 上，DeepSeek-R1、Anthropic 风格）
2. **UI 状态字段**：`message.state.thinking: boolean` 和 `message.state.open: boolean`
   - 由 `message/plugins/thinkingPlugin.ts` 自动维护（行 11-44）：
     - 每收到一个 chunk，检查 `choice.delta.reasoning_content` 或 `choice.message.reasoning_content` 是否为非空字符串
     - 是 → 设置 `state.thinking = true; state.open = true`
     - 否 → 设置 `state.thinking = false; state.open = false`
   - `onTurnEnd`（行 45-64）兜底：流式中断时强制设为 false

`state` 字段是 ChatMessage 上的泛型对象（`state?: State`），是渲染层与引擎层之间的"UI 状态便签"，**默认会被 `requestMessageFieldsExclude: ['state', 'metadata', 'loading']` 过滤掉不发往后端**（`engine.ts:72`）。

### 2.8 消息状态（pending / streaming / done / error）

**关键：状态不在 message 上，而在 engine 上**：

```ts
// packages/kit/src/message/types.ts:20
type RequestState = 'idle' | 'processing' | 'completed' | 'aborted' | 'error';
type RequestProcessingState = 'requesting' | 'completing' | string; // 如 'calling-tools'
```

- **engine 级状态**：`requestState` + `processingState` 描述整个请求生命周期
- **message 级状态**：`loading?: boolean`（true 表示该 assistant 消息还在等待首个 chunk；首个 chunk 到达后被引擎置为 undefined，见 `engine.ts:196-202`）
- **基于 loading 的渲染**：`renderers/defaultRenderers.ts:23-27` 用 `find: (message) => Boolean(message.loading)` 匹配 `Loading` 渲染器（优先级 `LOADING = -1`，最高）
- **tool 调用子状态**：`message.state.toolCall[toolCallId].status: 'running'|'success'|'failed'|'cancelled'`（由 `toolPlugin.ts:208, 220` 写入）

---

## 3. 会话（Conversation）模型和管理

源文件：`packages/kit/src/vue/conversation/`

### 3.1 ConversationInfo / Conversation

```ts
// packages/kit/src/vue/conversation/types.ts:5-23
interface ConversationInfo {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}
interface Conversation extends ConversationInfo {
  engine: UseMessageReturn; // 每个会话独占一个消息引擎实例
}
```

设计要点：**会话 = 元数据 + 消息引擎实例**。每个会话有自己的 `useMessage` 引擎，承载自己的 messages 数组和请求生命周期。

### 3.2 列表/选中/增删的 API 签名

```ts
// types.ts:55-76
interface UseConversationReturn {
  conversations: Ref<ConversationInfo[]>;
  activeConversationId: Ref<string | null>;
  activeConversation: ComputedRef<Conversation | null>;
  createConversation: (params?: {
    id?: string;
    title?: string;
    metadata?: Record<string, unknown>;
    useMessageOptions?: Partial<UseMessageOptions>;
  }) => Conversation;
  switchConversation: (id: string) => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<void>;
  clear: () => void;
  updateConversationTitle: (id: string, title?: string) => void;
  saveMessages: (id?: string) => void;
  sendMessage: (content: string) => void; // 转发给 activeConversation.engine
  abortActiveRequest: () => Promise<void>;
}
```

### 3.3 状态管理策略（值得借鉴）

源文件：`useConversation.ts`，关键设计点：

1. **双层数据**：
   - `conversations: Ref<ConversationInfo[]>` —— **只有元数据**（id/title/createdAt/updatedAt/metadata），始终全量在内存中
   - `workingEngines: Map<string, UseMessageReturn>` —— **引擎实例缓存**，只保留活跃和后台运行中的会话（行 20）

2. **惰性加载 messages**（`ensureEngine`，行 159-184）：切换到某个会话时才创建引擎；如果 storage 提供 `loadMessages`，则从 storage 拉取作为 `initialMessages`

3. **清理空闲引擎**（`clearInactiveEngines`，行 227-239）：切换会话时清理"非活跃且非 processing"的引擎以释放内存；正在流式响应的会话切走后**继续运行**

4. **自动保存（可选）**（`setupAutoSave`，行 76-100）：
   - 仅当 `autoSaveMessages: true` 且 storage 提供 `saveMessages` 时启用
   - 用 `useThrottleFn` 节流（默认 1000ms，trailing + leading）
   - 深度 `watch(engine.messages, throttledSave)`

5. **存储合并策略**（行 116-153）：异步加载存储列表后，内存数据优先——避免 `loadConversations` 异步返回前用 `createConversation` 创建的会话被覆盖

6. **删除会话**（行 267-288）：先 `engine.abortRequest()` 中止运行中的请求 → 移除 watcher → 从 map 和 list 删除 → storage 删除 → 若删的是 active 则清空 activeConversationId

7. **当前会话选中**：通过 `activeConversationId` ref + `activeConversation` computed（行 36-47）派生。computed 内部把 ConversationInfo 与 workingEngines 中的 engine 拼成完整 Conversation

---

## 4. 流式响应处理

源文件：`packages/kit/src/utils.ts` + `packages/kit/src/message/core/engine.ts` + `packages/kit/src/message/utils.ts`

### 4.1 SSE 协议处理思路

两个版本（功能近似，用法不同）：

**`handleSSEStream(response, handler, signal?)` —— 回调式**（`utils.ts:21-97`）

- 用 `response.body.getReader()` 拿 `ReadableStream`
- `TextDecoder` 解码 → 缓冲 `buffer` → 按 `'\n\n'` 切事件 → 每事件用 `/^data: (.+)$/m` 抽 data → JSON.parse → 调 `handler.onData(parsed)`
- 处理 `data: [DONE]` → 调 `handler.onDone(latestFinishReason)`
- abort 处理：`signal.addEventListener('abort', () => reader.cancel())`；abort 时 `finishReason = 'aborted'`

**`sseStreamToGenerator<T>(response, { signal })` —— 异步生成器式**（`utils.ts:164-249`）

- 同样的 SSE 解析逻辑，但 yield 出每个解析后的 data
- abort 时抛 `AbortError`（`error.name === 'AbortError'`）

### 4.2 流式 chunk 如何累积成完整消息

**核心在 `combineDeltaData(target, source)`**（`message/utils.ts:133-189`），这是移植时**必须保留的算法**：

- **string + string** → 字符串拼接（特殊：`type` 字段已有值时不覆盖）
- **array + array**：
  - 两边都是 `{ index, ... }` 形式 → **按 index 合并**（这正是 OpenAI `tool_calls` 流式 chunk 的格式：每个 chunk 带 `index` 标识第几个 tool call）
  - 否则 → 直接拼接
- **object + object** → 递归合并
- **新字段** → 直接赋值

**累积入口**（`engine.ts:212-240`，`runDefault`）：

```ts
mutate('messages', () => {
  if (!assistantMessage.metadata) assistantMessage.metadata = {};
  assistantMessage.metadata.createdAt = chunk.created;
  assistantMessage.metadata.updatedAt = Math.floor(Date.now() / 1000);
  Object.assign(assistantMessage.metadata, rest);

  const data =
    ('delta' in choice && objectDataIsValid(choice.delta) && choice.delta) ||
    ('message' in choice && objectDataIsValid(choice.message) && choice.message) ||
    null;
  if (data?.role) assistantMessage.role = data.role;
  if (data) {
    const { role, ...restData } = data;
    combineDeltaData(assistantMessage, restData); // ← 关键：原地累积到 assistantMessage
  }
});
```

### 4.3 增量渲染如何触发

- **Vue 适配器**（`message/adapters/vue.ts:80-123`）：`mutate` 内部跑 recipe（直接修改 `messages.value[i]` 上的 reactive 对象属性），跑完后 `messages.value = [...messages.value]` 强制替换数组引用 + `subscriptions.notify(kinds)` 通知订阅者
- 因为每条 message 是 `reactive(message)`（行 20），所以 `combineDeltaData` 原地改 `assistantMessage.content += chunk` 也会触发 Vue 响应式更新
- **React 移植策略**：react adapter 可以走类似路径——但更 idiomatic 的做法是 `mutate('messages', recipe)` 跑完后整体 `setState(newMessages)`，让 React.memo + 不变引用天然处理重渲染

### 4.4 错误/中断处理

**中断**（`engine.ts:447-462`）：

```ts
async function abort() {
  runtime.abortController?.abort();
  if (getState().isProcessing) {
    await new Promise<void>((resolve) => {
      let unsubscribe = () => {};
      unsubscribe = subscribe('requestState', (s) => {
        if (!s.isProcessing) {
          unsubscribe();
          resolve();
        }
      });
    });
  }
}
```

设计要点：abort 后**等到 requestState 真正变为非 processing 才返回**，避免调用方过早以为已停止。

**AbortError 识别**（`engine.ts:356-365`）：abort 信号已 abort / `error instanceof AbortError` / `error.name === 'AbortError'` 三重判断 → 设 `requestState = 'aborted'`；其他错误 → `requestState = 'error'`，调插件的 `onError` 钩子。

**makeAbortable**（`message/utils.ts:45-54`）：用 `Promise.race([originalPromise, abortPromise])` 把任意 Promise 变成可中断，并在 finally 中 cleanup 监听器。

### 4.5 `extractTextFromResponse` / `formatMessages` 的作用

- **`extractTextFromResponse(response: ChatCompletionResponse): string`**（`utils.ts:137-143`）：从**非流式**响应里取 `choices[0].message.content`。仅用于 `BaseModelProvider` 这套老 API（见第 5 节），新引擎用不到
- **`formatMessages(messages: Array<ChatMessage | string>): ChatMessage[]`**（`utils.ts:105-130`）：把混合输入归一为 `{ role, content, name? }`，字符串默认当 user 消息。同样服务于老 API

> ⚠️ 这两个工具属于 `BaseModelProvider`（已弃用路线），新引擎直接消费 `ChatCompletion | ChatCompletionChunk`，不需要它们。

---

## 5. Provider 抽象

tiny-robot 同时存在**两套 Provider 抽象**，这是移植时最容易踩坑的地方：

### 5.1 老抽象：`BaseModelProvider`（`packages/kit/src/providers/base.ts`，标记 `@deprecated`）

```ts
// providers/base.ts:6-62
abstract class BaseModelProvider {
  protected config: AIModelConfig;
  abstract chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract chatStream(request: ChatCompletionRequest, handler: StreamHandler): Promise<void>;
  updateConfig(config: AIModelConfig): void;
  getConfig(): AIModelConfig;
  protected validateRequest(request): void; // 强制 messages 非空 + 每条有 role+content
}
```

- **`StreamHandler`**（`types.ts:194-198`）：`{ onData: (data) => void, onError, onDone: (finishReason?) => void }`
- **`OpenAIProvider`**（`providers/openai.ts`）实现了它，构造时取 `apiUrl`（默认 `https://api.openai.com/v1`）、`apiKey`、`defaultModel`（默认 `gpt-3.5-turbo`）
- **DeepSeek 接入**：通过 `AIClient.createProvider`（`client.ts:39-49`）用 `new OpenAIProvider({ defaultModel: 'deepseek-chat', apiUrl: 'https://api.deepseek.com/v1', ...config })`——任何 OpenAI 兼容服务都这么接
- **自定义 provider**：`AIModelConfig.provider = 'custom'` + `providerImplementation: BaseModelProvider` 实例（`client.ts:34-36`）
- ⚠️ `AIClient` 整个类被标记 `@deprecated`（`client.ts:13`）

### 5.2 新抽象：`ResponseProvider`（`packages/kit/src/message/types.ts:40-43`，⭐ 真正的引擎契约）

```ts
type ResponseProvider<T extends ChatCompletion | ChatCompletionChunk> = (
  requestBody: MessageRequestBody,
  abortSignal: AbortSignal,
) => AsyncStreamableResult<T>;
// 即：(requestBody, signal) => Promise<T> | AsyncGenerator<T> | Promise<AsyncGenerator<T>>
```

**这是新引擎的唯一契约**——只要你的函数：

1. 接收 `{ messages, tools?, ...}` 和 `AbortSignal`
2. 返回 OpenAI 格式的 `ChatCompletion`（非流式）或 `ChatCompletionChunk` 流（流式），或它们的 Promise / AsyncGenerator

就能直接接入。**业务方完全不需要继承 `BaseModelProvider`**，写一个函数即可。

`MessageRequestBody`（`message/types.ts:34-38`）= `{ messages: ChatMessage[], tools?: ChatCompletionTool[], [key: string]: any }`——`tools` 字段会被 `toolPlugin.onBeforeRequest`（`toolPlugin.ts:336-348`）动态注入。

### 5.3 移植建议

- **直接丢弃** `BaseModelProvider` + `OpenAIProvider` + `AIClient` + `handleSSEStream`（回调式）+ `formatMessages` + `extractTextFromResponse`
- **保留** `ResponseProvider` 抽象 + `sseStreamToGenerator`（生成器式）
- 移植后给业务方提供：
  - `createOpenAIResponseProvider({ baseURL, apiKey, model })` 返回一个 `ResponseProvider` 函数（内部用 `sseStreamToGenerator` 解析 SSE）
  - DeepSeek/通义/Kimi 等 OpenAI 兼容服务只需换 `baseURL`

---

## 6. 存储层

源文件：`packages/kit/src/storage/`

### 6.1 存储接口抽象（`storage/types.ts`）

```ts
interface ConversationStorageStrategy {
  loadConversations: () => MaybePromise<ConversationInfo[]>;
  loadMessages: (conversationId: string) => MaybePromise<ChatMessage[]>;
  saveConversation: (conversation: ConversationInfo) => MaybePromise<void>;
  saveMessages: (conversationId: string, messages: ChatMessage[]) => MaybePromise<void>;
  deleteConversation?: (conversationId: string) => MaybePromise<void>; // 可选
}
```

设计简单干净，移植时**完全可保留**。

### 6.2 LocalStorage vs IndexedDB 策略

| 维度      | `LocalStorageStrategy`（`localStorageStrategy.ts`）                   | `IndexedDBStrategy`（`indexedDBStrategy.ts`）                                                                         |
| --------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 默认键/库 | key: `'tiny-ai-conversations'`                                        | db: `'tiny-robot-ai-db'`, version: 3                                                                                  |
| 数据结构  | 单个 JSON 字符串数组：`[{ id, title, ..., messages: ChatMessage[] }]` | 两个 object store：`conversations`（主键 `id`，按 `updatedAt` 索引）+ `messages`（主键 `conversationId`，存整个数组） |
| 加载会话  | 反序列化 + 去掉 messages 字段                                         | `getAllFromIndex('conversations', 'by-updated').reverse()`                                                            |
| 加载消息  | 反序列化后找到对应 conversation，取 messages                          | `db.get('messages', conversationId)`                                                                                  |
| 工厂      | `localStorageStrategyFactory({ key })`（`factories.ts:20`）           | `indexedDBStorageStrategyFactory({ dbName, dbVersion })`（`factories.ts:27`）                                         |
| 适用场景  | 数据量小、同步访问                                                    | 大量会话/消息（推荐）                                                                                                 |

`useConversation` 默认用 LocalStorage（`useConversation.ts:11`：`options.storage || localStorageStrategyFactory()`）。

### 6.3 序列化/反序列化

- **Vue Proxy 解包**：`storage/utils.ts:13-97` 的 `unwrapProxy(value, visited)` 递归 `toRaw`，跳过函数、Symbol、getter/setter，处理循环引用——这是 Vue 特有需求，**React 移植时直接删掉**
- **旧格式兼容**：`transformMessages`（`utils.ts:100-120`）把旧的 `renderContent: [{ type: 'collapsible-text' }, { type: 'markdown' }]` 转换为新的 `reasoning_content` + `content`——可保留作为数据迁移参考

### 6.4 自定义存储接入点

实现 `ConversationStorageStrategy` 接口传给 `useConversation({ storage })` 即可。例如可以写一个 `ServerStorageStrategy` 走 HTTP，接口天然支持 `MaybePromise`。

---

## 7. MCP 集成（实际是 Skills + Tools 系统）

### 7.1 概念辨析（关键）

tiny-robot 的"AI 工具调用"体系实际由 3 个概念组成，**MCP 命名带有误导**：

1. **Tools（工具）**：OpenAI Function Calling 协议，由 `toolPlugin` 实现
2. **Skills（技能）**：受 Anthropic "Skills" 启发的封装——一个文件夹（含 `SKILL.md` 入口 + 资源文件），可以注入 `instructions` 到 system prompt，并提供工具
3. **MCP（组件命名）**：`mcp-server-picker` 和 `mcp-add-form` 是**纯 UI 组件**，用于"插件管理面板"，**不包含 MCP 协议客户端代码**

### 7.2 用户如何选择/添加 MCP server（UI 层）

- `McpServerPicker`（`mcp-server-picker/index.type.ts`）展示两个 Tab：
  - **"已安装"**：列出 `installedPlugins: PluginInfo[]`，每个 plugin 含若干 `tools: PluginTool[]`，支持单独启用/禁用工具
  - **"市场"**：列出 `marketPlugins`，可分类筛选，点击"添加"触发 `plugin-add` 或 `plugin-create`
- `McpAddForm` 提供两种添加方式：
  - `addType: 'form'`：填表（`name/description/type:'sse'|'streamableHttp'/url/headers/thumbnail`）
  - `addType: 'code'`：直接粘贴 JSON 配置
- 这些组件**只 emit 事件**，"如何真正连到 MCP server"由业务方实现

### 7.3 AI 如何调用 MCP 工具（核心机制）

**`toolPlugin`**（`message/plugins/toolPlugin.ts:125-479`）—— 这是真正干活的：

#### 7.3.1 工具来源（3 种）

```ts
// toolPlugin.ts:28-36
interface RuntimeTool {
  tool: ChatCompletionFunctionTool; // OpenAI 工具 schema
  handler: (toolCall, context) => MaybeStreamableResult<string | object>; // 执行函数
}
type ToolProviderItem = ChatCompletionTool | RuntimeTool;
```

- **直接传 schema**：`getTools(context): ToolProviderItem[]` 返回纯 schema，由 `callTool(toolCall, context)` 统一执行
- **`RuntimeTool`**：schema + 内置 handler，更自包含（推荐）
- **跨插件协议**：任何插件可实现 `provideTools(context): ToolProviderItem[]` 接口（`toolPlugin.ts:38-40`），`toolPlugin` 在 `onBeforeRequest` 时聚合所有插件的工具（行 257-321）

#### 7.3.2 调用生命周期

1. `onBeforeRequest`（行 336-348）：`resolveTools` 聚合所有工具（来自 `getTools` + 所有插件的 `provideTools`）→ 写入 `requestBody.tools`，并去重重名（行 290-300，重名抛错）
2. 引擎发出请求 → AI 返回 `finish_reason: 'tool_calls'` 的 assistant 消息
3. `onAfterRequest`（行 349-477）：
   - 校验 `lastChoice.finish_reason === 'tool_calls'`
   - 调 `beforeCallTools` 钩子
   - 对每个 `tool_call`：
     - 创建并追加 `{ role: 'tool', tool_call_id, content: '' }` 占位消息（行 379-389）
     - `toolCallStart`：写 `state.toolCall[toolCallId].status = 'running'`，调 `onToolCallStart`
     - 执行（`runtimeTool.handler` 或 `callTool`），用 `normalizeToAsyncGenerator` 支持流式结果（行 412）
     - 流式累加到 `toolMessage.content`（行 415-442）—— 字符串拼接或 JSON 合并
     - `toolCallEnd`：写 `state.toolCall[toolCallId].status = 'success'|'failed'|'cancelled'`
   - `Promise.all` 等所有工具并行完成
   - 若未 abort，调 `requestNext()` → 触发 `executeRequest` 再发一轮，让 AI 看到工具结果继续回答

#### 7.3.3 容错

- `autoFillMissingToolMessages` 选项（行 180、330-335）：请求前扫描历史，对有 `tool_calls` 但缺对应 tool 消息的 assistant 消息补一条 `{ role: 'tool', content: 'Tool call cancelled.' }`，避免 OpenAI API 因消息序列不完整报错
- 工具执行抛错且 abort → `status: 'cancelled'`；其他错误 → 设 content 为 `toolCallFailedContent`，`status: 'failed'`

### 7.4 工具调用结果如何回显到 bubble

源文件：`bubble/renderers/Tool.vue` + `composables/useToolCall.ts`

- **匹配渲染器**：`defaultContentRendererMatches`（`defaultRenderers.ts:33-36`）用 `find: (message) => Array.isArray(message.tool_calls) && message.tool_calls.length > 0` 匹配 `Tools` 渲染器（一次匹配整组）
- **Tools → Tool**：`renderers/Tools.vue` 对 `message.tool_calls` 数组每项渲染一个 `Tool` 组件
- **Tool 组件**（`Tool.vue`）读取：
  - `toolCall = message.tool_calls[toolCallIndex]`（参数 `function.arguments`）
  - `state = message.state?.toolCall[tool.id]`（status + open）—— 决定图标（loading/success/error/cancelled）和展开态
  - `toolCallResults = BubbleProvider.store.toolCallResults[tool.id]`（结果字符串）—— **结果来自全局 store 而不是 message**，这是个有意思的设计选择
- **结果格式化**：用 `jsonrepair` 修复流式截断的 JSON，再 `JSON.stringify(parsed, null, 2)` 美化，再用正则做语法高亮（key/string/number/boolean/null 着色）
- **状态上报**：点击展开/折叠 → `handleBubbleEvent({ name: 'state:update', payload: { key: 'toolCall', value: { [id]: { ...state, open } } } })` → 冒泡到 BubbleList 的 `state-change` 事件

### 7.5 Skills 系统（更高层的封装）

源文件：`packages/kit/src/skills/` + `message/plugins/skillPlugin.ts`

- **SkillDefinition**（`skills/types/index.ts:71-92`）：`{ name, description, instructions, resources?: SkillResourceDescriptor[], metadata? }`
- **加载**：`loadSkill({ source: 'browser' | 'github', ... })` → 找到 `SKILL.md` → 解析 frontmatter（name/description/metadata）+ body（作为 instructions）+ 其余文件作为 resources
- **存储**：`SkillStorage<TImportOptions>` 接口（`skills/storage/types.ts:20-28`）：`add/get/has/delete/list/import`，提供 `IndexedDBSkillStorage` 和 `MemorySkillStorage` 两种实现
- **两种选择模式**（`skillPlugin.ts:9-44`）：
  - `mode: 'manual'`：业务方指定 skill 名字或内联 skill 定义
  - `mode: 'auto'`：注入 `select_skills` 工具（`capabilities/selection.ts`），让 AI 自己从候选中选；选中后加载完整 skill
  - `mode: 'none'`：禁用

**skillPlugin 实际做的事情**：

1. 把选中 skills 的 `instructions` 注入到请求中（作为 system message）
2. 通过 `provideTools` 协议把 skill 提供的工具暴露给 `toolPlugin`
3. 把 `SkillRequestContext` 写入 `customContext.__tiny_robot_skill`，供其他钩子读取

### 7.6 移植启示

- **toolPlugin 的设计非常通用**，可以原样移植到 React——它本身就是纯 TS
- **skillPlugin 较重**，如果不做 agent 场景可以暂时不移植
- **MCP UI 组件**（mcp-server-picker / mcp-add-form）可以保留设计，但实际连接 MCP server 的代码需要自己写（用 `@modelcontextprotocol/sdk`）

---

## 8. Vue Composables 设计 + 框架无关核心

### 8.1 `useMessage` 管什么（`vue/message/useMessage.ts`）

**核心职责**：把框架无关的 `createMessageEngine`（`message/core/engine.ts`）包装成 Vue ref + composable。

返回（`vue/message/types.ts:114-123`）：

```ts
interface UseMessageReturn {
  requestState: Ref<RequestState>;
  processingState: Ref<RequestProcessingState | undefined>;
  messages: Ref<ChatMessage[]>;
  responseProvider: Ref<ResponseProvider>;
  isProcessing: ComputedRef<boolean>;
  sendMessage: (content: string) => Promise<void>;
  send: (...msgs: ChatMessage[]) => Promise<void>;
  abortRequest: () => Promise<void>;
}
```

**状态 vs Action 边界**：

- **状态**：`requestState`、`processingState`、`messages`、`isProcessing`（computed）
- **Action**：`sendMessage`、`send`、`abortRequest`
- **可热替换**：`responseProvider` 是 ref，watch 它变化时调 `engine.setResponseProvider`（行 173-179）

### 8.2 `useConversation` 管什么（见第 3 节）

聚合多个 `useMessage` 引擎 + ConversationInfo 列表 + storage + 自动保存。

### 8.3 组件与 composable 的边界

- **组件（Bubble、BubbleList）**：纯渲染层，所有数据通过 props 传入（`messages`、`roleConfigs`、`groupStrategy`）
- **composable**：管理状态机和副作用（fetch、abort、storage、订阅）
- **核心引擎**：纯逻辑、可测试、框架无关

### 8.4 框架无关核心的设计（移植核心知识点）

`MessageEngine` 接口（`message/types.ts:65-73`）：

```ts
interface MessageEngine {
  getState(): PublicMessageState;
  subscribe(listener: (state) => void): () => void;
  subscribe(kinds: MessageUpdateKinds, listener): () => void; // 'messages' | 'requestState'
  sendMessage(content: string): Promise<void>;
  send(...msgs: ChatMessage[]): Promise<void>;
  abort(): Promise<void>;
  setResponseProvider(provider: ResponseProvider): void;
}
```

**关键解耦点是 `MessageStateAdapter`**（`message/types.ts:90-109`）：

```ts
interface MessageStateAdapter {
  initialize(initialState: InternalMessageState): void;
  getState(): PublicMessageState;
  createMessage<T>(message: T): T; // Vue: reactive(message) | Native: 原样返回
  mutate: MutateMessageStateFn;
  subscribe(listener): () => void;
  subscribe(kinds, listener): () => void;
}
```

**两种实现**：

- `createNativeMessageAdapter()`（`adapters/native.ts`）：纯 TS，闭包变量保存状态
- `createVueMessageAdapter()`（`adapters/vue.ts`）：用 `ref`/`reactive`/`computed`，并实现 `createMessage = reactive`

**`mutate(kinds, recipe)` 是核心抽象**（`message/types.ts:79-88`）：

- 在受控上下文里执行 recipe（直接 mutate draft）
- 通过 `skipNotify()` 让 recipe 主动声明"这次改动无需通知"
- 跑完后按 `kinds`（`'messages'` / `'requestState'`）通知对应订阅者
- Vue adapter 还会在 `'messages'` 时额外 `messages.value = [...]` 替换数组引用

**插件上下文也是抽象的**（`message/types.ts:111-210`）：`BasePluginContext`、`BeforeRequestContext`、`AfterRequestContext`、`CompletionChunkContext` 都通过 `createMessage` 和 `mutate` 与框架交互，**不依赖 Vue**。

### 8.5 哪些是 Vue 特有的（不能直接移植）

| Vue 特有的                                    | 替代方案（React 19）                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `ref/reactive/computed/watch`                 | `useState` + `useReducer` + `useMemo` + `useEffect` + `useSyncExternalStore` |
| `provide/inject` + `InjectionKey`             | React Context + `use(Context)`                                               |
| `defineProps/defineEmits/defineSlots`         | 普通 props + JSX children + callback props                                   |
| `defineModel` 双向绑定                        | `value` + `onChange` 受控                                                    |
| `<component :is={...}>` 动态组件              | JSX `{<Component .../>}` 直接渲染                                            |
| `v-model`、`v-show`、`v-html`                 | `value/onChange`、`hidden` 或条件渲染、`dangerouslySetInnerHTML`             |
| `useEditor`（Tiptap/vue-3）                   | `@tiptap/react` 的 `useEditor`（API 几乎一致，移植成本不高）                 |
| `markRaw` 避免 reactive 包组件                | React 无此问题                                                               |
| `toRaw` / `reactive` 在 storage 里            | 直接 `JSON.parse(JSON.stringify())` 或 `structuredClone`                     |
| `useBubbleStore` 用 reactive 对象做全局 store | React Context + useState，或 Zustand（与 flux 已对齐！）                     |

### 8.6 哪些是通用思路（可直接移植）

- 整个 `message/core/engine.ts`（~470 行，框架无关）
- 整个 `message/utils.ts`（`combineDeltaData` / `normalizeToAsyncGenerator` / `makeAbortable` / `pickFields` / `omitFields`）
- 整个 `message/plugins/`（thinking / tool / length / skill）
- `MessageStateAdapter` 接口和 `createNativeMessageAdapter`
- `MessageEnginePlugin` 生命周期：`onTurnStart → onBeforeRequest → (流式) onCompletionChunk → onAfterRequest → 可能 requestNext 递归 → onTurnEnd → onError/onFinally`
- Bubble 渲染器注册制（find/renderer/priority）
- ConversationStorageStrategy 接口和两个实现
- ResponseProvider 函数式抽象 + sseStreamToGenerator
- 主题 CSS 变量 + `data-tr-color-mode` 属性方案
- ConversationInfo/Conversation 双层模型 + workingEngines 缓存 + 惰性加载

---

## 9. 主题和样式

源文件：`packages/components/src/styles/` + `theme-provider/`

### 9.1 CSS 变量分层（`styles/variables.css`）

**5 层 token**（行 1-65 全局，行 67+ 按颜色模式）：

1. **层级管理**（z-index 体系）：`--tr-z-index-base/fixed/dropdown/popover/tooltip/modal/drawer/overlay/toast/message/loading`（`base: 0` → `loading: 9999`）
2. **间距系统**：`--tr-spacing-2xs(2px) / xs(4) / sm(8) / md(12) / lg(16) / xl(20) / 2xl(24) / 3xl(28)`
3. **圆角系统**：`--tr-radius-xs(2) / sm(4) / md(8) / lg(12) / xl(16) / full(9999)`
4. **字体系统**：`--tr-font-size-xs(12) / sm(14) / md(16) / lg(18) / xl(20) / 2xl(22) / 3xl(24)`
5. **字体粗细**：`--tr-font-weight-thin(100)` 到 `black(900)` 9 档

**颜色 token 分组**（每个组件一组，如 `--tr-attachments-*`、`--tr-mcp-server-picker-*`、`--tr-sender-*`、`--tr-suggestion-*`）—— 这种"组件维度命名 token"vs flux 的"语义 token + Tailwind class"是两种不同哲学。

### 9.2 暗色模式实现（`theme-provider/index.vue`）

**机制**：在 `targetElement`（默认 `<html>`）上设置 `data-tr-color-mode='light'|'dark'` 属性，所有暗色变量挂在 `[data-tr-color-mode='dark']` 选择器下。

**三态 colorMode**：`'light' | 'dark' | 'auto'`（`auto` 跟随系统）：

- `systemColorMode` 监听 `window.matchMedia('(prefers-color-scheme: dark)')`（行 56-67）
- `resolvedColorMode` computed：auto 时取 system，否则取 colorMode（行 69-74）

**持久化**：可选 `storage: Pick<Storage, 'getItem'|'setItem'>` + `storageKey: 'tiny-robot-theme-data'`，存 `{ theme, colorMode }` JSON。

**对外 API**（`useTheme.ts`）：`{ theme, colorMode, resolvedColorMode, systemColorMode, setTheme, toggleColorMode, setColorMode }`——通过 `provide/inject` 共享。

> 与 flux 现有约定（`docs/architecture/theme-compatibility.md`：无 React ThemeProvider，用 CSS 变量 + 稳定 class 名）**完全一致**，可直接复用思路。

### 9.3 设计 token vs 组件样式

- **设计 token**（`:root`）：颜色、间距、圆角、字体、阴影、z-index
- **组件样式**（各组件 `<style lang="less" scoped>`）：用 token 拼装，组件级 CSS 变量做"内部参数"（如 Bubble 里的 `--tr-bubble-max-width`、Container 里的 `--left`/`--width`，可在使用方覆盖）
- **特殊**：用 `<style module>` 做 JSON 高亮的 `.key/.string/.number` 类名隔离（`Tool.vue:241-260`）

---

## 10-11. 整体架构亮点、不足与移植建议

**已抽取到独立文档**：`2026-07-21-tiny-robot-migration-recommendations.md`

该文档包含：

- §10 整体架构亮点（10 条）/ 不足（10 条）/ Vue 绑死部分
- §11 移植清单（必须保留 / 需要改写 / 可以丢弃 / 包结构建议 / 关键设计决策）
- 每条建议都标注了 **v2 状态**（已采纳 / 已否决 / 推迟），与 `docs/components/flux-renderers-ai/design.md` v2 冲突时以 design.md 为准
- 源文件定位速查附录

> 本文件（§0-§9）保持为**纯调研事实**，不含建议；建议部分全部迁移到上述独立文档。

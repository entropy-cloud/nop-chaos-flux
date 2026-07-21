# flux-renderers-ai 渲染器详细设计

> 主架构、引擎、集成策略、不变量参见 [`design.md`](./design.md)。本文档列出每个渲染器的 schema 字段、events、data-slot 结构与使用示例。

## 1. ai-chat（Layout, P0）

### 1.1 职责

把 `ai-message-list` + `ai-sender` + 自动滚动 + 状态管理组织成一个完整对话面板。是 P0 的主入口渲染器，自带 `AiChatProvider`（React Context）向下传播 `engine` 实例。

### 1.2 Schema

```ts
export interface AiChatSchema extends BaseSchema {
  type: 'ai-chat';
  connector?: SchemaValue; // 表达式：返回 AiConnector 实例（host 经 xui:imports 注入）
  conversationId?: string; // 多会话标识（默认 'default'）
  placeholder?: string;
  emptyState?: SchemaInput; // value-or-region：空消息态
  systemPrompt?: string;
  autofocus?: boolean;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  maxLength?: number;
  showWordLimit?: boolean;
  initialMessages?: SchemaValue; // 表达式：初始 ChatMessage[]

  // regions
  header?: SchemaInput;
  footer?: SchemaInput;
  beforeMessages?: SchemaInput; // welcome / prompts 的常见位置
  afterMessages?: SchemaInput;

  // events
  onSend?: ActionSchema;
  onResponseComplete?: ActionSchema;
  onError?: ActionSchema;
  onAbort?: ActionSchema;
  onConversationChange?: ActionSchema;
}
```

### 1.3 DOM 结构

```html
<section class="nop-ai-chat" data-slot="ai-chat-root" data-state="idle|processing|error">
  <header data-slot="ai-chat-header">...</header>
  <div data-slot="ai-chat-before">...</div>
  <div data-slot="ai-message-list">...</div>
  <div data-slot="ai-chat-after">...</div>
  <footer data-slot="ai-sender">...</footer>
  <footer data-slot="ai-chat-footer">...</footer>
</section>
```

### 1.4 实现要点

- 顶层创建 `<AiChatProvider engine={engine}>`，engine 由 `useMessage({ connector })` 创建。
- 子渲染器（`ai-message-list` / `ai-sender`）通过 `useAiChatContext()` 拿 engine；在 ai-chat 外用时 `useAiChatContext()` 返回 null（让 ai-bubble 也能独立用于非对话场景）。
- `connector` 表达式变化触发 `engine.setConnector(newConnector)`；进行中的请求不中断（避免半句响应分裂）。
- marker：`nop-ai-chat`；Layout 类型，不硬编码 gap/padding；spacing 由 schema `className` 的 `stack-*` 别名表达。
- `data-state` 反映 `engine.requestState`，便于 CSS 选择器做状态样式。

## 2. ai-message-list（Layout, P0）

### 2.1 Schema

```ts
export interface AiMessageListSchema extends BaseSchema {
  type: 'ai-message-list';
  groupStrategy?: 'consecutive' | 'divider' | 'none'; // 默认 'divider'
  dividerRole?: ChatRole; // 默认 'user'
  autoScroll?: boolean; // 默认 true
  maxGroupSize?: number;
  itemRegion?: SchemaInput; // 参数化 region：$slot.message / $slot.index
  emptyRegion?: SchemaInput; // 覆盖 ai-chat.emptyState
}
```

### 2.2 实现要点

- 通过 `useAiChatContext()` 拿 engine，订阅 `engine.messages`（`useSyncExternalStore`）。
- `groupStrategy` 用 render-time 派生（React 19 默认，不加 `useMemo`）。
- `itemRegion` 不提供 → 默认渲染 `<AiBubbleRenderer message={msg} />`；提供 → 走 `itemRegion.render({ bindings: { message: msg, index } })`。
- 自动滚动：监听 `messages.length` + 末消息 content 长度，触发 `scrollToBottom`；用户向上滚动时暂停自动滚动（参考 tiny-robot `useAutoScroll`）。
- Layout 类型：根 marker `nop-ai-message-list`，不硬编码内部样式。

## 3. ai-bubble（Widget, P0）

### 3.1 Schema

```ts
export interface AiBubbleSchema extends BaseSchema {
  type: 'ai-bubble';
  message?: SchemaValue; // ChatMessage（从 scope 或 props 注入）
  placement?: 'start' | 'end' | 'auto'; // 默认 'auto'（user→end，其他→start）
  shape?: 'corner' | 'rounded' | 'none'; // 默认 'rounded'
  showAvatar?: boolean;
  avatarRegion?: SchemaInput; // 自定义头像渲染
  contentResolverName?: string; // 注册的内容解析器名字（默认 'default'）
  // 业务方通过 xui:imports 注册自定义 boxRenderer / contentRenderer
}
```

### 3.2 渲染器注册制（吸收 tiny-robot 设计）

```ts
export interface BubbleBoxRendererMatch {
  find(messages: ChatMessage[], content: unknown, contentIndex: number): boolean;
  renderer: React.ComponentType<BubbleBoxRendererProps>;
  priority?: number; // 默认 0；越小越优先
}

export interface BubbleContentRendererMatch {
  find(message: ChatMessage, content: unknown, contentIndex: number): boolean;
  renderer: React.ComponentType<BubbleContentRendererProps>;
  priority?: number;
}

export const BubbleRendererMatchPriority = {
  LOADING: -1,
  NORMAL: 0,
  CONTENT: 10,
  ROLE: 20,
} as const;
```

### 3.3 默认 content renderers

| 名字        | priority    | 匹配条件                         | 渲染                                                                  |
| ----------- | ----------- | -------------------------------- | --------------------------------------------------------------------- |
| `loading`   | LOADING(-1) | `message.loading === true`       | Spinner                                                               |
| `markdown`  | NORMAL(0)   | content 为 string                | `react-markdown` + sanitize（复用 `flux-renderers-content/sanitize`） |
| `image`     | CONTENT(10) | content 为数组含 `image_url`     | 图片网格                                                              |
| `reasoning` | CONTENT(10) | `message.reasoning_content` 非空 | 可折叠面板（thinking）                                                |
| `tools`     | CONTENT(10) | `message.tool_calls?.length > 0` | `<AiToolCallRenderer>` 列表                                           |

### 3.4 DOM 结构

```html
<article
  class="nop-ai-bubble"
  data-slot="ai-bubble"
  data-role="user|assistant|tool|system"
  data-placement="start|end"
  data-streaming?=""
>
  <div data-slot="ai-bubble-avatar">...</div>
  <div data-slot="ai-bubble-content">
    <div data-slot="ai-bubble-reasoning" data-open="false">...</div>
    <div data-slot="ai-bubble-markdown">...</div>
    <div data-slot="ai-bubble-tools">
      <div data-slot="ai-tool-call" data-tool-status="running|success|failed|cancelled">...</div>
    </div>
  </div>
  <div data-slot="ai-bubble-feedback">...</div>
</article>
```

> 状态属性 presence-only：`data-streaming` 在 `msg.loading` 为 true 时输出 `=""`，否则省略。

## 4. ai-sender（Widget, P0）

### 4.1 Schema

```ts
export interface AiSenderSchema extends BaseSchema {
  type: 'ai-sender';
  placeholder?: string;
  disabled?: boolean;
  loading?: SchemaValue; // engine.isProcessing 的镜像，true 显示停止按钮
  autofocus?: boolean;
  maxLength?: number;
  showWordLimit?: boolean;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  clearOnSubmit?: boolean; // 默认 true
  actions?: SchemaInput; // 自定义按钮区（默认 SubmitButton + ClearButton）

  onSubmit?: ActionSchema; // payload: { text: string }
  onCancel?: ActionSchema;
  onChange?: ActionSchema; // payload: { text: string }
}
```

### 4.2 实现要点

- P0 不依赖 Tiptap。使用 `@nop-chaos/ui` 的 `Textarea` + `Button`。
- 内部 `useState` 持有 draft text；提交时调 `engine.sendMessage(text)` 并触发 `onSubmit` event。
- `loading` 默认从 `useAiChatContext().isProcessing` 派生；显式 `loading` 字段优先。
- Enter 提交 / Shift+Enter 换行按 `submitType` 处理。
- 字数超限：禁用提交按钮 + 显示红色计数。
- 取消（停止）按钮：`engine.abort()` + 触发 `onCancel` event。

## 5. ai-conversations（Widget, P1）

### 5.1 Schema

```ts
export interface AiConversationsSchema extends BaseSchema {
  type: 'ai-conversations';
  conversations?: SchemaValue; // AiConversationInfo[] 表达式绑定（scope-owned，host 管理）
  activeId?: SchemaValue; // 同上
  showRenameControls?: boolean;
  menuItems?: AiConversationMenuItem[];

  onItemClick?: ActionSchema; // { id, conversation }
  onItemRename?: ActionSchema; // { id, title }
  onItemDelete?: ActionSchema; // { id }
  onCreate?: ActionSchema;
}
```

### 5.2 关键决策

**渲染器纯展示，不持有 storage**：消费 schema 注入的 `conversations` 数组（来源由 host 决定，可以是 `useConversation` 包装 + `ConversationStorageStrategy`、可以是后端 API、可以是任意自定义方案）。`useConversation` hook 是 **host helper**（不是渲染器内部 API），其 `storage` 参数由 host 显式注入实现。

存储方式不进 schema（违反 INV-3 复用边界与 §11.3 持久化策略）。host 通过 `xui:imports` 注入 storage adapter，schema 只看到 `$ai.storage` 这样的实例引用。详见 `design.md` §11.3。

## 6. ai-welcome（Widget, P1）

```ts
export interface AiWelcomeSchema extends BaseSchema {
  type: 'ai-welcome';
  title?: string;
  description?: string;
  icon?: string; // lucide 图标名
  align?: 'left' | 'center' | 'right'; // 默认 'center'
  footer?: SchemaInput; // 常放 ai-prompts
}
```

## 7. ai-prompts（Widget, P1）

```ts
export interface AiPromptItem {
  label: string;
  description?: string;
  icon?: string;
  badge?: string;
}

export interface AiPromptsSchema extends BaseSchema {
  type: 'ai-prompts';
  items?: AiPromptItem[] | SchemaValue;
  layout?: 'vertical' | 'horizontal' | 'wrap'; // 默认 'vertical'
  size?: 'sm' | 'md' | 'lg';

  onSelect?: ActionSchema; // { item, index }
}
```

## 8. ai-feedback（Widget, P1）

```ts
export interface AiFeedbackSchema extends BaseSchema {
  type: 'ai-feedback';
  message?: SchemaValue; // ChatMessage（用于 copy / refresh 内容源）
  actions?: Array<'copy' | 'refresh' | 'like' | 'dislike' | 'sources'>;
  // 默认 ['copy', 'refresh']

  onAction?: ActionSchema; // { action: 'copy'|'refresh'|..., message }
}
```

## 9. ai-attachments（Widget, P2）

### 9.1 Attachment 模型

```ts
export type AiAttachment = AiUrlAttachment | AiRawFileAttachment;

export interface AiAttachmentBase {
  id?: string;
  name?: string;
  status?: 'uploading' | 'success' | 'error';
  fileType?: string;
  message?: string; // 错误信息
}

export interface AiUrlAttachment extends AiAttachmentBase {
  url: string;
  size?: number;
  rawFile?: File;
}

export interface AiRawFileAttachment extends AiAttachmentBase {
  rawFile: File;
  url?: string;
  size?: number;
}
```

### 9.2 Schema

```ts
export interface AiAttachmentsSchema extends BaseSchema {
  type: 'ai-attachments';
  items?: AiAttachment[] | SchemaValue;
  mode?: 'image' | 'card'; // 默认按 fileType 自动判断
  accept?: string; // input file accept
  multiple?: boolean;
  maxSize?: number; // 单文件字节数
  maxFiles?: number;
  fileMatchers?: Array<{ pattern: RegExp; icon?: string }>;

  onUpload?: ActionSchema; // { file }
  onRemove?: ActionSchema; // { attachment }
  onError?: ActionSchema; // { file, error }
}
```

## 10. ai-tool-call（Widget, P2）

### 10.1 Schema

```ts
export interface AiToolCallSchema extends BaseSchema {
  type: 'ai-tool-call';
  toolCall?: SchemaValue; // ChatToolCall
  state?: ChatToolCallUIState; // { status, open?, result? }
  defaultOpen?: boolean;
  showResult?: boolean; // 默认 true

  onToggle?: ActionSchema; // { open, toolCall }
}
```

### 10.2 状态属性

| `data-tool-status` | 含义       | 默认图标 |
| ------------------ | ---------- | -------- |
| `running`          | 工具执行中 | Spinner  |
| `success`          | 成功完成   | Check    |
| `failed`           | 抛错       | X        |
| `cancelled`        | abort      | Ban      |

### 10.3 结果展示

工具结果（`function.arguments` 为 JSON 字符串）用 JSON 语法高亮渲染。流式截断的 JSON 用 `jsonrepair` 修复后 `JSON.stringify(parsed, null, 2)` 美化，再正则高亮（key/string/number/boolean/null）。

## 11. ai-suggestions（Widget, P4）

```ts
export interface AiSuggestionsSchema extends BaseSchema {
  type: 'ai-suggestions';
  items?: Array<{ text: string; icon?: string }> | SchemaValue;
  overflowMode?: 'expand' | 'scroll' | 'popover'; // 默认 'scroll'
  trigger?: 'hover' | 'click' | 'manual'; // 仅 popover 模式

  onSelect?: ActionSchema; // { item, index }
}
```

## 12. ai-mcp-manager（Widget, P7 可选）

```ts
export interface AiMcpPluginInfo {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  enabled: boolean;
  tools: AiMcpPluginTool[];
  category?: string;
}

export interface AiMcpPluginTool {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface AiMcpManagerSchema extends BaseSchema {
  type: 'ai-mcp-manager';
  installedPlugins?: AiMcpPluginInfo[] | SchemaValue;
  marketPlugins?: AiMcpPluginInfo[] | SchemaValue;
  enabledTools?: Record<string, string[]>; // { pluginId: [toolId, ...] }

  onPluginToggle?: ActionSchema; // { plugin, enabled }
  onPluginAdd?: ActionSchema; // { plugin }
  onPluginCreate?: ActionSchema; // { config }
  onToolToggle?: ActionSchema; // { pluginId, toolId, enabled }
}
```

> 仅 UI。实际 MCP 协议层由 `@modelcontextprotocol/sdk` 实现（host 注入），将 MCP 工具转成 `RuntimeTool[]` 喂给 `toolPlugin`。

## 13. Events 总览

| 渲染器           | event                                                                | payload                       |
| ---------------- | -------------------------------------------------------------------- | ----------------------------- |
| ai-chat          | `onSend`                                                             | `{ message: ChatMessage }`    |
| ai-chat          | `onResponseComplete`                                                 | `{ message: ChatMessage }`    |
| ai-chat          | `onError`                                                            | `{ error: Error }`            |
| ai-chat          | `onAbort`                                                            | `{}`                          |
| ai-chat          | `onConversationChange`                                               | `{ conversationId }`          |
| ai-sender        | `onSubmit`                                                           | `{ text: string }`            |
| ai-sender        | `onCancel`                                                           | `{}`                          |
| ai-sender        | `onChange`                                                           | `{ text: string }`            |
| ai-message-list  | `onScrollTop`                                                        | `{}`                          |
| ai-bubble        | `onAction`                                                           | `{ action: string, message }` |
| ai-conversations | `onItemClick` / `onItemRename` / `onItemDelete` / `onCreate`         | `{ id?, conversation? }`      |
| ai-prompts       | `onSelect`                                                           | `{ item, index }`             |
| ai-feedback      | `onAction`                                                           | `{ action, message }`         |
| ai-attachments   | `onUpload` / `onRemove` / `onError`                                  | `{ file?, attachment? }`      |
| ai-tool-call     | `onToggle`                                                           | `{ open, toolCall }`          |
| ai-suggestions   | `onSelect`                                                           | `{ item, index }`             |
| ai-mcp-manager   | `onPluginToggle` / `onPluginAdd` / `onPluginCreate` / `onToolToggle` | 各异                          |

## 14. 端到端 Schema 示例

### 14.1 最小可运行示例

```json
{
  "type": "page",
  "body": [
    {
      "type": "ai-chat",
      "testid": "demo-chat",
      "connector": "${$ai.connectors.openai}",
      "placeholder": "Ask anything...",
      "submitType": "enter",
      "systemPrompt": "You are a helpful assistant.",
      "header": { "type": "text", "text": "AI Assistant" },
      "beforeMessages": {
        "type": "ai-welcome",
        "title": "Hello",
        "description": "Ask me anything."
      }
    }
  ]
}
```

`$ai.connectors.openai` 假设 host 在 `xui:imports` 注册了名为 `ai` 的 import，提供 `connectors` 表达式 helper（返回 host 用 `createStreamBasedAiConnector(env, config)` 构造的 `AiConnector` 实例）。

### 14.2 多会话 + 自定义气泡渲染

```json
{
  "type": "ai-chat",
  "conversationId": "${$page.activeConversationId}",
  "connector": "${$ai.connectors.deepseek}",
  "itemRegion": {
    "type": "ai-bubble",
    "placement": "auto",
    "showAvatar": true,
    "avatarRegion": {
      "type": "image",
      "src": "${$slot.message.role === 'user' ? '/me.png' : '/bot.png'}"
    }
  },
  "onConversationChange": {
    "action": "setValue",
    "args": { "path": "activeConversationId", "value": "${$event.conversationId}" }
  },
  "footer": {
    "type": "ai-conversations",
    "conversations": "${$page.conversations}",
    "activeId": "${$page.activeConversationId}"
  }
}
```

### 14.3 工具调用 + 多模态附件

```json
{
  "type": "ai-chat",
  "connector": "${$ai.connectors.openai}",
  "systemPrompt": "You can call tools to help the user.",
  "header": {
    "type": "hstack",
    "className": "p-3 border-b",
    "items": [
      { "type": "text", "text": "AI Agent" },
      { "type": "button", "label": "Clear", "onClick": { "action": "ai:clear" } }
    ]
  },
  "afterMessages": {
    "type": "ai-attachments",
    "items": "${$page.attachments}",
    "accept": "image/*",
    "multiple": true,
    "maxSize": 5242880
  }
}
```

## 15. data-slot 完整速查

```
ai-chat-root
├── ai-chat-header
├── ai-chat-before
├── ai-message-list
│   └── ai-bubble (data-role, data-placement, data-streaming)
│       ├── ai-bubble-avatar
│       └── ai-bubble-content
│           ├── ai-bubble-reasoning (data-open)
│           ├── ai-bubble-markdown
│           ├── ai-bubble-image
│           └── ai-bubble-tools
│               └── ai-tool-call (data-tool-status)
│                   ├── ai-tool-call-header
│                   ├── ai-tool-call-args
│                   └── ai-tool-call-result
├── ai-chat-after
├── ai-sender
│   ├── ai-sender-input
│   └── ai-sender-actions
│       ├── ai-sender-submit
│       └── ai-sender-cancel
└── ai-chat-footer
```

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
  engine?: SchemaValue; // 表达式：返回外部 MessageEngine（host 经 page-data 注入，典型 `${engine}` = useConversation.activeEngine）。提供时绑定外部 engine 而非自建，统一 ai-chat 与会话管理/持久化（design.md §11.2/§11.5）。未提供时自建 engine（零回归）。
  placeholder?: string;
  emptyState?: SchemaInput; // value-or-region：空消息态；engine 为 null（会话切换瞬间）时也渲染此 region（engine-null-switch）
  systemPrompt?: string;
  autofocus?: boolean;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  maxLength?: number;
  showWordLimit?: boolean;
  showTimestamp?: boolean; // A-4：true 时每个气泡渲染 metadata.createdAt 时间脚注（经 ai-message-list 转发给 ai-bubble）
  initialMessages?: SchemaValue; // 表达式：初始 ChatMessage[]
  senderExtensions?: SchemaValue; // P6/A6：host 注入的富文本扩展组件（`React.ComponentType<AiSenderExtensionProps>`，典型 `${$ai.tiptapSender}`）
  conversationController?: SchemaValue; // 表达式：host 侧会话控制器（`AiConversationController`），绑定后 `ai` namespace 会话动作委托给它
  activeConversationId?: SchemaValue; // scope-owned 会话标识（host 经 useConversation/page-data 管理）；变化时派发 onConversationChange
  tools?: SchemaValue; // P2 agentic loop：表达式 `AiToolSchema[]`
  toolExecutor?: SchemaValue; // P2：表达式 `ToolExecutor`
  maxToolRounds?: number; // P2：工具循环轮数上限（默认 8）
  componentId?: string; // Layer C：component:<method> 显式标识（默认 node id/testid）
  componentName?: string; // Layer C：handle 名称（默认 'ai-chat'）
  branches?: SchemaValue; // A-16：host 管理分支集 `AiBranch[]`
  activeBranchId?: SchemaValue; // A-16：当前分支 id

  // regions
  header?: SchemaInput;
  footer?: SchemaInput;
  beforeMessages?: SchemaInput; // welcome / prompts 的常见位置
  afterMessages?: SchemaInput;

  // events
  onResponseComplete?: ActionSchema; // 流式完成：{ message: ChatMessage 快照 }
  onError?: ActionSchema; // 失败：{ error: Error }（engine lastError 真实 cause）
  onAbort?: ActionSchema; // 中断：{}
  onConversationChange?: ActionSchema; // activeConversationId prop 变化：{ conversationId }
  onBranchChange?: ActionSchema; // A-16 分支切换：{ type:'ai:branch-change', branchId }
}
```

### 1.3 DOM 结构

```html
<section
  class="nop-ai-chat"
  data-slot="ai-chat-root"
  data-state="idle|processing|completed|aborted|error|empty"
>
  <header data-slot="ai-chat-header">...</header>
  <!-- region：未声明时省略 -->
  <div data-slot="ai-chat-before">...</div>
  <!-- beforeMessages region，可选 -->
  <div data-slot="ai-message-list">...</div>
  <!-- AiMessageListView -->
  <div data-slot="ai-chat-after">...</div>
  <!-- afterMessages region，可选 -->
  <div class="nop-ai-sender" data-slot="ai-sender" data-extension?>...</div>
  <!-- AiSenderView：根元素是 <div>，非 <footer> -->
  <footer data-slot="ai-chat-footer">...</footer>
  <!-- footer region，可选 -->
</section>
```

> Failure-Path 变体（`ai-chat.tsx` 早返回分支）：
>
> - `engine-null-switch`（host 注入 `null`，如会话切换瞬间）：`data-state="empty"`，根下渲染 `<div data-slot="ai-chat-empty">…</div>`（`emptyState` region 或默认文案）。
> - `connector-missing`（无 engine 且无 connector）：`data-state="error"`，根下渲染 `<div data-slot="ai-chat-error">…</div>`。
>
> `data-state` 反映 `engine.requestState`（`idle|processing|completed|aborted|error`）或上述 `empty` 变体，便于 CSS 选择器做状态样式。

### 1.4 实现要点

- 顶层创建 `<AiChatProvider engine={engine}>`，engine 由 `useMessage({ connector })` 创建。
- **外部 engine 注入（design.md §11.2/§11.5）**：当 schema `engine` prop 解析为 `MessageEngine`（典型 `${engine}` = `useConversation.activeEngine`）时，`ai-chat` 经公共 `useEngineView` hook 绑定该外部 engine 而非自建——从而在会话管理/持久化场景下复用 `ai-chat` 全部能力（regions、`ai` namespace、ComponentHandle）。未提供时走自建路径（零回归）。Failure Paths：`engine-prop-not-engine`（非 engine 值 → console.warn + 回退自建）；`engine-null-switch`（`activeEngine` 切换瞬间为 null → 渲染 emptyState）。host 绑定示例见 `apps/playground/src/pages/ai-persistence-demo.tsx`（`engine: "${engine}"` 经 page-data 注入）。
- 子渲染器（`ai-message-list` / `ai-sender`）通过 `useAiChatContext()` 拿 engine；在 ai-chat 外用时 `useAiChatContext()` 返回 null（让 ai-bubble 也能独立用于非对话场景）。
- `connector` 表达式变化触发 `engine.setConnector(newConnector)`；进行中的请求不中断（避免半句响应分裂）。外部 engine 自带 connector 生命周期，热替换仅作用于自建 engine。
- marker：`nop-ai-chat`；Layout 类型，不硬编码 gap/padding；spacing 由 schema `className` 的 `stack-*` 别名表达。
- `data-state` 反映 `engine.requestState`，便于 CSS 选择器做状态样式。

## 2. ai-message-list（Layout, P0）

### 2.1 Schema

```ts
export interface AiMessageListSchema extends BaseSchema {
  type: 'ai-message-list';
  autoScroll?: boolean; // 默认 true
  itemRegion?: SchemaInput; // 参数化 region：$slot.message / $slot.index
  emptyRegion?: SchemaInput; // 覆盖 ai-chat.emptyState
}
```

> 与 `schemas.ts` `AiMessageListSchema` 一致。**不存在** `groupStrategy` / `dividerRole` / `maxGroupSize` 字段——历史文档残留，已从代码移除（`contract-honesty.test.ts` 回归断言三字段为零命中）。

### 2.2 实现要点

- 通过 `useAiChatContext()` 拿 engine，订阅 `engine.messages`（`useSyncExternalStore`）。
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

  // A-16 消息分支：host 注入的同级分支集 + 当前激活分支；当前消息 id 出现在
  // 集合中时渲染 prev/next + 计数选择器（"2/3"）。切换触发 onBranchChange。
  branches?: SchemaValue; // AiBranch[] = { id, messageId }[]
  activeBranchId?: SchemaValue;
  onBranchChange?: ActionSchema; // { branchId }
}
```

### 3.1b 消息分支（A-16）

- **engine**：`engine.regenerate(branchId?)` 丢弃尾部 assistant 轮次并重新请求，把新 `metadata.branchId` 盖到产出的 assistant 消息上（`create-engine.ts`）。engine **不存** branches 全量；host 经 `component:setMessages`/`engine.setMessages` 载入分支消息。
- **选择器**：`ai-bubble` 末位渲染 `data-slot="ai-bubble-branches"`（prev/计数/next）。`ai-chat` schema 的 `branches`/`activeBranchId` 经 `AiChatContext` 下发到每条 bubble；`branch-no-host-data`（空或当前消息不在集合中）不渲染。
- **DOM**：`ai-bubble-branch-prev` / `ai-bubble-branch-counter` / `ai-bubble-branch-next`。

### 3.2 渲染器注册制（吸收 tiny-robot 设计）

> 与 live `renderers/ai-bubble/types.ts` 一致。**不存在** `BubbleBoxRendererMatch` / `BubbleBoxRendererProps`——历史文档残留（`rg "BubbleBoxRendererMatch" packages/flux-renderers-ai/src/` 零命中）。实际注册制分两类：`BubbleContentRendererMatch`（按内容匹配）+ `BubbleToolRendererMatch`（A-6，按工具名匹配工具卡片）。

```ts
export interface BubbleContentRendererProps {
  message: ChatMessage;
  /** The content slice being rendered (string | part). */
  content: unknown;
  /** Index into the content array (0 for plain-string content). */
  contentIndex: number;
}

export interface BubbleContentRendererMatch {
  find(message: ChatMessage, content: unknown, contentIndex: number): boolean;
  renderer: ComponentType<BubbleContentRendererProps>;
  /** Lower = higher priority. */
  priority?: number;
}

export const BubbleRendererMatchPriority = {
  LOADING: -1,
  NORMAL: 0,
  CONTENT: 10,
  ROLE: 20,
} as const;

// A-6: BubbleToolRendererMatch — per-tool card registry（design.md §3.3）
export interface BubbleToolRendererProps {
  /** The assistant message that owns the tool_call. */
  message: ChatMessage;
  /** The specific tool_call being rendered. */
  toolCall: ChatToolCall;
  /** Resolved per-call UI state (status / open / result). */
  state: ChatToolCallUIState;
  /** Stable key derived from `toolCall.id ?? idx-${index}` (React key). */
  toolCallKey: string;
}

export interface BubbleToolRendererMatch {
  toolName: string | RegExp; // 匹配 tool_call.function.name（`*` 为最低优先 fallback）
  renderer: ComponentType<BubbleToolRendererProps>;
  /** Lower wins. Defaults to 0; the `*` fallback is forced to +Infinity. */
  priority?: number;
}
```

### 3.3 默认 content renderers

> 与 `renderers/ai-bubble/renderers/default-renderers.ts` 的 `defaultBubbleContentRenderers` 一致（共 8 个）。注册系统按 `priority` 升序遍历，第一个 `find` 返回 true 的胜出（越小越优先）。

| 名字        | priority    | 匹配条件                                                      | 渲染                                                                  |
| ----------- | ----------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `loading`   | LOADING(-1) | `message.loading === true`                                    | Spinner                                                               |
| `tools`     | CONTENT(10) | `message.tool_calls?.length > 0`（`toolsMatcher`）            | `<AiToolCallRenderer>` 列表                                           |
| `reasoning` | CONTENT(10) | `message.reasoning_content` 非空（`reasoningMatcher`）        | 可折叠面板（thinking）                                                |
| `image`     | CONTENT(10) | content 为数组含 `image_url`（`imageMatcher`）                | 图片网格                                                              |
| `error`     | CONTENT(10) | `errorMatcher(message)`（engine 错误态，A-5 wiring）          | 错误提示 + retry                                                      |
| `markdown`  | NORMAL(0)   | 非空 text content（string 或 `{type:'text', text}` 非空）     | `react-markdown` + sanitize（复用 `flux-renderers-content/sanitize`） |
| `data-part` | CONTENT(10) | content part 的 `type` 以 `data-` 前缀开头（A-1 host 自定义） | host 自定义内容块                                                     |
| `text`      | ROLE(20)    | 兜底 `() => true`（非字符串/未匹配 content 降级为文本）       | 纯文本                                                                |

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
  /**
   * P6 (A6): host-injected rich-text extension component (expression-resolved,
   * typically `${$ai.tiptapSender}`). When present, delegates the input area to
   * this component (Tiptap from `./rich-text` subpath); when absent, uses the
   * built-in `<Textarea>`.
   */
  senderExtensions?: SchemaValue;

  onSubmit?: ActionSchema; // payload: { text: string }
  onCancel?: ActionSchema;
  onChange?: ActionSchema; // payload: { text: string }
}

/**
 * Props the host-injected rich-text extension receives. The extension owns the
 * editing surface (e.g. Tiptap); it serializes content to plain text before
 * emitting onChange/onSubmit so the engine contract stays `sendMessage(string)`.
 */
export interface AiSenderExtensionProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
  showWordLimit?: boolean;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  disabled?: boolean;
  refocusAfterSubmit?: boolean;
}
```

### 4.2 实现要点

- P0 不依赖 Tiptap。使用 `@nop-chaos/ui` 的 `Textarea` + `Button`。
- 内部 `useState` 持有 draft text；提交时调 `engine.sendMessage(text)` 并触发 `onSubmit` event。
- `loading` 默认从 `useAiChatContext().isProcessing` 派生；显式 `loading` 字段优先。
- Enter 提交 / Shift+Enter 换行按 `submitType` 处理。
- 字数超限：禁用提交按钮 + 显示红色计数。
- 取消（停止）按钮：`engine.abort()` + 触发 `onCancel` event。
- **P6 Tiptap 扩展**（A6）：`senderExtensions` 字段声明时渲染 host 注入的组件（经 `xui:imports` 表达式解析为 `React.ComponentType<AiSenderExtensionProps>`），编辑器内容序列化为纯文本喂给 engine。host 经 `./rich-text` 子路径的 `createTiptapSender` 工厂创建编辑器：

```ts
import { createTiptapSender } from '@nop-chaos/flux-renderers-ai/rich-text';

const tiptapSender = createTiptapSender({
  extensions: ['mention', 'template', 'slash'],
  mentions: [{ id: 'u1', label: 'alice' }],
  templates: [{ label: 'Greeting', content: 'Hello!' }],
  slashCommands: [{ label: 'summarize', insertText: 'Summarize:' }],
});
```

未声明 `senderExtensions` 时保持现有 `<Textarea>` 降级行为（零回归）。Tiptap 为可选 peerDep，host 未 import `./rich-text` 时 bundle 不含 Tiptap（守卫见 `contract-honesty.test.ts`）。

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
  value?: SchemaValue; // 受控附件列表（表达式解析，AiAttachmentItem[]）
  mode?: 'image' | 'card' | 'auto'; // 默认 'auto'：按 MIME 自动判断
  accept?: string; // HTML input accept
  multiple?: boolean; // 默认 true
  maxSize?: number; // 单文件字节数
  maxFiles?: number; // 最大文件数
  enableDrop?: boolean; // 拖放 + 粘贴（默认 true）

  onChange?: ActionSchema; // 附件列表变化 → `{ attachments: AiAttachment[] }`
  onError?: ActionSchema; // 校验失败 → `{ reason: 'attachment-too-large' | 'attachment-too-many' }`
  onUpload?: ActionSchema; // 上传派发 → `{ attachments: AiAttachment[] }`
}
```

> 与 `schemas.ts` `AiAttachmentsSchema` 一致。**不存在** `items` / `fileMatchers` / `onRemove` 字段——历史文档残留，已从代码移除。附件项类型见 `AiAttachmentItem`（`id` / `url` / `name` / `contentType` / `size` / `status`）。

## 10. ai-tool-call（Widget, P2 + P3 HITL）

### 10.1 Schema

```ts
export interface AiToolCallSchema extends BaseSchema {
  type: 'ai-tool-call';
  toolCall?: SchemaValue; // 表达式解析为 ChatToolCall
  state?: SchemaValue; // 表达式解析为 ChatToolCallUIState（status / open / result / approval）
  defaultOpen?: boolean; // 参数面板是否默认展开
  // P3 HITL (A-14):
  onApproval?: ActionSchema; // { action: 'approve'|'reject', toolCall, toolCallId }
}
```

> 与 `schemas.ts` `AiToolCallSchema` 一致。**不存在** schema 级 `showResult` / `onToggle` 字段——`onToggle` 仅是 `AiToolCallView` 的 view-only prop（展开/折叠内部交互），schema 不可达；`showResult` 由 `state.open` / `defaultOpen` 表达。

### 10.2 状态属性

| `data-tool-status` | 含义       | 默认图标 |
| ------------------ | ---------- | -------- |
| `running`          | 工具执行中 | Spinner  |
| `success`          | 成功完成   | Check    |
| `failed`           | 抛错       | X        |
| `cancelled`        | abort      | Ban      |

### 10.3 结果展示

工具结果（`function.arguments` 为 JSON 字符串）用 JSON 语法高亮渲染。流式截断的 JSON 用 `jsonrepair` 修复后 `JSON.stringify(parsed, null, 2)` 美化，再正则高亮（key/string/number/boolean/null）。

### 10.4 HITL 审批（P3, A-14）

`ChatToolCallUIState.approval?: 'pending' | 'approved' | 'rejected'`（engine 仅持字段，不实现暂停/恢复——工作流由 host action handler 决策）。

- `approval === 'pending'`：卡片底部渲染 approve/reject 按钮（`@nop-chaos/ui` `Button`，绿色 approve / 中性 reject），根节点加 `data-requires-approval=""`（presence-only）与 `data-approval="pending"`；a11y 焦点陷阱——进入 pending 时聚焦 approve，Tab 在 approve/reject 间循环，Esc 还原先前焦点。
- 点击触发 `onApproval` event，payload `{ action: 'approve'|'reject', toolCall, toolCallId }`；engine **不**改 `approval`（host 决策后写回）。
- `approved`/`rejected`：按钮区隐藏，改为已决策徽标（✓ Approved 绿 / ✗ Rejected 红，复用 A-12 色板），`data-approval-decision`。
- `hitl-no-handler`：host 未挂 handler 时按钮可点但 event 无效（flux action no-op），`approval` 不变。

## 10b. ai-citations（Widget, P3, A-13）

### 组成模型（Decision-C）

`ai-citations` 是**独立 Widget**：host 在 `ai-chat` region（如 `afterMessages` 或 bubble footer）放置；它**重新渲染**一份 `message.content` 副本，把 `[N]` / `[N,M]` 解析为可悬停的 `<sup>` 标记。`ai-bubble` 内的 `[1]` 保持字面文本——二者不重叠渲染同一段（host 二选一放置）。in-bubble 内联变体（improvement §4.2）out-of-scope（host 自定义 `BubbleContentRenderer`）。

### Schema

```ts
export interface AiCitationSource {
  index: number; // 1-based [N]
  title?: string;
  url?: string;
  snippet?: string;
}

export interface AiCitationsSchema extends BaseSchema {
  type: 'ai-citations';
  message?: SchemaValue; // ChatMessage（content 来源）
  sources?: SchemaValue; // AiCitationSource[]（覆盖 metadata.sources）
  mode?: 'inline' | 'list'; // 默认 inline：[N]→<sup>；list：底部来源列表
  onSourceClick?: ActionSchema;
}
```

### 来源优先级 + 安全

来源读取顺序：显式 `sources` prop > `message.metadata.sources` > `data-sources` ChatMessageDataPart（A-1）。`citation-no-sources`：检测到 `[N]` 但无对应来源时，标记渲染但卡片显示空态文案。

安全：inline 路径对**原始** `message.content` 直接做 `[N]` 解析，每个文本 run 渲染为**受控 React 文本节点**（绝不用 `dangerouslySetInnerHTML` 处理用户内容）——`<`/`>`/`&` 由 React 恰好转义一次，`<script>` 元素不可能进入 DOM（XSS 门）。**不再**先经 `sanitizeHtml`（DOMPurify）：其输出为 HTML 转义串，再经 React 文本节点渲染会二次转义（`5 < 3` → 字面 `&lt;` 双编码，且会吞掉禁标签内的引用标记——multi-audit P1-d 裁定移除）；markdown 路径（`ai-bubble/renderers/markdown.tsx`）仍用 `sanitizeHtml`（react-markdown 会重新解析 HTML 实体，无双编码）。引用标记渲染为**受控 React 元素**，防 XSS。

### DOM 结构

```html
<div class="nop-ai-citations" data-slot="ai-citations" data-mode="inline">
  …
  <sup data-slot="ai-citation">
    [<button data-slot="ai-citation-trigger" data-citation-index="1">1</button>]
  </sup>
  …
</div>
<!-- 卡片经 Popover Portal 渲染到 body -->
<div data-slot="ai-citation-card">… 来源标题/url/片段 …</div>
```

## 11. ai-suggestions（Widget, P4）

```ts
export interface AiSuggestionItem extends SchemaObject {
  text: string;
  icon?: string;
}

export interface AiSuggestionsSchema extends BaseSchema {
  type: 'ai-suggestions';
  items?: Array<AiSuggestionItem> | SchemaValue;
  overflowMode?: 'expand' | 'scroll' | 'popover'; // 默认 'scroll'
  maxVisible?: number; // popover 模式下内联可见数（默认 3）

  onSelect?: ActionSchema; // { item, index }
}
```

- **与 `ai-prompts` 区别**：`ai-prompts`（P1）是静态推荐卡片（vertical/horizontal/wrap）；`ai-suggestions`（P4）是对话内即时建议胶囊，强调溢出处理（`expand`/`scroll`/`popover`）。
- **DOM**：marker `nop-ai-suggestions`，`data-slot="ai-suggestions"`，`data-overflow="expand|scroll|popover"`；每项 `data-slot="ai-suggestions-item"` + `data-index`；溢出触发 `data-slot="ai-suggestions-overflow"`（`+N`），展开后 `data-slot="ai-suggestions-overflow-list"`。
- **Failure Path**：`suggestions-overflow` 按模式排布；`popover` 下超出 `maxVisible` 收进 Popover + 计数；空列表 `data-empty`。

## 11b. ai-token-usage（Widget, P4, A-17）

```ts
export interface AiTokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number; // host/connector 填充（汇率/定价属 host 关注点）
}

export interface AiTokenUsageSchema extends BaseSchema {
  type: 'ai-token-usage';
  message?: SchemaValue; // ChatMessage（读 metadata.usage）
  usage?: SchemaValue; // 显式 usage（覆盖 metadata.usage）
  contextLimit?: number; // 上下文上限（环形分母）
  showCost?: boolean; // 默认 true

  onClick?: ActionSchema;
}
```

- 纯展示，数据由 connector 填 `message.metadata.usage`（engine §9.2 `AiConnectorChunk.metadata`）。
- 环形进度（SVG，零依赖）显示 `total / contextLimit`；`contextLimit` 缺省时只显示文本计数。
- **Failure Path `token-no-usage`**：`metadata.usage` 缺失 → 渲染 muted 占位（`data-empty`，文案"用量未上报"），从不崩溃。
- **DOM**：marker `nop-ai-token-usage`；`ai-token-usage-ring`（SVG）、`ai-token-usage-total`/`-prompt`/`-completion`/`-cost`/`-text`。

## 11c. ai-voice-input（Widget, P4, A-15）

```ts
export interface AiVoiceInputSchema extends BaseSchema {
  type: 'ai-voice-input';
  lang?: string; // BCP-47 tag → SpeechRecognition.lang
  continuous?: boolean; // default false（单次发声）
  interimResults?: boolean; // default false

  onResult?: ActionSchema; // { transcript }
  onError?: ActionSchema; // { reason: 'unsupported' | 'permission-denied' | 'no-result' }
}
```

- **INV-1**：`SpeechRecognition` 是用户手势触发的浏览器 API（麦克风输入），非 network IO，**渲染器直呼，不经 env**（`improvement §5.3` 裁定）。`MediaRecorder` 回退留 host 自定义。
- **DOM**：marker `nop-ai-voice-input`，`data-slot="ai-voice-input"`，`data-state="idle|listening"`，`data-unsupported`（仅不支持时出现）；录音态波形用 CSS（`styles.css` `@keyframes flux-ai-voice-wave`，零依赖）。
- **Failure Path**：`voice-unsupported`（mount 检测 → 禁用按钮 + tooltip + `onError('unsupported')`）、`voice-permission-denied`（`onerror` `not-allowed` → `onError('permission-denied')`）、`voice-no-result`（`onend` 无 final transcript → `onError('no-result')`）。

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

| 渲染器           | event                                                                | payload                                                                              |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ai-chat          | `onResponseComplete`                                                 | `{ message: ChatMessage }`                                                           |
| ai-chat          | `onError`                                                            | `{ error: Error }`                                                                   |
| ai-chat          | `onAbort`                                                            | `{}`                                                                                 |
| ai-chat          | `onConversationChange`                                               | `{ conversationId }`（resolved activeConversationId prop 变化时派发；含清空到 null） |
| ai-chat          | `onBranchChange`                                                     | `{ type: 'ai:branch-change', branchId }`                                             |
| ai-sender        | `onSubmit`                                                           | `{ text: string }`                                                                   |
| ai-sender        | `onCancel`                                                           | `{}`                                                                                 |
| ai-sender        | `onChange`                                                           | `{ text: string }`                                                                   |
| ai-bubble        | `onBranchChange`                                                     | `{ type: 'ai:branch-change', branchId }`                                             |
| ai-conversations | `onItemClick` / `onItemRename` / `onItemDelete` / `onCreate`         | `{ type?: 'ai:conversation-*', id?, conversation?, title? }`                         |
| ai-prompts       | `onSelect`                                                           | `{ item, index }`                                                                    |
| ai-feedback      | `onAction`                                                           | `{ action, message }`                                                                |
| ai-attachments   | `onChange` / `onError` / `onUpload`                                  | `{ attachments }` / `{ reason }` / `{ attachments }`                                 |
| ai-tool-call     | `onApproval` (P3 HITL)                                               | `{ action, toolCall, toolCallId }`                                                   |
| ai-citations     | `onSourceClick`                                                      | `{ source, index }`                                                                  |
| ai-token-usage   | `onClick`                                                            | `{ usage }`                                                                          |
| ai-suggestions   | `onSelect`                                                           | `{ item, index }`                                                                    |
| ai-voice-input   | `onResult`                                                           | `{ transcript }`                                                                     |
| ai-voice-input   | `onError`                                                            | `{ reason: 'unsupported' \| 'permission-denied' \| 'no-result' }`                    |
| ai-mcp-manager   | `onPluginToggle` / `onPluginAdd` / `onPluginCreate` / `onToolToggle` | 各异                                                                                 |

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
  "activeConversationId": "${$page.activeConversationId}",
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
    "args": { "path": "activeConversationId", "value": "${conversationId}" }
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
    "value": "${$page.attachments}",
    "accept": "image/*",
    "multiple": true,
    "maxSize": 5242880
  }
}
```

## 15. data-slot 完整速查

> 覆盖 `rg "data-slot=" packages/flux-renderers-ai/src/renderers/` 全部扫描结果（与 live code 一致）。`?` 标注的为条件渲染（仅特定状态下出现）。

### 15.1 ai-chat-root 子树

```
ai-chat-root (data-state=idle|processing|completed|aborted|error|empty)
├── ai-chat-header?                        (header region)
├── ai-chat-before?                        (beforeMessages region)
├── ai-message-list
│   └── ai-bubble (data-role, data-placement, data-shape, data-streaming?, data-error?, data-editing?)
│       ├── ai-bubble-avatar?
│       └── ai-bubble-content
│           ├── [content renderer，按 §3.3 注册制每 slice 一个]
│           │   ├── ai-bubble-loading
│           │   ├── ai-bubble-markdown
│           │   │   ├── ai-bubble-cursor?              (流式光标)
│           │   │   ├── ai-bubble-pre > ai-bubble-code (代码块)
│           │   │   └── ai-bubble-copy-code?           (代码复制按钮)
│           │   ├── ai-bubble-reasoning (data-open)
│           │   ├── ai-bubble-image
│           │   │   └── ai-bubble-image-item
│           │   ├── ai-bubble-tools
│           │   │   └── ai-tool-call (data-tool-status, data-approval?, data-requires-approval?)
│           │   │       ├── ai-tool-call-toggle        (展开/折叠 header)
│           │   │       ├── ai-tool-call-args          (JSON 高亮)
│           │   │       └── ai-tool-call-approval?     (P3 HITL pending 时)
│           │   │           ├── ai-tool-call-approve
│           │   │           └── ai-tool-call-reject
│           │   ├── ai-bubble-error
│           │   │   └── ai-bubble-error-retry?
│           │   ├── ai-bubble-data-part               (A-1 host 自定义 data-${string})
│           │   │   ├── ai-bubble-data-part-id
│           │   │   └── ai-bubble-data-part-payload
│           │   └── ai-bubble-text                    (兜底)
│           ├── ai-bubble-timestamp?                  (showTimestamp)
│           ├── ai-bubble-branches?                   (A-16 分支点)
│           │   ├── ai-bubble-branch-prev
│           │   ├── ai-bubble-branch-counter
│           │   └── ai-bubble-branch-next
│           └── ai-bubble-edit?                       (user 消息编辑态)
│               ├── ai-bubble-edit-toggle
│               ├── ai-bubble-edit-input
│               ├── ai-bubble-edit-submit
│               └── ai-bubble-edit-cancel
├── ai-chat-after?                         (afterMessages region)
├── ai-sender (data-extension?，根元素 <div>)
│   ├── ai-sender-input
│   │   └── ai-sender-count?               (字数计数)
│   └── ai-sender-actions
│       ├── ai-sender-cancel?              (processing 时显示停止)
│       └── ai-sender-submit
└── ai-chat-footer?                        (footer region)

(failure-path 早返回，不在上述子树内)
├── ai-chat-empty?                         (engine-null-switch，data-state=empty)
└── ai-chat-error?                         (connector-missing，data-state=error)
```

### 15.2 独立 renderer data-slot

> 以下 renderer 既可经 `ai-chat` 的 region（header/footer/beforeMessages/afterMessages）嵌入，也可独立放置；不在 `ai-chat-root` 子树内。

```
ai-welcome           → ai-welcome-icon / ai-welcome-title / ai-welcome-description / ai-welcome-footer?
ai-prompts           → ai-prompts-item* (ai-prompts-item-label / ai-prompts-item-description? / ai-prompts-item-badge?)
ai-feedback          → (根 ai-feedback，actions 由 button 组合)
ai-conversations     → ai-conversations-header? / ai-conversations-create? / ai-conversations-list
                         └ ai-conversations-item* (ai-conversations-item-button / ai-conversations-rename? / ai-conversations-rename-input? / ai-conversations-delete?)
ai-attachments       → ai-attachments-input / ai-attachments-list
                         └ ai-attachments-item* (ai-attachments-thumb / ai-attachments-pick / ai-attachments-upload? / ai-attachments-remove?)
ai-tool-call         → (根 ai-tool-call，同 §15.1 的 ai-tool-call 子树：toggle / args / approval?)
ai-citations         → ai-citation* (ai-citation-trigger / ai-citation-card / ai-citation-item? / ai-citation-empty? / ai-citation-open? / ai-citation-url?)
ai-token-usage       → ai-token-usage-ring? / ai-token-usage-total / ai-token-usage-prompt? / ai-token-usage-completion? / ai-token-usage-cost? / ai-token-usage-text?
ai-voice-input       → ai-voice-input-wave?
ai-suggestions       → ai-suggestions-item* (ai-suggestions-item-text) / ai-suggestions-overflow? (ai-suggestions-overflow-list?)
```

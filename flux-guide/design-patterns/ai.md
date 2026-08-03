# AI 组件家族（ai-chat 及卫星组件）

AI 对话渲染器家族：`ai-chat` 中枢组件 + 13 个卫星组件，配套框架无关的消息引擎（MessageEngine）、React 适配器、流式连接器（`createStreamBasedAiConnector`）与宿主工具（`useConversation` 等）。包：`@nop-chaos/flux-renderers-ai`，注册：

```ts
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
registerAiRenderers(registry); // ai-chat, ai-message-list, ai-bubble, ai-sender, ...
```

## 组件总览

| type               | 角色         | 说明                                             |
| ------------------ | ------------ | ------------------------------------------------ |
| `ai-chat`          | 中枢容器     | 内嵌消息列表 + 气泡 + 发送器，持有 MessageEngine |
| `ai-message-list`  | 消息列表     | 虚拟滚动 + 自动滚到底部                          |
| `ai-bubble`        | 单条消息气泡 | 角色对齐、markdown 流式缓冲、分支切换            |
| `ai-sender`        | 输入发送器   | 支持富文本扩展（Tiptap）、字数限制、提交模式     |
| `ai-conversations` | 会话侧栏     | 会话列表 / 重命名 / 删除 / 新建                  |
| `ai-welcome`       | 空会话欢迎区 | 标题/描述/图标/操作区                            |
| `ai-prompts`       | 提示词推荐   | 静态 prompt 列表，点击触发 `onSelect`            |
| `ai-feedback`      | 消息反馈     | 复制 / 重生成 / 点赞 / 点踩，`onAction`          |
| `ai-tool-call`     | 工具调用展示 | 状态/参数面板/审批（HITL）                       |
| `ai-attachments`   | 附件管理     | 图片/文件列表，拖拽粘贴，上传状态机              |
| `ai-citations`     | 引用标注     | 内联 `[N]` 角标或底部来源列表，悬停卡片          |
| `ai-voice-input`   | 语音输入按钮 | Web Speech API，`onResult` 输出文本              |
| `ai-token-usage`   | Token 用量环 | 读取 `message.metadata.usage`，环 + 文本计数     |
| `ai-suggestions`   | 动态建议胶囊 | overflowMode: expand/scroll/popover              |

## 最小集成（ai-chat 中枢）

```json
{
  "type": "page",
  "xui:imports": [{ "from": "ai", "as": "ai" }],
  "body": [
    {
      "type": "ai-chat",
      "connector": "${$ai.connectors.mock}",
      "placeholder": "Ask the mock AI anything…",
      "submitType": "enter",
      "header": {
        "type": "flex",
        "direction": "row",
        "align": "center",
        "justify": "between",
        "body": [{ "type": "text", "text": "AI Chat" }]
      },
      "className": "flex flex-col h-[70vh] max-w-3xl mx-auto"
    }
  ]
}
```

### 宿主接线（必须在宿主代码完成）

1. **流式能力**：env 必须提供 `stream`（SSE 流式 fetch，见 `docs/architecture/renderer-env.md` 与 `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`）。
2. **连接器**：宿主用 `createStreamBasedAiConnector({ env, buildRequest })` 构建 `AiConnector`，通过 `xui:imports` 的 `ai` 命名空间暴露，schema 用 `${$ai.connectors.mock}` 引用（playground 参考：`apps/playground/src/ai/mock-ai-env.ts`、`ai-chat-example.json`）。
3. **注册**：`registerAiRenderers(registry)`。

```ts
import { createStreamBasedAiConnector } from '@nop-chaos/flux-renderers-ai';

const connector = createStreamBasedAiConnector({
  env, // 需含 env.stream
  buildRequest: (req) => ({
    url: 'https://api.example.com/v1/chat/completions',
    method: 'POST',
    data: { messages: req.messages, stream: true },
  }),
});
// importLoader 将 { connectors: { mock: connector } } 挂到 createExpressionHelpers()
```

## ai-chat 字段参考

| 字段                            | 类型                                                   | 说明                                                     |
| ------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `connector`                     | 表达式 → `AiConnector`                                 | 流式连接器（宿主经 `xui:imports` 注入）                  |
| `engine`                        | 表达式 → `MessageEngine`                               | 可选，绑定外部引擎（如 `useConversation` 共享）          |
| `systemPrompt`                  | `string`                                               | 系统提示词                                               |
| `placeholder`                   | `string`                                               | 发送框占位                                               |
| `submitType`                    | `'enter' \| 'ctrlEnter' \| 'shiftEnter'`               | 提交键（默认 enter）                                     |
| `maxLength` / `showWordLimit`   | `number` / `boolean`                                   | 字数限制与计数器                                         |
| `autofocus`                     | `boolean`                                              | 自动聚焦发送框                                           |
| `initialMessages`               | 表达式 → `ChatMessage[]`                               | 初始消息（历史会话恢复）                                 |
| `senderExtensions`              | 表达式 → `React.ComponentType<AiSenderExtensionProps>` | 富文本发送器扩展（如 `${$ai.tiptapSender}`，Tiptap）     |
| `tools` / `toolExecutor`        | 表达式                                                 | agentic 工具循环（见下方工具循环）                       |
| `maxToolRounds`                 | `number`                                               | 工具循环最大轮数（默认 8）                               |
| `conversationController`        | 表达式                                                 | 会话控制器（`${$ai.controller}`，宿主注入）              |
| `activeConversationId`          | 表达式                                                 | 当前会话 id（宿主管理）                                  |
| `componentId` / `componentName` | `string`                                               | `component:<method>` 的显式身份（默认取 node id/testid） |
| `branches` / `activeBranchId`   | 表达式                                                 | 消息分支集 + 激活分支（A-16，宿主管理）                  |

### ai-chat Regions

`header`, `footer`（region）；`beforeMessages`, `afterMessages`, `emptyState`（value-or-region）

### ai-chat Events

| 事件                   | 说明                                         |
| ---------------------- | -------------------------------------------- |
| `onResponseComplete`   | 一次回复完整结束                             |
| `onError`              | 请求/流式错误                                |
| `onAbort`              | 用户中止                                     |
| `onConversationChange` | 会话切换                                     |
| `onBranchChange`       | 分支切换（宿主据此 `component:setMessages`） |

### ai-chat 组件句柄（`component:<method>`）

| 方法          | 参数                      | 说明                     |
| ------------- | ------------------------- | ------------------------ |
| `sendMessage` | `{ text }` 或 `{ parts }` | 发送文本/多模态消息      |
| `abort`       | -                         | 中止当前请求             |
| `clear`       | -                         | 清空消息                 |
| `getMessages` | -                         | 只读快照 `ChatMessage[]` |
| `setMessages` | `{ messages }`            | 替换消息列表（分支加载） |
| `regenerate`  | `{ branchId? }`           | 重新生成最后一条用户消息 |

### `ai` ActionScope 命名空间动作

`schema` 内可直接 dispatch：`ai:send`（`{ text }`）、`ai:abort`、`ai:clear`、`ai:createConversation`（`{ title?, metadata? }`）、`ai:switchConversation`（`{ id }`）、`ai:deleteConversation`（`{ id }`）、`ai:renameConversation`（`{ id, title }`）。会话类动作需先绑定 `conversationController`。

```json
{
  "type": "button",
  "text": "发送问候",
  "onClick": { "action": "ai:send", "args": { "text": "你好" } }
}
```

## 工具循环（agentic tools）

`ai-chat` 配置 `tools`（表达式 → `AiToolSchema[]`）与 `toolExecutor`（表达式 → `ToolExecutor`）后，引擎自动执行多轮 `tool_calls` 循环（上限 `maxToolRounds`）。`ai-tool-call` 渲染器展示每次调用的状态/参数/结果，`onApproval`（`{ action: 'approve'|'reject', toolCall, toolCallId }`）提供 HITL 审批通道。playground 参考：`apps/playground/src/ai/ai-tools-example.json`。

## 卫星组件速查

### ai-message-list / ai-bubble / ai-sender

```json
{
  "type": "flex",
  "direction": "column",
  "body": [
    {
      "type": "ai-message-list",
      "autoScroll": true,
      "emptyRegion": [{ "type": "text", "text": "开始对话吧" }]
    },
    {
      "type": "ai-sender",
      "placeholder": "输入消息…",
      "submitType": "enter",
      "clearOnSubmit": true,
      "showWordLimit": true,
      "onSubmit": { "action": "ai:send", "args": { "text": "${event.text}" } }
    }
  ]
}
```

| 组件              | 关键字段                                                                                                                                                    | 事件                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `ai-message-list` | `autoScroll`（默认 true）、`emptyRegion`（value-or-region）                                                                                                 | -                                  |
| `ai-bubble`       | `message`、`placement`（start/end/auto）、`shape`（corner/rounded/none）、`showAvatar`、`showTimestamp`、`contentResolverName`、`branches`/`activeBranchId` | `onBranchChange`                   |
| `ai-sender`       | `placeholder`、`loading`、`autofocus`、`maxLength`、`showWordLimit`、`submitType`、`clearOnSubmit`、`senderExtensions`                                      | `onSubmit`、`onCancel`、`onChange` |

> `ai-bubble` 的 `message` / `ai-sender` 的 `loading` 等以表达式从 scope 取（如 `${message}`、`${loading}`），典型用法是把 `ai-chat` 与独立子组件组合成自定义布局（程序化视图组件：`AiMessageListView` / `AiBubbleView` / `AiSenderView` 等可宿主直接组合）。

### 会话与管理类

| 组件               | 字段                                                                                      | 事件                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `ai-conversations` | `conversations`（表达式 → `AiConversationInfo[]`）、`activeId`、`showRenameControls`      | `onItemClick`、`onItemRename`、`onItemDelete`、`onCreate` |
| `ai-welcome`       | `title`、`description`、`icon`、`align`（left/center/right）、`footer`（value-or-region） | -                                                         |
| `ai-prompts`       | `items`、`layout`（vertical/horizontal/wrap）、`size`（sm/md/lg）                         | `onSelect`（`{ item, index }`）                           |
| `ai-feedback`      | `message`（表达式 → `ChatMessage`）、`actions`（表达式 → 自定义动作数组）                 | `onAction`                                                |
| `ai-suggestions`   | `items`、`overflowMode`（expand/scroll/popover）、`maxVisible`（默认 3）                  | `onSelect`                                                |

### 内容类

| 组件             | 字段                                                                                                                    | 事件                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `ai-tool-call`   | `toolCall`（表达式 → `ChatToolCall`）、`state`（表达式 → `ChatToolCallUIState`）、`defaultOpen`                         | `onApproval`（HITL）              |
| `ai-attachments` | `value`、`mode`（image/card/auto）、`accept`、`multiple`（默认 true）、`maxSize`、`maxFiles`、`enableDrop`（默认 true） | `onChange`、`onError`、`onUpload` |
| `ai-citations`   | `message`、`sources`（覆盖 metadata.sources）、`mode`（inline 默认/list）                                               | `onSourceClick`                   |
| `ai-token-usage` | `message`、`usage`、`contextLimit`、`showCost`（默认 true）                                                             | `onClick`                         |
| `ai-voice-input` | `lang`（BCP-47）、`continuous`、`interimResults`                                                                        | `onResult`、`onError`             |

## 消息引擎与宿主工具（宿主侧）

```ts
import {
  createMessageEngine,
  createThinkingPlugin,
  createToolPlugin,
  createLengthPlugin,
  createReactMessageAdapter,
  createNativeMessageAdapter,
  useConversation,
  useMessage,
  useEngineView,
  useAutoScroll,
} from '@nop-chaos/flux-renderers-ai';

const engine = createMessageEngine({
  adapter: createReactMessageAdapter(), // 或 createNativeMessageAdapter() 用于非 React
  plugins: [createThinkingPlugin(), createToolPlugin(), createLengthPlugin()],
});
engine.sendMessage('你好'); // 或 sendMessage([{ type: 'text', text }])
```

- `MessageEngine`：框架无关的状态机（消息列表、流式增量、abort、regenerate、工具循环），状态经 `MessageStateAdapter` 对外投影
- `createStreamBasedAiConnector`：基于 `env.stream` 的 OpenAI 风格流式连接器
- `useConversation`：多会话管理器（列表/增删改/持久化 `ConversationStorageStrategy`），其 engine 可注入 `ai-chat.engine` 共享
- `useMessage` / `useEngineView` / `useAutoScroll`：程序化组合用的 React 适配 hooks
- `AiChatProvider` / `useAiChatContext`：ai-chat 内部上下文（组合自定义布局时使用）
- 富文本：`@nop-chaos/flux-renderers-ai/rich-text` 提供 Tiptap 发送器扩展（`$ai.tiptapSender`），经 `senderExtensions` 挂入 `ai-sender`/`ai-chat`

## 注意事项

- **引擎不进 reactive scope**：`connector`/`engine`/`tools` 等是表达式解析的宿主对象（`${$ai.xxx}`），不是 scope 快照——不要把它们赋进普通 data 字段做响应式绑定
- **流式必配 `env.stream`**：`createStreamBasedAiConnector` 依赖 `env.stream`，缺省时请求无法完成
- **分支（A-16）**：引擎不存分支集；分支历史由宿主管理，切换分支用 `component:setMessages`，`onBranchChange` 触发宿主加载
- **无网络渲染器**：`ai-voice-input` 直接用 Web Speech API（用户手势触发的浏览器能力），不走 `RendererEnv`；`ai-token-usage` 纯展示 `metadata.usage`

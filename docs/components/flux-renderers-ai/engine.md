# flux-renderers-ai 引擎设计

> **本文档**：`engine.md`（从 `design.md` §7-§9 提取）
> **关联文档**：[`design.md`](./design.md)（设计总览）、[`implementation.md`](./implementation.md)（实施路线）、[`renderers.md`](./renderers.md)（渲染器 Schema）

## 7. 数据模型

### 7.1 ChatMessage（统一一处定义，消除 tiny-robot 的三处重复）

```ts
// src/engine/types.ts
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ChatMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
  | { type: 'file'; file: { url: string; name?: string; contentType?: string } }
  // P1 新增：通用 data part（host 自定义内容块，如 sources / events / artifacts）
  // 与 BubbleContentRendererMatch 注册制配合；type 用 `data-` 前缀避免与协议字段冲突
  | { type: `data-${string}`; id?: string; data: unknown };

export interface ChatToolCallFunction {
  name: string;
  arguments: string; // JSON string（流式逐字累积）
}

export interface ChatToolCall {
  index: number;
  id: string;
  type: 'function';
  function: ChatToolCallFunction;
}

export interface ChatMessageMetadata {
  createdAt?: number;
  updatedAt?: number;
  model?: string;
  finishReason?: string;
  [key: string]: unknown;
}

export interface ChatToolCallUIState {
  status: 'running' | 'success' | 'failed' | 'cancelled';
  open?: boolean;
  result?: string;
  // P3 新增：HITL 审批（human-in-the-loop）。engine 只持有状态字段，不实现暂停/恢复逻辑——
  // 审批工作流由 host action handler 处理（flux 不负责工作流编排）。
  approval?: 'pending' | 'approved' | 'rejected';
}

export interface ChatMessageUIState {
  thinking?: { open: boolean };
  toolCall?: Record<string, ChatToolCallUIState>;
  [key: string]: unknown;
}

export interface ChatMessage<
  M extends ChatMessageMetadata = ChatMessageMetadata,
  S extends ChatMessageUIState = ChatMessageUIState,
> {
  id: string; // flux 必需（React key 与 scope 绑定），tiny-robot 缺失
  role: ChatRole;
  content: string | ChatMessageContentPart[]; // OpenAI 多模态
  reasoning_content?: string; // DeepSeek/Anthropic 风格
  tool_calls?: ChatToolCall[];
  tool_call_id?: string; // role='tool' 时关联
  name?: string;
  loading?: boolean; // engine 写入：true 表示等待首个 chunk
  metadata?: M;
  state?: S;
}
```

> 不再使用 `extends ChatCompletionMessageParam`（避免对 `openai/resources` 类型的硬依赖，按 tiny-robot 调研报告 §10.2 第 7 条改进）。结构等价于 OpenAI Chat Completion message。

### 7.2 消息状态机

| 状态              | 字段位置                            | 取值                                               | 含义                                |
| ----------------- | ----------------------------------- | -------------------------------------------------- | ----------------------------------- |
| 请求级（turn 级） | `engine.requestState`               | `idle / processing / completed / aborted / error`  | 整个对话轮的生命周期                |
| 请求处理子状态    | `engine.processingState`            | `requesting / completing / calling-tools / string` | 流式细分                            |
| 消息级            | `message.loading`                   | `boolean / undefined`                              | 单条 assistant 消息是否在等首 chunk |
| 工具调用子状态    | `message.state.toolCall[id].status` | `running / success / failed / cancelled`           | 单个工具调用                        |

`engine.requestState` 通过 `engine.subscribe('requestState', fn)` 订阅，React adapter 用 `useSyncExternalStore` 桥接。

### 7.3 AiConversationInfo

```ts
export interface AiConversationInfo {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}
```

会话本身是 schema 驱动的（参见 `design.md` §10 `ai-conversations` 渲染器）；每个会话独占一个 engine 实例（双层模型：列表轻量 + engine 惰性创建 + 切走时清理空闲引擎，保留运行中的）。

## 8. 引擎与适配器

### 8.1 MessageEngine 接口（移植自 tiny-robot `kit/src/message/core/engine.ts`）

```ts
export interface MessageEngine {
  getState(): MessageEngineState;
  subscribe(listener: (state) => void): () => void; // 全量订阅
  subscribe(kind: 'messages' | 'requestState', listener): () => void; // 分通道
  sendMessage(content: string | ChatMessageContentPart[]): Promise<void>;
  send(...msgs: ChatMessage[]): Promise<void>;
  abort(): Promise<void>;
  /** 丢弃所有消息并把 requestState 重置为 `idle`（design.md §14.2 `ai:clear`）。 */
  clear(): void;
  setConnector(connector: AiConnector): void; /**
   * 热替换 connector（如切换模型 / provider）。
   * 进行中的请求继续使用旧 connector；下一条 sendMessage 用新 connector。
   * 这避免了"半句响应分裂"问题（旧请求用旧协议完成，新请求用新协议开始）。
   */
  registerPlugin(plugin: MessageEnginePlugin): () => void; // 返回 unsubscribe
  /** 当前消息的只读快照（design.md §14.3, ComponentHandle）。 */
  getMessages(): ChatMessage[];
  /**
   * 替换整个消息列表。由 Layer C ComponentHandle 的 `setMessages` 方法使用
   * （design.md §14.3 line 556）。回合进行中不可调用；调用方应先 `abort()`。
   */
  setMessages(messages: ChatMessage[]): void;
  /**
   * A-16 消息分支：丢弃尾部 assistant 轮（回到最后一条 user 消息）并重发请求，
   * 给新 assistant 消息盖 `metadata.branchId`。engine 不存分支集——host 拥有
   * 完整分支历史；本方法只记录新分支 id。`branchId` 可选：省略时 engine 分配
   * 递增 id。回合进行中不可调用；调用方应先 `abort()`。
   */
  regenerate(branchId?: string): Promise<void>;
}

export interface MessageEngineState {
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
  /** AI-19: 上一轮非 abort 的错误（connector 抛出 / 插件抛出 / tool-loop 失败）。
   *  每轮回合开始时清空；renderer 读取它喂 `onError`。 */
  lastError?: unknown;
}
```

> **AI-06 同步（2026-07-24）**：接口共 11 个方法（`getState` / `subscribe` /
> `sendMessage` / `send` / `abort` / `clear` / `setConnector` / `registerPlugin` /
> `getMessages` / `setMessages` / `regenerate`）。此前文档仅列 7 个，漏掉了
> `clear` / `getMessages` / `setMessages` / `regenerate`（A3 / A16 扩展期加入）。

引擎自身是纯 TS（无 React / Vue / DOM 依赖），可独立单测。

### 8.2 MessageStateAdapter 抽象（移植关键解耦点）

```ts
export interface MessageStateAdapter {
  initialize(initialState: InternalMessageState): void;
  getState(): PublicMessageState;
  getConnector(): AiConnector | null; // AI-08: 读访问器，避免穿透 cast
  getAbortController(): AbortController | null; // AI-08: 同上
  createMessage<T extends ChatMessage>(message: T): T; // 让 adapter 决定是否包装
  mutate(kind: MessageUpdateKinds, recipe: (draft) => void): void;
  subscribe(listener): () => void;
  subscribe(kind, listener): () => void;
}
```

> **AI-08 决策（2026-07-24）**：engine 历史上用 `(adapter as unknown as { state: InternalMessageState }).state.*` 穿透读私有字段（connector / abortController / isProcessing）共 6 处。两种收敛方案：
>
> - **方案 A（采用）**：接口加 `getConnector()` / `getAbortController()` 读访问器，`isProcessing` 走已有的 `getState()`。保留扩展点——plain-object adapter（不继承 `BaseMessageStateAdapter`、闭包持有 state）可自行实现这两个方法。
> - 方案 B（拒绝）：把 `CreateMessageEngineOptions.adapter` 收紧为 `BaseMessageStateAdapter` 类型。会破坏「直接实现接口」的扩展契约，且把抽象基类变成事实上的必经路径。
>
> 选 A 以保留 `MessageStateAdapter` 作为纯接口契约的语义。`BaseMessageStateAdapter` 内置默认实现，plain-object adapter 自行实现。收敛后 `create-engine.ts` 零穿透 cast（`rg "as unknown as \{ state: InternalMessageState \}"` 返回 0 匹配）。

两种实现：

- `createNativeMessageAdapter()`：纯 TS，闭包持有 state。**生产默认 + 公共导出** —— 是 `createMessageEngine` 的默认 adapter 创建路径（`create-engine.ts` 中 `options.adapter ?? createNativeMessageAdapter()`），并经 `index.ts` 公共导出（`export { createNativeMessageAdapter }`）。无需 React / DOM 即可驱动 engine，亦用于 engine 单测。
- `createReactMessageAdapter()`：内部用 module-level store + `Set<listener>`，配合 `useSyncExternalStore`。`mutate` 跑完 recipe 后通知订阅者；不依赖 React，但**为 React 订阅模型优化**（state 引用替换、按 kind 分通道通知）；同样经 `index.ts` 公共导出。

### 8.3 插件链生命周期

| 钩子                         | 调用时机                    | 典型用途                                                                               |
| ---------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `onTurnStart(context)`       | `sendMessage` / `send` 入口 | skill 注入 system prompt                                                               |
| `onBeforeRequest(context)`   | 发请求前                    | `toolPlugin.resolveTools` 聚合工具 + 写入 `requestBody.tools`                          |
| `onCompletionChunk(context)` | 每个流式 chunk              | `combineDeltaData` 累积；`thinkingPlugin` 检测 `reasoning_content` 写 `state.thinking` |
| `onAfterRequest(context)`    | 单轮请求结束                | `toolPlugin` 处理 `finish_reason: 'tool_calls'`，发起工具调用，再 `requestNext()`      |
| `onTurnEnd(context)`         | 整个对话轮结束              | 兜底重置 thinking 状态                                                                 |
| `onError(context)`           | abort 或异常                | 区分 `aborted` 与 `error`，写 `requestState`                                           |

### 8.4 流式累积算法（移植 `combineDeltaData`）

`src/engine/utils.ts:combineDeltaData(target, source)` 处理：

- string + string → 字符串拼接（除非字段是 `type`，已存在不覆盖）
- array + array：两边都有 `index` 字段 → **按 index 合并**（OpenAI tool_calls 流式 chunk 格式）；否则直接拼接
- object + object → 递归合并
- 新字段 → 直接赋值

这是引擎最关键的算法，必须有单元测试覆盖所有分支（参考 tiny-robot 的 `message/utils.test.ts`）。

### 8.5 React 适配：useMessage hook

```ts
export interface UseMessageOptions {
  connector: AiConnector;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
}

export interface UseMessageReturn {
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
  sendMessage: (content: string | ChatMessageContentPart[]) => Promise<void>;
  send: (...msgs: ChatMessage[]) => Promise<void>;
  abortRequest: () => Promise<void>;
  engine: MessageEngine; // 暴露给高级用法
}

export function useMessage(options: UseMessageOptions): UseMessageReturn;
```

实现要点：

- **AI-20 同步（2026-07-24）**：engine 实例通过 `useState` 的 lazy initializer
  持有一次（`const [selfEngine] = useState(() => createMessageEngine({...}))`），
  **不是** `useRef`。这样：rules-of-hooks 下 hook 总是无条件调用（条件落在值
  上，不在调用上）；deps 含 `options.connector` 引用变化时调
  `engine.setConnector`（idempotent on mount）。此前文档误写 `useRef`。
- `useSyncExternalStore(engine.subscribe, engine.getState)` 订阅状态
- React 19 默认不加 `useMemo` / `useCallback`，按 AGENTS.md React 19 章节
- 当 `options.engine`（外部 engine，如 `useConversation.activeEngine`）被传入时，
  绑定该外部 engine，自建 engine 保持 idle；外部 engine 的 connector 生命周期归
  owner，热替换 effect 对它跳过（review m4: never touch an external engine's
  connector）。自建 engine 在卸载时会 `abort()` 在途流（F2.2）。

### 8.6 useConversation hook

```ts
export interface UseConversationOptions {
  storage?: ConversationStorageStrategy;
  autoSaveMessages?: boolean;
  connector: AiConnector;
  createEngineOptions?: Omit<UseMessageOptions, 'connector'>;
}

export interface UseConversationReturn {
  conversations: AiConversationInfo[];
  activeConversationId: string | null;
  activeEngine: MessageEngine | null;
  createConversation(params?): AiConversationInfo;
  switchConversation(id: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  renameConversation(id: string, title: string): void;
  clearAll(): void;
  /**
   * Layer B 桥接对象（P1，design.md §11.1 Layer B）：绑定到 `ai-chat` 的
   * `conversationController` prop，让 `ai:createConversation` / `ai:switchConversation`
   * 等会话级 action 委托到本 hook 的实现。
   */
  controller: AiConversationControllerBridge;
}
```

照搬 tiny-robot 双层模型：`conversations` 数组始终全量内存；`engines: Map` 惰性创建，切走时清理非活跃非 processing 的 engine，保留正在流式的会话后台运行。

## 9. Connector 抽象（替代 v1 的 Provider 抽象）

### 9.1 命名变更说明

v1 用 `AiResponseProvider` 命名，v2 改为 **`AiConnector`**。理由：

- "Provider" 与 React Context Provider、`BaseModelProvider`（tiny-robot 已废弃抽象）容易混淆
- "Connector" 更准确反映其职责：**把 engine 接到具体 AI 后端的连接器**
- 与 `env.stream` / `env.openSocket` 的"连接能力"语义对齐

### 9.2 `AiConnector` 接口（包内只定义契约，不含实现）

```ts
// src/engine/types.ts
export type AiConnectorStreamResult =
  | AsyncGenerator<AiConnectorChunk>
  | Promise<AsyncGenerator<AiConnectorChunk>>;

export interface AiConnectorChunk {
  /** 增量 delta（OpenAI ChatCompletionChunk 结构等价；不直接 import SDK 类型） */
  delta?: {
    role?: ChatRole;
    content?: string;
    reasoning_content?: string;
    /**
     * 流式 tool_calls 是 partial（后续 chunk 可省略 `id`/`type`/`function.name`），
     * 故此处用 `AiConnectorDeltaToolCall[]`（`id`/`type`/`function` 均可选）而非
     * 完成的 `ChatToolCall[]`。后者是 finalize 后的形态（见 `engine/types.ts`
     * `AiConnectorDeltaToolCall` 与 `ChatToolCall`）。
     */
    tool_calls?: AiConnectorDeltaToolCall[];
  };
  /** 整体快照（某些后端按 snapshot 而非 delta 推送时使用） */
  snapshot?: Partial<ChatMessage>;
  /** chunk 元信息 */
  finishReason?: string;
  metadata?: ChatMessageMetadata;
}

export interface AiConnectorRequest {
  messages: ChatMessage[];
  tools?: AiToolSchema[]; // 结构等价于 OpenAI ChatCompletionTool
  signal: AbortSignal;
  /** 其他 OpenAI 兼容参数（temperature / top_p / max_tokens 等） */
  [key: string]: unknown;
}

export interface AiConnector {
  /** 流式调用：返回增量 chunk 的 AsyncGenerator */
  stream(request: AiConnectorRequest): AiConnectorStreamResult;
  /** 可选：非流式调用 */
  complete?(request: AiConnectorRequest): Promise<ChatMessage>;
}
```

> `AiConnector` 是 **engine 与 host 之间的契约**。engine 调 `connector.stream(...)`，对返回的 AsyncGenerator 做累积（`combineDeltaData`）；engine 自身不知道也不关心后端是 OpenAI / DeepSeek / 自家网关 / mock。

### 9.3 包内不提供任何具体 Connector 实现

- ❌ **不**内置 `createOpenAICompatibleProvider`（v1 错误）
- ❌ **不**内置 `createMockProvider`（v1 错误）
- ❌ **不**直调 `fetch` / `EventSource` / `ReadableStream` / `WebSocket`

具体实现由 **host** 提供。host 有两种组装方式：

**方式 A（推荐）：用 `env.stream` 组装**

由于 `env.stream` 已自动处理 SSE 切分 + JSON 解析（参见 `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` §第 2 轮），组装 Connector 非常简洁：

```ts
// host 应用代码示例（apps/playground/src/ai-connectors.ts）
import { createStreamBasedAiConnector, type AiConnector } from '@nop-chaos/flux-renderers-ai';

export function createOpenAIConnector(
  env: RendererEnv,
  config: { baseURL: string; apiKey: string; model: string },
): AiConnector {
  return createStreamBasedAiConnector({
    env,
    buildRequest: (req) => ({
      url: `${config.baseURL}/chat/completions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: { model: config.model, messages: req.messages, tools: req.tools, stream: true },
      // env.stream 默认就是 streamProtocol: 'sse' + streamChunkType: 'json'，无需显式指定
    }),
  });
}
```

`createStreamBasedAiConnector` 是**包提供的 host helper**（在 `src/adapters/ai-connector-factory.ts`），它：

- 接收 `env` + 用户提供的 `buildRequest` 回调
- 内部调 `env.stream(api, ctx)` —— streamFetcher 自动完成 URL 拼接、body 序列化、SSE 切分、JSON.parse
- 把 chunks 中的 OpenAI chunk 结构映射为 `AiConnectorChunk`（包内类型转换，无协议解析）
- **不含**任何 baseURL / apiKey / model 硬编码
- **不含**任何 SSE 协议解析代码（已下沉到 `env.stream`）

**方式 B：完全自定义 Connector**

```ts
// host 应用代码示例（用 env.fetcher / env.openSocket / 自有 SDK 都行）
import type { AiConnector } from '@nop-chaos/flux-renderers-ai';

export const myCustomConnector: AiConnector = {
  async stream(req) {
    // 业务方自由实现：可以用 env.stream、env.openSocket、env.fetcher
    // （但若不用 env，违反 INV-1，应在 host 内部评审）
  },
};
```

### 9.4 注入到 schema

host 在 `xui:imports` 注册 connector 实例：

```ts
// host 应用启动代码
runtime.registerImport('ai', {
  connectors: {
    openai: createOpenAIConnector(env, { baseURL: '...', apiKey: '...', model: 'gpt-4' }),
    deepseek: createOpenAIConnector(env, { baseURL: 'https://api.deepseek.com/v1', ... }),
  }
});
```

schema 通过表达式引用：

```json
{
  "type": "ai-chat",
  "connector": "${$ai.connectors.openai}"
}
```

### 9.5 `useMessage` 接口变更

```ts
export interface UseMessageOptions {
  connector: AiConnector;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
}
```

engine 在内部调 `connector.stream({ messages, tools, signal })`；不再有 `setResponseProvider` 这种方法，改为 `setConnector(connector)` 支持热替换。

### 9.6 不保留的旧抽象（继承自 v1）

- ❌ 不实现 `BaseModelProvider` / `OpenAIProvider` / `AIClient`（tiny-robot 已废弃）
- ❌ 不实现 `handleSSEStream` 回调式（SSE 切分由 `env.stream` 内部完成）
- ❌ 不实现 `formatMessages` / `extractTextFromResponse`
- ❌ 不内置 `createOpenAICompatibleProvider` / `createMockProvider`（v1 错误，已删除）
- ❌ 不内置任何 SSE/流式协议解析模块（v1 的 `src/sse/sse-stream-to-generator.ts` 已删除，协议解析下沉到 `env.stream`）

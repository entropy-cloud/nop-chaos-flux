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
- **热替换 scope（2151 P2 doc hardening）**：**只有 `connector` 是热替换字段**——
  `options.connector` 引用变化时调 `engine.setConnector`。其余选项
  （`systemPrompt` / `tools` / `toolExecutor` / `maxToolRounds` / `extraRequestParams` /
  `plugins`）为 **mount-time-only**：它们仅在 `useState` 的 lazy initializer 里
  种入 engine，后续 render 改变这些字段的值是**静默 no-op**——`MessageEngine`
  没有对应的 setter（设计如此：mid-conversation 改 prompt/toolset 是 host 层决策，
  应走「换 engine」路径，例如经 `useConversation.activeEngine` 注入新 engine）。

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

> **存储/驱逐契约（0730-1 P1 修正）**
>
> - **`clearAll()`** 不再是「仅清内存」的半成品：注入 `storage` 时它会逐条（或当 host 提供 `storage.clearAll?` 时原子地）调 `deleteConversation`/`clearAll` 清存储，单条失败经 `onStorageError({ phase:'deleteConversation' })` 上报且不阻断其余条；内存态始终清空。这避免了「清空后重载 ghost rehydration」（FP-2/FP-3）。
> - **`switchConversation` 的驱逐循环是 storage-aware**：仅当注入了 `storage` 时才驱逐非活跃、非 processing 的 idle engine（可经 `loadMessages` 回灌）；无 storage 时**不驱逐**——因为 ephemeral-by-design，无 rehydration 可恢复，驱逐即丢消息（FP-4）。host 仍可经 `deleteConversation` 主动收敛内存。
> - **`deleteConversation` 的 post-await 分支读 ref**（`activeIdRef.current` / `conversationsRef.current`）而非闭包值，确保删除进行中的会话期间并发 `createConversation` 时新会话不被陈旧闭包覆盖（FP-1）。所有 `setActiveId` 调用点同步刷新 `activeIdRef.current`，闭合 effect-mirror 与 abort 微任务的竞态。

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

## §Invariants — AI Engine 不变式契约

> 2026-08-09 沉淀（plan `docs/plans/2026-08-09-1826-2-i1-invariant-gate-sedimentation.md`，ai-invariant-loop Cycle 1 / I1）；2026-08-09 扩展（plan `docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`，K1-K4 修复 + 门禁 ②③④⑤ 补强）；2026-08-09 Cycle 2 / I1（plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`，N1-N5 → 第二批门禁 ⑥-⑩ 沉淀）；**2026-08-10 Cycle 2 / I4（plan `docs/plans/2026-08-10-0925-2-cycle2-i4-fix-execution.md`：13 条 K finding 全部修复 + 12 处 `it.fails` 翻转 + 注册红清零 + 门禁 ⑥⑦⑨⑩②④ 补强）**

AI engine 历经 4 轮审计（`docs/audits/2026-07-2*-ai.md`）发现的三大复发失败模式族（并发守卫 / stale-closure / storage 静默丢），已沉淀为**首批 5 类可执行不变式契约**，防重构/新增方法回归。I2 审计在门禁盲区发现 K1-K4 四个实例（I3 裁决 P0/P1），I4 修复并把门禁补强至对应路径；Cycle 1 / I6 按 Loop Rule 派生的 Cycle 2 新族 N1-N5（active 位移完整性 / bootstrap 合并 / branch 戳泄漏 / plugin 错误隔离 / 失败轮残留污染），已沉淀为**第二批门禁 ⑥-⑩**（见下节）：

- **不变式目录**：`docs/audits/ai-invariants/invariant-catalog.md`（每条含陈述 + 覆盖失败族 + 历史 bug 证据 live 行号 + 检测方法；§7 = I4 的 ②③④⑤ 扩展契约；§9 = Cycle 2 的 ⑥-⑩ 契约）。
- **门禁清单**：`docs/audits/ai-invariants/gates.md`（不变式 × 覆盖方法 × 检测方式 × 运行命令，棘轮单调追加登记处；Cycle 2 追加 ⑥-⑩ 五行 + 注册红节）。

### Cycle 2 门禁 ⑥-⑩（已修复，Cycle 2 / I4 翻转 + 清零）

> 沉淀时（2026-08-09）live 代码违反 ⑥-⑩——门禁以「预期失败」形态落库（`it.fails` ×12 + 扫描器注册红 ⑥×3 + ⑧×1）。**Cycle 2 / I4（2026-08-10）已全部修复：12 处 `it.fails` 全量翻转 `it` 且全绿、注册红清零（`check:ai-engine-invariants` live 零命中）、门禁按 I4 契约补强**（catalog §10：⑩ 空产物统一谓词 / ⑥ 同 tick 组合 + bootstrap build-on-demand / ⑦ clearAll 守卫 / ② 镜像写面 + `scanMirrorWriteSurface` / ④ 元数据排空链 / ⑨ abort 变体）。

- **⑥ active 位移完整性（N1）**：post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；位移方法（delete/clearAll/create）必须 bump `switchVersionRef` + 重置 `switchTargetRef`；switch 入口 exists 检查读镜像；version guard 为 id-aware（同 id 重 switch 不丢 hydration）；删除 active 后 next 引擎 build-on-demand；bootstrap 选中 active 建引擎 + loadMessages（K-⑥-3）。扫描器：`scanDisplacementVersionBumps`（live 零命中）。
- **⑦ storage bootstrap 列表合并（N2）**：bootstrap post-await `setConversations` 必须合并（不得覆盖加载期间创建的会话）+ clearAll 守卫（已清列表不复活，K-⑦-1）。
- **⑧ branch 戳消费/清除（N3）**：`pendingBranchId` 使用前必须消费或清除；runTurn 提前返回路径不得遗留待消费戳（connector-missing 早退已清戳）。扫描器：`scanBranchStampReset`（live 零命中）。
- **⑨ plugin 错误隔离（N4）**：plugin hook rejection 不得使 turn 卡死或绕过状态写入——onTurnStart 纳入 try 清理面；onError 经 `callPluginError` 隔离（抛错不跳过状态写入）；onTurnEnd rejection 隔离（不 reject host-facing promise，abort 变体 K-⑨-1）。
- **⑩ 失败轮产物清理（N5）**：failed/aborted/退化成功（零 chunk）轮的空产物（`content:''` + 无 finishReason）不得进入请求历史与 autoSave 快照——终态提交层 drop（`commitOrDropResidue`）+ buildContext 尾部排除 + autoSave 尾部剥除（K-⑩-1/2/3/4/5）。

### 空产物清理设计裁定（K-⑩，重构防回退）

**空产物（`content:''` 且无 `finishReason`）的 assistant 消息不得进入请求历史与 autoSave 快照**——统一谓词 `isVacuousAssistantResidue`（`engine/utils.ts`）。三条落地面缺一不可：① 终态提交层 drop（`commitOrDropResidue`，失败/中止/退化轮不提交空产物）；② `buildContext` 尾部排除谓词扩展（纵深防御）；③ autoSave 快照尾部剥除（覆盖 `abort()` 同步翻 `requestState` 早于 engine 清理的窗口）。部分内容（非空）的失败轮产物保留提交（用户已见部分回答）；带 finishReason 的空内容提交保留（真实完成）。见 `docs/audits/ai-invariants/invariant-catalog.md` §10.1 / bug note 125。

### 运行命令

```bash
# 参数化穷举不变式测试（engine + adapter，含表完备性门禁；⑥⑦ 在 conversation-invariants-cycle2.test.ts，⑩ 与 ②/④ 元数据排空臂在 engine-invariants-i4.test.ts / conversation-invariants-i4.test.ts）
pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants.test.ts src/adapters/__tests__/conversation-invariants.test.ts src/adapters/__tests__/conversation-invariants-cycle2.test.ts src/engine/__tests__/engine-invariants-i4.test.ts src/adapters/__tests__/conversation-invariants-i4.test.ts

# 静态门禁（②③④⑥⑧ + ② 镜像写面；①⑤⑦⑨⑩ 纯行为/行为面不静态化；Cycle 2 / I4 后 live 零命中）
pnpm check:ai-engine-invariants
```

### 表完备性规则

engine/adapter 任何新增或重构的变更方法若不在测试表也不在白名单 → 测试红（`Object.keys(createMessageEngine())` 运行时枚举断言）。这是「治反应式盲区」的核心——不再依赖人工记住把新方法加入测试。

白名单（非变更，不写会话状态）：`getState`/`subscribe`/`setConnector`/`registerPlugin`/`getMessages`。`runTurn` 为内部管道（非公共成员），不进表，由 `send`/`sendMessage`/`regenerate` 间接覆盖。

### Failure Path — 永不 settle 的 connector（K2 设计裁定）

`abort()` 以 best-effort 强制终结在途 generator（`activeGenerator?.return()` + chunk 循环每迭代 `signal.aborted` 检查）——**协作式** generator（挂在 `yield` 上）经 `.return()` 立即结算；**永不 yield 的 generator（卡在自己内部 `await`）无法从外部抢占**，属 **connector 契约违背**，非 engine 缺陷（invariant-catalog §7.2 / bug note 122）。host 侧若需绝对终止保证，connector 必须尊重 `request.signal` 或保持协作式 yield 结构。

### Failure Path — 已知违背面（Cycle 2 / ⑥-⑩，已修复）

> Cycle 2 / I4（2026-08-10）修复前，以下面曾被门禁钉死为预期红（`it.fails` + 扫描器注册红）。**全部已修复并翻转**（`engine-invariants.test.ts` / `conversation-invariants-cycle2.test.ts` / `conversation-invariants.test.ts` 全 `it` 全绿；`check:ai-engine-invariants` live 零命中）。本段保留为修复记录：

- **失败轮空 placeholder 进后续历史/持久化**（⑩/N5）：失败轮 catch 提交 `loading=false, content=''` 的 assistant placeholder，`buildContext` 仅排除 `loading===true` 尾消息 → 空块进入下一请求（严格后端拒绝）且经 autoSave 持久化。**修复**：空产物（`content:''` + 无 finishReason）统一谓词 `isVacuousAssistantResidue`（`engine/utils.ts`）——终态提交层 drop（`commitOrDropResidue`）、buildContext 尾部排除扩展、autoSave 快照尾部剥除（K-⑩-1/2/3/4/5，bug note 125）。
- **plugin hook rejection 卡死 turn**（⑨/N4）：`onTurnStart` 在 try 之外（rejection 使 `processing` 卡死）、catch 内 `onError` 先于状态写入（抛错跳过 mutate）、`onTurnEnd` rejection 遮蔽原错误。**修复**：onTurnStart 移入 try；`callPluginError` 隔离全部 onError 调用点；onTurnEnd rejection 隔离（不 reject host-facing promise，abort 变体 K-⑨-1，bug note 130）。
- **active 位移错位**（⑥/N1）：switch 在途 × delete/clearAll/create 时，post-await 提升/复水可能覆盖被位移的 active 状态；delete active 后 next 引擎 null 悬挂；同 id 快速重 switch hydration 被 version guard 丢弃。**修复**：位移方法 bump + 镜像写面 + id-aware version guard + build-on-demand（bootstrap/delete-fixup，K-⑥-1/2/3，bug note 126）。
- **branch 戳泄漏**（⑧/N3）：connector-missing 早退遗留 `pendingBranchId` → 下一无关 turn 被戳 branchId。**修复**：早退前清戳（bug note 125/130 同文件面）。
- **bootstrap 列表覆盖**（⑦/N2）：bootstrap 整体覆盖加载期间创建的会话。**修复**：合并 + clearAll 守卫（K-⑦-1，bug note 127）。
- **storage 元数据幽灵**（②/④，K-K4/②-1/2 + K-K3/④-1）：delete/clearAll 缺镜像写面 → rename 重存已删会话；rename/create 元数据写不入排空链 → gated 写晚于 clearAll 落盘。**修复**：镜像写面全方法同步 + 元数据写入排空链 + settlement-time 再校验（bug notes 128/129）。

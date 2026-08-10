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

export interface ChatMessageEditingState {
  active: boolean;
  draft?: string;
}

export interface ChatMessageUIState {
  thinking?: { open?: boolean; startedAt?: number; endedAt?: number };
  toolCall?: Record<string, ChatToolCallUIState>;
  // renderer 驱动的消息编辑态（用户消息编辑入口，design.md §11.5）。engine 持有，
  // 虚拟滚动回收（A-8）不会丢掉 editing 标志/草稿；不投射到 flux scope。
  editing?: ChatMessageEditingState;
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
   * （design.md §14.3 ComponentHandle）。回合进行中不可调用；调用方应先 `abort()`。
   */
  setMessages(messages: ChatMessage[]): void;
  /**
   * Renderer-driven message editing state（design.md §11.5）。写
   * `message.state.editing`；`editing` 为 `null` 时清除。`messageId` 无匹配时
   * no-op（Failure Path `edit-unknown-message`）。不投影到 scope。
   */
  setMessageEditing(messageId: string, editing: { active: boolean; draft?: string } | null): void;
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

> **AI-06 同步（2026-07-24；方法计数 2026-08-10 校准）**：接口共 **12** 个方法
> （`getState` / `subscribe` / `sendMessage` / `send` / `abort` / `clear` /
> `setConnector` / `registerPlugin` / `getMessages` / `setMessages` /
> `setMessageEditing` / `regenerate`）。此前文档仅列 7 个，漏掉了
> `clear` / `getMessages` / `setMessages` / `regenerate`（A3 / A16 扩展期加入）；
> 2026-08-10 补 `setMessageEditing`（§4.7 消息编辑，P1-9 后加入）并把计数校准为 12。

**A-16 branch id 契约（2026-08-11，R2-F3 文档化；行为测试 `engine-branches.test.ts`）**：

- **尾部数字解析归一化**：`regenerate()` 未传 `branchId` 时从先前 assistant 的 `metadata.branchId` 前进——尾部数字经 `parseInt(m[2], 10)` 解析，**前导零归一化**：host 传入 `branch-01` 前进为 `branch-2`（数值语义正确，显示级格式漂移是约定行为，不是 bug）。
- **无数字后缀 fallback**：先前 branch id 无数字后缀（如 host 自定义 `branch-abc`）→ 不尝试派生，从内部序列计数器 mint 新 `branch-<n>`（首条 `branch-1`）。
- **不校验格式**：`findPriorAssistantBranchId`（`engine/branching.ts`）对先前 branch id **不做格式校验**，host 自定义任意字符串原样透传；格式处理发生在 `branchSeq.next` 的解析面（上述两条）。host 若需严格的格式约定，应在注入 branch id 时自行校验。

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

- `createNativeMessageAdapter()`：纯 TS，闭包持有 state。**生产默认 + 公共导出** —— 是 `createMessageEngine` 的默认 adapter 创建路径（`create-engine.ts` 中 `options.adapter ?? createNativeMessageAdapter()`），并经 `index.ts` 公共导出（`export { createNativeMessageAdapter }`）。无需 React / DOM 即可驱动 engine，亦用于 engine 单测。**快照稳定性限制（FIND-05，2026-08-11，plan `2026-08-11-0008-3`）**：`getState()` 每次调用都重建新对象引用——对 React 宿主直绑（`useSyncExternalStore`）**不稳定**（快照引用每次变化 → 无限渲染循环「Maximum update depth exceeded」页面崩溃）。native adapter 只供**非 React 消费**（engine 单测 / Node / 其他框架）。React 绑定必须先经 `createReactMessageAdapter()` 构造 engine（见 §8.5 前置条件）。
- `createReactMessageAdapter()`：内部用 module-level store + `Set<listener>`，配合 `useSyncExternalStore`。`mutate` 跑完 recipe 后通知订阅者；不依赖 React，但**为 React 订阅模型优化**（state 引用替换、按 kind 分通道通知）；同样经 `index.ts` 公共导出。`getState()` 返回**缓存快照**（mutation 之间引用稳定）——满足 `useSyncExternalStore` 快照恒等契约。

### 8.3 插件链生命周期

| 钩子                         | 调用时机                    | 典型用途                                                                               |
| ---------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `onTurnStart(context)`       | `sendMessage` / `send` 入口 | skill 注入 system prompt                                                               |
| `onBeforeRequest(context)`   | 发请求前                    | `toolPlugin.resolveTools` 聚合工具 + 写入 `requestBody.tools`                          |
| `onCompletionChunk(context)` | 每个流式 chunk              | `combineDeltaData` 累积；`thinkingPlugin` 检测 `reasoning_content` 写 `state.thinking` |
| `onAfterRequest(context)`    | 单轮请求结束                | `toolPlugin` 处理 `finish_reason: 'tool_calls'`，发起工具调用，再 `requestNext()`      |
| `onTurnEnd(context)`         | 整个对话轮结束              | 兜底重置 thinking 状态                                                                 |
| `onError(context)`           | abort 或异常                | 区分 `aborted` 与 `error`，写 `requestState`                                           |

> **插件上下文只读契约（⑪，2026-08-10）**：`MessageEngineContext` 的 `request.messages` 与 `state` 均为 **read-only**（`engine/types.ts` 文档化）。`request.messages` 是引擎历史的**数组 + 元素双重隔离副本**（`buildContext` 经 wire 白名单投影逐元素新建对象）——插件可以塑造出站请求（如 push system prompt），但任何 push / 元素原地修改都**不会写穿**进引擎历史（绕过 `mutate`/notify 的污染路径已封堵）。`state` 为 live 引擎状态对象，插件**不得**直接修改（引擎写入只走 `adapter.mutate` recipe）。注入 system prompt 的推荐方式 = `CreateMessageEngineOptions.systemPrompt`（不进历史）；次选 = 在 `onTurnStart` 内 push 到 `ctx.request.messages`（只影响本轮出站载荷，不进历史、不持久化）。
>
> **插件 state 写面注记（P1-7/P1-8，2026-08-10 multi-audit）**：`thinkingPlugin` 与 `toolPlugin` 在 `onCompletionChunk` 写 `message.state.thinking` / `message.state.toolCall[id]`（status / startedAt / endedAt / result），但**不写 `open` 字段**（保持 undefined-absent）。历史缺陷：两插件 write-once-false pin `open:false` → 气泡渲染器 `?? internalOpen` 被短路，展开 chevron / reasoning 面板死控件。现契约 = `open` 为可选字段：engine 不持有即 renderer 本地展开态（方案 A，无引擎写回 API 支撑写回面）；host 显式写入 `open: true/false` 时渲染器以 engine 值为准（随消息快照存活）。

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
  /** 可选外部 `MessageEngine`（如 `useConversation.activeEngine`）；提供时绑定它，否则自建（零回归默认）。 */
  engine?: MessageEngine | null;
  connector: AiConnector | null;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
  /** 每次请求额外透传的 OpenAI 兼容参数。 */
  extraRequestParams?: Record<string, unknown>;
  systemPrompt?: string;
  /** host 注入的工具 schema（作为 `request.tools` 转发）。 */
  tools?: AiToolSchema[];
  /** host 注入的工具执行器（启用多轮 tool_calls 循环）。 */
  toolExecutor?: ToolExecutor | null;
  /** 连续工具调用轮数上限（默认 8）。 */
  maxToolRounds?: number;
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
- **外部 engine adapter 前置条件（FIND-05，2026-08-11，plan `2026-08-11-0008-3`）**：当 `options.engine`（外部 engine，如 `useConversation.activeEngine`）被传入时，绑定该外部 engine。**被绑定的外部 engine 必须用 `createReactMessageAdapter()` 构造**（`createMessageEngine({ connector, adapter: createReactMessageAdapter() })`）——`useEngineView` 的 `useSyncExternalStore` 绑定要求 `getSnapshot` 在两次通知之间返回稳定引用；默认 native adapter（`createMessageEngine({ connector })` 的默认构造）每次 `getState()` 都重建对象 → 无限渲染循环。运行时守卫（`use-engine-view.ts`）：检测到连续两次快照引用不等（native adapter 特征；React adapter 的合法变更只产生孤立 mismatch，零误报）时 `console.warn` 一次并指向 `createReactMessageAdapter`——宿主按 §8.5 文档化路径接入即收到可诊断错误而非页面崩溃。自建 engine 恒经 React adapter（零回归默认）；外部 engine 的 connector 生命周期归 owner，热替换 effect 对它跳过（review m4: never touch an external engine's connector）。自建 engine 在卸载时会 `abort()` 在途流（F2.2）。
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
  connector: AiConnector;
  /** 自建 engine 的构造选项（排除 `connector`/`engine`——热替换路径 + buildEngine 静默丢弃面，open P2-1/P2-2）。 */
  createEngineOptions?: Omit<UseMessageOptions, 'connector' | 'engine'>;
  storage?: ConversationStorageStrategy;
  autoSaveMessages?: boolean;
  /** 初始会话列表（提供 `storage` 时忽略）。 */
  initialConversations?: AiConversationInfo[];
  /** AI-28：存储操作失败回调（`{ phase, conversationId?, error }`），非致命。 */
  onStorageError?: (event: ConversationStorageErrorEvent) => void;
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

> **FIND-08（2026-08-11，plan `2026-08-11-0335-3`）**：`ConversationStorageErrorEvent`（`onStorageError` 回调的事件类型）已从包入口导出——宿主可直接 `import type { ConversationStorageErrorEvent } from '@nop-chaos/flux-renderers-ai'` 命名该类型（对齐 `ConversationStorageStrategy` 先例）。
>
> **双命名接口关系（FIND-19，2026-08-11，plan `2026-08-11-0335-3`）**：`controller` 字段类型为 `AiConversationControllerBridge`（hook 产出面）；`ai` namespace / action-provider 消费面是 `AiConversationController`（`ai-conversation-controller.ts`，design.md §14.2）——二者结构性可赋值（3/4 成员同构，`renameConversation` 仅返回类型宽度差 `void` vs `MaybePromise<void>`），host 将 `useConversation()` 的 `controller` 直接绑到 `conversationController` prop 即成立。双命名保留为 hook 产物类型稳定性；成员须两接口同步演进，不做结构性合并（公共导出面变更需人工确认）。

> **行为注记（2026-08-10，multi P2-2/P2-7 + open P2-1/P2-2；接口清单本体同步归 `docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`）**
>
> - **unmount 清理 = detach-before-abort**：卸载 cleanup 先 unsubscribe autoSave 再 abort in-flight engine（与 `clearAll` K3 同序），并清空 `pendingSavesRef`——卸载期 abort 不再入队无人排空的 aborted 快照 save（multi P2-2）。
> - **bootstrap effect 依赖稳定**：mount bootstrap 经 `storageRef` 镜像读取（host 每 render 内联构造 storage 不再逐 render 重跑 `loadConversations`；multi P2-7）。
> - **connector 变更 fan-out**：`connector` 变更时对 engineCache 全量自建 engine `setConnector`（open P2-1）。
> - **`createEngineOptions` 收窄**：类型排除 `engine`（`Omit<UseMessageOptions, 'connector' | 'engine'>`）——被 `buildEngine` 静默丢弃的字段不再可传（open P2-2）。

> **存储/驱逐契约（0730-1 P1 修正 + 2026-08-11 FIND-02 收口）**
>
> - **`clearAll()`** 不再是「仅清内存」的半成品：注入 `storage` 时它逐条（clearAll 时点会话快照 per-id）调 `deleteConversation` 清存储，单条失败经 `onStorageError({ phase:'deleteConversation', conversationId })` 上报且不阻断其余条；内存态始终清空。这避免了「清空后重载 ghost rehydration」（FP-2/FP-3）。**FIND-02（2026-08-11，plan `2026-08-11-0008-3`）裁定（方案 a 采用）**：存储清空**只对 clearAll 时点快照做 per-id `deleteConversation` fan-out，永不调用 `storage.clearAll()`**——原子 clear 链在 drain 之后结算，会晚于「clearAll→drain 窗口内新建会话」的 save（该 save 不入本 drain：`pendingSavesRef` 同步清空）并抹掉新记录（「ghost-free-creation in reverse」：列表存活但记录被擦）。per-id 快照删除天然只作用于 clearAll 时点存在的会话，clear 后新写永不被扫；`ConversationStorageStrategy.clearAll` 保留为 host 直调面（`storage/types.ts` 文档同步）。既有 K3 守卫覆盖「旧写在 delete/clear 前 drain」方向，本面补「clear 后新写不被误清」反向。
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
```

> **载荷白名单（⑪/P1-5，2026-08-10）**：engine 在 `buildContext` 对 `messages` 做 **wire 投影**（`projectWireMessage`，`engine/utils.ts`）——渲染器私有 `state`（editing 草稿 / toolCall UI / thinking）与内部工具 metadata（`toolError` Error stack / `toolStatus`）**不进入连接器请求**（design.md §11.5「state 不投影」）；保留 `{id, role, content, reasoning_content, tool_calls, tool_call_id, name}` + 良性 metadata（createdAt/model/finishReason）。剥离在 engine 边界（非 connector 归一化层）：engine 是唯一知道哪些字段是域内部的层，全部 connector（`createStreamBasedAiConnector` 或自定义实现）按契约收到干净载荷。`state` 仍是引擎内部消息形状（`getMessages()` 完整返回），仅 wire 面排除——不改公共类型签名。

```ts
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
// host 应用代码示例（apps/playground/src/ai/openai-connector.ts）
import { createStreamBasedAiConnector, type AiConnector } from '@nop-chaos/flux-renderers-ai';

export function createOpenAICompatibleConnector(
  env: RendererEnv,
  config: { baseURL: string; apiKey: string; model: string },
): AiConnector {
  return createStreamBasedAiConnector({
    env,
    buildRequest: (req) => ({
      url: `${config.baseURL.replace(/\/$/, '')}/chat/completions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      data: { model: config.model, messages: req.messages, tools: req.tools, stream: true },
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

注入分两步：host 侧提供 `env.importLoader`（把 `xui:imports` 的 spec 解析成命名空间模块），schema 侧声明 `xui:imports` 并以表达式引用。**不存在任何全局注册 API**——FIND-11（plan `2026-08-11-0335-3`）已移除虚构的全局注册示例，真实机制仅此一种。

host 侧（playground 真实实现 `apps/playground/src/ai/mock-ai-env.ts:96-125`）：

```ts
// host 应用代码示例：经 env.importLoader 暴露 `ai` 命名空间
const { importLoader, resolveImportUrl } = createAiImportLoader(connector, {
  tools: mockToolSchemas,
  toolExecutor: mockToolExecutor,
});
const env: RendererEnv = {
  /* ...既有字段 */ importLoader,
  resolveImportUrl,
  stream: createMockAiStream(),
};

// importLoader.load(spec) 内部：spec.from === 'ai://' → 返回模块 {
//   createExpressionHelpers: () => ({ connectors: { mock: connector }, tools, toolExecutor })
// }
```

schema 侧声明并引用：

```json
{
  "type": "page",
  "xui:imports": [{ "from": "ai", "as": "ai" }],
  "body": [{ "type": "ai-chat", "connector": "${$ai.connectors.mock}" }]
}
```

### 9.5 `useMessage` 接口变更

```ts
export interface UseMessageOptions {
  engine?: MessageEngine | null;
  connector: AiConnector | null;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
  extraRequestParams?: Record<string, unknown>;
  systemPrompt?: string;
  tools?: AiToolSchema[];
  toolExecutor?: ToolExecutor | null;
  maxToolRounds?: number;
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

> 2026-08-09 沉淀（plan `docs/plans/2026-08-09-1826-2-i1-invariant-gate-sedimentation.md`，ai-invariant-loop Cycle 1 / I1）；2026-08-09 扩展（plan `docs/plans/2026-08-09-2007-2-cycle1-i4-fix-execution.md`，K1-K4 修复 + 门禁 ②③④⑤ 补强）；2026-08-09 Cycle 2 / I1（plan `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`，N1-N5 → 第二批门禁 ⑥-⑩ 沉淀）；**2026-08-10 Cycle 2 / I4（plan `docs/plans/2026-08-10-0925-2-cycle2-i4-fix-execution.md`：13 条 K finding 全部修复 + 12 处 `it.fails` 翻转 + 注册红清零 + 门禁 ⑥⑦⑨⑩②④ 补强）**；**2026-08-10 双审计 P1（plan `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`：6 条 P1 修复 + 门禁 ⑩ dangling-tool_calls 成员 + ⑪ plugin ctx 写隔离新族 + ④ fan-out 源成员）**；**2026-08-10 双审计 P2（plan `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`：⑧ break/throw 扩面 + adapter 面行为修正——unmount detach-before-abort / bootstrap storage 依赖稳定化 / connector fan-out / createEngineOptions 类型收窄 / O-2 注释重写）**；**2026-08-11 双审计 P1（plan `docs/plans/2026-08-11-0008-2-engine-loop-termination-and-error-carrier-remediation.md`：R1-F1 marker 载体归位 + renderer 终止消费 + FIND-03 A-5 错误载体回归；⑩ 面枚举事实修正注记 + 失败路径记录）**；**2026-08-11 双审计 P1（plan `docs/plans/2026-08-11-0008-3-conversation-adapter-host-contract-remediation.md`：FIND-02 clearAll×create 反向竞态（快照 per-id fan-out 裁定）+ FIND-04 命令边界失败保真 + FIND-05 native adapter 渲染循环守卫 + 失败路径记录）**；**2026-08-11 双审计 P2（plan `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`：FIND-12 autoSave connector-missing 触发面（消息数水位线）+ R1-F2 ⑪ 嵌套写隔离（`projectWireMessage` 深克隆）+ R1-F3 no-storage 首会话 build-on-demand + R1-F4 delete-during-load merge 过滤 + FIND-22/R2-F3 branching 契约文档化与行为测试 + ⑪ 门禁嵌套成员 +3）**

AI engine 历经 4 轮审计（`docs/audits/2026-07-2*-ai.md`）发现的三大复发失败模式族（并发守卫 / stale-closure / storage 静默丢），已沉淀为**首批 5 类可执行不变式契约**，防重构/新增方法回归。I2 审计在门禁盲区发现 K1-K4 四个实例（I3 裁决 P0/P1），I4 修复并把门禁补强至对应路径；Cycle 1 / I6 按 Loop Rule 派生的 Cycle 2 新族 N1-N5（active 位移完整性 / bootstrap 合并 / branch 戳泄漏 / plugin 错误隔离 / 失败轮残留污染），已沉淀为**第二批门禁 ⑥-⑩**（见下节）：

- **不变式目录**：`docs/audits/ai-invariants/invariant-catalog.md`（每条含陈述 + 覆盖失败族 + 历史 bug 证据 live 行号 + 检测方法；§7 = I4 的 ②③④⑤ 扩展契约；§9 = Cycle 2 的 ⑥-⑩ 契约）。
- **门禁清单**：`docs/audits/ai-invariants/gates.md`（不变式 × 覆盖方法 × 检测方式 × 运行命令，棘轮单调追加登记处；Cycle 2 追加 ⑥-⑩ 五行 + 注册红节）。

### Cycle 2 门禁 ⑥-⑩（已修复，Cycle 2 / I4 翻转 + 清零）

> 沉淀时（2026-08-09）live 代码违反 ⑥-⑩——门禁以「预期失败」形态落库（`it.fails` ×12 + 扫描器注册红 ⑥×3 + ⑧×1）。**Cycle 2 / I4（2026-08-10）已全部修复：12 处 `it.fails` 全量翻转 `it` 且全绿、注册红清零（`check:ai-engine-invariants` live 零命中）、门禁按 I4 契约补强**（catalog §10：⑩ 空产物统一谓词 / ⑥ 同 tick 组合 + bootstrap build-on-demand / ⑦ clearAll 守卫 / ② 镜像写面 + `scanMirrorWriteSurface` / ④ 元数据排空链 / ⑨ abort 变体）。

- **⑥ active 位移完整性（N1）**：post-await 提升/复水写入（`setActiveEngine`/`engine.setMessages`）以 `activeIdRef`/`switchVersionRef` 为唯一裁决面且目标必须仍存在；位移方法（delete/clearAll/create）必须 bump `switchVersionRef` + 重置 `switchTargetRef`；switch 入口 exists 检查读镜像；version guard 为 id-aware（同 id 重 switch 不丢 hydration）；删除 active 后 next 引擎 build-on-demand；bootstrap 选中 active 建引擎 + loadMessages（K-⑥-3）。扫描器：`scanDisplacementVersionBumps`（live 零命中）。
- **⑦ storage bootstrap 列表合并（N2）**：bootstrap post-await `setConversations` 必须合并（不得覆盖加载期间创建的会话）+ clearAll 守卫（已清列表不复活，K-⑦-1）。
- **⑧ branch 戳消费/清除（N3）**：`pendingBranchId` 使用前必须消费或清除；runTurn 提前返回路径不得遗留待消费戳（connector-missing 早退已清戳）。扫描器：`scanBranchStampReset`（live 零命中）。
- **⑧ 扩面（2026-08-10，multi P2-1）**：覆盖路径从「提前 `return`」扩展到 **break/throw 早退**——abort while-head break（`if (signal.aborted) break`）与 plugin `onTurnStart` 抛错（catch）两条在 runOnce 消费前退出 turn 的路径均曾残留 `pendingBranchId`（下一无关 turn 被误戳 branchId + regenerate 序列偏移）。修复：break 前置清戳 + catch 内清戳（同 connector-missing 语义）。**门禁扩面**：静态扫描器 `scanBranchStampReset` 三条规则（return / break 前缀清除 / pre-runOnce plugin-await try 的 catch 清除，committed 回归 fixture +4）；运行时参数化成员 +3（break 臂 / throw 臂 / regenerate 序列臂，`it.fails` 落库 → 翻转 `it`）。详见 `docs/audits/ai-invariants/invariant-catalog.md` §9.3 注记。
- **⑨ plugin 错误隔离（N4）**：plugin hook rejection 不得使 turn 卡死或绕过状态写入——onTurnStart 纳入 try 清理面；onError 经 `callPluginError` 隔离（抛错不跳过状态写入）；onTurnEnd rejection 隔离（不 reject host-facing promise，abort 变体 K-⑨-1）。
- **⑩ 失败轮产物清理（N5）**：failed/aborted/退化成功（零 chunk）轮的空产物（`content:''` + 无 finishReason）不得进入请求历史与 autoSave 快照——终态提交层 drop（`commitOrDropResidue`）+ buildContext 尾部排除 + autoSave 尾部剥除（K-⑩-1/2/3/4/5）。
- **⑩ 扩展（2026-08-10，P1-2）**：**dangling tool_calls 形状**——assistant 消息携带 `tool_calls` 且其后无配对 `role:'tool'` 响应（`tool_call_id` 匹配）时，**不得作为 tool_calls 携带者**进入请求载荷 / autoSave / 后续轮次历史（严格 OpenAI 兼容后端对无配对 tool 响应的 tool_calls 返回 400，重试环反复失败）。**content-agnostic** 判定（交错文本+tool_calls 形状同样覆盖）：内容非空 → strip `tool_calls` 保留文本；内容为空 → 整体 drop；部分配对（multi-call 部分 commit 后 abort）→ 仅 strip 无配对条目（不得整数组 strip 使已 commit 的 tool 消息孤儿化）。统一谓词 `isDanglingToolCallsMessage` / `cleanDanglingToolCalls` / `sanitizeDanglingToolCalls`（`engine/utils.ts`），三个清理面（runOnce abort 分支 / tool-no-executor / runTurn abort-mid-executor 返回）+ buildContext 投影 + autoSave 臂同源。独立于 `isVacuousAssistantResidue`（后者要求 `!finishReason`——dangling 轮带 `finishReason:'tool_calls'`）。
- **⑩ 面枚举修正注记（2026-08-11，R1-F1 事实修正）**：正常 loop-max 路径**不是** dangling 清理面——loop-top break（`create-engine.ts` `rounds >= maxToolRounds`）在上一轮 `executeToolCalls` **完成之后**触发（`rounds` 在 break 检查后才 `+= 1`），`tool-execution.ts` 为每个 tool_call 追加配对 `role:'tool'` 消息 → 触发终止的 assistant 的 tool_calls 全部有配对响应，`isDanglingToolCallsMessage` 恒 false。修正后 ⑩ 清理面枚举 = **三 dangling 面（runOnce abort / tool-no-executor / abort-mid-executor，均调 `cleanDanglingAssistantAt`）+ 一 vacuous drop 面（`commitOrDropResidue` / `isVacuousAssistantResidue`）**，两套谓词语义区分（dangling 要求 `finishReason:'tool_calls'` 存在，vacuous 要求其不存在）。防回归守卫：`engine-tool-loop.test.ts`「tool-loop-max: no dangling shape」测试钉住该契约语义（未来若重构使 break 前无配对响应，守卫即红）。**marker 载体契约**：`metadata.toolLoopMaxReached` 归属**触发终止的末条 assistant**（`finishReason:'tool_calls'` + 配对 tool_calls，位于 executeToolCalls 追加的 `role:'tool'` 消息之前）——loop-top break 的 mutate recipe 从 tail 向前跳过 `role:'tool'` 定位（`create-engine.ts`），消费面 = `ai-message-list` 末条 assistant 渲染终止 note（`data-slot="ai-message-list-loop-limit"`，i18n `flux.ai.toolLoopMaxReached`，非错误态、无操作栏、工具卡保持已提交终态）；配对 tool_calls **不 strip**（工具结果保持用户可见）。
- **⑪ plugin ctx 写隔离（2026-08-10，open P1-1）**：全部 plugin hook 的 `ctx.request.messages` 不得是 engine 的 live message 数组——`buildContext` 无条件产出数组 + 元素双重隔离副本（`sanitizeDanglingToolCalls(...).map(projectWireMessage)`）。按 engine.md §8.3 文档模式 push system prompt 只能塑造出站请求，**不能写穿 engine 历史**（绕过 `mutate`/notify → 永久进历史 → 流向下轮载荷与 autoSave 快照的污染路径已封堵）。同族：**请求载荷白名单化（P1-5）**——`AiConnectorRequest.messages` 是 wire 投影：渲染器私有 `state`（editing 草稿 / toolCall UI / thinking，design.md §11.5「不投影」）与内部工具 metadata（`toolError` Error stack / `toolStatus`）在 engine 边界剥离（白名单 `{id, role, content, reasoning_content, tool_calls, tool_call_id, name}` + 良性 metadata），全部 connector 按契约收到干净载荷。
- **⑪ 嵌套写隔离（2026-08-11，R1-F2）**：写隔离覆盖**全部嵌套深度**——`projectWireMessage` 对白名单字段（`tool_calls`/`content` 部件/`reasoning_content`）与 `metadata` 嵌套值做元素级深克隆（`deepClone`，`engine/utils.ts`），plugin 对 `ctx.request.messages[i]` 任意深度 `push`/mutate 只塑造出站请求，**不写穿 engine 历史与 wire payload**（open P1-1 已修族的嵌套深度残留成员；`types.ts` MessageEngineContext 注释与 `build-context.ts` 同步；⑪ 门禁参数化成员 +3，`engine-invariants-p1.test.ts`）。

### adapter 面行为注记（2026-08-10，multi P2-2/P2-7 + open P2-1/P2-2）

- **unmount 清理顺序（multi P2-2）**：`useConversation` 的 unmount cleanup 与 `clearAll` 同序——**先 detach（unsubscribe autoSave）再 abort**。abort 的 `requestState` 翻转（`processing` → `aborted`）会触发 autoSave 回调；卸载期若 listener 仍挂载，会把 aborted 快照 save 入队到已无 drain 面的 hook（快速 remount 的 cross-mount ghost）。卸载路径同时清空 `pendingSavesRef`（卸载前排入的已完成 turn save 由 promise 链自行结算，镜像再校验存活于闭包）。
- **bootstrap 依赖稳定化（multi P2-7）**：mount bootstrap effect 读 `storageRef.current`（ref 镜像，对齐 `connectorRef` 先例），effect deps 不再含 `storage`——host 每 render 内联构造 storage 不再逐 render 重跑 `loadConversations()`（每次重跑会 abort 上一 controller）。
- **connector 变更 fan-out（open P2-1）**：`connector` 变更时对 `engineCache` 全量自建 engine fan-out `setConnector(connector)`（与 `useMessage` 的 hot-swap 同语义，2151 hot-swap 族；m4「绝不触碰外部 engine 的 connector」不适用——cache 只持有本 hook 自建 engine）。`buildEngine` 后续新建 engine 仍取最新 `connectorRef.current`。
- **createEngineOptions 类型收窄（open P2-2）**：`Omit<UseMessageOptions, 'connector' | 'engine'>`——`engine` 此前可传但被 `buildEngine` 静默丢弃（类型契约静默 no-op），现编译期报错。其余字段（plugins/tools/toolExecutor/systemPrompt 等）有意 build-time 捕获：引擎按会话惰性构建，host 变更选项即新建 engine（与 use-message hot-swap scope 文档同语义）。

### adapter 面行为注记（2026-08-11，FIND-12 / R1-F3 / R1-F4）

- **autoSave connector-missing 触发面（FIND-12）**：`attachAutoSave` 的触发谓词从「`wasProcessing && isDone`」扩展为「`wasProcessing && isDone` ‖ `isDone && 消息数增长`」——connector-missing 轮（`create-engine.ts` runTurn `idle → 'error'` 直接翻转，`isProcessing` 从未为 true）的用户消息**进入持久化路径**（此前只进内存，reload 静默丢失）。消息数水位线（订阅内 `lastSeenCount`，对比 `engine.getMessages().length`）判定「error 前收到过用户消息」；`full` 通道同步水位线（`clear`/`setMessages` 只发 `full` 不发 `requestState`，clear-then-connector-missing 序列仍可判定）；与 K-⑩-3 空残留剥离谓词组合——无消息的 vacuous 轮（如 connector-missing regenerate）不持久化。
- **no-storage 首会话 build-on-demand（R1-F3）**：无 storage + `initialConversations` 时 mount 即为首会话建 engine（`use-conversation.ts` mount effect，K-⑥-3 `ensureEngineAndHydrateEvent` 同语义，无 storage 跳过 hydrate）——`activeEngine` 不再恒 null（此前 host 绑定 `engine={activeEngine}` 得到「已激活会话却空态」）。幂等：strict-mode 双 mount 命中缓存跳过。
- **delete-during-load merge 过滤（R1-F4）**：mount bootstrap `loadConversations` 期间 `deleteConversation` 的已删 id 记入 `deletedDuringLoadRef`，K-⑦ merge 基在非空判断**前**过滤——被删会话不复活为幽灵列表项、唯一被删会话不重新成为 active（与 `listClearedRef` clearAll 守卫语义并列）。

### renderer 面行为注记（2026-08-11，R1-F5）

- **`ai` ActionScope namespace 多实例语义**：`ai-chat` 渲染器注册的 `ai` namespace 是 **namespace-keyed、非实例隔离**的——`flux-runtime` `registerNamespace` 对同 namespace 重复注册执行 `cleanupProvider(existing)` 顶替（后挂载者接管），先卸载者的 unregister 注销整个 namespace（`action-scope.ts`）。**单页多 ai-chat：`ai:*` 动作由后挂载者接管、先卸载者注销**；`ai-chat` 注册前检测到 namespace 已被占用时 `console.warn` 一次（设计.md §14.2 多实例注记）。多实例控制走 ComponentHandle 路径（cid-isolated）或 host 按实例提供独立 ActionScope；完整实例隔离方案（按实例 namespace / 前缀隔离 / action-scope 多 provider）属 flux-runtime 公共语义结构性重构，入非阻塞 follow-up 需人工确认（决策见 plan `2026-08-11-0335-2` Phase 5 与 bug note 160）。

### 空产物清理设计裁定（K-⑩，重构防回退）

**空产物（`content:''` 且无 `finishReason`）的 assistant 消息不得进入请求历史与 autoSave 快照**——统一谓词 `isVacuousAssistantResidue`（`engine/utils.ts`）。三条落地面缺一不可：① 终态提交层 drop（`commitOrDropResidue`，失败/中止/退化轮不提交空产物）；② `buildContext` 尾部排除谓词扩展（纵深防御）；③ autoSave 快照尾部剥除（覆盖 `abort()` 同步翻 `requestState` 早于 engine 清理的窗口）。部分内容（非空）的失败轮产物保留提交（用户已见部分回答）；带 finishReason 的空内容提交保留（真实完成）。见 `docs/audits/ai-invariants/invariant-catalog.md` §10.1 / bug note 125。

**A-5 错误载体契约（2026-08-11，FIND-03）**：零 chunk 失败轮（auth 401/429、网络首字节前失败、`onBeforeRequest` 拒绝——空产物 drop 后末条消息为 user）使 bubble 级错误渲染器（绑定 `requestState==='error'` + 末条 assistant，`ai-message-list` `isError` 投影）**结构性不可达**——用户看到静默失败。**载体 = `ai-message-list` list 级错误横幅**（`ListErrorBanner`，`ai-bubble/renderers/error.tsx`，`data-slot="ai-message-list-error"` + retry `data-slot="ai-message-list-error-retry"`，复用 `requestFailed`/`retry` i18n key 与重试行为——重发最后一条 user 文本）：渲染条件 = `requestState==='error'` **且末条非 assistant**（末条为 assistant 时 bubble 级错误继续生效，横幅不重复渲染；`aborted` 非 error 态无横幅）。engine/历史/持久化语义不变（⑩ 协议洁净目标保持）。

### 运行命令

```bash
# 参数化穷举不变式测试（engine + adapter，含表完备性门禁；⑥⑦ 在 conversation-invariants-cycle2.test.ts，⑩ 与 ②/④ 元数据排空臂在 engine-invariants-i4.test.ts / conversation-invariants-i4.test.ts，⑪ + ⑩ dangling 成员在 engine-invariants-p1.test.ts / engine-invariants-i4.test.ts / conversation-invariants-i4.test.ts，⑧ break/throw/regenerate 泄漏臂（multi P2-1 扩面）在 engine-invariants-p2.test.ts，2026-08-11 P2 族（FIND-12/R1-F3/R1-F4 + ⑪ 嵌套成员）在 conversation-invariants-p2.test.ts / engine-invariants-p1.test.ts——FIND-15 校准：engine-invariants-p2.test.ts 补入本清单）
pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants.test.ts src/adapters/__tests__/conversation-invariants.test.ts src/adapters/__tests__/conversation-invariants-cycle2.test.ts src/engine/__tests__/engine-invariants-i4.test.ts src/adapters/__tests__/conversation-invariants-i4.test.ts src/engine/__tests__/engine-invariants-p1.test.ts src/engine/__tests__/engine-invariants-p2.test.ts src/adapters/__tests__/conversation-invariants-p2.test.ts

# 静态门禁（②③④⑥⑧ + ② 镜像写面 + ④ fan-out 源；①⑤⑦⑨⑩⑪ 纯行为/行为面不静态化；live 零命中）
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
- **branch 戳泄漏**（⑧/N3）：connector-missing 早退遗留 `pendingBranchId` → 下一无关 turn 被戳 branchId。**修复**：早退前清戳（bug note 125/130 同文件面）。**2026-08-10 multi P2-1 扩面**：abort while-head break 与 onTurnStart 抛错（catch）两条 pre-runOnce 早退同样残留戳（`it.fails` ×3 落库 → 翻转 `it`）；修复 = break 前置清戳 + catch 内清戳 + 扫描器 break/throw 规则（bug note 137）。
- **bootstrap 列表覆盖**（⑦/N2）：bootstrap 整体覆盖加载期间创建的会话。**修复**：合并 + clearAll 守卫（K-⑦-1，bug note 127）。
- **storage 元数据幽灵**（②/④，K-K4/②-1/2 + K-K3/④-1）：delete/clearAll 缺镜像写面 → rename 重存已删会话；rename/create 元数据写不入排空链 → gated 写晚于 clearAll 落盘。**修复**：镜像写面全方法同步 + 元数据写入排空链 + settlement-time 再校验（bug notes 128/129）。

### Failure Path — 2026-08-11 双审计 P1（R1-F1 + FIND-03，已修复）

- **tool-loop-max 终止不可见（R1-F1）**：`maxToolRounds` 达上限 break 时，`toolLoopMaxReached` marker 曾写在 **tool 消息 tail**（`draft.messages[len-1]`，恒为 executeToolCalls 追加的最后一条 `role:'tool'`）而非触发终止的 assistant，且 **renderer 零消费者**——循环达上限终止对用户完全不可见。**修复**：写面归位为**末条 assistant**（loop-top break recipe 从 tail 向前跳过 `role:'tool'` 定位，snapshot 恒等纪律保持——recipe 内 read-old → build-new → replace）；消费面 = `ai-message-list` 末条 assistant 带 marker 时渲染终止 note（`data-slot="ai-message-list-loop-limit"`，i18n `flux.ai.toolLoopMaxReached`，非错误态、无操作栏，配对工具卡保持已提交终态）；**不 strip 配对 tool_calls**（工具结果保持用户可见；正常 loop-max 路径无 dangling 形状，见 ⑩ 面枚举修正注记）。bug note 149。
- **A-5 错误载体回归（FIND-03）**：K-⑩ 空产物 drop 使「零 chunk 失败轮」（auth 401/429、网络首字节前失败、`onBeforeRequest` 拒绝）后末条为 user 消息，`ai-message-list` 的 `isError` 绑定（末条 assistant）恒 false → 错误气泡 + 重试入口结构性不可达。**修复**：list 级错误横幅载体（`ListErrorBanner`，`data-slot="ai-message-list-error"` + retry，`requestState==='error'` 且末条非 assistant 时渲染；末条为 assistant 时 bubble 级错误继续生效；engine/历史/持久化 drop 语义不变）。bug note 150。

### Failure Path — 2026-08-11 双审计 P1（adapter/宿主契约面 FIND-02/FIND-04/FIND-05，plan `2026-08-11-0008-3`，已修复）

- **clearAll×create 反向竞态（FIND-02）**：`clearAll()` 把 `storage.clearAll()` 链在 pending-save drain 之后；「clearAll 之后新建会话」的 `saveConversation` 不入该 drain（`pendingSavesRef` 同步清空），在 drain 结算前落盘 → 延迟原子 clear 最后执行**抹掉新会话记录**（「ghost-free-creation in reverse」：列表存活但记录被擦，remount 后数据丢失）。既有 K3 守卫只覆盖「旧写在 delete/clear 前 drain」正向方向，反向方向零覆盖。**修复（裁定方案 a）**：存储清空 = clearAll 时点 `ids` 快照逐 id `deleteConversation` fan-out，**永不调用 `storage.clearAll()`**——per-id 删除天然只作用于 clearAll 时点存在的会话，clear 后新写永不被扫；`ConversationStorageStrategy.clearAll` 保留为 host 直调面（接口零变更）。bug note 151。
- **命令边界失败保真（FIND-04）**：`ai:send` / `component:sendMessage` 对失败轮（connector 抛错 → engine settle `requestState:'error'` + `lastError`）与忙时二次发送（runTurn `isProcessing` 入口守卫静默丢弃）统一返回 `{ok:true}`——命令边界谎报成功。**修复**：`ai-action-provider.ts` / `ai-component-handle.ts` 的 send/sendMessage 分支——await 后快照 `engine.getState().requestState`，'error' → `{ok:false, error: lastError}`（非 Error 包装 `{cause}`）；发送前 `isProcessing` 预检 → `{ok:false, error: engine busy: ...}`；同族忙时静默 no-op 面（`clear` / `regenerate` 的 engine processing 守卫）同步补齐预检。engine void-settle 契约零改动（只改映射层）。bug note 152。
- **native adapter 渲染循环（FIND-05）**：`createMessageEngine({ connector })` 默认 native adapter 的 `getState()` 每次重建新对象；宿主按 §8.5 外部 engine 路径直绑 → `useSyncExternalStore` 快照引用每次变化 → 无限渲染循环「Maximum update depth exceeded」页面崩溃（仓内消费方全部显式传 `createReactMessageAdapter`，裸绑仅 host 面可达）。**修复（裁定方案 a+b）**：`useEngineView` 运行时不稳定 getSnapshot 检测（连续 ≥2 次 `getState()` 返回值引用不等 → `console.warn` 一次并指向 `createReactMessageAdapter`；React adapter 的合法变更只产生孤立 mismatch，零误报；module-level WeakMap 每 engine 一次）+ engine.md §8.2/§8.5 文档化 adapter 前置条件。渲染行为本身不改（React 深度上限仍终止循环，但宿主先收到可诊断输出）。bug note 153。

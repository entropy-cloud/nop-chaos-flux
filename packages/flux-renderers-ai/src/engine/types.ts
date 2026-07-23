/**
 * Framework-agnostic AI message engine types.
 *
 * Ported from tiny-robot (`kit/src/message/`) and rewritten for flux.
 * This module MUST NOT import 'react' or reference DOM globals (INV-1,
 * `design.md` §18.1 invariant 1). All IO is injected via `AiConnector`.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * OpenAI-compatible multimodal content part. The `data-${string}` variant is a
 * P1 host-defined content block (sources / events / artifacts) that pairs with
 * the `ai-bubble` registration system; the `data-` prefix avoids clashes with
 * protocol fields (`engine.md` §7.1).
 */
export type ChatMessageContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'image_url';
      image_url: { url: string; detail?: 'auto' | 'low' | 'high' };
    }
  | { type: 'file'; file: { url: string; name?: string; contentType?: string } }
  | { type: `data-${string}`; id?: string; data: unknown };

export interface ChatToolCallFunction {
  name: string;
  /** JSON string accumulated token-by-token during streaming. */
  arguments: string;
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
  /** P3 HITL approval state. Engine only holds the field; host handles workflow. */
  approval?: 'pending' | 'approved' | 'rejected';
}

export interface ChatMessageUIState {
  thinking?: { open: boolean; startedAt?: number; endedAt?: number };
  toolCall?: Record<string, ChatToolCallUIState>;
  [key: string]: unknown;
}

export interface ChatMessage<
  M extends ChatMessageMetadata = ChatMessageMetadata,
  S extends ChatMessageUIState = ChatMessageUIState,
> {
  /** Stable id (React key + scope binding); tiny-robot lacked this. */
  id: string;
  role: ChatRole;
  /** OpenAI multimodal content (string is the common text shorthand). */
  content: string | ChatMessageContentPart[];
  /** DeepSeek / Anthropic style reasoning trace. */
  reasoning_content?: string;
  tool_calls?: ChatToolCall[];
  /** Associates a role='tool' message with its call. */
  tool_call_id?: string;
  name?: string;
  /** Engine-written: true while waiting for the first chunk. */
  loading?: boolean;
  metadata?: M;
  state?: S;
}

export interface AiConversationInfo {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// State machine
// ============================================

/** Utility: a value that may be returned synchronously or as a Promise. */
export type MaybePromise<T> = T | Promise<T>;

export type RequestState = 'idle' | 'processing' | 'completed' | 'aborted' | 'error';

export type RequestProcessingState =
  | 'requesting'
  | 'completing'
  | 'calling-tools';

export interface MessageEngineState {
  messages: ChatMessage[];
  requestState: RequestState;
  processingState?: RequestProcessingState;
  isProcessing: boolean;
}

// ============================================
// Connector contract (host provides the implementation)
// ============================================

/** Structure-equivalent to OpenAI ChatCompletionTool; not imported from SDK. */
export interface AiToolFunctionSchema {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface AiToolSchema {
  type: 'function';
  function: AiToolFunctionSchema;
}

/**
 * Result of a tool execution. `ok:true` carries the serialized result string;
 * `ok:false` carries an error description. Either form is written as the
 * `role:'tool'` message content so the model can react to failures.
 */
export interface ToolExecutionResult {
  ok: boolean;
  /** Serialized tool output (string — written verbatim as the tool message content). */
  result?: string;
  /** Error description when `ok:false`. */
  error?: string;
}

/**
 * Host-provided tool executor. Invoked once per `tool_call` after a
 * `finish_reason:'tool_calls'` turn. The engine wraps this in try/catch and
 * records `state.toolCall[id].status` accordingly (Failure Path
 * `tool-exec-failed`). Framework-agnostic — must not import `react`/DOM.
 */
export type ToolExecutor = (input: {
  toolCall: ChatToolCall;
  signal: AbortSignal;
}) => MaybePromise<string | ToolExecutionResult>;

export interface AiConnectorChunk {
  /** Incremental delta (OpenAI ChatCompletionChunk-equivalent). */
  delta?: {
    role?: ChatRole;
    content?: string;
    reasoning_content?: string;
    /** Streaming tool_calls are partial (later chunks omit id/name). */
    tool_calls?: AiConnectorDeltaToolCall[];
  };
  /** Whole-message snapshot for backends that push snapshots instead of deltas. */
  snapshot?: Partial<ChatMessage>;
  finishReason?: string;
  metadata?: ChatMessageMetadata;
}

/** Partial tool-call shape as it appears inside a streaming delta chunk. */
export interface AiConnectorDeltaToolCall {
  index: number;
  id?: string;
  type?: 'function';
  function?: Partial<ChatToolCallFunction>;
}

export interface AiConnectorRequest {
  messages: ChatMessage[];
  tools?: AiToolSchema[];
  signal: AbortSignal;
  /** Other OpenAI-compatible params (temperature / top_p / max_tokens …). */
  [key: string]: unknown;
}

export type AiConnectorStreamResult =
  | AsyncGenerator<AiConnectorChunk>
  | Promise<AsyncGenerator<AiConnectorChunk>>;

export interface AiConnector {
  /** Streaming call: returns an AsyncGenerator of incremental chunks. */
  stream(request: AiConnectorRequest): AiConnectorStreamResult;
  /** Optional non-streaming call. */
  complete?(request: AiConnectorRequest): Promise<ChatMessage>;
}

// ============================================
// State adapter abstraction (decouples engine from the view layer)
// ============================================

export type MessageUpdateKind =
  | 'messages'
  | 'requestState'
  | 'processingState'
  | 'full';

export type MessageStateListener = (state: MessageEngineState) => void;

export interface InternalMessageState extends MessageEngineState {
  connector: AiConnector | null;
  abortController: AbortController | null;
}

export interface PublicMessageState extends MessageEngineState {}

export type MessageStateSubscribe = {
  (listener: MessageStateListener): () => void;
  (kind: MessageUpdateKind, listener: MessageStateListener): () => void;
};

export interface MessageStateAdapter {
  initialize(initialState: InternalMessageState): void;
  getState(): PublicMessageState;
  /** Let the adapter wrap a freshly created message (e.g. assign id / proxy). */
  createMessage<T extends ChatMessage>(message: T): T;
  mutate(kind: MessageUpdateKind, recipe: (draft: InternalMessageState) => void): void;
  subscribe: MessageStateSubscribe;
}

// ============================================
// Plugin lifecycle (ported from tiny-robot plugin chain)
// ============================================

export interface MessageEngineContext {
  engine: MessageEngine;
  state: MessageEngineState;
  request: AiConnectorRequest;
  signal: AbortSignal;
}

export interface MessageEnginePlugin {
  name: string;
  onTurnStart?(context: MessageEngineContext): void | Promise<void>;
  onBeforeRequest?(context: MessageEngineContext): void | Promise<void>;
  onCompletionChunk?(
    context: MessageEngineContext,
    chunk: AiConnectorChunk,
    assistantMessage: ChatMessage,
  ): void;
  onAfterRequest?(context: MessageEngineContext, assistantMessage: ChatMessage): void | Promise<void>;
  onTurnEnd?(context: MessageEngineContext): void | Promise<void>;
  onError?(context: MessageEngineContext, error: unknown): void;
}

// ============================================
// MessageEngine interface (ported from tiny-robot engine.ts)
// ============================================

export interface MessageEngine {
  getState(): MessageEngineState;
  subscribe: MessageStateSubscribe;
  sendMessage(content: string | ChatMessageContentPart[]): Promise<void>;
  send(...messages: ChatMessage[]): Promise<void>;
  abort(): Promise<void>;
  /** Drop every message and reset requestState to `idle` (design.md §14.2 `ai:clear`). */
  clear(): void;
  setConnector(connector: AiConnector): void;
  registerPlugin(plugin: MessageEnginePlugin): () => void;
  /** Read-only snapshot of the current messages (design.md §14.3, ComponentHandle). */
  getMessages(): ChatMessage[];
  /**
   * Replace the entire message list. Used by the Layer C ComponentHandle
   * `setMessages` method (design.md §14.3 line 556). Must not be called while a
   * turn is in-flight; callers should `abort()` first.
   */
  setMessages(messages: ChatMessage[]): void;
  /**
   * A-16 message branches: drop the trailing assistant turn (back to the last
   * user message) and re-run the request, stamping the resulting assistant
   * message's `metadata.branchId` so the host can build a branch picker. The
   * engine stores NO branch set — the host owns full branch history; this
   * method only records the new branch id (improvement §5.4).
   *
   * `branchId` is optional: when omitted the engine assigns an incrementing id.
   * Must not be called while a turn is in-flight; callers should `abort()` first.
   */
  regenerate(branchId?: string): Promise<void>;
}

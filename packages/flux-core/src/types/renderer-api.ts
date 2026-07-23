import type { ExpressionExecutionEnv } from './expression-env-types.js';
import type { ActionMonitorPayload, ActionResult, ImportedLibraryLoader } from './actions.js';
import type { ScopeRef } from './scope.js';
import type { ExecutableApiRequest, SchemaPath } from './schema-base-types.js';
import type { SchemaInput } from './schema.js';

export interface ApiRequestContext {
  scope: ScopeRef;
  env: RendererEnv;
  signal?: AbortSignal;
  interactionId?: string;
  requestInstanceId?: string;
}

export interface ApiResponse<T = unknown> {
  /**
   * Computed property: `status === 0`, mirroring the backend
   * `ApiResponse.isOk()`. Optional on the type because the raw envelope
   * returned by fetchers does not contain `ok`; the runtime normalization
   * layer sets it before any consumer reads it.
   */
  ok?: boolean;
  status: number;
  data: T;
  /** Error code (mirrors backend `ApiResponse.code`). */
  code?: string;
  /** Human-readable error message (mirrors backend `ApiResponse.msg`, a top-level field). */
  msg?: string;
  /** Field-level validation errors (mirrors backend `ApiResponse.errors`). */
  errors?: Record<string, string>;
  headers?: Record<string, string>;
  raw?: unknown;
}

/**
 * A dictionary bean as returned by `DictProvider__getDict` in nop-entropy.
 * `options` is the canonical option list consumed by select-like controls.
 */
export interface DictBean {
  name: string;
  label?: string;
  locale?: string;
  valueType?: string;
  options: Array<{ label: string; value: string; code?: string; description?: string }>;
}

export type ApiFetcher = <T = unknown>(
  api: ExecutableApiRequest,
  ctx: ApiRequestContext,
) => Promise<ApiResponse<T>>;

// ============================================
// env.stream —— 流式响应（SSE / NDJSON / 自动切分+解析）
// 评审来源：docs/discussions/2026-07-21-env-stream-and-websocket-extension.md（第 3 轮最终裁定）
// ============================================

/**
 * 流式协议类型；决定 `env.stream` 如何把字节流切分为 chunk。
 * - `sse`：Server-Sent Events，按 `\n\n` 切 event，提取 `data:` 行；自动识别 `[DONE]` 结束迭代。
 * - `ndjson`：Newline-Delimited JSON，按 `\n` 切行，跳过空行。
 * - `json-lines`：`ndjson` 别名（语义等价）。
 * - `text`：不切分，按网络包到达分块（每个 chunk 一段文本）。
 * - `raw`：不切分，原样返回 `Uint8Array`（与 `streamChunkType:'arraybuffer'` 等价）。
 */
export type StreamProtocol = 'sse' | 'ndjson' | 'json-lines' | 'text' | 'raw';

/**
 * chunk 数据类型；决定 `env.stream` 如何反序列化每个 chunk。
 * - `json`：`JSON.parse(chunk)`；解析失败抛 `StreamChunkParseError`。
 * - `text`：返回 string。
 * - `blob`：返回 Blob。
 * - `arraybuffer`：返回 ArrayBuffer。
 */
export type StreamChunkType = 'json' | 'text' | 'blob' | 'arraybuffer';

/**
 * 流式请求：扩展 `ExecutableApiRequest`，复用 url/method/headers/body/dataType 等字段，
 * 新增两个可选的协议/解析参数。
 */
export type StreamApiRequest = ExecutableApiRequest & {
  /** 流式协议，默认 `'sse'`。 */
  streamProtocol?: StreamProtocol;
  /** chunk 数据类型，默认 `'json'`。 */
  streamChunkType?: StreamChunkType;
};

/**
 * 流式响应：`response` 携带连接级元信息（与 `ApiResponse` 同构，无 `data` 字段——
 * 流式数据通过 `chunks` 提供），`chunks` 是已切分+已解析的异步迭代。
 * 连接关闭或 `ctx.signal` abort 时迭代自然结束（generator return）。
 */
export interface StreamFetchResult<T = unknown> {
  response: Omit<ApiResponse, 'data'>;
  chunks: AsyncGenerator<T>;
}

/**
 * `env.stream` 主接口：与 `env.fetcher` 同构（同样接 `ExecutableApiRequest` 的超集 +
 * `ApiRequestContext`），仅返回值不同（流式 envelope 而非一次性 envelope）。
 */
export type StreamFetcher = <T = unknown>(
  api: StreamApiRequest,
  ctx: ApiRequestContext,
) => Promise<StreamFetchResult<T>>;

/**
 * chunk 解析失败错误（`streamChunkType:'json'` 但 chunk 非合法 JSON 时抛出）。
 * 调用方在 `for await (const chunk of chunks)` 内 `try/catch` 捕获。
 */
export class StreamChunkParseError extends Error {
  readonly chunkIndex: number;
  readonly rawChunk: string;
  readonly cause?: unknown;
  constructor(options: { chunkIndex: number; rawChunk: string; cause?: unknown; message?: string }) {
    super(options.message ?? `Failed to parse stream chunk #${options.chunkIndex}`);
    this.name = 'StreamChunkParseError';
    this.chunkIndex = options.chunkIndex;
    this.rawChunk = options.rawChunk;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
    type ErrorWithCaptureStack = {
      captureStackTrace?: (target: object, constructor?: object) => void;
    };
    const errorCtor = Error as unknown as ErrorWithCaptureStack;
    if (typeof errorCtor.captureStackTrace === 'function') {
      errorCtor.captureStackTrace(this, StreamChunkParseError);
    }
  }
}

// ============================================
// env.openSocket —— WebSocket 长连接
// ============================================

/** WebSocket 连接选项。与浏览器原生 `WebSocket` 接近，但用结构化字段便于 SSR/test 实现。 */
export interface WebSocketOptions {
  /** 子协议（对应原生 `new WebSocket(url, protocols)`）。 */
  protocols?: string | string[];
  /** 请求头（原生 WebSocket 不支持，SSR/Node 实现可读取；playground 原生实现忽略）。 */
  headers?: Record<string, string>;
  /** 二进制消息类型，对应原生 `WebSocket.binaryType`。 */
  binaryType?: 'blob' | 'arraybuffer';
  /** abort 信号；触发后调用 `close()`，触发 `onclose`。 */
  signal?: AbortSignal;
}

/** WebSocket 连接句柄。结构化 event 替代 DOM `Event` 对象，避免 DOM 类型耦合。 */
export interface WebSocketConnection {
  readonly readyState: 'connecting' | 'open' | 'closing' | 'closed';
  send(data: string | ArrayBufferLike): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: { type: 'open' }) => void) | null;
  onmessage: ((event: { type: 'message'; data: string | ArrayBufferLike }) => void) | null;
  onclose: ((event: { type: 'close'; code: number; reason: string }) => void) | null;
  onerror: ((event: { type: 'error'; error: unknown }) => void) | null;
}

/** `env.openSocket` 主接口：建立 WebSocket 长连接，返回结构化 `WebSocketConnection`。 */
export type WebSocketOpener = (
  url: string,
  options?: WebSocketOptions,
  ctx?: ApiRequestContext,
) => WebSocketConnection;

export interface RenderMonitorPayload {
  nodeId: string;
  path: SchemaPath;
  type: string;
}

export interface ErrorMonitorPayload {
  phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
  error: unknown;
  nodeId?: string;
  path?: SchemaPath;
  details?: Record<string, unknown>;
}

export interface ApiMonitorPayload {
  api: ExecutableApiRequest;
  nodeId?: string;
  path?: SchemaPath;
  interactionId?: string;
  requestInstanceId?: string;
}

export interface RendererMonitor {
  onRenderStart?(payload: RenderMonitorPayload): void;
  onRenderEnd?(payload: RenderMonitorPayload & { durationMs: number }): void;
  onActionStart?(payload: ActionMonitorPayload): void;
  onActionEnd?(payload: ActionMonitorPayload & { durationMs: number; result?: ActionResult }): void;
  onError?(payload: ErrorMonitorPayload): void;
  onApiRequest?(payload: ApiMonitorPayload): void;
}

export interface RendererEnv extends ExpressionExecutionEnv {
  fetcher: ApiFetcher;
  /**
   * 流式响应（SSE / NDJSON / chunked，自动按协议切分+按 chunkType 解析）。
   * 可选；host 不提供时调用方应回退到 `fetcher` + 轮询。使用前必须 capability check（`if (env.stream)`）。
   */
  stream?: StreamFetcher;
  /**
   * WebSocket 长连接。可选；host 不提供时调用方应回退或显示错误。
   * 使用前必须 capability check（`if (env.openSocket)`）。
   */
  openSocket?: WebSocketOpener;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  navigate?: (to: string | number, options?: { replace?: boolean }) => void;
  confirm?: (message: string, title?: string) => Promise<boolean>;
  alert?: (message: string, title?: string) => void;
  functions?: Record<string, (...args: any[]) => any>;
  filters?: Record<string, (input: any, ...args: any[]) => any>;
  importLoader?: ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  monitor?: RendererMonitor;

  /** Load a page schema by path. App provides caching, URL resolution, role filtering. */
  loadPage?: (path: string, signal?: AbortSignal) => Promise<SchemaInput>;
  /** Load a dict by name. App provides caching, URL resolution. Returns a DictBean. */
  loadDict?: (name: string, signal?: AbortSignal) => Promise<DictBean>;
  /** Permission check for `xui:roles` filtering. Returns true (allow-all) when absent. */
  hasRole?(role: string): boolean;
  /** Current locale, used as a cache key segment for page/dict caches. */
  locale?: string;
}

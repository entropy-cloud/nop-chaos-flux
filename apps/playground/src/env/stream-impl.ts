/**
 * playground 默认 `env.stream` 实现（P-1 落地）。
 *
 * 设计原则（对齐 discussion 第 3 轮最终裁定）：
 * - 与 `env.fetcher` 同构的高层次抽象：自动处理 URL/body 序列化、chunk 切分、chunk 解析、SSE `[DONE]` 识别。
 * - HTTP 2xx 视为连接成功；非 2xx 把 status/code/msg 填入 `response`（连接级错误经 response 报告，**不**抛出）。
 * - `ctx.signal` abort 时关闭底层 reader，chunks 迭代自然结束。
 * - chunk 解析失败（`streamChunkType:'json'`）抛 `StreamChunkParseError`（含 chunkIndex/rawChunk/cause）。
 *
 * 可测试性：核心切分/解析逻辑抽为纯异步 generator `createChunkGenerator`，
 * 单测直接喂入 byte provider（mock ReadableStream），无需真实 fetch。
 */

import {
  StreamChunkParseError,
  type ApiRequestContext,
  type StreamApiRequest,
  type StreamChunkType,
  type StreamFetchResult,
  type StreamProtocol,
} from '@nop-chaos/flux-core';

type GlobalFetch = typeof globalThis.fetch;

export interface CreateStreamOptions {
  /** 注入 fetch（便于测试；缺省使用 `globalThis.fetch`）。 */
  fetchImpl?: GlobalFetch;
}

const DEFAULT_PROTOCOL: StreamProtocol = 'sse';
const DEFAULT_CHUNK_TYPE: StreamChunkType = 'json';
const SSE_DONE = '[DONE]';

/** 从 `ExecutableApiRequest` 序列化出 fetch 参数（url/init）。复用 fetcher 的常规序列化规则。 */
function buildFetchInput(
  api: StreamApiRequest,
): { url: string; init: RequestInit } {
  const method = (api.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { ...(api.headers ?? {}) };

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD' && api.data !== undefined) {
    const dataType = api.dataType ?? 'json';
    if (dataType === 'json') {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
      body = typeof api.data === 'string' ? api.data : JSON.stringify(api.data);
    } else if (dataType === 'form') {
      body = new URLSearchParams(flattenToStringRecord(api.data)).toString();
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    } else {
      // form-data: 交给浏览器 multipart 编码
      const form = new FormData();
      for (const [k, v] of Object.entries(flattenToStringRecord(api.data))) {
        form.append(k, v);
      }
      body = form;
    }
  }

  return { url: api.url, init: { method, headers, body, signal: undefined } };
}

function flattenToStringRecord(data: unknown): Record<string, string> {
  if (data == null) return {};
  if (typeof data === 'object' && !Array.isArray(data)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return out;
  }
  return { value: typeof data === 'string' ? data : JSON.stringify(data) };
}

/**
 * 核心切分+解析 generator。读 `readChunk` 返回的原始字节，按 `protocol` 切分、按 `chunkType` 解析，
 * yield 已解析好的 chunk。读完后 return。
 *
 * - `readChunk`: 返回下一段字节，流结束时返回 `undefined`。
 * - `onAbort`: 可选回调，abort 时调用（用于关闭底层 reader）。
 */
export async function* createChunkGenerator<T = unknown>(options: {
  readChunk: () => Promise<Uint8Array | undefined>;
  protocol: StreamProtocol;
  chunkType: StreamChunkType;
  signal?: AbortSignal;
  onAbort?: () => void;
  decoder?: { decode: (input: Uint8Array, options?: { stream?: boolean }) => string };
}): AsyncGenerator<T> {
  const protocol = options.protocol;
  const chunkType = options.chunkType;
  const decoder = options.decoder ?? new TextDecoder();

  // raw: 不切分不解析，原样返回 Uint8Array（与 streamChunkType:'arraybuffer' 等价）。
  if (protocol === 'raw') {
    while (true) {
      if (options.signal?.aborted) {
        options.onAbort?.();
        return;
      }
      const bytes = await options.readChunk();
      if (bytes === undefined) return;
      yield bytes as unknown as T;
    }
  }

  let buffer = '';
  let chunkIndex = 0;

  // text: 按网络包到达分块，每个 chunk 直接 decode（不跨包拼接）。
  if (protocol === 'text') {
    while (true) {
      if (options.signal?.aborted) {
        options.onAbort?.();
        return;
      }
      const bytes = await options.readChunk();
      if (bytes === undefined) return;
      const text = decoder.decode(bytes, { stream: true });
      if (text !== '') {
        yield coerceChunk<T>(text, chunkType, chunkIndex);
        chunkIndex += 1;
      }
    }
  }

  // sse / ndjson / json-lines: 需要跨包拼接后按分隔符切分。
  const separator = protocol === 'sse' ? '\n\n' : '\n';
  while (true) {
    if (options.signal?.aborted) {
      options.onAbort?.();
      return;
    }
    const bytes = await options.readChunk();
    if (bytes !== undefined) {
      buffer += decoder.decode(bytes, { stream: true });
    }

    let separatorIndex = buffer.indexOf(separator);
    while (separatorIndex !== -1) {
      const rawSegment = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + separator.length);
      separatorIndex = buffer.indexOf(separator);

      if (protocol === 'sse') {
        const data = extractSseData(rawSegment);
        if (data === null) continue; // 非 data 事件（如 comment / event id），跳过
        if (data === SSE_DONE) return; // [DONE] 自动结束，不 yield
        yield coerceChunk<T>(data, chunkType, chunkIndex);
      } else {
        const line = rawSegment.trim();
        if (line === '') continue; // 空行跳过
        yield coerceChunk<T>(line, chunkType, chunkIndex);
      }
      chunkIndex += 1;
    }

    if (bytes === undefined) {
      // 流结束，处理 buffer 残留
      if (protocol === 'sse') {
        const tail = extractSseData(buffer);
        if (tail !== null && tail !== SSE_DONE) {
          yield coerceChunk<T>(tail, chunkType, chunkIndex);
        }
      } else {
        const tail = buffer.trim();
        if (tail !== '') {
          yield coerceChunk<T>(tail, chunkType, chunkIndex);
        }
      }
      return;
    }
  }
}

/** 从单个 SSE event 段提取 `data:` 内容；多行 `data:` 用 `\n` 拼接（与 SSE 规范一致）。返回 null 表示无 data 行。 */
function extractSseData(eventSegment: string): string | null {
  const lines = eventSegment.split('\n');
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (dataLines.length === 0) return null;
  return dataLines.join('\n');
}

/** 按 `chunkType` 反序列化单个 chunk 文本；失败抛 `StreamChunkParseError`。 */
function coerceChunk<T>(raw: string, chunkType: StreamChunkType, chunkIndex: number): T {
  switch (chunkType) {
    case 'text':
      return raw as unknown as T;
    case 'json': {
      try {
        return JSON.parse(raw) as T;
      } catch (cause) {
        throw new StreamChunkParseError({ chunkIndex, rawChunk: raw, cause });
      }
    }
    case 'blob':
      return new Blob([raw]) as unknown as T;
    case 'arraybuffer': {
      const encoded = new TextEncoder().encode(raw);
      return encoded.buffer.slice(0, encoded.byteLength) as unknown as T;
    }
    default:
      return raw as unknown as T;
  }
}

/**
 * 创建 playground 默认 `StreamFetcher`。
 */
export function createDefaultStream(options: CreateStreamOptions = {}): NonNullable<
  import('@nop-chaos/flux-core').RendererEnv['stream']
> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const stream = async <T = unknown>(
    api: StreamApiRequest,
    ctx: ApiRequestContext,
  ): Promise<StreamFetchResult<T>> => {
    const { url, init } = buildFetchInput(api);

    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: ctx.signal });
    } catch (err) {
      // 连接级错误：DNS 失败 / 网络错误 → 经 response 字段报告，不抛出
      return {
        response: {
          status: 0,
          ok: false,
          code: 'network-error',
          msg: err instanceof Error ? err.message : String(err),
        },
        chunks: (async function* () {
          /* empty iterator */
        })(),
      };
    }

    const responseHeaders: Record<string, string> = {};
    response.headers?.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      // 非 2xx：报告 status/code/msg，chunks 为空迭代
      return {
        response: {
          status: response.status,
          ok: false,
          code: String(response.status),
          msg: response.statusText,
          headers: responseHeaders,
        },
        chunks: (async function* () {
          /* empty iterator */
        })(),
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      // 无 body 流（理论上 2xx 但无 body）：返回空迭代
      return {
        response: { status: response.status, ok: true, headers: responseHeaders, raw: response },
        chunks: (async function* () {
          /* empty iterator */
        })(),
      };
    }

    const abortListener = () => {
      reader.cancel().catch(() => {});
    };
    if (ctx.signal) {
      if (ctx.signal.aborted) {
        reader.cancel().catch(() => {});
      } else {
        ctx.signal.addEventListener('abort', abortListener, { once: true });
      }
    }

    const readChunk = async (): Promise<Uint8Array | undefined> => {
      const { done, value } = await reader.read();
      return done ? undefined : value;
    };

    const chunks = createChunkGenerator<T>({
      readChunk,
      protocol: api.streamProtocol ?? DEFAULT_PROTOCOL,
      chunkType: api.streamChunkType ?? DEFAULT_CHUNK_TYPE,
      signal: ctx.signal,
      onAbort: () => {
        if (ctx.signal) ctx.signal.removeEventListener('abort', abortListener);
      },
    });

    return {
      response: { status: response.status, ok: true, headers: responseHeaders, raw: response },
      chunks,
    };
  };

  return stream as unknown as NonNullable<import('@nop-chaos/flux-core').RendererEnv['stream']>;
}

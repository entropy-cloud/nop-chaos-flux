/**
 * playground 默认 `env.openSocket` 实现（P-1 落地）。
 *
 * 代理浏览器原生 `WebSocket`，把原生事件映射为结构化 event
 * （`onopen`/`onmessage`/`onclose`/`onerror`）。
 * - `readyState` 映射为 `'connecting'|'open'|'closing'|'closed'`。
 * - `options.signal` abort 触发 `close()`，进而触发 `onclose`。
 *
 * 可测试性：`mapWebSocket` 把原生 WebSocket 包装为结构化 `WebSocketConnection`，
 * 单测可直接注入 mock WebSocket。
 */

import type { ApiRequestContext, WebSocketConnection, WebSocketOptions } from '@nop-chaos/flux-core';

/** 浏览器原生 WebSocket 的最小结构子集（便于注入 mock）。 */
export interface NativeWebSocketLike {
  readonly readyState: number;
  binaryType?: BinaryType;
  send(data: string | ArrayBufferLike): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string | ArrayBufferLike }) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

const STATE_OPEN = 1;
const STATE_CLOSING = 2;
const STATE_CLOSED = 3;

function mapReadyState(native: number): WebSocketConnection['readyState'] {
  switch (native) {
    case STATE_OPEN:
      return 'open';
    case STATE_CLOSING:
      return 'closing';
    case STATE_CLOSED:
      return 'closed';
    default:
      return 'connecting';
  }
}

/** 浏览器原生 WebSocket 工厂（可注入便于测试）。 */
export type NativeWebSocketFactory = (
  url: string,
  protocols?: string | string[],
) => NativeWebSocketLike;

/**
 * 把原生 WebSocket 包装为结构化 `WebSocketConnection`。
 */
export function mapWebSocket(native: NativeWebSocketLike, options?: WebSocketOptions): WebSocketConnection {
  if (options?.binaryType && 'binaryType' in native) {
    native.binaryType = options.binaryType;
  }

  const connection: WebSocketConnection = {
    get readyState() {
      return mapReadyState(native.readyState);
    },
    send(data) {
      native.send(data);
    },
    close(code, reason) {
      native.close(code, reason);
    },
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };

  native.onopen = () => {
    connection.onopen?.({ type: 'open' });
  };
  native.onmessage = (ev) => {
    connection.onmessage?.({ type: 'message', data: ev.data });
  };
  native.onclose = (ev) => {
    connection.onclose?.({ type: 'close', code: ev.code, reason: ev.reason });
  };
  native.onerror = (err) => {
    connection.onerror?.({ type: 'error', error: err });
  };

  return connection;
}

export interface CreateOpenSocketOptions {
  /** 注入 WebSocket 构造器（便于测试；缺省使用浏览器原生 `WebSocket`）。 */
  webSocketFactory?: NativeWebSocketFactory;
}

/**
 * 创建 playground 默认 `WebSocketOpener`。
 */
export function createDefaultOpenSocket(
  options: CreateOpenSocketOptions = {},
): NonNullable<import('@nop-chaos/flux-core').RendererEnv['openSocket']> {
  const factory =
    options.webSocketFactory ??
    ((url: string, protocols?: string | string[]) =>
      new WebSocket(url, protocols) as unknown as NativeWebSocketLike);

  const openSocket = (
    url: string,
    opts?: WebSocketOptions,
    ctx?: ApiRequestContext,
  ): WebSocketConnection => {
    ctx?.env?.monitor?.onApiRequest?.({
      api: { url } as never,
    });
    const native = factory(url, opts?.protocols);
    const connection = mapWebSocket(native, opts);

    if (opts?.signal) {
      if (opts.signal.aborted) {
        connection.close();
      } else {
        const onAbort = () => connection.close();
        opts.signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    return connection;
  };

  return openSocket;
}

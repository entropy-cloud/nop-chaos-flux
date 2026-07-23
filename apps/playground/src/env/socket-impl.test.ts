import { describe, expect, it, vi } from 'vitest';
import { createDefaultOpenSocket, mapWebSocket, type NativeWebSocketLike } from './socket-impl.js';

function createMockNative(initialState = 0): NativeWebSocketLike & {
  fireOpen: () => void;
  fireMessage: (data: string | ArrayBufferLike) => void;
  fireClose: (code: number, reason: string) => void;
  fireError: (err: unknown) => void;
  setState: (s: number) => void;
} {
  let state = initialState;
  const native: NativeWebSocketLike = {
    get readyState() {
      return state;
    },
    binaryType: 'blob',
    send: vi.fn(),
    close: vi.fn((code?: number, reason?: string) => {
      void code;
      void reason;
      state = 3;
    }),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };
  return Object.assign(native, {
    fireOpen: () => native.onopen?.({}),
    fireMessage: (data: string | ArrayBufferLike) => native.onmessage?.({ data }),
    fireClose: (code: number, reason: string) => {
      state = 3;
      native.onclose?.({ code, reason });
    },
    fireError: (err: unknown) => native.onerror?.(err),
    setState: (s: number) => {
      state = s;
    },
  });
}

describe('mapWebSocket — event mapping', () => {
  it('maps native readyState numbers to structured state strings', () => {
    const mock = createMockNative(0);
    const conn = mapWebSocket(mock);
    expect(conn.readyState).toBe('connecting');
    mock.setState(1);
    expect(conn.readyState).toBe('open');
    mock.setState(2);
    expect(conn.readyState).toBe('closing');
    mock.setState(3);
    expect(conn.readyState).toBe('closed');
  });

  it('maps onopen/onmessage/onclose/onerror into structured events', () => {
    const mock = createMockNative(0);
    const conn = mapWebSocket(mock);
    const events: unknown[] = [];
    conn.onopen = (e) => events.push(['open', e.type]);
    conn.onmessage = (e) => events.push(['message', e.data]);
    conn.onclose = (e) => events.push(['close', e.code, e.reason]);
    conn.onerror = (e) => events.push(['error', (e as { error: string }).error]);

    mock.fireOpen();
    mock.fireMessage('hello');
    mock.fireClose(1000, 'normal');
    mock.fireError('boom');

    expect(events).toEqual([
      ['open', 'open'],
      ['message', 'hello'],
      ['close', 1000, 'normal'],
      ['error', 'boom'],
    ]);
  });

  it('delegates send() and close() to the native socket', () => {
    const mock = createMockNative(1);
    const conn = mapWebSocket(mock);
    conn.send('ping');
    conn.close(1000, 'bye');
    expect(mock.send).toHaveBeenCalledWith('ping');
    expect(mock.close).toHaveBeenCalledWith(1000, 'bye');
  });

  it('applies binaryType option to the native socket', () => {
    const mock = createMockNative(0);
    mapWebSocket(mock, { binaryType: 'arraybuffer' });
    expect(mock.binaryType).toBe('arraybuffer');
  });
});

describe('createDefaultOpenSocket — factory integration', () => {
  it('constructs a native socket via the injected factory and returns a mapped connection', () => {
    const created = createMockNative(0);
    const factory = vi.fn(() => created);
    const opener = createDefaultOpenSocket({ webSocketFactory: factory });

    const conn = opener('wss://example.com', { protocols: 'chat' });
    expect(factory).toHaveBeenCalledWith('wss://example.com', 'chat');
    expect(conn.readyState).toBe('connecting');
  });

  it('routes native events through the structured connection callbacks', () => {
    const created = createMockNative(0);
    const opener = createDefaultOpenSocket({ webSocketFactory: vi.fn(() => created) });
    const conn = opener('wss://example.com');

    const received: unknown[] = [];
    conn.onmessage = (e) => received.push(e.data);
    created.fireMessage('m1');
    created.fireMessage('m2');
    expect(received).toEqual(['m1', 'm2']);
  });

  it('calls close() when options.signal aborts', () => {
    const created = createMockNative(1);
    const closeSpy = vi.spyOn(created, 'close');
    const opener = createDefaultOpenSocket({ webSocketFactory: vi.fn(() => created) });
    const controller = new AbortController();
    opener('wss://example.com', { signal: controller.signal });
    expect(closeSpy).not.toHaveBeenCalled();
    controller.abort();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('calls close() immediately if options.signal is already aborted', () => {
    const created = createMockNative(0);
    const closeSpy = vi.spyOn(created, 'close');
    const opener = createDefaultOpenSocket({ webSocketFactory: vi.fn(() => created) });
    const controller = new AbortController();
    controller.abort();
    opener('wss://example.com', { signal: controller.signal });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocketOpener } from '@nop-chaos/flux-core';
import type { WebSocketConnection } from '@nop-chaos/flux-core';
import { createDebugClient } from '../client/debug-client.js';
import { createDebugStore } from '../state/debug-store.js';

/** MockConnection：手动驱动 onopen/onmessage/onclose（WebSocketConnection 契约）。 */
class MockConnection implements WebSocketConnection {
  readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'open';
  sent: string[] = [];
  onopen: ((event: { type: 'open' }) => void) | null = null;
  onmessage: ((event: { type: 'message'; data: string | ArrayBufferLike }) => void) | null = null;
  onclose: ((event: { type: 'close'; code: number; reason: string }) => void) | null = null;
  onerror: ((event: { type: 'error'; error: unknown }) => void) | null = null;

  send(data: string | ArrayBufferLike): void {
    this.sent.push(String(data));
  }

  close(): void {
    this.readyState = 'closed';
  }

  open() {
    this.readyState = 'open';
    this.onopen?.({ type: 'open' });
  }

  receive(text: string) {
    this.onmessage?.({ type: 'message', data: text });
  }

  closeFromServer(code = 1006, reason = '') {
    this.readyState = 'closed';
    this.onclose?.({ type: 'close', code, reason });
  }
}

function parseFrame(text: string): { id?: string; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { errorCode?: string; message?: string } } {
  return JSON.parse(text);
}

function createEnv() {
  const store = createDebugStore();
  const connections: MockConnection[] = [];
  const opener: WebSocketOpener = vi.fn((_url: string) => {
    const conn = new MockConnection();
    connections.push(conn);
    return conn;
  });
  const client = createDebugClient({
    store,
    openSocket: opener,
    serverUrl: '/ws/xlang-debugger',
    getToken: () => 'tok-1',
  });
  return { store, connections, opener, client };
}

async function flushMicrotasks(): Promise<void> {
  await vi.advanceTimersByTimeAsync(1);
}

async function openSession(env: ReturnType<typeof createEnv>): Promise<void> {
  const { client, connections } = env;
  const connectPromise = client.connect();
  const conn = connections[connections.length - 1];
  conn.open();
  await Promise.resolve();
  // session.open 请求帧
  const openFrameText = conn.sent.find((f) => f.includes('session.open'));
  expect(openFrameText).toBeTruthy();
  const openFrame = parseFrame(openFrameText!);
  conn.receive(JSON.stringify({
    jsonrpc: '2.0',
    id: openFrame.id,
    result: { sessionId: 'u1:conn-1', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
  }));
  await connectPromise;
  await Promise.resolve();
}

describe('debug client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setHidden(hidden: boolean) {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (hidden ? 'hidden' : 'visible'),
    });
  }

  it('handshake sends token query param and session.open frame, registers transport', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    const openerMock = env.opener as unknown as { mock: { calls: Array<[string]> } };
    expect(openerMock.mock.calls[0][0]).toContain('nopDebugToken=tok-1');
    const openFrame = parseFrame(conn.sent.find((f) => f.includes('session.open'))!);
    expect(openFrame.params).toMatchObject({ protoVersion: '1.0' });
    // F7：transport 注册后 store 动作 → JSON-RPC 帧（上行方向）
    env.store.getState().resume();
    expect(conn.sent.some((f) => f.includes('debugger.resume'))).toBe(true);
    env.client.dispose();
  });

  it('maps nine transport methods to JSON-RPC frames (M5 mapping table)', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    const store = env.store;
    store.getState().setBreakpoints([{ sourcePath: 'a.xpl', line: 1 }]);

    store.getState().toggleBreakpoint('a.xpl', 2); // 派生 addBreakpoint
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.addBreakpoint');
    store.getState().toggleBreakpoint('a.xpl', 1); // 派生 removeBreakpoint
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.removeBreakpoint');
    store.getState().step('into');
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.stepInto');
    store.getState().step('over');
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.stepOver');
    store.getState().step('out');
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.stepOut');
    store.getState().muteBreakpoints(true);
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.muteBreakpoints');
    store.getState().runToPosition({ sourcePath: 'a.xpl', line: 9 });
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.runToPosition');
    store.getState().evalExpr({ threadId: 1, frameIndex: 0, expr: 'x' });
    expect(parseFrame(conn.sent.at(-1)!).method).toBe('debugger.getExprValue');
    env.client.dispose();
  });

  it('renew heartbeat: schedules per renewIntervalMs, updates store lease from receipt', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    const renewCount = () => conn.sent.filter((f) => f.includes('lease.renew')).length;
    expect(renewCount()).toBe(1); // 连接后立即 renew（首豁免）
    // 回应首 renew（renewInFlight 守卫：未回执前 interval renew 跳过）
    const firstRenew = parseFrame(conn.sent.filter((f) => f.includes('lease.renew'))[0]);
    conn.receive(JSON.stringify({ jsonrpc: '2.0', id: firstRenew.id, result: { lease: { expiresAtMs: 1, suspendedThreadIds: [] } } }));
    await Promise.resolve();
    vi.advanceTimersByTime(200);
    expect(renewCount()).toBeGreaterThanOrEqual(2);
    // renew 回执 → setLease
    const renewFrame = parseFrame(conn.sent.filter((f) => f.includes('lease.renew')).at(-1)!);
    conn.receive(JSON.stringify({
      jsonrpc: '2.0',
      id: renewFrame.id,
      result: { lease: { expiresAtMs: 999999, suspendedThreadIds: [] } },
    }));
    await Promise.resolve();
    expect(env.store.getState().lease).toEqual({ expiresAtMs: 999999 });
    env.client.dispose();
  });

  it('visibility hidden pauses renew, visible resumes immediately', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    const renewCount = () => conn.sent.filter((f) => f.includes('lease.renew')).length;
    const before = renewCount();
    const firstRenew = parseFrame(conn.sent.filter((f) => f.includes('lease.renew'))[0]);
    conn.receive(JSON.stringify({ jsonrpc: '2.0', id: firstRenew.id, result: { lease: { expiresAtMs: 1, suspendedThreadIds: [] } } }));
    await Promise.resolve();

    setHidden(true);
    vi.advanceTimersByTime(1000);
    expect(renewCount()).toBe(before);

    setHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(renewCount()).toBeGreaterThan(before);
    env.client.dispose();
  });

  it('dispatches events to store appliers (suspended/exception/resumed)', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.suspended', params: { reason: 'breakAt', threadId: 17, location: { sourcePath: 'a.xpl', line: 5 } } }));
    expect(env.store.getState().suspended).toEqual([{ threadId: 17, sourcePath: 'a.xpl', line: 5 }]);
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.exception', params: { message: 'boom', errorCode: 'nop.err.t' } }));
    expect(env.store.getState().exceptions).toHaveLength(1);
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.resumed', params: { threadIds: [17], cause: 'user' } }));
    expect(env.store.getState().suspended).toEqual([]);
    env.client.dispose();
  });

  it('reconnects after abnormal close and replays rebind snapshot', async () => {
    const env = createEnv();
    await openSession(env);
    const firstConn = env.connections[0];
    const sessionId = env.client.sessionId();
    expect(sessionId).toBe('u1:conn-1');

    firstConn.closeFromServer(1006);
    await vi.advanceTimersByTimeAsync(600);
    const secondConn = env.connections[1];
    expect(secondConn).toBeTruthy();

    // 重连：session.open（过渡会话）→ session.rebind{上次会话}
    secondConn.open();
    await flushMicrotasks();
    secondConn.receive(JSON.stringify({
      jsonrpc: '2.0',
      id: parseFrame(secondConn.sent.find((f) => f.includes('session.open'))!).id,
      result: { sessionId: 'u1:conn-2', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    await flushMicrotasks();
    const rebindFrame = parseFrame(secondConn.sent.find((f) => f.includes('session.rebind'))!);
    expect(rebindFrame.params).toEqual({ sessionId: 'u1:conn-1' });
    secondConn.receive(JSON.stringify({
      jsonrpc: '2.0',
      id: rebindFrame.id,
      result: {
        sessionId: 'u1:conn-1',
        breakpoints: [{ sourcePath: 'r.xpl', line: 3 }],
        suspendedThreads: [{ threadName: 't', threadId: 42, suspended: true }],
        lease: { expiresAtMs: 888888, suspendedThreadIds: [] },
      },
    }));
    await flushMicrotasks();
    expect(env.store.getState().breakpoints).toEqual([{ sourcePath: 'r.xpl', line: 3 }]);
    expect(env.store.getState().lease).toEqual({ expiresAtMs: 888888 });
    env.client.dispose();
  });

  it('rebind rejected (BOUND_ELSEWHERE) rebuilds on transitional session (F4)', async () => {
    const env = createEnv();
    await openSession(env);
    // 回应首个 renew（renewInFlight 守卫复位，重建路径的 renewNow 才能发送）
    const firstConn = env.connections[0];
    const firstRenewF4 = parseFrame(firstConn.sent.filter((f) => f.includes('lease.renew'))[0]);
    firstConn.receive(JSON.stringify({ jsonrpc: '2.0', id: firstRenewF4.id, result: { lease: { expiresAtMs: 1, suspendedThreadIds: [] } } }));
    env.store.getState().setBreakpoints([{ sourcePath: 'keep.xpl', line: 2 }]);
    firstConn.closeFromServer(1006);
    await vi.advanceTimersByTimeAsync(600);
    const secondConn = env.connections[1];
    secondConn.open();
    await flushMicrotasks();
    secondConn.receive(JSON.stringify({
      jsonrpc: '2.0',
      id: parseFrame(secondConn.sent.find((f) => f.includes('session.open'))!).id,
      result: { sessionId: 'u1:conn-2', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    await flushMicrotasks();
    const rebindFrame = parseFrame(secondConn.sent.find((f) => f.includes('session.rebind'))!);
    secondConn.receive(JSON.stringify({
      jsonrpc: '2.0',
      id: rebindFrame.id,
      error: { message: 'not rebindable', errorCode: 'nop.err.xlang.debugger.session-bound-elsewhere' },
    }));
    await flushMicrotasks();
    // F4：按新会话重建——重发断点 + 恢复心跳（非终态）
    const setBp = secondConn.sent.find((f) => f.includes('debugger.setBreakpoints'));
    expect(setBp).toBeTruthy();
    expect(parseFrame(setBp!).params).toEqual({
      bps: [{ sourcePath: 'keep.xpl', line: 2 }],
    });
    expect(secondConn.sent.some((f) => f.includes('lease.renew'))).toBe(true);
    env.client.dispose();
    const __methods = secondConn.sent.map((f) => { try { return (JSON.parse(f).method ?? 'resp'); } catch { return '?'; } }).join(',');
    if (!secondConn.sent.some((f) => f.includes('debugger.setBreakpoints'))) {
      throw new Error('PROBE frames: ' + __methods + ' | storeBps: ' + JSON.stringify(env.store.getState().breakpoints));
    }
  });

  it('4401 close is terminal (no reconnect, authFailed callback)', async () => {
    const onSessionClosed = vi.fn();
    const store = createDebugStore();
    const connections: MockConnection[] = [];
    const client = createDebugClient({
      store,
      openSocket: ((_url: string) => {
        const conn = new MockConnection();
        connections.push(conn);
        return conn;
      }) as WebSocketOpener,
      serverUrl: '/ws/xlang-debugger',
      getToken: () => 'expired',
      onSessionClosed,
    });
    const connectPromise = client.connect();
    connections[0].open();
    await Promise.resolve();
    connections[0].receive(JSON.stringify({
      jsonrpc: '2.0',
      id: parseFrame(connections[0].sent.find((f) => f.includes('session.open'))!).id,
      result: { sessionId: 'u1:c1', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    await connectPromise;
    connections[0].closeFromServer(4401);
    await vi.advanceTimersByTimeAsync(20000);
    expect(connections).toHaveLength(1, '4401 终态不得重连');
    expect(onSessionClosed).toHaveBeenCalledWith(expect.objectContaining({ reason: 'authFailed' }));
    client.dispose();
  });

  it('dispose sends session.close, clears transport and pending', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    env.client.dispose();
    expect(conn.sent.some((f) => f.includes('session.close'))).toBe(true);
    expect(env.store.getState().transport ?? null).toBeNull();
    expect(env.client.connectionState()).toBe('disconnected');
    // dispose 后 store 动作不再发帧
    const count = conn.sent.length;
    env.store.getState().resume();
    expect(conn.sent.length).toBe(count);
  });
});

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

  close(code = 1000, reason = ''): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    // 对齐真实 socket：close() 触发 onclose（client 侧 disposed/stopped/身份守卫负责早退）
    this.onclose?.({ type: 'close', code, reason });
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
    // F4：按新会话重建——重发断点 + 恢复心跳（非终态）+ 采纳过渡会话 id（B2）
    const setBp = secondConn.sent.find((f) => f.includes('debugger.setBreakpoints'));
    expect(setBp).toBeTruthy();
    expect(parseFrame(setBp!).params).toEqual({
      bps: [{ sourcePath: 'keep.xpl', line: 2 }],
    });
    expect(env.client.sessionId()).toBe('u1:conn-2');
    const methods = secondConn.sent.map((f) => { try { return JSON.parse(f).method ?? 'resp'; } catch { return '?'; } });
    expect(methods).toContain('lease.renew');
    env.client.dispose();
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
    expect(connections).toHaveLength(1);
    expect(onSessionClosed).toHaveBeenCalledWith(expect.objectContaining({ reason: 'authFailed' }));
    client.dispose();
  });

  it('query public surface and onLog/onCompleted subscriptions (plan 620 F8/F7)', async () => {
    const env = createEnv();
    const logs: Array<{ message: string }> = [];
    const completed: Array<{ ok: boolean }> = [];
    const unLog = env.client.onLog((e) => logs.push(e));
    const unCompleted = env.client.onCompleted((r) => completed.push(r));
    await openSession(env);
    const conn = env.connections[0];

    // query 直查 getStackInfo
    const queryPromise = env.client.query<{ stackInfo: unknown }>('debugger.getStackInfo', { threadId: 17 });
    const queryFrame = parseFrame(conn.sent.find((f) => f.includes('debugger.getStackInfo'))!);
    conn.receive(JSON.stringify({ jsonrpc: '2.0', id: queryFrame.id, result: { stackInfo: { stackTrace: [] } } }));
    expect((await queryPromise).stackInfo).toBeTruthy();

    // evt.log 单条 → onLog
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.log', params: { level: 'info', message: 'hello', timestamp: 1 } }));
    expect(logs.map((l) => l.message)).toContain('hello');
    // evt.logs 批量拆帧 → onLog
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.logs', params: { entries: [{ level: 'warn', message: 'w1' }, { level: 'info', message: 'w2' }] } }));
    expect(logs.map((l) => l.message)).toEqual(expect.arrayContaining(['w1', 'w2']));
    // evt.completed → onCompleted
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.completed', params: { ok: true, result: 'done' } }));
    expect(completed).toHaveLength(1);
    // 退订后不再接收
    unLog();
    unCompleted();
    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.log', params: { level: 'info', message: 'after-unsub' } }));
    expect(logs.map((l) => l.message)).not.toContain('after-unsub');
    env.client.dispose();
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

describe('debug client terminal codes and edge paths (audit m3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('4400/4403 closes are terminal too', async () => {
    for (const code of [4400, 4403]) {
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
        getToken: () => 't',
      });
      client.connect();
      connections[0].open();
      await Promise.resolve();
      connections[0].closeFromServer(code);
      await vi.advanceTimersByTimeAsync(20000);
      expect(connections).toHaveLength(1);
      client.dispose();
    }
  });

  it('evt.sessionClosed triggers onSessionClosed callback', async () => {
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
      getToken: () => 't',
      onSessionClosed,
    });
    client.connect();
    connections[0].open();
    await Promise.resolve();
    connections[0].receive(JSON.stringify({
      jsonrpc: '2.0',
      id: parseFrame(connections[0].sent.find((f) => f.includes('session.open'))!).id,
      result: { sessionId: 'u1:c1', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    connections[0].receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.sessionClosed', params: { reason: 'graceExpired' } }));
    // plan 650 F-1：四值 reason 透传（废除折叠为 'closed'）
    expect(onSessionClosed).toHaveBeenCalledWith(expect.objectContaining({ reason: 'graceExpired' }));
    client.dispose();
  });

  /**
   * plan 650 F-1（item 26 审计）：evt.sessionClosed 会话状态收敛——心跳停/挂起清/
   * lease 空/transport 失效/连接撕卸；userClosed 终态不自动重建。
   */
  it('evt.sessionClosed invalidates session state (F-1)', async () => {
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
      getToken: () => 't',
      onSessionClosed,
    });
    client.connect();
    const conn = connections[0];
    conn.open();
    await Promise.resolve();
    const openFrame = JSON.parse(conn.sent.find((f) => f.includes('session.open'))!);
    conn.receive(JSON.stringify({
      jsonrpc: '2.0', id: openFrame.id,
      result: { sessionId: 'u1:c1', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    // 造挂起态 + transport
    store.getState().addSuspended({ threadId: 1, sourcePath: 'a.xpl', line: 1 });
    await vi.advanceTimersByTimeAsync(150); // 至少一次 renew（心跳在跑）
    const renewCountBefore = conn.sent.filter((f) => f.includes('lease.renew')).length;
    expect(renewCountBefore).toBeGreaterThan(0);
    expect(store.getState().transport).not.toBeNull();

    conn.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.sessionClosed', params: { reason: 'userClosed' } }));
    expect(onSessionClosed).toHaveBeenCalledWith(expect.objectContaining({ reason: 'userClosed' }));
    // 收敛断言：挂起清/lease 空/transport 失效/连接撕卸
    expect(store.getState().suspended).toEqual([]);
    expect(store.getState().lease).toBeNull();
    expect(store.getState().transport).toBeNull();
    expect(client.connectionState()).toBe('disconnected');
    expect(conn.readyState).toBe('closed');
    // 终态（userClosed）：无自动重建——不再有新连接
    await vi.advanceTimersByTimeAsync(20000);
    expect(connections).toHaveLength(1);
    client.dispose();
  });

  /**
   * plan 650 F-1：graceExpired 可重试——失效后由 onclose 编排重连，重连后 rebind 旧 id
   * 被拒 → rebuildOnNewSession 复位状态 + 断点重放（F-2 复位断言）。
   */
  it('graceExpired reconnects and rebuild resets stale suspended state (F-1/F-2)', async () => {
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
      getToken: () => 't',
    });
    client.connect();
    const conn1 = connections[0];
    conn1.open();
    await Promise.resolve();
    const open1 = JSON.parse(conn1.sent.find((f) => f.includes('session.open'))!);
    conn1.receive(JSON.stringify({
      jsonrpc: '2.0', id: open1.id,
      result: { sessionId: 'u1:c1', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    store.getState().addSuspended({ threadId: 9, sourcePath: 'old.xpl', line: 3 }); // 旧会话挂起态残留

    conn1.receive(JSON.stringify({ jsonrpc: '2.0', method: 'evt.sessionClosed', params: { reason: 'serverShutdown' } }));
    expect(store.getState().suspended).toEqual([]);
    // conn.close(1000) → onclose → 重连（重连退避，推进时钟）
    await vi.advanceTimersByTimeAsync(20000);
    expect(connections.length).toBeGreaterThanOrEqual(2);
    const conn2 = connections[connections.length - 1];
    conn2.open();
    await Promise.resolve();
    const open2 = JSON.parse(conn2.sent.find((f) => f.includes('session.open'))!);
    conn2.receive(JSON.stringify({
      jsonrpc: '2.0', id: open2.id,
      result: { sessionId: 'u1:transient', protoVersion: '1.0', lease: { ttlMs: 30000, renewIntervalMs: 100 } },
    }));
    await Promise.resolve();
    await Promise.resolve(); // open.then → sendRequest(rebind) 链式微任务
    // rebind 旧 id u1:c1 → BOUND_ELSEWHERE → rebuildOnNewSession（采纳过渡会话 + 复位 + 断点重放）
    const rebindFrame = JSON.parse(conn2.sent.find((f) => f.includes('session.rebind'))!);
    conn2.receive(JSON.stringify({
      jsonrpc: '2.0', id: rebindFrame.id,
      error: { code: -32000, message: 'session not rebindable', errorCode: 'nop.err.xlang.debugger.session-bound-elsewhere' },
    }));
    await Promise.resolve();
    const setBps = conn2.sent.find((f) => f.includes('setBreakpoints'));
    if (store.getState().breakpoints.length > 0) {
      expect(setBps).toBeTruthy(); // 断点重放
    }
    expect(store.getState().suspended).toEqual([]); // F-2：重建不复位则残留旧挂起态
    client.dispose();
  });

  /**
   * plan 650 F-4：StrictMode 双挂载——旧连接 onclose 晚到不践踏新连接状态（身份守卫）。
   */
  it('stale late onclose does not clobber the new connection (F-4)', async () => {
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
      getToken: () => 't',
    });
    client.connect();
    const conn1 = connections[0];
    conn1.open();
    // 模拟 StrictMode：dispose（旧连接 close 但桩不触发 onclose）→ 再 connect（新连接）
    client.dispose();
    client.connect();
    const conn2 = connections[connections.length - 1];
    conn2.open();
    await Promise.resolve();
    expect(client.connectionState()).toBe('connecting'); // conn2 open 后 open 往返在途
    // 旧连接 onclose 晚到——身份守卫必须早退（不置 state=disconnected、不触发重连风暴）
    conn1.closeFromServer(1006);
    expect(client.connectionState()).not.toBe('disconnected');
    expect(connections).toHaveLength(2); // 无第三条连接（无重连风暴）
    client.dispose();
  });

  it('openSocket-missing fails terminal via onSessionClosed (plan 621 B6: visible error bar, not unhandled rejection)', async () => {
    const store = createDebugStore();
    const onSessionClosed = vi.fn();
    const client = createDebugClient({
      store,
      openSocket: undefined as unknown as WebSocketOpener,
      serverUrl: '/ws/xlang-debugger',
      getToken: () => 't',
      onSessionClosed,
    });
    // B6 契约修订：同步失败不再 reject（装配层 void client.connect() 会成未处理拒绝），
    // 改终态回调呈现——connect 正常 resolve，onSessionClosed 携带原因
    await expect(client.connect()).resolves.toBeUndefined();
    expect(onSessionClosed).toHaveBeenCalledTimes(1);
    expect(onSessionClosed.mock.calls[0]![0].reason).toBe('closed');
    expect(String(onSessionClosed.mock.calls[0]![0].detail)).toContain('openSocket');
    expect(client.connectionState()).toBe('disconnected');
  });

  it('throwing opener fails terminal with error detail, no reconnect storm (plan 621 B6)', async () => {
    const store = createDebugStore();
    const onSessionClosed = vi.fn();
    const opener = vi.fn((_url: string) => {
      throw new SyntaxError('Failed to construct WebSocket: url must be absolute');
    });
    const client = createDebugClient({
      store,
      openSocket: opener as unknown as WebSocketOpener,
      serverUrl: '/relative/ws',
      getToken: () => undefined,
      onSessionClosed,
    });
    await expect(client.connect()).resolves.toBeUndefined();
    expect(onSessionClosed).toHaveBeenCalledTimes(1);
    expect(onSessionClosed.mock.calls[0]![0].reason).toBe('closed');
    expect(String(onSessionClosed.mock.calls[0]![0].detail)).toContain('url must be absolute');
    expect(client.connectionState()).toBe('disconnected');
    // 终态：重连窗口内 opener 不再被调（必然复抛的重连风暴被避免）
    await vi.advanceTimersByTimeAsync(20_000);
    expect(opener).toHaveBeenCalledTimes(1);
  });

  it('empty token omits nopDebugToken param entirely (plan 621 B4: single injection seam)', async () => {
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
      getToken: () => undefined,
    });
    void client.connect();
    const url = (opener as unknown as { mock: { calls: Array<[string]> } }).mock.calls[0]![0];
    // 宿主注入点（demo 页 openSocket 包装）追加时不得同键双参：无 token 一参不拼
    expect(url).toBe('/ws/xlang-debugger');
    expect(url).not.toContain('nopDebugToken');
    client.dispose();
  });

  it('connect after dispose revives the same client instance (plan 621 B3: StrictMode remount)', async () => {
    const env = createEnv();
    await openSession(env);
    expect(env.client.connectionState()).toBe('connected');
    env.client.dispose();
    expect(env.client.connectionState()).toBe('disconnected');
    // StrictMode 第二次 setup：同实例再 connect 必须真实重开连接并完成握手
    // （复活后 reconnectAttempt 归零——revive 前 dispose 清空 pending/timers）
    await openSession(env);
    expect(env.connections.length).toBe(2);
    expect(env.client.connectionState()).toBe('connected');
    const conn2 = env.connections[1]!;
    expect(conn2.sent.some((f) => f.includes('session.open'))).toBe(true);
    env.client.dispose();
  });

  it('finish terminal (authFailed) still blocks revive (stopped latch survives)', async () => {
    const env = createEnv();
    await openSession(env);
    env.connections[0]!.closeFromServer(4401);
    await flushMicrotasks();
    expect(env.client.connectionState()).toBe('disconnected');
    // 终态后同实例 connect：stopped 闩锁不复活（4401 是协议终态，不是卸载语义）
    await env.client.connect();
    expect(env.connections.length).toBe(1);
    expect(env.client.connectionState()).toBe('disconnected');
    env.client.dispose();
  });


  it('RATE_LIMITED backoff delays subsequent renew (M1)', async () => {
    const env = createEnv();
    await openSession(env);
    const conn = env.connections[0];
    const renewFrames = () => conn.sent.filter((f) => f.includes('lease.renew'));
    // 首 renew（openSession 时发出）回 RATE_LIMITED → 退避重启 interval（200ms→400ms）
    const frame = parseFrame(renewFrames()[0]);
    conn.receive(JSON.stringify({ jsonrpc: '2.0', id: frame.id, error: { message: 'rate', errorCode: 'nop.err.xlang.debugger.rate-limited' } }));
    await Promise.resolve();
    await Promise.resolve(); // 冲刷两级微任务链（P.reject → 传播 → onError 退避重启）
    const countAfterLimited = renewFrames().length;
    vi.advanceTimersByTime(399);
    expect(renewFrames().length).toBe(countAfterLimited); // 退避窗口内不 renew
    vi.advanceTimersByTime(1);
    expect(renewFrames().length).toBeGreaterThan(countAfterLimited); // 400ms 到点重试
    env.client.dispose();
  });
});

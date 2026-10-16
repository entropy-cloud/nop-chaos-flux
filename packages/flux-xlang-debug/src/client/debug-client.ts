import type { WebSocketConnection, WebSocketOpener } from '@nop-chaos/flux-core';
import type { DebugStore, DebugTransport, StepKind } from '../state/debug-store.js';

const PROTO_VERSION = '1.0';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_EXECUTE_RENEW_INTERVAL = 60_000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 15_000;

/** session.open 结果的租约策略（D1 §3.4 LeasePolicy）。 */
export interface LeasePolicy {
  ttlMs: number;
  renewIntervalMs: number;
}

export type SessionCloseReason =
  | 'closed'
  | 'authFailed'
  | 'rebindRejected'
  | 'protocolUnsupported';

export interface CreateDebugClientOptions {
  store: DebugStore;
  openSocket: WebSocketOpener;
  serverUrl: string;
  /** per-attempt 取 token（M3）：每次连接尝试重取，避免长会话重连用过期 token 撞 4401。 */
  getToken: () => string | undefined;
  onSessionClosed?: (payload: { reason: SessionCloseReason; detail?: string }) => void;
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export interface DebugClient {
  connect(): Promise<void>;
  dispose(): void;
  sessionId(): string | null;
  connectionState(): 'disconnected' | 'connecting' | 'connected';
}

/**
 * WS 调试客户端（plan 618，D1 §3.2/§3.4 + D2 §3.1/§3.5）：env.openSocket 连接、
 * JSON-RPC 请求/事件分发、DebugTransport 实现（store 上行→WS）、续期心跳（页面
 * 可见性感知 + RATE_LIMITED 退避）、断连重连 + rebind 快照回放。
 */
export function createDebugClient(options: CreateDebugClientOptions): DebugClient {
  const { store, openSocket, serverUrl, getToken, onSessionClosed } = options;

  let connection: WebSocketConnection | null = null;
  let currentSessionId: string | null = null;
  let state: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  let disposed = false;
  let nextId = 0;
  const pending = new Map<string, Pending>();
  let renewTimer: ReturnType<typeof setInterval> | null = null;
  let renewInFlight = false;
  let renewBackoff = 1;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function connectionState(): 'disconnected' | 'connecting' | 'connected' {
    return state;
  }

  function sessionId(): string | null {
    return currentSessionId;
  }

  function sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    // 门槛 = 连接句柄（session.open 在 connecting 态发送；transport 方法仅在
    // connected 后经 store.transport 可达，onclose 后 connection 置 null 自然拒绝）
    if (!connection) {
      return Promise.reject(new Error(`not connected: ${method}`));
    }
    const id = String(++nextId);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`request timeout: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      connection!.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });
  }

  // ===== 下行事件 → store applier（M2：log 族/completed/未知事件显式忽略）=====

  function handleNotification(method: string, params: Record<string, unknown> | undefined): void {
    const p = params ?? {};
    switch (method) {
      case 'evt.suspended':
        store
            .getState()
            .addSuspended({
              threadId: Number(p.threadId),
              sourcePath: String((p.location as { sourcePath?: string } | undefined)?.sourcePath ?? ''),
              line: Number((p.location as { line?: number } | undefined)?.line ?? 0),
            });
        return;
      case 'evt.resumed':
      case 'evt.leaseExpired':
        store.getState().removeSuspended((p.threadIds as number[] | undefined) ?? []);
        return;
      case 'evt.exception':
        store.getState().addException({
          sourcePath: p.sourcePath as string | undefined,
          line: p.line as number | undefined,
          message: String(p.message ?? ''),
          errorCode: p.errorCode as string | undefined,
        });
        return;
      case 'evt.sessionClosed':
        onSessionClosed?.({ reason: 'closed', detail: JSON.stringify(p) });
        return;
      case 'ping':
      case 'pong':
      case 'evt.log':
      case 'evt.logs':
      case 'evt.completed':
        return; // 保留名/显式忽略（M2/M6）
      default:
        return; // 未知事件忽略（D1 §3.6）
    }
  }

  function handleMessage(text: string): void {
    let msg: { id?: string | number | null; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message?: string; errorCode?: string; data?: { errorCode?: string } } };
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.id != null && (msg.result !== undefined || msg.error !== undefined)) {
      const key = String(msg.id);
      const entry = pending.get(key);
      if (entry) {
        clearTimeout(entry.timer);
        pending.delete(key);
        if (msg.error !== undefined) {
          const err = new Error(msg.error.message ?? 'request failed');
          (err as Error & { errorCode?: string }).errorCode =
              msg.error.errorCode ?? msg.error.data?.errorCode;
          entry.reject(err);
        } else {
          entry.resolve(msg.result);
        }
      }
      return;
    }
    if (msg.method) {
      handleNotification(msg.method, msg.params);
    }
  }

  // ===== renew 心跳（F5：恢复可见立即 renew + 相位重置；RATE_LIMITED 退避）=====

  function renewNow(): void {
    if (renewInFlight || state !== 'connected') {
        return;
    }
    renewInFlight = true;
    sendRequest('lease.renew', {})
        .then((result) => {
          renewInFlight = false;
          renewBackoff = 1;
          const lease = (result as { lease?: { expiresAtMs?: number } } | undefined)?.lease;
          if (lease?.expiresAtMs != null) {
            store.getState().setLease(lease.expiresAtMs); // F2：renew 回执是 setLease 数据源
          }
        })
        .catch((error: Error & { errorCode?: string }) => {
          renewInFlight = false;
          if (error.errorCode === 'nop.err.xlang.debugger.rate-limited') {
            // M1 修复：退避作用于运行中 interval——重排下个排程点（D2 §3.1）
            renewBackoff = Math.min(renewBackoff * 2, 3);
            if (state === 'connected') {
              startRenewHeartbeat(currentRenewIntervalMs);
            }
          }
        });
  }

  function startRenewHeartbeat(renewIntervalMs: number): void {
    stopRenewHeartbeat();
    const interval = Math.min(
        Math.max(renewIntervalMs, 200) * renewBackoff,
        MAX_EXECUTE_RENEW_INTERVAL,
    );
    renewTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        renewNow();
      }
    }, interval);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // D2 §3.1：恢复可见立即 renew 一次（隐藏期零 renew，租约自然到期放行）；
      // m1：重置 interval 相位，避免旧相位紧随二次 renew
      renewNow();
      startRenewHeartbeat(currentRenewIntervalMs);
      renewNow();
    }
  }

  function stopRenewHeartbeat(): void {
    if (renewTimer != null) {
      clearInterval(renewTimer);
      renewTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  }

  // ===== transport 实现（F7/M5：store 上行 → JSON-RPC 帧）=====

  const transport: DebugTransport = {
    addBreakpoint(sourcePath, line) {
      void sendRequest('debugger.addBreakpoint', {
        bp: { sourcePath, line },
      }).catch(() => {});
    },
    removeBreakpoint(sourcePath, line) {
      void sendRequest('debugger.removeBreakpoint', {
        bp: { sourcePath, line },
      }).catch(() => {});
    },
    toggleBreakpoint(sourcePath, line) {
      const exists = store
          .getState()
          .breakpoints.some((bp) => bp.sourcePath === sourcePath && bp.line === line);
      if (exists) {
        transport.removeBreakpoint(sourcePath, line);
      } else {
        transport.addBreakpoint(sourcePath, line);
      }
    },
    step(kind: StepKind) {
      const method = kind === 'into' ? 'debugger.stepInto' : kind === 'over' ? 'debugger.stepOver' : 'debugger.stepOut';
      void sendRequest(method, {}).catch(() => {});
    },
    resume() {
      void sendRequest('debugger.resume', {}).catch(() => {});
    },
    suspend() {
      void sendRequest('debugger.suspend', {}).catch(() => {});
    },
    runToPosition(bp) {
      void sendRequest('debugger.runToPosition', { bp }).catch(() => {});
    },
    muteBreakpoints(muted) {
      void sendRequest('debugger.muteBreakpoints', { muted }).catch(() => {});
    },
    evalExpr(args) {
      void sendRequest('debugger.getExprValue', {
        threadId: args.threadId,
        frameIndex: args.frameIndex,
        expr: args.expr,
      }).catch(() => {});
    },
  };

  // ===== 重连（F1/F4/F5）=====

  function scheduleReconnect(): void {
    if (stopped || disposed) {
      return;
    }
    reconnectAttempt += 1;
    const jitter = Math.random() * 0.3 + 0.85;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** (reconnectAttempt - 1) * jitter, RECONNECT_MAX_MS);
    reconnectTimer = setTimeout(() => {
      void connect();
    }, delay);
  }

  /** rebind 快照回放（F1）：断点镜像 + 挂起位置恢复（本地副本对账 + getStackInfo 补取）。 */
  function applyRebindSnapshot(result: unknown): void {
    const snapshot = result as {
      sessionId: string;
      breakpoints: Array<{ sourcePath: string; line: number; condition?: string; logExpr?: string }>;
      suspendedThreads: Array<{ threadId: number }>;
      lease: { expiresAtMs: number };
    };
    store.getState().setBreakpoints(snapshot.breakpoints ?? []);
    store.getState().setLease(snapshot.lease?.expiresAtMs ?? null);

    const known = new Map(
        store.getState().suspended.map((s) => [s.threadId, s] as const),
    );
    const restored = (snapshot.suspendedThreads ?? []).map((thread) => {
      const local: { threadId: number; sourcePath: string; line: number } | undefined =
          known.get(thread.threadId);
      if (local) {
        return local;
      }
      // D2 §3.6：未知线程位置经 getStackInfo 补取（异步，先落占位）
      void sendRequest('debugger.getStackInfo', { threadId: thread.threadId })
          .then((stackResult) => {
            const top = (stackResult as {
              stackInfo?: { stackTrace?: Array<{ sourcePath?: string; line?: number }> };
            })?.stackInfo?.stackTrace?.[0];
            if (top?.sourcePath != null) {
              store.getState().addSuspended({
                threadId: thread.threadId,
                sourcePath: top.sourcePath,
                line: top.line ?? 0,
              });
            }
          })
          .catch(() => {});
      return { threadId: thread.threadId, sourcePath: '', line: 0 };
    });
    store.getState().setSuspended(restored);
  }

  /** F4：rebind 被拒 → 按新会话重建（采纳过渡会话 + 恢复心跳 + 重发断点），非终态。 */
  function rebuildOnNewSession(transitionalSessionId: string): void {
    currentSessionId = transitionalSessionId;
    startRenewHeartbeatAfterConnect(); // F5：重建租约时钟（立即 renew + 心跳）
    const breakpoints = [...store.getState().breakpoints];
    if (breakpoints.length > 0) {
      void sendRequest('debugger.setBreakpoints', { bps: breakpoints }).catch(() => {});
    }
    onSessionClosed?.({ reason: 'rebindRejected' });
  }

  function startRenewHeartbeatAfterConnect(): void {
    // rebind 成功后的首个 renew 豁免限流（D2 §3.1）——立即 renew 重建租约时钟
    renewNow();
    startRenewHeartbeat(currentRenewIntervalMs);
  }

  let currentRenewIntervalMs = 10_000;

  // ===== 连接 =====

  async function connect(): Promise<void> {
    if (disposed || stopped) {
      return;
    }
    state = 'connecting';
    const token = getToken();
    const url = `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}nopDebugToken=${encodeURIComponent(token ?? '')}`;
    const conn = openSocket(url);
    connection = conn;

    conn.onopen = () => {
      void sendRequest('session.open', { protoVersion: PROTO_VERSION })
          .then((result) => {
            const open = result as { sessionId: string; lease: LeasePolicy } | undefined;
            if (!open?.sessionId) {
              throw new Error('session.open returned no sessionId');
            }
            state = 'connected';
            reconnectAttempt = 0;
            currentRenewIntervalMs = open.lease?.renewIntervalMs ?? 10_000;
            store.getState().setTransport(transport); // F7：上行通路注册

            // D1 §3.9 重连流：重连（已有上次会话 id）→ 过渡会话 + rebind
            const previousSessionId = currentSessionId;
            if (previousSessionId != null && previousSessionId !== open.sessionId) {
              void sendRequest('session.rebind', { sessionId: previousSessionId })
                  .then((rebindResult) => {
                    currentSessionId = previousSessionId;
                    applyRebindSnapshot(rebindResult);
                    startRenewHeartbeatAfterConnect(); // F5：rebind 成功立即 renew + 相位重置
                  })
                  .catch((error: Error & { errorCode?: string }) => {
                    if (error.errorCode === 'nop.err.xlang.debugger.session-bound-elsewhere') {
                      rebuildOnNewSession(open.sessionId); // F4：按新会话重建（采纳过渡会话），非终态
                      return;
                    }
                    scheduleReconnect();
                  });
              return;
            }

            currentSessionId = open.sessionId;
            startRenewHeartbeatAfterConnect();
          })
          .catch((error: Error & { errorCode?: string }) => {
            if (error.errorCode === 'nop.err.xlang.debugger.protocol-version-unsupported') {
              finish('protocolUnsupported');
            }
            // 其余 open 错误走 onclose 重连路径
          });
    };

    conn.onmessage = (event) => {
      handleMessage(typeof event.data === 'string' ? event.data : '');
    };

    conn.onclose = (event) => {
      connection = null;
      state = 'disconnected';
      stopRenewHeartbeat();
      if (disposed || stopped) {
        return;
      }
      if (event.code === 4401) {
        finish('authFailed');
        return;
      }
      if (event.code === 4400) {
        finish('protocolUnsupported');
        return;
      }
      if (event.code === 4403) {
        finish('authFailed');
        return;
      }
      scheduleReconnect();
    };

    conn.onerror = () => {
      // onclose 随后到达，重连由 onclose 路径编排
    };
  }

  function finish(reason: SessionCloseReason): void {
    stopped = true;
    stopRenewHeartbeat();
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    onSessionClosed?.({ reason, detail: currentSessionId ?? undefined });
  }

  function dispose(): void {
    disposed = true;
    // M7 知情声明：session.close = 中止挂起线程语义；组件卸载不 dispose 则由
    // 服务端宽限 15s 兜底销毁——取舍归装配层
    if (connection && state === 'connected' && currentSessionId != null) {
      try {
        connection.send(JSON.stringify({ jsonrpc: '2.0', id: String(++nextId), method: 'session.close', params: {} }));
      } catch {
        // 连接已死：宽限兜底
      }
    }
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('client disposed'));
    }
    pending.clear();
    stopRenewHeartbeat();
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    store.getState().setTransport(null); // F7
    state = 'disconnected';
    try {
      connection?.close(1000, 'client dispose');
    } catch {
      // 已关闭
    }
    connection = null;
  }

  return {
    connect,
    dispose,
    sessionId,
    connectionState,
  };
}

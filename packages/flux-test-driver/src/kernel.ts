import type { DebuggerApiView, FtGlobal } from './types.js';
import { getRealInput as getBridge } from './real-input.js';
import { buildFtGlobal } from './ft.js';

declare global {
  interface Window {
    __NOP_DEBUGGER_API__?: DebuggerApiView;
    __FLUX_FT__?: FtGlobal;
    __FLUX_TEST_GATEWAY_PORT__?: number;
    __FLUX_TEST_TARGET_ID__?: string;
  }
}

export interface KernelAttachResult {
  attached: boolean;
  controllerId?: string;
  sessionId?: string;
  gatewayConnected: boolean;
}

export type { RealInputFn } from './real-input.js';

let gatewaySocket: WebSocket | null = null;
let logTimer: ReturnType<typeof setInterval> | null = null;

const LOG_EMIT_MAX_PER_TICK = 20;

export interface KernelEventView { seq: number; kind: string; summary: string }

/** Pure rate limiter: at most 20 newest events per tick; excess counted as dropped. */
export function collectLogBatch(events: KernelEventView[], lastSeq: number, max = LOG_EMIT_MAX_PER_TICK): { entries: KernelEventView[]; dropped: number; nextSeq: number } {
  const fresh = events.filter((event) => event.seq > lastSeq);
  if (fresh.length === 0) {
    return { entries: [], dropped: 0, nextSeq: lastSeq };
  }
  const nextSeq = Math.max(...events.map((event) => event.seq));
  if (fresh.length > max) {
    return { entries: fresh.slice(fresh.length - max), dropped: fresh.length - max, nextSeq };
  }
  return { entries: fresh, dropped: 0, nextSeq };
}

/** 1s tick: ship at most 20 new kernel events per tick; excess counted as dropped. */
function startLogEmit(api: () => DebuggerApiView | undefined): void {
  if (logTimer) return;
  let lastSeq = 0;
  logTimer = setInterval(() => {
    if (!gatewaySocket || gatewaySocket.readyState !== WebSocket.OPEN) return;
    try {
      const raw = api()?.queryEvents?.() as Array<{ id: number; kind: string; summary: string }> | undefined;
      if (!raw || raw.length === 0) return;
      const events: KernelEventView[] = raw.map((event) => ({ seq: event.id, kind: String(event.kind), summary: String(event.summary) }));
      const batch = collectLogBatch(events, lastSeq);
      if (batch.entries.length === 0) return;
      lastSeq = batch.nextSeq;
      gatewaySocket.send(JSON.stringify({ event: 'log.emit', payload: { entries: batch.entries, dropped: batch.dropped } }));
    } catch {
      // log streaming must never take the spec run down
    }
  }, 1_000);
}

function connectGateway(port: number, targetId: string, controllerId: string): boolean {
  try {
    gatewaySocket = new WebSocket(`ws://127.0.0.1:${port}/gateway?targetId=${encodeURIComponent(targetId)}`);
    gatewaySocket.addEventListener('open', () => {
      gatewaySocket?.send(JSON.stringify({ event: 'session.attach', payload: { targetId, controllerId } }));
    });
    return true;
  } catch {
    gatewaySocket = null;
    return false;
  }
}

/** Notify the test gateway (if connected) about a finished assertion. */
export function notifyAssert(result: unknown): void {
  if (gatewaySocket && gatewaySocket.readyState === WebSocket.OPEN) {
    gatewaySocket.send(JSON.stringify({ event: 'assert.result', payload: result }));
  }
}

/**
 * Install the in-page `ft` global, binding to the page's existing
 * `__NOP_DEBUGGER_API__` kernel (playground dev pages expose it via
 * `exposeAutomationApi`). Optionally connects the local test gateway.
 */
export function installFt(options: { gateway?: boolean; waitForKernelMs?: number } = {}): Promise<KernelAttachResult> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('installFt must run in a browser page'));
  }
  const getApi = (): DebuggerApiView | undefined => window.__NOP_DEBUGGER_API__;
  const deadline = Date.now() + (options.waitForKernelMs ?? 0);

  const install = (): KernelAttachResult => {
    const api = getApi();
    window.__FLUX_FT__ = buildFtGlobal(getApi);
    return {
      attached: Boolean(api),
      controllerId: api?.controllerId,
      sessionId: api?.sessionId,
      gatewayConnected: false,
    };
  };

  const waitForKernel = async (): Promise<KernelAttachResult> => {
    while (!getApi() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const result = install();
    if (options.gateway && window.__FLUX_TEST_GATEWAY_PORT__) {
      const targetId = window.__FLUX_TEST_TARGET_ID__ ?? 'unknown';
      result.gatewayConnected = connectGateway(window.__FLUX_TEST_GATEWAY_PORT__, targetId, result.controllerId ?? 'no-kernel');
      if (result.gatewayConnected) {
        startLogEmit(getApi);
        // real-input bridge: Locator/keyboard/mouse prefer CDP trust events when
        // the gateway can relay them (CSS :hover and OS-level keys are
        // unreachable synthetically)
        let nextId = 1;
        (window as unknown as { __fluxTestRealInput?: ReturnType<typeof getBridge> }).__fluxTestRealInput = async (method, params) => {
          const socket = gatewaySocket;
          if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('gateway not open');
          const id = nextId++;
          socket.send(JSON.stringify({ id, method, params }));
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('real-input timeout')), 5_000);
            const onMessage = (event: MessageEvent) => {
              const msg = JSON.parse(String(event.data)) as { id?: number; error?: { message: string } };
              if (msg.id !== id) return;
              clearTimeout(timer);
              socket.removeEventListener('message', onMessage);
              if (msg.error) reject(new Error(msg.error.message));
              else resolve();
            };
            socket.addEventListener('message', onMessage);
          });
        };
      }
    }
    return result;
  };
  return waitForKernel();
}

export function getFt(): FtGlobal {
  if (typeof window === 'undefined' || !window.__FLUX_FT__) {
    throw new Error('kernel-not-attached: installFt() must run before using ft');
  }
  return window.__FLUX_FT__;
}

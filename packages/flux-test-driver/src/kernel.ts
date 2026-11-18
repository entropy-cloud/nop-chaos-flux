import type { DebuggerApiView, FtGlobal } from './types.js';
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

let gatewaySocket: WebSocket | null = null;

function connectGateway(port: number, targetId: string, controllerId: string): boolean {
  try {
    gatewaySocket = new WebSocket(`ws://127.0.0.1:${port}/?targetId=${encodeURIComponent(targetId)}`);
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

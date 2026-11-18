import { escapeAttr } from './escape-attr.js';
import type { AssertCheck, DebuggerApiView, FtGlobal, WaitForPredicate, WaitForResult } from './types.js';
import { createExpect } from './expect.js';
import { createLocator } from './locator.js';

export function requireKernel(api: DebuggerApiView | undefined): DebuggerApiView {
  if (!api) {
    throw new Error('kernel-not-attached: page has no __NOP_DEBUGGER_API__; enable exposeAutomationApi or install the debugger kernel');
  }
  return api;
}

function waitForViaApi(api: DebuggerApiView | undefined, predicate: WaitForPredicate, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }): Promise<WaitForResult> {
  const kernel = requireKernel(api);
  if (!kernel.waitFor) {
    return Promise.resolve({ ok: false, attempts: 0, durationMs: 0, lastError: 'kernel waitFor not wired' });
  }
  return kernel.waitFor(predicate, options);
}

export function buildFtGlobal(getApi: () => DebuggerApiView | undefined): FtGlobal {
  const api = getApi();
  const resolveByTestId = (testId: string): Element | null => document.querySelector(`[data-testid="${escapeAttr(testId)}"]`);

  const ft: FtGlobal = {
    async goto(url: string): Promise<void> {
      window.location.href = url;
    },
    async reload(): Promise<void> {
      window.location.reload();
    },
    byCid(id: string | number) {
      const kernel = requireKernel(api);
      if (typeof id === 'number') {
        return kernel.inspectByCid?.(id);
      }
      const element = document.querySelector(`[data-cid="${escapeAttr(String(id))}"]`) ?? resolveByTestId(String(id));
      if (!element) return undefined;
      return kernel.inspectByElement?.(element);
    },
    async dispatch(cid: string, action: unknown) {
      const kernel = requireKernel(api);
      const inspect = ft.byCid(cid);
      if (!inspect) throw new Error(`kernel-not-attached: no cid ${cid}`);
      return kernel.dispatch?.(action, { cid: inspect.cid });
    },
    async waitFor(predicate, options) {
      return waitForViaApi(api, predicate, options);
    },
    scope<T = unknown>(path: string): T {
      const kernel = requireKernel(api);
      const snapshot = kernel.getSnapshot() as { scopes?: Record<string, unknown> } | undefined;
      if (!snapshot) throw new Error('kernel-not-attached: no snapshot available');
      const segments = path.split('.');
      let current: unknown = snapshot;
      for (const segment of segments) {
        if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[segment];
        } else {
          // Fall back to searching scope stores for the leading segment.
          const scopes = snapshot.scopes ?? {};
          current = (scopes as Record<string, unknown>)[segment];
          if (current === undefined) {
            throw new Error(`kernel-not-attached: scope path not found: ${path}`);
          }
        }
      }
      return current as T;
    },
    snapshotAt(epoch: number) {
      const kernel = requireKernel(api);
      if (!kernel.getSnapshotAt) throw new Error('kernel-not-attached: snapshot collector not wired');
      return kernel.getSnapshotAt(epoch);
    },
    async evaluate<T>(expression: string): Promise<T> {
      // eslint-disable-next-line no-new-func -- 兼容层兜底 API：语义等价 page.evaluate 的存量迁移逃生口
      return new Function(`return (${expression});`)() as T;
    },
    async screenshot(options?: unknown) {
      const kernel = requireKernel(api);
      if (!kernel.screenshot) throw new Error('kernel-not-attached: capture channel not wired');
      return kernel.screenshot(options);
    },
    expect: createExpect(getApi, notifyAssertSafe),
    locator(selector: string, options?) {
      return createLocator(() => document, selector, options, getApi);
    },
    getByTestId(testId: string, options?) {
      return createLocator(() => document, `[data-testid="${testId}"]`, options, getApi);
    },
    kernel: {
      attached: Boolean(api),
      controllerId: api?.controllerId,
      sessionId: api?.sessionId,
    },
  };
  return ft;
}


function notifyAssertSafe(result: AssertCheck): void {
  try {
    const notify = (globalThis as { __fluxTestNotifyAssert?: (r: AssertCheck) => void }).__fluxTestNotifyAssert;
    notify?.(result);
  } catch {
    // assertion reporting must never break the spec itself
  }
}

import { escapeAttr } from './escape-attr.js';
import type { AssertCheck, DebuggerApiView, FtGlobal, WaitForPredicate, WaitForResult } from './types.js';
import { createExpect } from './expect.js';
import { createLocator } from './locator.js';
import { createWebExpect } from './expect-web.js';
import { createKeyboard, createMouse } from './input.js';
import { buildRoleSelector, createRoleLocator } from './roles.js';

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
      // 兼容层兜底 API：语义等价 page.evaluate 的存量迁移逃生口
      const compile = (body: string) =>
        // eslint-disable-next-line no-new-func -- 同上
        new Function(body) as () => T;
      try {
        return compile(`return (${expression});`)();
      } catch (err) {
        if (!(err instanceof SyntaxError)) throw err;
        // statement form: wrap in an IIFE so multi-statement snippets work like page.evaluate fn bodies
        return compile(`return (() => {\n${expression}\n})();`)();
      }
    },
    async screenshot(options?: unknown) {
      const kernel = requireKernel(api);
      if (!kernel.screenshot) throw new Error('kernel-not-attached: capture channel not wired');
      return kernel.screenshot(options);
    },
    expect: createExpect(getApi, notifyAssertSafe),
    expectWeb: createWebExpect(notifyAssertSafe),
    locator(selector: string, options?) {
      return createLocator(() => document, selector, options, getApi);
    },
    getByTestId(testId: string, options?) {
      return createLocator(() => document, `[data-testid="${testId}"]`, options, getApi);
    },
    getByRole(role, options) {
      const selector = buildRoleSelector(role, options?.level);
      if (options?.name === undefined) {
        return createLocator(() => document, selector, {}, getApi);
      }
      return createRoleLocator(() => document, selector, options.name, {});
    },
    keyboard: createKeyboard(),
    mouse: createMouse(),
    async setViewportSize(width, height) {
      const real = (globalThis as { __fluxTestRealInput?: (m: string, p: Record<string, unknown>) => Promise<void> }).__fluxTestRealInput;
      if (!real) throw new Error('viewport: real-input bridge unavailable (gateway not connected)');
      await real('emulation.viewport', { width, height });
    },
    errors() {
      const kernel = requireKernel(api);
      const latest = kernel.getLatestErrors?.() ?? [];
      return latest.map((event) => ({ kind: String((event as { kind?: string }).kind ?? 'error'), message: String((event as { message?: string }).message ?? (event as { summary?: string }).summary ?? '') }));
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

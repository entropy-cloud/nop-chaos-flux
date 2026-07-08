import type { ReactionHandle, ReactionHandleDebugState } from '@nop-chaos/flux-core';

type ReactionHandleMethod = 'dispatch' | 'force' | 'ready' | 'pause' | 'resume';

interface PendingCall {
  method: ReactionHandleMethod;
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

/**
 * Extended `ReactionHandle` with proxy lifecycle hooks used by the React
 * integration (`node-renderer-resolved.tsx`). The proxy itself satisfies the
 * public `ReactionHandle` contract; the `__activate` / `__dispose` methods are
 * called from a `useLayoutEffect` and its cleanup.
 *
 * Design:
 *  - The proxy identity is stable across re-renders (created once per
 *    reaction field via `useMemo`).
 *  - Before first `__activate`, and between `__dispose` and a subsequent
 *    `__activate` (StrictMode re-mount window), method calls are buffered in
 *    `pendingCalls`. `dispatch()` returns a Promise that resolves when the
 *    call drains on the next `__activate`; `force`/`ready`/`pause`/`resume`
 *    are buffered silently.
 *  - `__dispose` resolves any buffered Promises to a canonical cancelled
 *    result (per ZZ Bug 1 fix), disposes the underlying realHandle, and
 *    clears the buffer. New calls after dispose are buffered for the next
 *    activation (StrictMode re-mount).
 */
export interface ReactionHandleProxy extends ReactionHandle {
  __activate(register: () => ReactionHandle): void;
  __dispose(): void;
  /**
   * Register a bindings provider from the renderer (e.g. CRUD's
   * evaluationBindings). The provider is passed to the real handle on
   * activation so that reactive/force triggers inject renderer context
   * into the action's evaluationBindings.
   */
  __setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void;
}

const DEFAULT_DEBUG_STATE: ReactionHandleDebugState = {
  phase: 'initial-paused',
  fireCount: 0,
  pauseCount: 0,
  pendingChange: false,
  pendingChangedPaths: [],
  disposed: false,
};

function noop(): void {
  /* no-op */
}

export function createReactionHandleProxy(): ReactionHandleProxy {
  let realHandle: ReactionHandle | undefined;
  let pendingCalls: PendingCall[] = [];
  let bindingsProvider: (() => Record<string, unknown>) | undefined;

  function bufferVoid(method: ReactionHandleMethod, args: unknown[]): void {
    pendingCalls.push({ method, args, resolve: noop, reject: noop });
  }

  function bufferPromise(method: 'dispatch', args: unknown[]): Promise<{ ok: boolean }> {
    return new Promise((resolve, reject) => {
      pendingCalls.push({
        method,
        args,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: unknown) => void,
      });
    });
  }

  function drainPending(handle: ReactionHandle): void {
    const calls = pendingCalls;
    pendingCalls = [];
    for (const call of calls) {
      const method = call.method as keyof Pick<
        ReactionHandle,
        'dispatch' | 'force' | 'ready' | 'pause' | 'resume'
      >;
      const result = (handle[method] as (...args: unknown[]) => unknown)(...call.args);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).then(call.resolve, call.reject);
      } else {
        call.resolve(undefined);
      }
    }
  }

  const proxy: ReactionHandleProxy = {
    dispatch(ctx) {
      if (realHandle) {
        return realHandle.dispatch(ctx);
      }
      return bufferPromise('dispatch', [ctx]);
    },
    force(paths) {
      if (realHandle) {
        realHandle.force(paths);
        return;
      }
      bufferVoid('force', [paths]);
    },
    ready() {
      if (realHandle) {
        realHandle.ready();
        return;
      }
      bufferVoid('ready', []);
    },
    pause() {
      if (realHandle) {
        realHandle.pause();
        return;
      }
      bufferVoid('pause', []);
    },
    resume() {
      if (realHandle) {
        realHandle.resume();
        return;
      }
      bufferVoid('resume', []);
    },
    dispose() {
      // Public dispose mirrors internal __dispose for callers that want to
      // tear down eagerly. Idempotent: useLayoutEffect cleanup may call this
      // again afterwards without harm.
      proxy.__dispose();
    },
    getDebugState() {
      return realHandle ? realHandle.getDebugState() : { ...DEFAULT_DEBUG_STATE };
    },
    __activate(register) {
      realHandle = register();
      // Propagate bindings provider to the real handle so reactive/force
      // triggers inject renderer context into evaluationBindings.
      if (bindingsProvider) {
        const handleWithSetter = realHandle as ReactionHandle & {
          _setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void;
        };
        handleWithSetter._setBindingsProvider?.(bindingsProvider);
      }
      drainPending(realHandle);
    },
    __dispose() {
      for (const call of pendingCalls) {
        if (call.method === 'dispatch') {
          call.resolve({ ok: false, cancelled: true });
        } else {
          call.resolve(undefined);
        }
      }
      pendingCalls = [];
      realHandle?.dispose();
      realHandle = undefined;
    },
    __setBindingsProvider(fn) {
      bindingsProvider = fn;
      if (realHandle) {
        const handleWithSetter = realHandle as ReactionHandle & {
          _setBindingsProvider?(provider: (() => Record<string, unknown>) | undefined): void;
        };
        handleWithSetter._setBindingsProvider?.(fn);
      }
    },
  };

  return proxy;
}

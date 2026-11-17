import type {
  EvalTrace,
  RenderSpan,
  RendererPlugin,
  ScopeRef,
  ScopeStore,
  StabilityTracker,
  StoreWriteObserver,
} from '@nop-chaos/flux-core';
import { createStabilityTracker } from './stability-tracker.js';
import { registerStoreWriteObserver } from './scope.js';

interface RuntimeDebugInstrumentation {
  stabilityTracker: StabilityTracker;
  liveScopeStores: Map<string, ScopeStore<Record<string, any>>>;
  registerScopeStore(scopeId: string, store: ScopeStore<Record<string, any>>): void;
  unregisterScopeStore(scopeId: string): void;
  getLiveScopeIds(): string[];
  registerStoreWriteObserver(observer: StoreWriteObserver): () => void;
  resolveNodePropsWithSpan<F extends (node: any, scope: any, state?: any) => unknown>(base: F): F;
  evaluateWithSampling<F extends (target: unknown, scope: ScopeRef) => unknown>(base: F): F;
  getActionRootScope(): ScopeRef;
}

export function createRuntimeDebugInstrumentation(input: {
  plugins: readonly RendererPlugin[];
  actionRootScope: ScopeRef;
  debugExpressionSamplingRate?: number;
  debugScopeDebounceMs?: number;
}): RuntimeDebugInstrumentation {
  const { plugins } = input;
  const stabilityTracker = createStabilityTracker({ scopeDebounceMs: input.debugScopeDebounceMs });
  const liveScopeStores = new Map<string, ScopeStore<Record<string, any>>>();
  if (input.actionRootScope.store) {
    liveScopeStores.set(input.actionRootScope.id, input.actionRootScope.store);
  }

  return {
    stabilityTracker,
    liveScopeStores,
    registerScopeStore(scopeId, store) {
      liveScopeStores.set(scopeId, store);
    },
    unregisterScopeStore(scopeId) {
      liveScopeStores.delete(scopeId);
    },
    getLiveScopeIds() {
      return [...liveScopeStores.keys()];
    },
    registerStoreWriteObserver(observer) {
      return registerStoreWriteObserver(observer);
    },
    resolveNodePropsWithSpan<F extends (node: { id?: string }, scope: ScopeRef, state?: unknown) => unknown>(base: F): F {
      if (!plugins.some((plugin) => plugin.onRender)) {
        return base;
      }
      return ((node: { id?: string }, scope: ScopeRef, state?: unknown) => {
        const startedAt = performance.now();
        try {
          return base(node, scope, state);
        } finally {
          const span: RenderSpan = {
            nodeId: node?.id,
            phase: 'resolve',
            durationMs: performance.now() - startedAt,
          };
          for (const plugin of plugins) {
            plugin.onRender?.(span);
          }
        }
      }) as F;
    },
    evaluateWithSampling<F extends (target: unknown, scope: ScopeRef) => unknown>(base: F): F {
      const rate = input.debugExpressionSamplingRate ?? 0;
      if (rate <= 0 || !plugins.some((plugin) => plugin.onExpressionEval)) {
        return base;
      }
      return ((target: unknown, scope: ScopeRef) => {
        if (Math.random() >= rate) {
          return base(target, scope);
        }
        try {
          return base(target, scope);
        } finally {
          const trace: EvalTrace = {
            expressionSource: typeof target === 'string' ? target : String(target),
          };
          for (const plugin of plugins) {
            plugin.onExpressionEval?.(trace);
          }
        }
      }) as F;
    },
    getActionRootScope() {
      return input.actionRootScope;
    },
  };
}

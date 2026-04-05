import type {
  ActionSchema,
  CompiledRuntimeValue,
  DynamicRuntimeValue,
  RendererHelpers,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef
} from '@nop-chaos/flux-core';
import { collectRuntimeDependencies } from './node-runtime';
import { scopeChangeHitsDependencies } from './scope-change';

export interface ReactionRegistration {
  id: string;
  dispose(): void;
}

const MAX_REACTION_CASCADE_DEPTH = 10;

function normalizeActionArray(actions: unknown): ActionSchema | ActionSchema[] {
  return actions as ActionSchema | ActionSchema[];
}

export function registerReaction(input: {
  id: string;
  runtime: RendererRuntime;
  scope: ScopeRef;
  watch: unknown;
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  actions: unknown;
  helpers: Pick<RendererHelpers, 'dispatch'>;
}): ReactionRegistration {
  const compiledWatch = input.runtime.expressionCompiler.compileValue(input.watch);
  const dynamicWatch = compiledWatch.isStatic ? undefined : compiledWatch as DynamicRuntimeValue<unknown>;
  const watchState: RuntimeValueState<unknown> | undefined = dynamicWatch?.createState();
  const compiledWhen = input.when
    ? input.runtime.expressionCompiler.formulaCompiler.compileExpression<boolean>(input.when)
    : undefined;

  let disposed = false;
  let initialized = false;
  let previousValue: unknown;
  let dependencies: ScopeDependencySet | undefined;
  let triggerQueued = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let fireCount = 0;
  let pendingForce = false;
  let pendingChangedPaths = new Set<string>();
  let cascadeDepth = 0;

  function evaluateWatchValue() {
    const value = dynamicWatch
      ? input.runtime.expressionCompiler.evaluateWithState(dynamicWatch, input.scope, input.runtime.env, watchState!).value
      : (compiledWatch as CompiledRuntimeValue<unknown> & { value: unknown }).value;

    dependencies = collectRuntimeDependencies(watchState);
    return value;
  }

  async function runReaction(changePaths: readonly string[], force = false) {
    if (disposed) {
      return;
    }

    const nextValue = evaluateWatchValue();
    const changed = force || !initialized || !Object.is(previousValue, nextValue);
    const prev = previousValue;

    previousValue = nextValue;
    initialized = true;

    if (!changed) {
      return;
    }

    const whenAllowed = compiledWhen
      ? compiledWhen.exec({
          scope: input.scope.read(),
          value: nextValue,
          prev,
          changed,
          changedPaths: changePaths
        }, input.runtime.env)
      : true;

    if (!whenAllowed) {
      return;
    }

    await input.helpers.dispatch(normalizeActionArray(input.actions), {
      scope: input.scope,
      event: {
        value: nextValue,
        prev,
        changed,
        changedPaths: changePaths
      }
    });

    fireCount += 1;

    if (input.once && fireCount >= 1) {
      dispose();
    }
  }

  function scheduleReaction(changePaths: readonly string[], force = false) {
    if (disposed || triggerQueued) {
      for (const path of changePaths) {
        pendingChangedPaths.add(path);
      }
      pendingForce = pendingForce || force;
      return;
    }

    for (const path of changePaths) {
      pendingChangedPaths.add(path);
    }
    pendingForce = pendingForce || force;
    triggerQueued = true;
    const invoke = () => {
      triggerQueued = false;
      const nextChangedPaths = Array.from(pendingChangedPaths);
      const nextForce = pendingForce;
      pendingChangedPaths = new Set<string>();
      pendingForce = false;

      if (cascadeDepth >= MAX_REACTION_CASCADE_DEPTH) {
        return;
      }

      if (input.debounce && input.debounce > 0) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          debounceTimer = undefined;
          cascadeDepth += 1;
          void runReaction(nextChangedPaths, nextForce).finally(() => {
            cascadeDepth = Math.max(0, cascadeDepth - 1);
          });
        }, input.debounce);
        return;
      }

      cascadeDepth += 1;
      void runReaction(nextChangedPaths, nextForce).finally(() => {
        cascadeDepth = Math.max(0, cascadeDepth - 1);
      });
    };

    void Promise.resolve().then(invoke);
  }

  function dispose() {
    if (disposed) {
      return;
    }

    disposed = true;
    unsubscribe?.();

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  }

  const initialValue = evaluateWatchValue();
  previousValue = initialValue;
  initialized = true;

  if (input.immediate) {
    scheduleReaction([], true);
  }

  const unsubscribe = input.scope.store?.subscribe((change) => {
    if (disposed) {
      return;
    }

    if (!scopeChangeHitsDependencies(change, dependencies)) {
      return;
    }

    scheduleReaction(change.paths);
  });

  return {
    id: input.id,
    dispose
  };
}

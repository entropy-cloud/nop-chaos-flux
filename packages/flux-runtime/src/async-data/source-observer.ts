import type {
  ActionResult,
  AnonymousSourceEntry,
  RendererRuntime,
  ScopeRef,
  SourceObserver,
  SourceObserverSnapshot,
  SourceTransientState,
} from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';

function sameInputs(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

function buildLoadingState(): SourceTransientState {
  return { loading: true, error: undefined, status: 'loading' };
}

function buildResultState(result: ActionResult): SourceTransientState {
  return {
    loading: false,
    error: result.ok ? undefined : result.error,
    status: result.ok ? 'ready' : 'error',
  };
}

export function createSourceObserver(runtime: RendererRuntime): SourceObserver {
  let currentSnapshot: SourceObserverSnapshot = { value: {} };
  let currentInputs: readonly unknown[] = [];
  let currentController: AbortController | undefined;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function updateSnapshot(nextValue: Readonly<Record<string, unknown>>, nextInputs: readonly unknown[]) {
    if (!sameInputs(currentInputs, nextInputs) || !shallowEqual(currentSnapshot.value, nextValue)) {
      currentInputs = nextInputs;
      currentSnapshot = { value: nextValue };
      notify();
    }
  }

  function run(input: {
    scope: ScopeRef;
    entries: readonly AnonymousSourceEntry[];
    baseValue?: Readonly<Record<string, unknown>>;
  }) {
    const baseValue = input.baseValue ?? {};
    const nextInputs = input.entries.map((entry) => entry.source);

    currentController?.abort();
    currentController = undefined;

    if (input.entries.length === 0) {
      updateSnapshot(baseValue, nextInputs);
      return;
    }

    const controller = new AbortController();
    currentController = controller;

    const loadingPatch = Object.fromEntries(
      input.entries.flatMap((entry) =>
        entry.stateKey ? [[entry.stateKey, buildLoadingState()] satisfies [string, SourceTransientState]] : [],
      ),
    );
    updateSnapshot({ ...baseValue, ...loadingPatch }, nextInputs);

    void Promise.allSettled(
      input.entries.map(async (entry) => {
        const result = await runtime.executeSource({
          source: entry.source,
          scope: input.scope,
          ctx: { signal: controller.signal },
        });
        return [entry, result] as const;
      }),
    ).then((settled) => {
      if (controller.signal.aborted) {
        return;
      }

      const valuePatch: Record<string, unknown> = {};
      const transientPatch: Record<string, SourceTransientState> = {};

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const [entry, actionResult] = result.value;
          valuePatch[entry.key] = actionResult.ok ? actionResult.data : undefined;
          if (entry.stateKey) {
            transientPatch[entry.stateKey] = buildResultState(actionResult);
          }
          continue;
        }

        const error = result.reason;
        for (const entry of input.entries) {
          if (!(entry.key in valuePatch)) {
            valuePatch[entry.key] = undefined;
          }
          if (entry.stateKey && !(entry.stateKey in transientPatch)) {
            transientPatch[entry.stateKey] = { loading: false, error, status: 'error' };
          }
        }
      }

      updateSnapshot({ ...baseValue, ...valuePatch, ...transientPatch }, nextInputs);
    });
  }

  return {
    getSnapshot() {
      return currentSnapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    run,
    dispose() {
      currentController?.abort();
      currentController = undefined;
      listeners.clear();
    },
  };
}

import type {
  ActionResult,
  RendererRuntime,
  ScopeRef,
  SourceSchema,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import { isSourceSchema } from './use-source-value';

export interface SourceTransientState {
  loading: boolean;
  error: unknown;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

interface SourceEntry {
  key: string;
  source: SourceSchema;
}

interface ControllerSnapshot {
  sourceInputs: readonly unknown[];
  value: Readonly<Record<string, unknown>>;
}

function buildLoadingPatch(
  entries: readonly SourceEntry[],
  sourceStatePropKeys: Readonly<Record<string, string>>,
): Record<string, SourceTransientState> {
  return Object.fromEntries(
    entries.flatMap((entry) => {
      const stateKey = sourceStatePropKeys[entry.key];
      if (!stateKey) return [];
      return [[stateKey, { loading: true, error: undefined, status: 'loading' as const }]];
    }),
  );
}

function sameInputs(left: readonly unknown[], right: readonly unknown[]) {
  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  );
}

export interface NodeSourcePropController {
  getSnapshot(): ControllerSnapshot;
  subscribe(listener: () => void): () => void;
  run(propsValue: Readonly<Record<string, unknown>>, scope: ScopeRef): void;
  dispose(): void;
}

export function createNodeSourcePropController(
  node: TemplateNode,
  runtime: RendererRuntime,
): NodeSourcePropController {
  const sourcePropKeys = node.sourcePropKeys;
  const sourceStatePropKeys = node.sourceStatePropKeys;

  let currentSnapshot: ControllerSnapshot = {
    sourceInputs: [],
    value: {},
  };
  const listeners = new Set<() => void>();
  let currentController: AbortController | undefined;

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function run(propsValue: Readonly<Record<string, unknown>>, scope: ScopeRef) {
    const sourceEntries = sourcePropKeys
      .map((key) => ({ key, source: propsValue[key] }))
      .filter((entry): entry is SourceEntry => isSourceSchema(entry.source));

    const sourceInputs = sourcePropKeys.map((key) => propsValue[key]);

    if (sourceEntries.length === 0) {
      currentController?.abort();
      currentController = undefined;
      const next = { sourceInputs, value: propsValue };
      if (
        !sameInputs(currentSnapshot.sourceInputs, sourceInputs) ||
        !shallowEqual(currentSnapshot.value, propsValue)
      ) {
        currentSnapshot = next;
        notify();
      }
      return;
    }

    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;

    const loadingPatch = buildLoadingPatch(sourceEntries, sourceStatePropKeys);
    const loadingValue = { ...propsValue, ...loadingPatch };
    currentSnapshot = { sourceInputs, value: loadingValue };
    notify();

    void Promise.allSettled(
      sourceEntries.map(async (entry) => {
        const result: ActionResult = await runtime.executeSource({
          source: entry.source,
          scope,
          ctx: { signal: controller.signal },
        });
        return [entry, result] as const;
      }),
    ).then((settled) => {
      if (controller.signal.aborted) return;

      const valuePatch: Record<string, unknown> = {};
      const transientPatch: Record<string, SourceTransientState> = {};

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const [entry, actionResult] = result.value;
          valuePatch[entry.key] = actionResult.ok ? actionResult.data : undefined;
          const stateKey = sourceStatePropKeys[entry.key];
          if (stateKey) {
            transientPatch[stateKey] = {
              loading: false,
              error: actionResult.ok ? undefined : actionResult.error,
              status: actionResult.ok ? 'ready' : 'error',
            };
          }
        } else {
          const error = result.reason;
          for (const entry of sourceEntries) {
            if (!(entry.key in valuePatch)) {
              valuePatch[entry.key] = undefined;
            }
            const stateKey = sourceStatePropKeys[entry.key];
            if (stateKey && !(stateKey in transientPatch)) {
              transientPatch[stateKey] = { loading: false, error, status: 'error' };
            }
          }
        }
      }

      const nextValue = { ...propsValue, ...valuePatch, ...transientPatch };
      const next: ControllerSnapshot = { sourceInputs, value: nextValue };

      if (
        !sameInputs(currentSnapshot.sourceInputs, sourceInputs) ||
        !shallowEqual(currentSnapshot.value, nextValue)
      ) {
        currentSnapshot = next;
        notify();
      }
    });
  }

  function dispose() {
    currentController?.abort();
    currentController = undefined;
    listeners.clear();
  }

  return {
    getSnapshot: () => currentSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    run,
    dispose,
  };
}

import type {
  RendererRuntime,
  ResolvedNodeProps,
  ScopeRef,
  SourceObserver,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { setIn, shallowEqual, type SourceTransientState } from '@nop-chaos/flux-core';
import { isSourceSchema } from './use-source-value.js';

function sameInputs(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

function buildLoadingPatch(
  entries: ReadonlyArray<{ key: string; stateKey?: string }>,
): Record<string, SourceTransientState> {
  return Object.fromEntries(
    entries.flatMap((entry) =>
      entry.stateKey
        ? [[entry.stateKey, { loading: true, error: undefined, status: 'loading' } satisfies SourceTransientState]]
        : [],
    ),
  );
}

interface ControllerSnapshot {
  sourceInputs: readonly unknown[];
  value: ResolvedNodeProps['value'];
}

interface ResolvedSourceEntry {
  key: string;
  source: import('@nop-chaos/flux-core').SourceSchema;
  stateKey?: string;
  targetPath: string;
}

function createSyntheticSourceKey(path: string) {
  return `__source:${path}`;
}

function collectNestedSourceEntries(
  value: unknown,
  path: string,
  entries: ResolvedSourceEntry[],
) {
  if (isSourceSchema(value)) {
    entries.push({
      key: createSyntheticSourceKey(path),
      source: value,
      targetPath: path,
    });
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectNestedSourceEntries(value[index], `${path}.${index}`, entries);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    collectNestedSourceEntries(child, `${path}.${key}`, entries);
  }
}

function collectSourceEntries(
  propsValue: ResolvedNodeProps['value'],
  sourcePropKeys: readonly string[],
  sourceStatePropKeys: Readonly<Record<string, string>>,
): ResolvedSourceEntry[] {
  const entries: ResolvedSourceEntry[] = sourcePropKeys.flatMap((key) => {
    const source = propsValue[key];
    if (!isSourceSchema(source)) {
      return [];
    }
    return [
      {
        key,
        source,
        stateKey: sourceStatePropKeys[key],
        targetPath: key,
      },
    ];
  });

  const topLevelSourceKeys = new Set(entries.map((entry) => entry.key));
  for (const [key, value] of Object.entries(propsValue)) {
    if (topLevelSourceKeys.has(key)) {
      continue;
    }
    collectNestedSourceEntries(value, key, entries);
  }

  return entries;
}

function sanitizeSourceInputs(
  propsValue: ResolvedNodeProps['value'],
  entries: readonly ResolvedSourceEntry[],
): ResolvedNodeProps['value'] {
  let nextValue = propsValue;
  for (const entry of entries) {
    nextValue = setIn(nextValue, entry.targetPath, undefined);
  }
  return nextValue;
}

function materializeResolvedSources(
  value: ResolvedNodeProps['value'],
  entries: readonly ResolvedSourceEntry[],
): ResolvedNodeProps['value'] {
  let nextValue = value;
  let cleanedValue: Record<string, unknown> | undefined;

  for (const entry of entries) {
    if (entry.key in nextValue) {
      nextValue = setIn(nextValue, entry.targetPath, nextValue[entry.key]);
    }
    if (entry.key !== entry.targetPath && entry.key in nextValue) {
      const nextCleanedValue = cleanedValue ?? { ...nextValue };
      delete nextCleanedValue[entry.key];
      cleanedValue = nextCleanedValue;
      nextValue = nextCleanedValue;
    }
  }

  return nextValue;
}

export interface NodeSourcePropController {
  getSnapshot(): ControllerSnapshot;
  subscribe(listener: () => void): () => void;
  run(propsValue: ResolvedNodeProps['value'], scope: ScopeRef): void;
  dispose(): void;
}

export function createNodeSourcePropController(
  node: TemplateNode,
  runtime: RendererRuntime,
): NodeSourcePropController {
  const sourcePropKeys = node.sourcePropKeys;
  const sourceStatePropKeys = node.sourceStatePropKeys;
  const observer: SourceObserver = runtime.createSourceObserver();
  let currentEntries: readonly ResolvedSourceEntry[] = [];

  let currentSnapshot: ControllerSnapshot = {
    sourceInputs: [],
      value: observer.getSnapshot().value as ResolvedNodeProps['value'],
  };

  let cachedObserverSnapshot: unknown;
  let cachedMaterializedValue: ResolvedNodeProps['value'] | undefined;

  function resolveMaterializedValue(): ResolvedNodeProps['value'] {
    const observerSnapshot = observer.getSnapshot();
    if (observerSnapshot !== cachedObserverSnapshot) {
      cachedObserverSnapshot = observerSnapshot;
      cachedMaterializedValue = materializeResolvedSources(
        observerSnapshot.value as ResolvedNodeProps['value'],
        currentEntries,
      );
    }
    return cachedMaterializedValue ?? {};
  }

  function updateSnapshot(nextSnapshot: ControllerSnapshot) {
    if (
      sameInputs(currentSnapshot.sourceInputs, nextSnapshot.sourceInputs) &&
      shallowEqual(currentSnapshot.value, nextSnapshot.value)
    ) {
      return false;
    }
    currentSnapshot = nextSnapshot;
    return true;
  }

  function run(propsValue: ResolvedNodeProps['value'], scope: ScopeRef) {
    const sourceEntries = collectSourceEntries(propsValue, sourcePropKeys, sourceStatePropKeys);
    currentEntries = sourceEntries;
    cachedObserverSnapshot = undefined;
    cachedMaterializedValue = undefined;
    const sourceInputs = sourceEntries.map((entry) => entry.source);
    const baseValue = sanitizeSourceInputs(propsValue, sourceEntries);
    const loadingValue = materializeResolvedSources(
      sourceEntries.length > 0 ? { ...baseValue, ...buildLoadingPatch(sourceEntries) } : baseValue,
      sourceEntries,
    );
    updateSnapshot({
      sourceInputs,
      value: loadingValue,
    });

    observer.run({
      scope,
      entries: sourceEntries,
      baseValue,
    });
  }

  function dispose() {
    observer.dispose();
  }

  return {
    getSnapshot: () => {
      const resolvedValue = resolveMaterializedValue();
      updateSnapshot({
        sourceInputs: currentSnapshot.sourceInputs,
        value: resolvedValue,
      });
      return currentSnapshot;
    },
    subscribe(listener) {
      return observer.subscribe(() => {
        const resolvedValue = resolveMaterializedValue();
        const changed = updateSnapshot({
          sourceInputs: currentSnapshot.sourceInputs,
          value: resolvedValue,
        });
        if (changed) {
          listener();
        }
      });
    },
    run,
    dispose,
  };
}

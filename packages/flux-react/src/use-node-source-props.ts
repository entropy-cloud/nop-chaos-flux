import { useEffect, useMemo, useState } from 'react';
import type { ActionResult, TemplateNode, ScopeRef, SourceSchema } from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import { useRendererRuntime } from './hooks';
import { isSourceSchema } from './useSourceValue';

export interface SourceTransientState {
  loading: boolean;
  error: unknown;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

interface SourceEntry {
  key: string;
  source: SourceSchema;
}

interface SourceResolutionState {
  sourceInputs: readonly unknown[];
  value: Readonly<Record<string, unknown>>;
}

function sameInputs(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

function buildStatePatch(
  entries: readonly SourceEntry[],
  sourceStatePropKeys: Readonly<Record<string, string>>,
  valueFactory: (entry: SourceEntry) => SourceTransientState
) {
  return Object.fromEntries(
    entries.flatMap((entry) => {
      const stateKey = sourceStatePropKeys[entry.key];

      if (!stateKey) {
        return [];
      }

      return [[stateKey, valueFactory(entry)] as const];
    })
  );
}

export function useNodeSourceProps(
  node: TemplateNode,
  propsValue: Readonly<Record<string, unknown>>,
  scope: ScopeRef
): Readonly<Record<string, unknown>> {
  const runtime = useRendererRuntime();
  const sourcePropKeys = node.sourcePropKeys;
  const sourceStatePropKeys = node.sourceStatePropKeys;
  const sourceEntries = useMemo(
    () => sourcePropKeys
      .map((key) => ({ key, source: propsValue[key] }))
      .filter((entry): entry is SourceEntry => isSourceSchema(entry.source)),
    [propsValue, sourcePropKeys]
  );
  const sourceInputs = useMemo(
    () => sourcePropKeys.map((key) => propsValue[key]),
    [propsValue, sourcePropKeys]
  );
  const loadingStatePatch = useMemo(
    () => buildStatePatch(sourceEntries, sourceStatePropKeys, () => ({
      loading: true,
      error: undefined,
      status: 'loading'
    })),
    [sourceEntries, sourceStatePropKeys]
  );
  const currentValue = useMemo(
    () => sourceEntries.length === 0
      ? propsValue
      : { ...propsValue, ...loadingStatePatch },
    [loadingStatePatch, propsValue, sourceEntries.length]
  );
  const [state, setState] = useState<SourceResolutionState>({
    sourceInputs,
    value: currentValue
  });

  useEffect(() => {
    if (sourceEntries.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      sourceEntries.map(async (entry) => {
        const result: ActionResult = await runtime.executeSource({ source: entry.source, scope });
        return [entry, result] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      const valuePatch = Object.fromEntries(entries.map(([entry, result]) => [entry.key, result.ok ? result.data : undefined]));
      const transientPatch = Object.fromEntries(
        entries.flatMap(([entry, result]) => {
          const stateKey = sourceStatePropKeys[entry.key];

          if (!stateKey) {
            return [];
          }

          return [[stateKey, {
            loading: false,
            error: result.ok ? undefined : result.error,
            status: result.ok ? 'ready' : 'error'
          } satisfies SourceTransientState] as const];
        })
      );
      const nextValue = { ...propsValue, ...valuePatch, ...transientPatch };

      setState((previous) => {
        if (sameInputs(previous.sourceInputs, sourceInputs) && shallowEqual(previous.value, nextValue)) {
          return previous;
        }

        return {
          sourceInputs,
          value: nextValue
        };
      });
    }).catch((error) => {
      if (cancelled) {
        return;
      }

      const errorPatch = buildStatePatch(sourceEntries, sourceStatePropKeys, () => ({
        loading: false,
        error,
        status: 'error'
      }));

      setState({
        sourceInputs,
        value: { ...propsValue, ...errorPatch }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [currentValue, propsValue, runtime, scope, sourceEntries, sourceInputs, sourceStatePropKeys]);

  if (sourceEntries.length === 0) {
    return propsValue;
  }

  if (!sameInputs(state.sourceInputs, sourceInputs)) {
    return currentValue;
  }

  return state.value;
}

import { useEffect, useMemo, useState } from 'react';
import type { ActionResult, ScopeRef, SourceSchema } from '@nop-chaos/flux-core';
import { useRenderScope, useRendererRuntime } from './hooks';

export function isSourceSchema(value: unknown): value is SourceSchema {
  return Boolean(value) && typeof value === 'object' && (value as { type?: unknown }).type === 'source';
}

export interface SourceValueState<T> {
  loading: boolean;
  value: T | undefined;
  error: unknown;
}

interface ResolvedSourceState<T> {
  source?: SourceSchema;
  value: T | undefined;
  error: unknown;
}

export function useSourceValue<T>(input: unknown, options?: { scope?: ScopeRef }): SourceValueState<T> {
  const runtime = useRendererRuntime();
  const activeScope = useRenderScope();
  const scope = options?.scope ?? activeScope;
  const source = useMemo(() => (isSourceSchema(input) ? input : undefined), [input]);
  const [state, setState] = useState<ResolvedSourceState<T>>({
    source: undefined,
    value: source ? undefined : (input as T | undefined),
    error: undefined
  });

  useEffect(() => {
    let cancelled = false;

    if (!source) {
      return;
    }

    void runtime.executeSource({ source, scope })
      .then((result: ActionResult) => {
        if (cancelled) {
          return;
        }

        setState({
          source,
          value: result.data as T | undefined,
          error: result.ok ? undefined : result.error
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState({ source, value: undefined, error });
      });

    return () => {
      cancelled = true;
    };
  }, [input, runtime, scope, source]);

  if (!source) {
    return {
      loading: false,
      value: input as T | undefined,
      error: undefined
    };
  }

  if (state.source !== source) {
    return {
      loading: true,
      value: undefined,
      error: undefined
    };
  }

  return {
    loading: false,
    value: state.value,
    error: state.error
  };
}

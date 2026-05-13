import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ScopeRef, SourceObserver, SourceSchema } from '@nop-chaos/flux-core';
import { useRenderScope, useRendererRuntime } from './hooks.js';

export function isSourceSchema(value: unknown): value is SourceSchema {
  return (
    Boolean(value) && typeof value === 'object' && (value as { type?: unknown }).type === 'source'
  );
}

export interface SourceValueState<T> {
  loading: boolean;
  value: T | undefined;
  error: unknown;
}

export function useSourceValue<T>(
  input: unknown,
  options?: { scope?: ScopeRef },
): SourceValueState<T> {
  const runtime = useRendererRuntime();
  const activeScope = useRenderScope();
  const scope = options?.scope ?? activeScope;
  const source = useMemo(() => (isSourceSchema(input) ? input : undefined), [input]);
  const observer = useMemo<SourceObserver>(() => runtime.createSourceObserver(), [runtime]);
  const snapshot = useSyncExternalStore(observer.subscribe, observer.getSnapshot, observer.getSnapshot);

  useEffect(() => {
    if (!source) {
      observer.run({ scope, entries: [], baseValue: { value: input as T | undefined } });
      return;
    }

    observer.run({
      scope,
      entries: [{ key: 'value', source, stateKey: 'sourceState' }],
      baseValue: {},
    });
  }, [input, observer, scope, source]);

  useEffect(() => {
    return () => {
      observer.dispose();
    };
  }, [observer]);

  if (!source) {
    return {
      loading: false,
      value: input as T | undefined,
      error: undefined,
    };
  }

  const sourceState = snapshot.value.sourceState as
    | { loading: boolean; error: unknown; status: 'idle' | 'loading' | 'ready' | 'error' }
    | undefined;

  return {
    loading: sourceState?.loading ?? true,
    value: snapshot.value.value as T | undefined,
    error: sourceState?.error,
  };
}

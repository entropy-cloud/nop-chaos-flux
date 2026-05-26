import { useCallback, useContext, useMemo } from 'react';
import type {
  DataSourceStatusSummary,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn, parsePath } from '@nop-chaos/flux-core';
import {
  FormLayoutContext,
  type FormLayoutContextValue,
} from './contexts.js';
import {
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentImportFrame,
  useCurrentNodeInstance,
  useCurrentNodeMeta,
  useCurrentPage,
  useRenderInstancePath,
  useCurrentSurfaceRuntime,
  useStructuralLoopContext,
} from './context-hooks.js';
import { useRenderScopeContext, useRendererRuntimeContext } from './runtime-context-hooks.js';
export {
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentImportFrame,
  useCurrentNodeInstance,
  useCurrentNodeMeta,
  useCurrentPage,
  useRenderInstancePath,
  useCurrentSurfaceRuntime,
  useStructuralLoopContext,
} from './context-hooks.js';
import {
  createFormModelGenerationSubscribe,
  createScopeSubscribe,
  createScopeOwnSubscribe,
  emptyUnsubscribe,
} from './hook-subscriptions.js';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';
import {
  useCurrentForm,
  useCurrentValidationScope,
  useCurrentFormState,
  useCurrentValidationValues,
  useCurrentFormErrors,
  useCurrentFormError,
  useCurrentFormFieldState,
  useValidationNodeState,
  useFieldError,
  useOwnedFieldState,
  useChildFieldState,
  useAggregateError,
} from './hooks/use-form-hooks.js';

export {
  useCurrentForm,
  useCurrentValidationScope,
  useCurrentFormState,
  useCurrentValidationValues,
  useCurrentFormErrors,
  useCurrentFormError,
  useCurrentFormFieldState,
  useValidationNodeState,
  useFieldError,
  useOwnedFieldState,
  useChildFieldState,
  useAggregateError,
} from './hooks/use-form-hooks.js';

export function useRendererRuntime(): RendererRuntime {
  return useRendererRuntimeContext();
}

export function useRenderScope(): ScopeRef {
  return useRenderScopeContext();
}

export function useRendererEnv() {
  return useRendererRuntime().env;
}

export function useScopeSelector<T, S = Record<string, unknown>>(
  selector: (scopeData: S) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
  options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] },
): T {
  const scope = useRenderScope();
  const enabled = options?.enabled !== false;
  const pathsKey =
    options?.paths && options.paths.length > 0
      ? Array.from(
          new Set(
            options.paths
              .map((path) => parsePath(path.trim()).join('.'))
              .filter((path) => path.length > 0),
          ),
        )
          .sort()
          .join('\u0000') || undefined
      : undefined;
  const subscribe = useMemo(
    () =>
      enabled
        ? createScopeSubscribe(scope, pathsKey ? pathsKey.split('\u0000') : undefined)
        : () => emptyUnsubscribe,
    [enabled, pathsKey, scope],
  );
  const getSnapshot = useMemo(
    () =>
      enabled
        ? () => (scope.store?.getSnapshot() ?? scope.readVisible()) as unknown as S
        : () => undefined as unknown as S,
    [enabled, scope],
  );
  const fallbackSelector = useCallback(() => options?.fallback as T, [options?.fallback]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    enabled ? selector : fallbackSelector,
    equalityFn,
  );
}

export function useOwnScopeSelector<T, S = Record<string, unknown>>(
  selector: (scopeData: S) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
  const scope = useRenderScope();
  const subscribe = useMemo(() => createScopeOwnSubscribe(scope), [scope]);
  const getSnapshot = useCallback(() => scope.readOwn() as unknown as S, [scope]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    selector,
    equalityFn,
  );
}

export function useDataSourceStatus(
  path: string,
  options?: { enabled?: boolean },
): DataSourceStatusSummary | undefined {
  return useScopeSelector(
    (scopeData: Record<string, unknown>) => {
      if (!path) {
        return undefined;
      }

      return getIn(scopeData, path) as DataSourceStatusSummary | undefined;
    },
    Object.is,
    { enabled: options?.enabled !== false, fallback: undefined, paths: path ? [path] : undefined },
  );
}

export function useActionDispatcher() {
  return useRendererRuntime().dispatch;
}

export function useCurrentFormModelGeneration(): number {
  const form = useCurrentForm();
  const validationScope = useCurrentValidationScope();
  const owner = form ?? validationScope;
  const subscribe = useMemo(() => createFormModelGenerationSubscribe(owner), [owner]);
  const getSnapshot = useMemo(() => () => owner?.modelGeneration ?? 0, [owner]);

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, (n) => n, Object.is);
}

export function useFormLayout(): FormLayoutContextValue {
  return useContext(FormLayoutContext) ?? {};
}

export function useStrictMode(): boolean {
  return useRendererRuntime().strictMode;
}

export const rendererHooks = {
  useRendererRuntime,
  useRenderScope,
  useRenderInstancePath,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentImportFrame,
  useScopeSelector,
  useOwnScopeSelector,
  useRendererEnv,
  useActionDispatcher,
  useCurrentForm,
  useCurrentValidationScope,
  useCurrentFormState,
  useCurrentValidationValues,
  useCurrentFormErrors,
  useCurrentFormError,
  useCurrentFormFieldState,
  useValidationNodeState,
  useFieldError,
  useDataSourceStatus,
  useOwnedFieldState,
  useChildFieldState,
  useAggregateError,
  useCurrentPage,
  useCurrentSurfaceRuntime,
  useCurrentNodeMeta,
  useCurrentNodeInstance,
  useStructuralLoopContext,
  useCurrentFormModelGeneration,
  useFormLayout,
  useStrictMode,
};

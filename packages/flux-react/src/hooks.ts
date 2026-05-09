import { useCallback, useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionScope,
  ComponentHandleRegistry,
  DataSourceStatusSummary,
  ImportFrame,
  PageRuntime,
  RenderNodeMeta,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  ImportFrameContext,
  NodeMetaContext,
  PageContext,
  RenderInstancePathContext,
  RuntimeContext,
  ScopeContext,
  StructuralLoopContext,
  SurfaceContext,
  FormLayoutContext,
  type FormLayoutContextValue,
  useRequiredContext,
} from './contexts.js';
import { getIn } from '@nop-chaos/flux-core';
import { createHelpers } from './helpers.js';
import {
  createFormModelGenerationSubscribe,
  createScopeSubscribe,
  createScopeOwnSubscribe,
  emptyUnsubscribe,
} from './hook-subscriptions.js';
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
  return useRequiredContext(RuntimeContext, 'RendererRuntime');
}

export function useRenderScope(): ScopeRef {
  return useRequiredContext(ScopeContext, 'RenderScope');
}

export function useRenderInstancePath():
  | readonly import('@nop-chaos/flux-core').InstanceFrame[]
  | undefined {
  return useContext(RenderInstancePathContext);
}

export function useCurrentActionScope(): ActionScope | undefined {
  return useContext(ActionScopeContext);
}

export function useCurrentComponentRegistry(): ComponentHandleRegistry | undefined {
  return useContext(ComponentRegistryContext);
}

export function useCurrentImportFrame(): ImportFrame | undefined {
  return useContext(ImportFrameContext);
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
  const paths = options?.paths;
  const subscribe = useMemo(
    () => (enabled ? createScopeSubscribe(scope, paths) : () => emptyUnsubscribe),
    [enabled, paths, scope],
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

export function useCurrentPage(): PageRuntime | undefined {
  return useContext(PageContext);
}

export function useCurrentSurfaceRuntime() {
  return useContext(SurfaceContext);
}

export function useCurrentNodeMeta(): RenderNodeMeta {
  return useRequiredContext(NodeMetaContext, 'NodeMeta');
}

export function useCurrentNodeInstance() {
  return useContext(NodeMetaContext)?.node ?? undefined;
}

export function useStructuralLoopContext() {
  return useContext(StructuralLoopContext);
}

export function useActionDispatcher() {
  return useRendererRuntime().dispatch;
}

export function useRenderFragment() {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const actionScope = useCurrentActionScope();
  const componentRegistry = useCurrentComponentRegistry();
  const form = useCurrentForm();
  const page = useCurrentPage();
  const surfaceRuntime = useCurrentSurfaceRuntime();
  const nodeMeta = useContext(NodeMetaContext);

  return useMemo(
    () =>
      createHelpers({
        runtime,
        scope,
        actionScope,
        componentRegistry,
        form,
        page,
        surfaceRuntime,
        nodeInstance: nodeMeta?.node ?? undefined,
        dialogId: scope.get('dialogId') as string | undefined,
      }).render,
    [runtime, scope, actionScope, componentRegistry, form, page, surfaceRuntime, nodeMeta],
  );
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
  useRenderFragment,
  useCurrentFormModelGeneration,
  useFormLayout,
  useStrictMode,
};

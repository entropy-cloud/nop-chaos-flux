import { useCallback, useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionScope,
  ComponentHandleRegistry,
  DataSourceStatusSummary,
  FormFieldStateSnapshot,
  FormErrorQuery,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  ImportFrame,
  PageRuntime,
  RenderNodeMeta,
  RendererRuntime,
  ScopeRef,
  ValidationError
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  FormContext,
  ImportFrameContext,
  NodeMetaContext,
  PageContext,
  RenderInstancePathContext,
  RuntimeContext,
  ScopeContext,
  StructuralLoopContext,
  SurfaceContext,
  useRequiredContext
} from './contexts';
import { getIn } from '@nop-chaos/flux-core';
import { createHelpers } from './helpers';
import { EMPTY_FORM_FIELD_STATE, EMPTY_FORM_STORE_STATE, selectCurrentFormErrors, selectCurrentFormFieldState } from './form-state';

function shallowEqualFormFieldState(
  a: FormFieldStateSnapshot,
  b: FormFieldStateSnapshot
): boolean {
  return (
    a.error === b.error &&
    a.validating === b.validating &&
    a.touched === b.touched &&
    a.dirty === b.dirty &&
    a.visited === b.visited &&
    a.submitting === b.submitting
  );
}

function shallowEqualArrays<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function emptyUnsubscribe() {
  return undefined;
}

function createFormErrorSubscribe(store: FormStoreApi | undefined, path: string | undefined) {
  return (listener: () => void) => {
    if (!store) {
      return emptyUnsubscribe;
    }

    if (path && typeof store.subscribeToPath === 'function') {
      return store.subscribeToPath(path, listener);
    }

    return store.subscribe(listener);
  };
}

function createScopeOwnSubscribe(scope: ScopeRef) {
  return (listener: () => void) => {
    const subscribe = scope.store?.subscribe;

    if (!subscribe) {
      return emptyUnsubscribe;
    }

    let previousSnapshot = scope.readOwn();

    return subscribe(() => {
      const nextSnapshot = scope.readOwn();

      if (nextSnapshot === previousSnapshot) {
        return;
      }

      previousSnapshot = nextSnapshot;
      listener();
    });
  };
}

export function useRendererRuntime(): RendererRuntime {
  return useRequiredContext(RuntimeContext, 'RendererRuntime');
}

export function useRenderScope(): ScopeRef {
  return useRequiredContext(ScopeContext, 'RenderScope');
}

export function useRenderInstancePath(): readonly import('@nop-chaos/flux-core').InstanceFrame[] | undefined {
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

/**
 * Subscribe to scope data changes with a selector function.
 *
 * The generic parameter `S` allows callers to specify the expected shape of scope data
 * for type-safe selection. Since scope stores hold dynamic data determined at runtime,
 * the internal cast from `Record<string, unknown>` to `S` is a necessary type bridge
 * that transfers type responsibility to the caller's selector.
 */
export function useScopeSelector<T, S = Record<string, unknown>>(
  selector: (scopeData: S) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
  options?: { enabled?: boolean; fallback?: T }
): T {
  const scope = useRenderScope();
  const store = scope.store;
  const enabled = options?.enabled !== false;
  const subscribe = useMemo(
    () => (enabled ? store?.subscribe ?? (() => emptyUnsubscribe) : () => emptyUnsubscribe),
    [enabled, store]
  );
  const getSnapshot = useMemo(
    () => (enabled ? () => (store?.getSnapshot() ?? scope.readVisible()) as unknown as S : () => (undefined as unknown as S)),
    [enabled, store, scope]
  );
  const fallbackSelector = useCallback(() => options?.fallback as T, [options?.fallback]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    enabled ? selector : fallbackSelector,
    equalityFn
  );
}

/**
 * Subscribe to scope's own data changes (excluding inherited parent data).
 *
 * Similar to `useScopeSelector`, the generic parameter `S` allows type-safe selection.
 * The internal cast is a type bridge for dynamic scope data.
 */
export function useOwnScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T {
  const scope = useRenderScope();
  const subscribe = useMemo(() => createScopeOwnSubscribe(scope), [scope]);
  const getSnapshot = useCallback(() => scope.readOwn() as unknown as S, [scope]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    selector,
    equalityFn
  );
}

export function useCurrentForm(): FormRuntime | undefined {
  return useContext(FormContext);
}

export function useCurrentFormState<T>(
  selector: (state: FormStoreState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
  options?: { enabled?: boolean }
): T {
  const form = useCurrentForm();
  const enabled = options?.enabled !== false;
  const subscribe = useMemo(
    () => (enabled ? form?.store.subscribe ?? (() => () => undefined) : () => () => undefined),
    [enabled, form]
  );
  const getSnapshot = useMemo(
    () => (enabled ? () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE : () => EMPTY_FORM_STORE_STATE),
    [enabled, form]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
}

export function useCurrentFormErrors(query?: FormErrorQuery): ValidationError[] {
  const form = useCurrentForm();
  const stablePath = query?.path;
  const stableOwnerPath = query?.ownerPath;
  const stableRule = query?.rule;
  const sourceKindsKey = query?.sourceKinds ? JSON.stringify(query.sourceKinds) : undefined;
  const subscribe = useMemo(() => createFormErrorSubscribe(form?.store, stablePath), [form, stablePath]);
  const getSnapshot = useMemo(() => () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE, [form]);
  const selector = useCallback(
    (state: FormStoreState): ValidationError[] => {
      const q: FormErrorQuery | undefined = stablePath || stableOwnerPath || stableRule || sourceKindsKey
        ? { path: stablePath, ownerPath: stableOwnerPath, rule: stableRule, sourceKinds: sourceKindsKey ? (JSON.parse(sourceKindsKey) as FormErrorQuery['sourceKinds']) : undefined }
        : undefined;
      return selectCurrentFormErrors(state, q);
    },
    [stablePath, stableOwnerPath, stableRule, sourceKindsKey]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, shallowEqualArrays);
}

export function useCurrentFormError(query: FormErrorQuery, options?: { enabled?: boolean }): ValidationError | undefined {
  const form = useCurrentForm();
  const enabled = options?.enabled !== false;
  const stablePath = query?.path;
  const stableOwnerPath = query?.ownerPath;
  const stableRule = query?.rule;
  const sourceKindsKey = query?.sourceKinds ? JSON.stringify(query.sourceKinds) : undefined;
  const subscribe = useMemo(
    () => enabled ? createFormErrorSubscribe(form?.store, stablePath) : () => emptyUnsubscribe,
    [enabled, form, stablePath]
  );
  const getSnapshot = useMemo(
    () => enabled ? () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE : () => EMPTY_FORM_STORE_STATE,
    [enabled, form]
  );
  const selector = useCallback(
    (state: FormStoreState): ValidationError | undefined => {
      const q: FormErrorQuery = { path: stablePath, ownerPath: stableOwnerPath, rule: stableRule, sourceKinds: sourceKindsKey ? (JSON.parse(sourceKindsKey) as FormErrorQuery['sourceKinds']) : undefined };
      return selectCurrentFormErrors(state, q)[0];
    },
    [stablePath, stableOwnerPath, stableRule, sourceKindsKey]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, Object.is);
}

export function useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot {
  const form = useCurrentForm();
  const store: FormStoreApi | undefined = form?.store;
  const stablePath = query?.path;
  const stableOwnerPath = query?.ownerPath;
  const stableRule = query?.rule;
  const sourceKindsKey = query?.sourceKinds ? JSON.stringify(query.sourceKinds) : undefined;
  
  // When path is empty, skip subscription entirely and return empty state
  const skipSubscription = !path;

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!store || skipSubscription) return () => undefined;
      const unsubPath = typeof store.subscribeToPath === 'function'
        ? store.subscribeToPath(path, listener)
        : store.subscribe(listener);
      const unsubSubmitting = typeof store.subscribeToSubmitting === 'function'
        ? store.subscribeToSubmitting(listener)
        : () => undefined;
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    },
    [store, path, skipSubscription]
  );

  const getSnapshot = useCallback(
    (): FormStoreState => {
      if (skipSubscription) return EMPTY_FORM_STORE_STATE;
      return store ? store.getState() : EMPTY_FORM_STORE_STATE;
    },
    [store, skipSubscription]
  );

  const selector = useCallback(
    (state: FormStoreState): FormFieldStateSnapshot => {
      if (skipSubscription) return EMPTY_FORM_FIELD_STATE;
      const q: FormErrorQuery | undefined = stablePath || stableOwnerPath || stableRule || sourceKindsKey
        ? { path: stablePath, ownerPath: stableOwnerPath, rule: stableRule, sourceKinds: sourceKindsKey ? (JSON.parse(sourceKindsKey) as FormErrorQuery['sourceKinds']) : undefined }
        : undefined;
      return selectCurrentFormFieldState(state, path, q);
    },
    [path, stablePath, stableOwnerPath, stableRule, sourceKindsKey, skipSubscription]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, shallowEqualFormFieldState);
}

export function useValidationNodeState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useFieldError(path: string): ValidationError | undefined {
  const form = useCurrentForm();
  const store: FormStoreApi | undefined = form?.store;

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!store) return () => undefined;
      const unsubPath = typeof store.subscribeToPath === 'function'
        ? store.subscribeToPath(path, listener)
        : store.subscribe(listener);
      const unsubSubmitting = typeof store.subscribeToSubmitting === 'function'
        ? store.subscribeToSubmitting(listener)
        : () => undefined;
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    },
    [store, path]
  );

  const getSnapshot = useCallback(
    (): FormStoreState => (store ? store.getState() : EMPTY_FORM_STORE_STATE),
    [store]
  );

  const selector = useCallback(
    (state: FormStoreState): ValidationError | undefined => {
      const fieldState = state.fieldStates[path];
      const errors = fieldState?.errors;
      return errors?.find((e) =>
        !e.sourceKind || e.sourceKind === 'field' || e.sourceKind === 'runtime-registration'
      );
    },
    [path]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, Object.is);
}

export function useDataSourceStatus(path: string, options?: { enabled?: boolean }): DataSourceStatusSummary | undefined {
  return useScopeSelector(
    (scopeData: Record<string, unknown>) => {
      if (!path) {
        return undefined;
      }

      return getIn(scopeData, path) as DataSourceStatusSummary | undefined;
    },
    Object.is,
    { enabled: options?.enabled !== false, fallback: undefined }
  );
}

export function useOwnedFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path, ownerPath: path });
}

export function useChildFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useAggregateError(path: string, options?: { enabled?: boolean }): ValidationError | undefined {
  return useCurrentFormError({ path, ownerPath: path, sourceKinds: ['array', 'object', 'form', 'runtime-registration'] }, options);
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
    () => createHelpers({
      runtime,
      scope,
      actionScope,
      componentRegistry,
        form,
        page,
        surfaceRuntime,
        nodeInstance: nodeMeta?.node ?? undefined,
        dialogId: scope.get('dialogId') as string | undefined
      }).render,
    [runtime, scope, actionScope, componentRegistry, form, page, surfaceRuntime, nodeMeta]
  );
}

export function useCurrentFormModelGeneration(): number {
  const form = useCurrentForm();
  const subscribe = useMemo(() => form?.store.subscribe ?? (() => () => undefined), [form]);
  const getSnapshot = useMemo(() => () => form?.modelGeneration ?? 0, [form]);

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, (n) => n, Object.is);
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
  useCurrentFormModelGeneration
};

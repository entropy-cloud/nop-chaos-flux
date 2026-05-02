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
  ValidationStoreApi,
  ValidationScopeRuntime,
  ValidationError,
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
  ValidationContext,
  NO_VALIDATION_OWNER,
  useRequiredContext,
  FormLayoutContext,
  type FormLayoutContextValue,
} from './contexts';
import { getIn } from '@nop-chaos/flux-core';
import { createHelpers } from './helpers';
import {
  EMPTY_FORM_FIELD_STATE,
  EMPTY_FORM_STORE_STATE,
  selectCurrentFormErrors,
  selectCurrentFormFieldState,
} from './form-state';
import {
  createFormFieldStateSubscribe,
  createFormStoreSnapshot,
  createFormStoreSubscribe,
  createFormErrorSubscribe,
  createScopeOwnSubscribe,
  emptyUnsubscribe,
  shallowEqualArrays,
  shallowEqualFormFieldState,
} from './hook-subscriptions';

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
  options?: { enabled?: boolean; fallback?: T },
): T {
  const scope = useRenderScope();
  const store = scope.store;
  const enabled = options?.enabled !== false;
  const subscribe = useMemo(
    () => (enabled ? (store?.subscribe ?? (() => emptyUnsubscribe)) : () => emptyUnsubscribe),
    [enabled, store],
  );
  const getSnapshot = useMemo(
    () =>
      enabled
        ? () => (store?.getSnapshot() ?? scope.readVisible()) as unknown as S
        : () => undefined as unknown as S,
    [enabled, store, scope],
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

/**
 * Subscribe to scope's own data changes (excluding inherited parent data).
 *
 * Similar to `useScopeSelector`, the generic parameter `S` allows type-safe selection.
 * The internal cast is a type bridge for dynamic scope data.
 */
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

export function useCurrentForm(): FormRuntime | undefined {
  return useContext(FormContext);
}

export function useCurrentValidationScope(): ValidationScopeRuntime | undefined {
  const validationScope = useContext(ValidationContext);
  const currentForm = useCurrentForm();
  const currentPage = useCurrentPage();

  if (validationScope === NO_VALIDATION_OWNER) {
    return currentForm;
  }

  return validationScope ?? currentForm ?? currentPage?.validationOwner;
}

function useCurrentValidationStore(): ValidationStoreApi | undefined {
  return useCurrentValidationScope()?.store;
}

function useFormStoreSelector<T>(args: {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => FormStoreState;
  selector: (state: FormStoreState) => T;
  equalityFn: (a: T, b: T) => boolean;
}) {
  return useSyncExternalStoreWithSelector(
    args.subscribe,
    args.getSnapshot,
    args.getSnapshot,
    args.selector,
    args.equalityFn,
  );
}

function useCurrentFormLikeStore(): FormStoreApi | undefined {
  const form = useCurrentForm();
  const validationStore = useCurrentValidationStore();
  return (form?.store ?? validationStore) as FormStoreApi | undefined;
}

function useStableFormErrorQuery(query?: FormErrorQuery) {
  const stablePath = query?.path;
  const stableOwnerPath = query?.ownerPath;
  const stableRule = query?.rule;
  const sourceKindsKey = query?.sourceKinds ? JSON.stringify(query.sourceKinds) : undefined;

  return useMemo(() => {
    if (!stablePath && !stableOwnerPath && !stableRule && !sourceKindsKey) {
      return {
        stablePath,
        resolvedQuery: undefined,
      };
    }

    return {
      stablePath,
      resolvedQuery: {
        path: stablePath,
        ownerPath: stableOwnerPath,
        rule: stableRule,
        sourceKinds: sourceKindsKey
          ? (JSON.parse(sourceKindsKey) as FormErrorQuery['sourceKinds'])
          : undefined,
      } satisfies FormErrorQuery,
    };
  }, [stablePath, stableOwnerPath, stableRule, sourceKindsKey]);
}

function useFormErrorStoreSelector<T>(args: {
  query?: FormErrorQuery;
  enabled?: boolean;
  selector: (state: FormStoreState, resolvedQuery: FormErrorQuery | undefined) => T;
  equalityFn: (a: T, b: T) => boolean;
}) {
  const store = useCurrentFormLikeStore();
  const enabled = args.enabled !== false;
  const { stablePath, resolvedQuery } = useStableFormErrorQuery(args.query);
  const subscribe = useMemo(
    () => (enabled ? createFormErrorSubscribe(store, stablePath) : () => emptyUnsubscribe),
    [enabled, store, stablePath],
  );
  const getSnapshot = useMemo(
    () =>
      enabled ? () => store?.getState() ?? EMPTY_FORM_STORE_STATE : () => EMPTY_FORM_STORE_STATE,
    [enabled, store],
  );
  const selector = useCallback(
    (state: FormStoreState) => args.selector(state, resolvedQuery),
    [args, resolvedQuery],
  );

  return useFormStoreSelector({
    subscribe,
    getSnapshot,
    selector,
    equalityFn: args.equalityFn,
  });
}

function usePathFieldStoreSelector<T>(args: {
  path: string;
  skipSubscription?: boolean;
  selector: (state: FormStoreState) => T;
  equalityFn: (a: T, b: T) => boolean;
}) {
  const store = useCurrentFormLikeStore();
  const skipSubscription = args.skipSubscription ?? false;
  const subscribe = useMemo(
    () => createFormFieldStateSubscribe(store, args.path, skipSubscription),
    [store, args.path, skipSubscription],
  );
  const getSnapshot = useCallback(
    (): FormStoreState =>
      skipSubscription ? EMPTY_FORM_STORE_STATE : (store?.getState() ?? EMPTY_FORM_STORE_STATE),
    [store, skipSubscription],
  );

  return useFormStoreSelector({
    subscribe,
    getSnapshot,
    selector: args.selector,
    equalityFn: args.equalityFn,
  });
}

export function useCurrentFormState<T>(
  selector: (state: FormStoreState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
  options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
): T {
  const form = useCurrentForm();
  const enabled = options?.enabled !== false;
  const path = options?.path;
  const paths = options?.paths;
  const store = form?.store;
  const subscribe = useMemo(
    () => createFormStoreSubscribe(store, { enabled, path, paths }),
    [enabled, path, paths, store],
  );
  const getSnapshot = useMemo(() => createFormStoreSnapshot(store, enabled), [enabled, store]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    selector,
    equalityFn,
  );
}

export function useCurrentFormErrors(query?: FormErrorQuery): ValidationError[] {
  return useFormErrorStoreSelector({
    query,
    selector: (state, resolvedQuery) => selectCurrentFormErrors(state, resolvedQuery),
    equalityFn: shallowEqualArrays,
  });
}

export function useCurrentFormError(
  query: FormErrorQuery,
  options?: { enabled?: boolean },
): ValidationError | undefined {
  return useFormErrorStoreSelector({
    query,
    enabled: options?.enabled,
    selector: (state, resolvedQuery) => selectCurrentFormErrors(state, resolvedQuery)[0],
    equalityFn: Object.is,
  });
}

export function useCurrentFormFieldState(
  path: string,
  query?: FormErrorQuery,
): FormFieldStateSnapshot {
  // When path is empty, skip subscription entirely and return empty state
  const skipSubscription = !path;
  const { resolvedQuery } = useStableFormErrorQuery(query);

  const selector = useCallback(
    (state: FormStoreState): FormFieldStateSnapshot => {
      if (skipSubscription) return EMPTY_FORM_FIELD_STATE;
      return selectCurrentFormFieldState(state, path, resolvedQuery);
    },
    [path, resolvedQuery, skipSubscription],
  );

  return usePathFieldStoreSelector({
    path,
    skipSubscription,
    selector,
    equalityFn: shallowEqualFormFieldState,
  });
}

export function useValidationNodeState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useFieldError(path: string): ValidationError | undefined {
  const selector = useCallback(
    (state: FormStoreState): ValidationError | undefined => {
      const fieldState = state.fieldStates[path];
      const errors = fieldState?.errors;
      return errors?.find(
        (e) => !e.sourceKind || e.sourceKind === 'field' || e.sourceKind === 'runtime-registration',
      );
    },
    [path],
  );

  return usePathFieldStoreSelector({
    path,
    selector,
    equalityFn: Object.is,
  });
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
    { enabled: options?.enabled !== false, fallback: undefined },
  );
}

export function useOwnedFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path, ownerPath: path });
}

/**
 * Alias for path-scoped child field observation within composite/owner UIs.
 * It intentionally matches `useCurrentFormFieldState(path, { path })`.
 */
export function useChildFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useAggregateError(
  path: string,
  options?: { enabled?: boolean },
): ValidationError | undefined {
  return useCurrentFormError(
    { path, ownerPath: path, sourceKinds: ['array', 'object', 'form', 'runtime-registration'] },
    options,
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
  const subscribe = useMemo(() => form?.store.subscribe ?? (() => () => undefined), [form]);
  const getSnapshot = useMemo(() => () => form?.modelGeneration ?? 0, [form]);

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

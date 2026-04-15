import { useCallback, useContext, useMemo, useRef } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  ActionScope,
  ComponentHandleRegistry,
  FormFieldStateSnapshot,
  FormErrorQuery,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
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
  NodeMetaContext,
  PageContext,
  RenderInstancePathContext,
  RuntimeContext,
  ScopeContext,
  SurfaceContext,
  useRequiredContext
} from './contexts';
import { createHelpers } from './helpers';
import { EMPTY_FORM_STORE_STATE, EMPTY_FORM_FIELD_STATE, selectCurrentFormErrors, selectCurrentFormFieldState } from './form-state';

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

export function useRendererEnv() {
  return useRendererRuntime().env;
}

export function useScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T {
  const scope = useRenderScope();
  const store = scope.store;
  const subscribe = store?.subscribe ?? (() => emptyUnsubscribe);
  const getSnapshot = () => (store?.getSnapshot() ?? scope.readVisible()) as unknown as S;

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    selector,
    equalityFn
  );
}

export function useOwnScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T {
  const scope = useRenderScope();
  const subscribe = useMemo(() => createScopeOwnSubscribe(scope), [scope]);
  const getSnapshot = () => scope.readOwn() as unknown as S;

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
  equalityFn: (a: T, b: T) => boolean = Object.is
): T {
  const form = useCurrentForm();
  const subscribe = form?.store.subscribe ?? (() => () => undefined);
  const getSnapshot = () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE;

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
}

export function useCurrentFormErrors(query?: FormErrorQuery): ValidationError[] {
  const form = useCurrentForm();
  const subscribe = form?.store.subscribe ?? (() => () => undefined);
  const getSnapshot = () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE;
  const queryRef = useRef(query);
  queryRef.current = query;
  const selector = useCallback(
    (state: FormStoreState) => selectCurrentFormErrors(state, queryRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, shallowEqualArrays);
}

export function useCurrentFormError(query: FormErrorQuery): ValidationError | undefined {
  const form = useCurrentForm();
  const subscribe = form?.store.subscribe ?? (() => () => undefined);
  const getSnapshot = () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE;
  const queryRef = useRef(query);
  queryRef.current = query;
  const selector = useCallback(
    (state: FormStoreState) => selectCurrentFormErrors(state, queryRef.current)[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form]
  );

  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, Object.is);
}

export function useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot {
  const form = useCurrentForm();
  const store: FormStoreApi | undefined = form?.store;
  const queryRef = useRef(query);
  queryRef.current = query;
  const cachedRef = useRef<FormFieldStateSnapshot>(EMPTY_FORM_FIELD_STATE);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!store) return () => undefined;
      const unsubPath = store.subscribeToPath(path, listener);
      const unsubSubmitting = store.subscribeToSubmitting(listener);
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    },
    [store, path]
  );

  const getSnapshot = useCallback(
    (): FormFieldStateSnapshot => {
      if (!store) return EMPTY_FORM_FIELD_STATE;
      const state = store.getState();
      const next = selectCurrentFormFieldState(state, path, queryRef.current);
      if (shallowEqualFormFieldState(next, cachedRef.current)) {
        return cachedRef.current;
      }
      cachedRef.current = next;
      return next;
    },
    [store, path]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useValidationNodeState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useFieldError(path: string): ValidationError | undefined {
  const form = useCurrentForm();
  const store: FormStoreApi | undefined = form?.store;
  const cachedRef = useRef<ValidationError | undefined>(undefined);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!store) return () => undefined;
      const unsubPath = store.subscribeToPath(path, listener);
      const unsubSubmitting = store.subscribeToSubmitting(listener);
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    },
    [store, path]
  );

  const getSnapshot = useCallback(
    (): ValidationError | undefined => {
      if (!store) return undefined;
      const state = store.getState();
      const errors = state.errors[path];
      const next = errors?.find((e) =>
        !e.sourceKind || e.sourceKind === 'field' || e.sourceKind === 'runtime-registration'
      );
      if (next === cachedRef.current) return cachedRef.current;
      cachedRef.current = next;
      return next;
    },
    [store, path]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useOwnedFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path, ownerPath: path });
}

export function useChildFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path });
}

export function useAggregateError(path: string): ValidationError | undefined {
  return useCurrentFormError({ path, ownerPath: path, sourceKinds: ['array', 'object', 'form', 'runtime-registration'] });
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
  const subscribe = form?.store.subscribe ?? (() => () => undefined);
  const getSnapshot = () => form?.modelGeneration ?? 0;

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
  useOwnedFieldState,
  useChildFieldState,
  useAggregateError,
  useCurrentPage,
  useCurrentSurfaceRuntime,
  useCurrentNodeMeta,
  useCurrentNodeInstance,
  useRenderFragment,
  useCurrentFormModelGeneration
};

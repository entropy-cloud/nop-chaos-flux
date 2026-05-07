import { useCallback, useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type {
  FormErrorQuery,
  FormFieldStateSnapshot,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  PageRuntime,
  ValidationScopeRuntime,
  ValidationStoreApi,
  ValidationError,
} from '@nop-chaos/flux-core';
import {
  FormContext,
  NO_VALIDATION_OWNER,
  PageContext,
  ValidationContext,
} from '../contexts.js';
import {
  EMPTY_FORM_FIELD_STATE,
  EMPTY_FORM_STORE_STATE,
  selectCurrentFormErrors,
  selectCurrentFormFieldState,
} from '../form-state.js';
import {
  createFormFieldStateSubscribe,
  createFormStoreSnapshot,
  createFormStoreSubscribe,
  createFormErrorSubscribe,
  emptyUnsubscribe,
  shallowEqualArrays,
  shallowEqualFormFieldState,
} from '../hook-subscriptions.js';

export function useCurrentForm(): FormRuntime | undefined {
  return useContext(FormContext);
}

export function useCurrentValidationScope(): ValidationScopeRuntime | undefined {
  const validationScope = useContext(ValidationContext);
  const currentForm = useCurrentForm();
  const currentPage = useContext(PageContext) as PageRuntime | undefined;

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

function useCurrentValidationValuesSelector<T>(
  selector: (values: Record<string, unknown>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
  options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
): T {
  const currentForm = useCurrentForm();
  const validationStore = useCurrentValidationStore();
  const enabled = options?.enabled !== false;
  const path = options?.path;
  const paths = options?.paths;
  const store = (currentForm?.store ?? validationStore) as FormStoreApi | undefined;
  const subscribe = useMemo(
    () => createFormStoreSubscribe(store, { enabled, path, paths }),
    [enabled, path, paths, store],
  );
  const getSnapshot = useMemo(() => createFormStoreSnapshot(store, enabled), [enabled, store]);

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    (state) => selector(state.values as Record<string, unknown>),
    equalityFn,
  );
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

export function useCurrentValidationValues<T>(
  selector: (values: Record<string, unknown>) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
  options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
): T {
  return useCurrentValidationValuesSelector(selector, equalityFn, options);
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

export function useOwnedFieldState(path: string): FormFieldStateSnapshot {
  return useCurrentFormFieldState(path, { path, ownerPath: path });
}

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

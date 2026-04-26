import type { FormStoreApi, ScopeRef } from '@nop-chaos/flux-core';
import type { FormFieldStateSnapshot } from '@nop-chaos/flux-core';
import { EMPTY_FORM_STORE_STATE, type FormStoreState } from './form-state';

export function shallowEqualFormFieldState(
  a: FormFieldStateSnapshot,
  b: FormFieldStateSnapshot
): boolean {
  return (
    a.error === b.error &&
    a.validating === b.validating &&
    a.touched === b.touched &&
    a.dirty === b.dirty &&
    a.visited === b.visited &&
    a.submitting === b.submitting &&
    a.submitAttempted === b.submitAttempted
  );
}

export function shallowEqualArrays<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function emptyUnsubscribe() {
  return undefined;
}

export function createFormErrorSubscribe(store: FormStoreApi | undefined, path: string | undefined) {
  return (listener: () => void) => {
    if (!store) {
      return emptyUnsubscribe;
    }

    if (path && typeof store.subscribeToPath === 'function') {
      const unsubPath = store.subscribeToPath(path, listener);
      const unsubSubmitting = typeof store.subscribeToSubmitting === 'function'
        ? store.subscribeToSubmitting(listener)
        : () => undefined;
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    }

    const unsubStore = store.subscribe(listener);
    const unsubSubmitting = typeof store.subscribeToSubmitting === 'function'
      ? store.subscribeToSubmitting(listener)
      : () => undefined;
    return () => {
      unsubStore();
      unsubSubmitting();
    };
  };
}

export function createFormStoreSubscribe(
  store: FormStoreApi | undefined,
  options?: { enabled?: boolean; path?: string }
) {
  const enabled = options?.enabled !== false;
  const path = options?.path;

  return (listener: () => void) => {
    if (!enabled || !store) {
      return emptyUnsubscribe;
    }

    if (path && typeof store.subscribeToPath === 'function') {
      return store.subscribeToPath(path, listener);
    }

    return store.subscribe(listener);
  };
}

export function createFormStoreSnapshot(
  store: FormStoreApi | undefined,
  enabled = true
): () => FormStoreState {
  return enabled && store ? () => store.getState() : () => EMPTY_FORM_STORE_STATE;
}

export function createFormFieldStateSubscribe(
  store: FormStoreApi | undefined,
  path: string,
  skipSubscription = false
) {
  return (listener: () => void) => {
    if (!store || skipSubscription) {
      return emptyUnsubscribe;
    }

    const unsubPath = typeof store.subscribeToPath === 'function'
      ? store.subscribeToPath(path, listener)
      : store.subscribe(listener);
    const unsubSubmitting = typeof store.subscribeToSubmitting === 'function'
      ? store.subscribeToSubmitting(listener)
      : emptyUnsubscribe;
    return () => {
      unsubPath();
      unsubSubmitting();
    };
  };
}

export function createScopeOwnSubscribe(scope: ScopeRef) {
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

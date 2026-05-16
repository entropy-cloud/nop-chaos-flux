import type {
  FormFieldStateSnapshot,
  FormStoreApi,
  FormStoreState,
  ScopeChange,
  ScopeDependencySet,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { parsePath } from '@nop-chaos/flux-core';
import { EMPTY_FORM_STORE_STATE } from './form-state.js';
import { scopeChangeHitsDependencies } from '@nop-chaos/flux-runtime';

export function shallowEqualFormFieldState(
  a: FormFieldStateSnapshot,
  b: FormFieldStateSnapshot,
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

function createScopeDependencySet(paths: readonly string[] | undefined): ScopeDependencySet | undefined {
  if (!paths || paths.length === 0) {
    return undefined;
  }

  let wildcard = false;
  const normalizedPaths = new Set<string>();

  for (const path of paths) {
    const trimmed = path.trim();
    if (trimmed.length === 0) {
      continue;
    }

    if (trimmed === '*') {
      wildcard = true;
      break;
    }

    const normalizedPath = parsePath(trimmed).join('.');
    if (normalizedPath.length > 0) {
      normalizedPaths.add(normalizedPath);
    }
  }

  if (wildcard) {
    return {
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    };
  }

  if (normalizedPaths.size === 0) {
    return undefined;
  }

  return {
    paths: Array.from(normalizedPaths).sort(),
    wildcard: false,
    broadAccess: false,
  };
}

export function createFormErrorSubscribe(
  store: FormStoreApi | undefined,
  path: string | undefined,
) {
  return (listener: () => void) => {
    if (!store) {
      return emptyUnsubscribe;
    }

    if (path && typeof store.subscribeToPath === 'function') {
      const unsubPath = store.subscribeToPath(path, listener);
      const unsubSubmitting =
        typeof store.subscribeToSubmitting === 'function'
          ? store.subscribeToSubmitting(listener)
          : () => undefined;
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    }

    const unsubStore = store.subscribe(listener);
    const unsubSubmitting =
      typeof store.subscribeToSubmitting === 'function'
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
  options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
) {
  const enabled = options?.enabled !== false;
  const path = options?.path;
  const paths = options?.paths;

  return (listener: () => void) => {
    if (!enabled || !store) {
      return emptyUnsubscribe;
    }

    if (paths && paths.length > 0 && typeof store.subscribeToPaths === 'function') {
      const unsubPaths = store.subscribeToPaths(paths, listener);
      const unsubSubmitting =
        typeof store.subscribeToSubmitting === 'function'
          ? store.subscribeToSubmitting(listener)
          : emptyUnsubscribe;
      return () => {
        unsubPaths();
        unsubSubmitting();
      };
    }

    if (path && typeof store.subscribeToPath === 'function') {
      const unsubPath = store.subscribeToPath(path, listener);
      const unsubSubmitting =
        typeof store.subscribeToSubmitting === 'function'
          ? store.subscribeToSubmitting(listener)
          : emptyUnsubscribe;
      return () => {
        unsubPath();
        unsubSubmitting();
      };
    }

    return store.subscribe(listener);
  };
}

export function createFormStoreSnapshot(
  store: FormStoreApi | undefined,
  enabled = true,
): () => FormStoreState {
  return enabled && store ? () => store.getState() : () => EMPTY_FORM_STORE_STATE;
}

export function createFormFieldStateSubscribe(
  store: FormStoreApi | undefined,
  path: string,
  skipSubscription = false,
) {
  return (listener: () => void) => {
    if (!store || skipSubscription) {
      return emptyUnsubscribe;
    }

    const unsubPath =
      typeof store.subscribeToPath === 'function'
        ? store.subscribeToPath(path, listener)
        : store.subscribe(listener);
    const unsubSubmitting =
      typeof store.subscribeToSubmitting === 'function'
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

export function createScopeSubscribe(scope: ScopeRef, paths?: readonly string[]) {
  return (listener: () => void) => {
    const subscribe = scope.store?.subscribe;

    if (!subscribe) {
      return emptyUnsubscribe;
    }

    const dependencies = createScopeDependencySet(paths);

    return subscribe((change: ScopeChange) => {
      if (dependencies && !scopeChangeHitsDependencies(change, dependencies)) {
        return;
      }

      listener();
    });
  };
}

export function createFormModelGenerationSubscribe(
  form:
    | {
        subscribeToModelGeneration?: (listener: () => void) => () => void;
        store?: Pick<FormStoreApi, 'subscribe'>;
      }
    | undefined,
) {
  return (listener: () => void) => {
    if (typeof form?.subscribeToModelGeneration === 'function') {
      return form.subscribeToModelGeneration(listener);
    }

    return form?.store?.subscribe(listener) ?? emptyUnsubscribe;
  };
}

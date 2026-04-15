import { createStore } from 'zustand/vanilla';
import type { FormPathState, FormStoreApi, FormStoreState, PageStoreApi, PageStoreState, SurfaceEntry, SurfaceStoreApi, SurfaceStoreState, ValidationError } from '@nop-chaos/flux-core';
import { setIn } from '@nop-chaos/flux-core';

function validationErrorsEqual(
  left: ValidationError[] | undefined,
  right: ValidationError[] | undefined
) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((error, index) => {
    const candidate = right[index];

    if (!candidate) {
      return false;
    }

    const leftRelatedPaths = error.relatedPaths ?? [];
    const rightRelatedPaths = candidate.relatedPaths ?? [];

    return candidate.path === error.path
      && candidate.rule === error.rule
      && candidate.message === error.message
      && candidate.ruleId === error.ruleId
      && candidate.sourceKind === error.sourceKind
      && leftRelatedPaths.length === rightRelatedPaths.length
      && leftRelatedPaths.every((path, relatedIndex) => path === rightRelatedPaths[relatedIndex]);
  });
}

function errorStateEqual(
  left: Record<string, ValidationError[]>,
  right: Record<string, ValidationError[]>
) {
  if (left === right) {
    return true;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!validationErrorsEqual(left[key], right[key])) {
      return false;
    }
  }

  return true;
}

export function createFormStore(initialValues: Record<string, any>): FormStoreApi {
  const store = createStore<FormStoreState>(() => ({
    values: initialValues,
    errors: {},
    validating: {},
    touched: {},
    dirty: {},
    visited: {},
    submitting: false
  }));

  const pathListeners = new Map<string, Set<() => void>>();
  const submittingListeners = new Set<() => void>();

  function notifyPath(path: string) {
    const listeners = pathListeners.get(path);
    if (listeners) {
      for (const listener of listeners) {
        listener();
      }
    }
  }

  function notifySubmitting() {
    for (const listener of submittingListeners) {
      listener();
    }
  }

  function diffAndNotifyBooleanMaps(
    before: Record<string, boolean>,
    after: Record<string, boolean>,
    changed: Set<string>
  ) {
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        changed.add(key);
      }
    }
    for (const key of Object.keys(after)) {
      if (before[key] !== after[key]) {
        changed.add(key);
      }
    }
  }

  function diffAndNotifyErrorMaps(
    before: Record<string, ValidationError[]>,
    after: Record<string, ValidationError[]>,
    changed: Set<string>
  ) {
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        changed.add(key);
      }
    }
    for (const key of Object.keys(after)) {
      if (!validationErrorsEqual(before[key], after[key])) {
        changed.add(key);
      }
    }
  }

  function setBooleanState<K extends 'touched' | 'dirty' | 'visited' | 'validating'>(key: K, path: string, nextValue: boolean) {
    const current = store.getState()[key];

    if (nextValue) {
      if (current[path]) {
        return;
      }

      store.setState({ [key]: { ...current, [path]: true } } as Pick<FormStoreState, K>);
      notifyPath(path);
      return;
    }

    if (!current[path]) {
      return;
    }

    const next = { ...current };
    delete next[path];
    store.setState({ [key]: next } as Pick<FormStoreState, K>);
    notifyPath(path);
  }

  function setPathErrors(path: string, errors?: ValidationError[]) {
    const current = store.getState().errors;
    const existing = current[path];

    if (!errors || errors.length === 0) {
      if (!existing) {
        return;
      }

      const next = { ...current };
      delete next[path];
      store.setState({ errors: next });
      notifyPath(path);
      return;
    }

    if (validationErrorsEqual(existing, errors)) {
      return;
    }

    store.setState({ errors: { ...current, [path]: errors } });
    notifyPath(path);
  }

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    subscribeToPath(path, listener) {
      let listeners = pathListeners.get(path);
      if (!listeners) {
        listeners = new Set();
        pathListeners.set(path, listeners);
      }
      listeners.add(listener);
      return () => {
        listeners!.delete(listener);
        if (listeners!.size === 0) {
          pathListeners.delete(path);
        }
      };
    },
    subscribeToSubmitting(listener) {
      submittingListeners.add(listener);
      return () => {
        submittingListeners.delete(listener);
      };
    },
    getPathState(path): FormPathState {
      const state = store.getState();
      return {
        errors: state.errors[path],
        validating: state.validating[path] === true,
        touched: state.touched[path] === true,
        dirty: state.dirty[path] === true,
        visited: state.visited[path] === true
      };
    },
    setValues(values) {
      store.setState({ values });
    },
    setValue(path, value) {
      const current = store.getState().values;
      store.setState({ values: setIn(current, path, value) });
    },
    setErrors(errors) {
      if (errorStateEqual(store.getState().errors, errors)) {
        return;
      }

      const before = store.getState().errors;
      store.setState({ errors });
      const changed = new Set<string>();
      diffAndNotifyErrorMaps(before, errors, changed);
      for (const path of changed) {
        notifyPath(path);
      }
    },
    setPathErrors(path, errors) {
      setPathErrors(path, errors);
    },
    setValidating(path, validating) {
      setBooleanState('validating', path, validating);
    },
    setValidatingState(validating) {
      const before = store.getState().validating;
      store.setState({ validating });
      const changed = new Set<string>();
      diffAndNotifyBooleanMaps(before, validating, changed);
      for (const path of changed) {
        notifyPath(path);
      }
    },
    setTouched(path, touched) {
      setBooleanState('touched', path, touched);
    },
    setTouchedState(touched) {
      const before = store.getState().touched;
      store.setState({ touched });
      const changed = new Set<string>();
      diffAndNotifyBooleanMaps(before, touched, changed);
      for (const path of changed) {
        notifyPath(path);
      }
    },
    setDirty(path, dirty) {
      setBooleanState('dirty', path, dirty);
    },
    setDirtyState(dirty) {
      const before = store.getState().dirty;
      store.setState({ dirty });
      const changed = new Set<string>();
      diffAndNotifyBooleanMaps(before, dirty, changed);
      for (const path of changed) {
        notifyPath(path);
      }
    },
    setVisited(path, visited) {
      setBooleanState('visited', path, visited);
    },
    setVisitedState(visited) {
      const before = store.getState().visited;
      store.setState({ visited });
      const changed = new Set<string>();
      diffAndNotifyBooleanMaps(before, visited, changed);
      for (const path of changed) {
        notifyPath(path);
      }
    },
    setSubmitting(submitting) {
      if (store.getState().submitting === submitting) {
        return;
      }
      store.setState({ submitting });
      notifySubmitting();
    },
    batchUpdate(updates) {
      const before = store.getState();
      store.setState(updates);
      const after = store.getState();

      const changed = new Set<string>();

      if (updates.errors !== undefined) {
        diffAndNotifyErrorMaps(before.errors, after.errors, changed);
      }
      if (updates.validating !== undefined) {
        diffAndNotifyBooleanMaps(before.validating, after.validating, changed);
      }
      if (updates.touched !== undefined) {
        diffAndNotifyBooleanMaps(before.touched, after.touched, changed);
      }
      if (updates.dirty !== undefined) {
        diffAndNotifyBooleanMaps(before.dirty, after.dirty, changed);
      }
      if (updates.visited !== undefined) {
        diffAndNotifyBooleanMaps(before.visited, after.visited, changed);
      }

      for (const path of changed) {
        notifyPath(path);
      }

      if (updates.submitting !== undefined && before.submitting !== after.submitting) {
        notifySubmitting();
      }
    }
  };
}

export function createPageStore(initialData: Record<string, any>): PageStoreApi {
  const store = createStore<PageStoreState>(() => ({
    data: initialData,
    refreshTick: 0
  }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    setData(data) {
      store.setState({ data });
    },
    updateData(path, value) {
      const state = store.getState();
      store.setState({ data: setIn(state.data, path, value) });
    },
    refresh() {
      const state = store.getState();
      store.setState({ refreshTick: state.refreshTick + 1 });
    }
  };
}

export function createSurfaceStore(): SurfaceStoreApi {
  const store = createStore<SurfaceStoreState>(() => ({
    entries: []
  }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    push(entry: SurfaceEntry) {
      const state = store.getState();
      store.setState({ entries: [...state.entries, entry] });
    },
    remove(surfaceId) {
      const state = store.getState();

      if (!surfaceId) {
        const target = state.entries[state.entries.length - 1];

        if (!target) {
          return undefined;
        }

        store.setState({ entries: state.entries.slice(0, -1) });
        return target;
      }

      const target = state.entries.find((entry) => entry.id === surfaceId);

      if (!target) {
        return undefined;
      }

      store.setState({ entries: state.entries.filter((entry) => entry.id !== surfaceId) });
      return target;
    }
  };
}

import { createStore } from 'zustand/vanilla';
import type { FieldState, FormPathState, FormStoreApi, FormStoreState, PageStoreApi, PageStoreState, SurfaceEntry, SurfaceStoreApi, SurfaceStoreState } from '@nop-chaos/flux-core';
import { setIn, validationErrorsEqual } from '@nop-chaos/flux-core';

function fieldStateEqual(left: FieldState | undefined, right: FieldState | undefined): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.touched === right.touched &&
    left.dirty === right.dirty &&
    left.visited === right.visited &&
    left.validating === right.validating &&
    validationErrorsEqual(left.errors, right.errors)
  );
}

function mergeFieldState(existing: FieldState | undefined, patch: Partial<FieldState>): FieldState | undefined {
  const merged: FieldState = { ...existing };

  if ('touched' in patch) {
    if (patch.touched === true) merged.touched = true;
    else delete merged.touched;
  }

  if ('dirty' in patch) {
    if (patch.dirty === true) merged.dirty = true;
    else delete merged.dirty;
  }

  if ('visited' in patch) {
    if (patch.visited === true) merged.visited = true;
    else delete merged.visited;
  }

  if ('validating' in patch) {
    if (patch.validating === true) merged.validating = true;
    else delete merged.validating;
  }

  if ('errors' in patch) {
    if (patch.errors && patch.errors.length > 0) merged.errors = patch.errors;
    else delete merged.errors;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function createFormStore(initialValues: Record<string, any>): FormStoreApi {
  const store = createStore<FormStoreState>(() => ({
    values: initialValues,
    fieldStates: {},
    submitting: false,
    submitAttempted: false
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

  function diffAndNotifyFieldStates(
    before: Record<string, FieldState>,
    after: Record<string, FieldState>,
    changed: Set<string>
  ) {
    for (const key of Object.keys(before)) {
      if (!(key in after)) {
        changed.add(key);
      }
    }
    for (const key of Object.keys(after)) {
      if (!fieldStateEqual(before[key], after[key])) {
        changed.add(key);
      }
    }
  }

  function updateFieldState(path: string, patch: Partial<FieldState>) {
    const current = store.getState().fieldStates;
    const existing = current[path];
    const next = mergeFieldState(existing, patch);

    if (fieldStateEqual(existing, next)) {
      return;
    }

    if (next === undefined) {
      const { [path]: _removed, ...rest } = current;
      store.setState({ fieldStates: rest });
    } else {
      store.setState({ fieldStates: { ...current, [path]: next } });
    }
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
      const fieldState = store.getState().fieldStates[path];
      return {
        errors: fieldState?.errors,
        validating: fieldState?.validating === true,
        touched: fieldState?.touched === true,
        dirty: fieldState?.dirty === true,
        visited: fieldState?.visited === true
      };
    },
    getFieldState(path) {
      return store.getState().fieldStates[path];
    },
    setFieldState(path, state) {
      updateFieldState(path, state);
    },
    setValues(values) {
      store.setState({ values });
    },
    setValue(path, value) {
      const current = store.getState().values;
      store.setState({ values: setIn(current, path, value) });
    },
    setPathErrors(path, errors) {
      updateFieldState(path, { errors: errors && errors.length > 0 ? errors : undefined });
    },
    setValidating(path, validating) {
      updateFieldState(path, { validating: validating ? true : undefined });
    },
    setTouched(path, touched) {
      updateFieldState(path, { touched: touched ? true : undefined });
    },
    setDirty(path, dirty) {
      updateFieldState(path, { dirty: dirty ? true : undefined });
    },
    setVisited(path, visited) {
      updateFieldState(path, { visited: visited ? true : undefined });
    },
    setSubmitting(submitting) {
      if (store.getState().submitting === submitting) {
        return;
      }
      store.setState({ submitting });
      notifySubmitting();
    },
    setSubmitAttempted(submitAttempted) {
      if (store.getState().submitAttempted === submitAttempted) {
        return;
      }
      store.setState({ submitAttempted });
      notifySubmitting();
    },
    batchUpdate(updates) {
      const before = store.getState();
      store.setState(updates);
      const after = store.getState();

      if (updates.fieldStates !== undefined) {
        const changed = new Set<string>();
        diffAndNotifyFieldStates(before.fieldStates, after.fieldStates, changed);
        for (const path of changed) {
          notifyPath(path);
        }
      }

      if (
        (updates.submitting !== undefined && before.submitting !== after.submitting)
        || (updates.submitAttempted !== undefined && before.submitAttempted !== after.submitAttempted)
      ) {
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

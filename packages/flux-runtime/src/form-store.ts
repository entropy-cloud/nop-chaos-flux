import { createStore } from 'zustand/vanilla';
import type {
  FieldState,
  FormPathState,
  FormStoreApi,
  FormStoreState,
  PageStoreApi,
  PageStoreState,
  SurfaceEntry,
  SurfaceStoreApi,
  SurfaceStoreState,
} from '@nop-chaos/flux-core';
import { getIn, setIn, validationErrorsEqual } from '@nop-chaos/flux-core';

interface FormStoreSummaryState {
  errorCount: number;
  dirtyCount: number;
  touchedCount: number;
  visitedCount: number;
  validatingCount: number;
}

type InternalFormStoreState = FormStoreState & {
  summary: FormStoreSummaryState;
};

function countFieldStateErrors(fieldState: FieldState | undefined): number {
  return fieldState?.errors?.length ?? 0;
}

function getFieldStateCounterFlags(fieldState: FieldState | undefined) {
  return {
    dirty: fieldState?.dirty === true ? 1 : 0,
    touched: fieldState?.touched === true ? 1 : 0,
    visited: fieldState?.visited === true ? 1 : 0,
    validating: fieldState?.validating === true ? 1 : 0,
  } as const;
}

function diffSummaryCounters(
  before: FieldState | undefined,
  after: FieldState | undefined,
): FormStoreSummaryState {
  const beforeFlags = getFieldStateCounterFlags(before);
  const afterFlags = getFieldStateCounterFlags(after);

  return {
    errorCount: countFieldStateErrors(after) - countFieldStateErrors(before),
    dirtyCount: afterFlags.dirty - beforeFlags.dirty,
    touchedCount: afterFlags.touched - beforeFlags.touched,
    visitedCount: afterFlags.visited - beforeFlags.visited,
    validatingCount: afterFlags.validating - beforeFlags.validating,
  };
}

function addSummaryDelta(
  summary: FormStoreSummaryState,
  delta: FormStoreSummaryState,
): FormStoreSummaryState {
  return {
    errorCount: summary.errorCount + delta.errorCount,
    dirtyCount: summary.dirtyCount + delta.dirtyCount,
    touchedCount: summary.touchedCount + delta.touchedCount,
    visitedCount: summary.visitedCount + delta.visitedCount,
    validatingCount: summary.validatingCount + delta.validatingCount,
  };
}

function emptySummary(): FormStoreSummaryState {
  return {
    errorCount: 0,
    dirtyCount: 0,
    touchedCount: 0,
    visitedCount: 0,
    validatingCount: 0,
  };
}

function computeSummaryFromFieldStates(
  fieldStates: Record<string, FieldState>,
): FormStoreSummaryState {
  let summary = {
    errorCount: 0,
    dirtyCount: 0,
    touchedCount: 0,
    visitedCount: 0,
    validatingCount: 0,
  };

  for (const fieldState of Object.values(fieldStates)) {
    summary = addSummaryDelta(summary, diffSummaryCounters(undefined, fieldState));
  }

  return summary;
}

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

function mergeFieldState(
  existing: FieldState | undefined,
  patch: Partial<FieldState>,
): FieldState | undefined {
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
  const store = createStore<InternalFormStoreState>(() => ({
    values: initialValues,
    fieldStates: {},
    submitting: false,
    submitAttempted: false,
    summary: {
      ...emptySummary(),
    },
  }));

  const pathListeners = new Map<string, Set<() => void>>();
  const descendantPathListeners = new Map<string, Set<() => void>>();
  const submittingListeners = new Set<() => void>();

  function notifyPathListeners(listeners: Set<() => void> | undefined) {
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener();
    }
  }

  function notifyPath(path: string) {
    notifyPathListeners(pathListeners.get(path));
  }

  function pathPrefixes(path: string): readonly string[] {
    const prefixes = [path];
    let index = path.lastIndexOf('.');

    while (index >= 0) {
      prefixes.push(path.slice(0, index));
      index = path.lastIndexOf('.', index - 1);
    }

    return prefixes;
  }

  function subscribeToPaths(paths: readonly string[], listener: () => void): () => void {
    if (paths.length === 0) {
      return () => undefined;
    }

    const unsubscribers = paths.map((path) => {
      let listeners = pathListeners.get(path);
      if (!listeners) {
        listeners = new Set();
        pathListeners.set(path, listeners);
      }
      listeners.add(listener);

      const descendantUnsubscribers = pathPrefixes(path)
        .slice(1)
        .map((prefix) => {
          let descendantListeners = descendantPathListeners.get(prefix);
          if (!descendantListeners) {
            descendantListeners = new Set();
            descendantPathListeners.set(prefix, descendantListeners);
          }
          descendantListeners.add(listener);

          return () => {
            descendantListeners!.delete(listener);
            if (descendantListeners!.size === 0) {
              descendantPathListeners.delete(prefix);
            }
          };
        });

      return () => {
        listeners!.delete(listener);
        if (listeners!.size === 0) {
          pathListeners.delete(path);
        }

        for (const unsubscribeDescendant of descendantUnsubscribers) {
          unsubscribeDescendant();
        }
      };
    });

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }

  function collectChangedValuePaths(
    before: unknown,
    after: unknown,
    changed: Set<string>,
    basePath?: string,
  ) {
    if (Object.is(before, after)) {
      return;
    }

    const beforeIsObject = typeof before === 'object' && before !== null;
    const afterIsObject = typeof after === 'object' && after !== null;

    if (!beforeIsObject || !afterIsObject || Array.isArray(before) || Array.isArray(after)) {
      if (basePath) {
        changed.add(basePath);
      }
      return;
    }

    const beforeRecord = before as Record<string, unknown>;
    const afterRecord = after as Record<string, unknown>;
    const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);

    if (keys.size === 0 && basePath) {
      changed.add(basePath);
      return;
    }

    for (const key of keys) {
      const nextPath = basePath ? `${basePath}.${key}` : key;
      collectChangedValuePaths(beforeRecord[key], afterRecord[key], changed, nextPath);
    }
  }

  function notifyValuePathListeners(changedPaths: Set<string>) {
    if (changedPaths.size === 0) {
      return;
    }

    const notified = new Set<() => void>();

    for (const changedPath of changedPaths) {
      for (const prefix of pathPrefixes(changedPath)) {
        const listeners = pathListeners.get(prefix);
        if (!listeners) {
          continue;
        }

        for (const listener of listeners) {
          if (notified.has(listener)) {
            continue;
          }

          notified.add(listener);
          listener();
        }
      }

      const descendantListeners = descendantPathListeners.get(changedPath);
      if (!descendantListeners) {
        continue;
      }

      for (const listener of descendantListeners) {
        if (notified.has(listener)) {
          continue;
        }

        notified.add(listener);
        listener();
      }
    }
  }

  function collectSubscribedChangedPaths(
    before: Record<string, any>,
    after: Record<string, any>,
    changedPaths: Set<string>,
  ) {
    const candidatePaths = new Set<string>([
      ...pathListeners.keys(),
      ...descendantPathListeners.keys(),
    ]);

    for (const path of candidatePaths) {
      if (getIn(before, path) !== getIn(after, path)) {
        changedPaths.add(path);
      }
    }
  }

  function diffAndNotifyValuePaths(before: Record<string, any>, after: Record<string, any>) {
    const changedPaths = new Set<string>();
    collectChangedValuePaths(before, after, changedPaths);

    if (changedPaths.size === 0 && before !== after) {
      collectSubscribedChangedPaths(before, after, changedPaths);
    }

    notifyValuePathListeners(changedPaths);
  }

  function notifySubmitting() {
    for (const listener of submittingListeners) {
      listener();
    }
  }

  function diffAndNotifyFieldStates(
    before: Record<string, FieldState>,
    after: Record<string, FieldState>,
    changed: Set<string>,
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
    const currentState = store.getState();
    const current = currentState.fieldStates;
    const existing = current[path];
    const next = mergeFieldState(existing, patch);

    if (fieldStateEqual(existing, next)) {
      return;
    }

    const nextSummary = addSummaryDelta(
      currentState.summary ?? emptySummary(),
      diffSummaryCounters(existing, next),
    );

    if (next === undefined) {
      const { [path]: _removed, ...rest } = current;
      store.setState({ fieldStates: rest, summary: nextSummary });
    } else {
      store.setState({ fieldStates: { ...current, [path]: next }, summary: nextSummary });
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
      return subscribeToPaths([path], listener);
    },
    subscribeToPaths(paths, listener) {
      return subscribeToPaths(paths, listener);
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
        visited: fieldState?.visited === true,
      };
    },
    getFieldState(path) {
      return store.getState().fieldStates[path];
    },
    setFieldState(path, state) {
      updateFieldState(path, state);
    },
    setValues(values) {
      const before = store.getState().values;
      store.setState({ values });
      diffAndNotifyValuePaths(before, values);
    },
    setValue(path, value) {
      const current = store.getState().values;
      const nextValues = setIn(current, path, value);
      store.setState({ values: nextValues });
      diffAndNotifyValuePaths(current, nextValues);
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
      const nextFieldStates = updates.fieldStates;
      store.setState({
        ...updates,
        ...(nextFieldStates !== undefined
          ? { summary: computeSummaryFromFieldStates(nextFieldStates) }
          : undefined),
      });
      const after = store.getState();

      if (updates.values !== undefined && before.values !== after.values) {
        diffAndNotifyValuePaths(before.values, after.values);
      }

      if (updates.fieldStates !== undefined) {
        const changed = new Set<string>();
        diffAndNotifyFieldStates(before.fieldStates, after.fieldStates, changed);
        for (const path of changed) {
          notifyPath(path);
        }
      }

      if (
        (updates.submitting !== undefined && before.submitting !== after.submitting) ||
        (updates.submitAttempted !== undefined && before.submitAttempted !== after.submitAttempted)
      ) {
        notifySubmitting();
      }
    },
  };
}

export function createPageStore(initialData: Record<string, any>): PageStoreApi {
  const store = createStore<PageStoreState>(() => ({
    data: initialData,
    refreshTick: 0,
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
    },
  };
}

export function createSurfaceStore(): SurfaceStoreApi {
  const store = createStore<SurfaceStoreState>(() => ({
    entries: [],
    uncontrolledOpenById: {},
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
    upsert(entry: SurfaceEntry) {
      const state = store.getState();
      const index = state.entries.findIndex((existing) => existing.id === entry.id);

      if (index < 0) {
        store.setState({ entries: [...state.entries, entry] });
        return;
      }

      const nextEntries = state.entries.slice();
      nextEntries[index] = entry;
      store.setState({ entries: nextEntries });
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
    },
    setUncontrolledOpen(surfaceId, open) {
      const state = store.getState();
      if (state.uncontrolledOpenById[surfaceId] === open) {
        return;
      }

      store.setState({
        uncontrolledOpenById: {
          ...state.uncontrolledOpenById,
          [surfaceId]: open,
        },
      });
    },
    getUncontrolledOpen(surfaceId) {
      return store.getState().uncontrolledOpenById[surfaceId];
    },
    clearUncontrolledOpen(surfaceId) {
      const state = store.getState();
      if (!Object.prototype.hasOwnProperty.call(state.uncontrolledOpenById, surfaceId)) {
        return;
      }

      const next = { ...state.uncontrolledOpenById };
      delete next[surfaceId];
      store.setState({ uncontrolledOpenById: next });
    },
  };
}

import type {
  FieldState,
  FormStoreCommitDiagnostic,
  FormStoreDiagnosticsOptions,
  FormStoreDiagnosticsSnapshot,
  FormPathState,
  FormStoreApi,
  FormStoreState,
} from '@nop-chaos/flux-core';
import { validationErrorsEqual } from '@nop-chaos/flux-core';

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

const ownedFormStoreMetadata = new WeakMap<FormStoreApi, { baseStore: FormStoreApi; ownerId: string }>();
const OWNED_FIELD_STATE_SEPARATOR = '::';

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

function fieldStatesEqual(
  left: Record<string, FieldState>,
  right: Record<string, FieldState>,
): boolean {
  if (left === right) {
    return true;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!(key in right) || !fieldStateEqual(left[key], right[key])) {
      return false;
    }
  }

  return true;
}

function visibleFormStateEqual(left: FormStoreState, right: FormStoreState): boolean {
  return (
    left.values === right.values &&
    left.submitting === right.submitting &&
    left.submitAttempted === right.submitAttempted &&
    fieldStatesEqual(left.fieldStates, right.fieldStates)
  );
}

function encodeOwnedFieldStatePath(ownerId: string, path: string): string {
  return `${ownerId}${OWNED_FIELD_STATE_SEPARATOR}${path}`;
}

function decodeOwnedFieldStates(
  fieldStates: Record<string, FieldState>,
  ownerId: string,
): Record<string, FieldState> {
  const prefix = `${ownerId}${OWNED_FIELD_STATE_SEPARATOR}`;
  const next: Record<string, FieldState> = {};

  for (const [key, fieldState] of Object.entries(fieldStates)) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    next[key.slice(prefix.length)] = fieldState;
  }

  return next;
}

function replaceOwnedFieldStates(
  fieldStates: Record<string, FieldState>,
  ownerId: string,
  ownedFieldStates: Record<string, FieldState>,
): Record<string, FieldState> {
  const prefix = `${ownerId}${OWNED_FIELD_STATE_SEPARATOR}`;
  const next: Record<string, FieldState> = {};

  for (const [key, fieldState] of Object.entries(fieldStates)) {
    if (!key.startsWith(prefix)) {
      next[key] = fieldState;
    }
  }

  for (const [path, fieldState] of Object.entries(ownedFieldStates)) {
    next[encodeOwnedFieldStatePath(ownerId, path)] = fieldState;
  }

  return next;
}

function unwrapOwnedFormStore(store: FormStoreApi): FormStoreApi {
  return ownedFormStoreMetadata.get(store)?.baseStore ?? store;
}

function translateOwnedDiagnosticsSnapshot(
  snapshot: FormStoreDiagnosticsSnapshot,
  ownerId: string,
): FormStoreDiagnosticsSnapshot {
  if (!snapshot.enabled) {
    return snapshot;
  }

  const prefix = `${ownerId}${OWNED_FIELD_STATE_SEPARATOR}`;

  return {
    ...snapshot,
    recentCommits: snapshot.recentCommits.map((commit): FormStoreCommitDiagnostic => ({
      ...commit,
      ownerId,
      changedPaths: commit.changedPaths
        .map((path) => {
          if (path === '*' || !path.startsWith(prefix)) {
            return path;
          }

          return path.slice(prefix.length);
        })
        .filter((path) => path === '*' || !path.includes(OWNED_FIELD_STATE_SEPARATOR)),
    })),
  };
}

export function createOwnedFormStore(baseStore: FormStoreApi, ownerId: string): FormStoreApi {
  const resolvedBaseStore = unwrapOwnedFormStore(baseStore);
  let cachedBaseFieldStates: Record<string, FieldState> | undefined;
  let cachedOwnedFieldStates: Record<string, FieldState> | undefined;
  let cachedOwnedSummary: FormStoreSummaryState | undefined;

  function getOwnedFieldStates(baseFieldStates: Record<string, FieldState>): Record<string, FieldState> {
    if (cachedBaseFieldStates === baseFieldStates && cachedOwnedFieldStates) {
      return cachedOwnedFieldStates;
    }

    const ownedFieldStates = decodeOwnedFieldStates(baseFieldStates, ownerId);
    cachedBaseFieldStates = baseFieldStates;
    cachedOwnedFieldStates = ownedFieldStates;
    cachedOwnedSummary = computeSummaryFromFieldStates(ownedFieldStates);
    return ownedFieldStates;
  }

  function getOwnedState(): InternalFormStoreState {
    const state = resolvedBaseStore.getState() as InternalFormStoreState;
    const fieldStates = getOwnedFieldStates(state.fieldStates);

    return {
      values: state.values,
      fieldStates,
      submitting: state.submitting,
      submitAttempted: state.submitAttempted,
      summary: cachedOwnedSummary ?? computeSummaryFromFieldStates(fieldStates),
    };
  }

  const ownedStore: FormStoreApi = {
    getState() {
      return getOwnedState();
    },
    subscribe(listener) {
      let previousState = getOwnedState();

      return resolvedBaseStore.subscribe(() => {
        const nextState = getOwnedState();
        if (visibleFormStateEqual(previousState, nextState)) {
          return;
        }

        previousState = nextState;
        listener();
      });
    },
    subscribeToPath(path, listener) {
      return resolvedBaseStore.subscribeToPaths(
        [path, encodeOwnedFieldStatePath(ownerId, path)],
        listener,
      );
    },
    subscribeToPaths(paths, listener) {
      const ownedPaths = paths.map((path) => encodeOwnedFieldStatePath(ownerId, path));
      return resolvedBaseStore.subscribeToPaths([...paths, ...ownedPaths], listener);
    },
    subscribeToSubmitting(listener) {
      return resolvedBaseStore.subscribeToSubmitting(listener);
    },
    getPathState(path): FormPathState {
      const fieldState = getOwnedState().fieldStates[path];
      return {
        errors: fieldState?.errors,
        validating: fieldState?.validating === true,
        touched: fieldState?.touched === true,
        dirty: fieldState?.dirty === true,
        visited: fieldState?.visited === true,
      };
    },
    getFieldState(path) {
      return getOwnedState().fieldStates[path];
    },
    setFieldState(path, state) {
      resolvedBaseStore.setFieldState(encodeOwnedFieldStatePath(ownerId, path), state);
    },
    setValues(values) {
      resolvedBaseStore.setValues(values);
    },
    setValue(path, value) {
      resolvedBaseStore.setValue(path, value);
    },
    setPathErrors(path, errors) {
      resolvedBaseStore.setPathErrors(encodeOwnedFieldStatePath(ownerId, path), errors);
    },
    setValidating(path, validating) {
      resolvedBaseStore.setValidating(encodeOwnedFieldStatePath(ownerId, path), validating);
    },
    setTouched(path, touched) {
      resolvedBaseStore.setTouched(encodeOwnedFieldStatePath(ownerId, path), touched);
    },
    setDirty(path, dirty) {
      resolvedBaseStore.setDirty(encodeOwnedFieldStatePath(ownerId, path), dirty);
    },
    setVisited(path, visited) {
      resolvedBaseStore.setVisited(encodeOwnedFieldStatePath(ownerId, path), visited);
    },
    setSubmitting(submitting) {
      resolvedBaseStore.setSubmitting(submitting);
    },
    setSubmitAttempted(submitAttempted) {
      resolvedBaseStore.setSubmitAttempted(submitAttempted);
    },
    batchUpdate(updates) {
      if (updates.fieldStates === undefined) {
        resolvedBaseStore.batchUpdate(updates);
        return;
      }

      const currentState = resolvedBaseStore.getState();
      resolvedBaseStore.batchUpdate({
        ...updates,
        fieldStates: replaceOwnedFieldStates(currentState.fieldStates, ownerId, updates.fieldStates),
      });
    },
    startDiagnosticsSession(options?: FormStoreDiagnosticsOptions) {
      resolvedBaseStore.startDiagnosticsSession(options);
    },
    stopDiagnosticsSession() {
      resolvedBaseStore.stopDiagnosticsSession();
    },
    clearDiagnosticsSession() {
      resolvedBaseStore.clearDiagnosticsSession();
    },
    getDiagnosticsSnapshot() {
      return translateOwnedDiagnosticsSnapshot(resolvedBaseStore.getDiagnosticsSnapshot(), ownerId);
    },
  };

  ownedFormStoreMetadata.set(ownedStore, { baseStore: resolvedBaseStore, ownerId });
  return ownedStore;
}

import type { FieldState, ScopeRef } from '@nop-chaos/flux-core';
import { setIn } from '@nop-chaos/flux-core';
import { remapFieldStates, transformArrayIndexedPath } from './form-path-state.js';
import { remapExternalErrors } from './form-runtime-owner-external-errors.js';
import type {
  FormRuntimeInitialStateSlice,
  FormRuntimeStoreScopeState,
  FormRuntimeValidationRunState,
} from './form-runtime-types.js';
import type { ExternalErrorEntry } from './form-runtime-types.js';

type ArrayMutationState = FormRuntimeStoreScopeState &
  FormRuntimeInitialStateSlice &
  FormRuntimeValidationRunState & {
    hiddenFields: Set<string>;
    externalErrors: Map<string, ExternalErrorEntry>;
  };

export function remapValidationRunState(
  sharedState: FormRuntimeValidationRunState,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
  cancelValidationDebounce: (path: string) => void,
) {
  const prefix = `${arrayPath}.`;

  for (const path of Array.from(sharedState.validationRuns.keys())) {
    if (!path.startsWith(prefix)) {
      continue;
    }

    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (!nextPath) {
      sharedState.validationRuns.delete(path);
      continue;
    }

    if (nextPath !== path) {
      const value = sharedState.validationRuns.get(path);
      sharedState.validationRuns.delete(path);

      if (value !== undefined) {
        sharedState.validationRuns.set(nextPath, value);
      }
    }
  }

  for (const path of Array.from(sharedState.pendingValidationDebounces.keys())) {
    if (!path.startsWith(prefix)) {
      continue;
    }

    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (!nextPath) {
      cancelValidationDebounce(path);
      continue;
    }

    if (nextPath !== path) {
      const pending = sharedState.pendingValidationDebounces.get(path);

      if (!pending) {
        continue;
      }

      sharedState.pendingValidationDebounces.delete(path);
      sharedState.pendingValidationDebounces.set(nextPath, pending);
    }
  }
}

export function remapInitialFieldState(
  sharedState: FormRuntimeInitialStateSlice,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
) {
  const nextInitialValues: Record<string, unknown> = {};
  const nextDirty: Record<string, boolean> = {};

  for (const [path, value] of Object.entries(sharedState.initialFieldState.initialValues)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath) {
      nextInitialValues[nextPath] = value;
    }
  }

  for (const [path, value] of Object.entries(sharedState.initialFieldState.dirty)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath && value) {
      nextDirty[nextPath] = true;
    }
  }

  sharedState.initialFieldState.initialValues = nextInitialValues;
  sharedState.initialFieldState.dirty = nextDirty;
}

export function remapHiddenFields(
  hiddenFields: Set<string>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
) {
  const nextHiddenFields = new Set<string>();

  for (const path of hiddenFields) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath) {
      nextHiddenFields.add(nextPath);
    }
  }

  hiddenFields.clear();

  for (const path of nextHiddenFields) {
    hiddenFields.add(path);
  }
}

export function remapArrayFieldState(
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
  state: { fieldStates: Record<string, FieldState> },
): { fieldStates: Record<string, FieldState> } {
  return {
    fieldStates: remapFieldStates(state.fieldStates, arrayPath, transformIndex),
  };
}

export function replaceManagedArrayValue(input: {
  arrayPath: string;
  nextValue: unknown[];
  state: { values: Record<string, any>; fieldStates: Record<string, FieldState> };
  initialFieldState: FormRuntimeInitialStateSlice['initialFieldState'];
  remappedState: { fieldStates: Record<string, FieldState> };
}) {
  const baseline = input.initialFieldState.initialValues[input.arrayPath];
  const isDirty = !Object.is(baseline, input.nextValue);

  const nextFieldStates = { ...input.remappedState.fieldStates };
  const arrayFieldState = nextFieldStates[input.arrayPath];

  if (arrayFieldState) {
    const updatedArrayState: FieldState = { ...arrayFieldState };
    delete updatedArrayState.validating;
    delete updatedArrayState.errors;

    if (isDirty) {
      updatedArrayState.dirty = true;
    } else {
      delete updatedArrayState.dirty;
    }

    if (Object.keys(updatedArrayState).length === 0) {
      delete nextFieldStates[input.arrayPath];
    } else {
      nextFieldStates[input.arrayPath] = updatedArrayState;
    }
  } else if (isDirty) {
    nextFieldStates[input.arrayPath] = { dirty: true };
  }

  return {
    values: setIn(input.state.values, input.arrayPath, input.nextValue),
    fieldStates: nextFieldStates,
  };
}

export function executeArrayMutation(ctx: {
  sharedState: ArrayMutationState;
  scope: ScopeRef;
  formId?: string;
  setLastChange?: (change: import('@nop-chaos/flux-core').ScopeChange) => void;
  getArrayValue: (path: string) => unknown;
  arrayPath: string;
  arrayOperation: (current: unknown[]) => unknown[];
  indexTransform: (candidateIndex: number) => number | undefined;
  cancelValidationDebounce: (path: string) => void;
  revalidateDependents: (
    path: string,
    reason?: import('@nop-chaos/flux-core').ValidationReason,
  ) => Promise<void>;
}): void {
  const currentValue = ctx.getArrayValue(ctx.arrayPath);
  const currentArray = Array.isArray(currentValue) ? currentValue : [];
  const nextValue = ctx.arrayOperation(currentArray);

  ctx.sharedState.validationRuns.set(
    ctx.arrayPath,
    (ctx.sharedState.validationRuns.get(ctx.arrayPath) ?? 0) + 1,
  );
  ctx.cancelValidationDebounce(ctx.arrayPath);

  const state = ctx.sharedState.store.getState();
  const remappedState = remapArrayFieldState(ctx.arrayPath, ctx.indexTransform, state);
  const nextStoreState = replaceManagedArrayValue({
    arrayPath: ctx.arrayPath,
    nextValue,
    state,
    initialFieldState: ctx.sharedState.initialFieldState,
    remappedState,
  });

  ctx.setLastChange?.({
    paths: [ctx.arrayPath],
    sourceScopeId: ctx.formId ?? ctx.scope.id,
    kind: 'update',
  });
  ctx.sharedState.store.batchUpdate(nextStoreState);
  remapValidationRunState(
    ctx.sharedState,
    ctx.arrayPath,
    ctx.indexTransform,
    ctx.cancelValidationDebounce,
  );
  remapInitialFieldState(ctx.sharedState, ctx.arrayPath, ctx.indexTransform);
  remapHiddenFields(ctx.sharedState.hiddenFields, ctx.arrayPath, ctx.indexTransform);
  remapExternalErrors(ctx.sharedState.externalErrors, ctx.arrayPath, ctx.indexTransform);
  void ctx.revalidateDependents(ctx.arrayPath, 'change');
}

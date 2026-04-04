import type { ScopeRef } from '@nop-chaos/flux-core';
import { setIn } from '@nop-chaos/flux-core';
import { remapBooleanState, remapErrorState, transformArrayIndexedPath } from './form-path-state';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export function remapValidationRunState(
  sharedState: ManagedFormRuntimeSharedState,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
  cancelValidationDebounce: (path: string) => void
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
  sharedState: ManagedFormRuntimeSharedState,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
) {
  const nextInitialValues: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(sharedState.initialFieldState.initialValues)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath) {
      nextInitialValues[nextPath] = value;
    }
  }

  sharedState.initialFieldState.initialValues = nextInitialValues;
  sharedState.initialFieldState.dirty = remapBooleanState(sharedState.initialFieldState.dirty, arrayPath, transformIndex);
}

export function remapArrayFieldState(
  sharedState: ManagedFormRuntimeSharedState,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined,
  cancelValidationDebounce: (path: string) => void
) {
  const state = sharedState.store.getState();
  sharedState.store.batchUpdate({
    errors: remapErrorState(state.errors, arrayPath, transformIndex),
    touched: remapBooleanState(state.touched, arrayPath, transformIndex),
    dirty: remapBooleanState(state.dirty, arrayPath, transformIndex),
    visited: remapBooleanState(state.visited, arrayPath, transformIndex),
    validating: remapBooleanState(state.validating, arrayPath, transformIndex)
  });
  remapValidationRunState(sharedState, arrayPath, transformIndex, cancelValidationDebounce);
  remapInitialFieldState(sharedState, arrayPath, transformIndex);
}

export function replaceManagedArrayValue(input: {
  sharedState: ManagedFormRuntimeSharedState;
  arrayPath: string;
  nextValue: unknown[];
  cancelValidationDebounce: (path: string) => void;
  revalidateDependents: (path: string) => Promise<void>;
}) {
  input.sharedState.validationRuns.set(
    input.arrayPath,
    (input.sharedState.validationRuns.get(input.arrayPath) ?? 0) + 1
  );
  input.cancelValidationDebounce(input.arrayPath);

  const state = input.sharedState.store.getState();
  const baseline = input.sharedState.initialFieldState.initialValues[input.arrayPath];
  const isDirty = !Object.is(baseline, input.nextValue);

  const nextValidating = { ...state.validating };
  delete nextValidating[input.arrayPath];

  const nextDirty = isDirty
    ? { ...state.dirty, [input.arrayPath]: true }
    : (() => { const d = { ...state.dirty }; delete d[input.arrayPath]; return d; })();

  const nextErrors = { ...state.errors };
  delete nextErrors[input.arrayPath];

  input.sharedState.store.batchUpdate({
    validating: nextValidating,
    dirty: nextDirty,
    values: setIn(state.values, input.arrayPath, input.nextValue),
    errors: nextErrors
  });

  void input.revalidateDependents(input.arrayPath);
}

export function executeArrayMutation(ctx: {
  sharedState: ManagedFormRuntimeSharedState;
  scope: ScopeRef;
  arrayPath: string;
  arrayOperation: (current: unknown[]) => unknown[];
  indexTransform: (candidateIndex: number) => number | undefined;
  cancelValidationDebounce: (path: string) => void;
  revalidateDependents: (path: string) => Promise<void>;
}): void {
  const currentValue = ctx.scope.get(ctx.arrayPath);
  const currentArray = Array.isArray(currentValue) ? currentValue : [];
  const nextValue = ctx.arrayOperation(currentArray);

  remapArrayFieldState(ctx.sharedState, ctx.arrayPath, ctx.indexTransform, ctx.cancelValidationDebounce);
  replaceManagedArrayValue({
    sharedState: ctx.sharedState,
    arrayPath: ctx.arrayPath,
    nextValue,
    cancelValidationDebounce: ctx.cancelValidationDebounce,
    revalidateDependents: ctx.revalidateDependents
  });
}

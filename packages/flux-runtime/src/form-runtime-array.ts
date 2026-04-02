import type { ScopeRef } from '@nop-chaos/flux-core';
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
  sharedState.store.setErrors(remapErrorState(state.errors, arrayPath, transformIndex));
  sharedState.store.setTouchedState(remapBooleanState(state.touched, arrayPath, transformIndex));
  sharedState.store.setDirtyState(remapBooleanState(state.dirty, arrayPath, transformIndex));
  sharedState.store.setVisitedState(remapBooleanState(state.visited, arrayPath, transformIndex));
  sharedState.store.setValidatingState(remapBooleanState(state.validating, arrayPath, transformIndex));
  remapValidationRunState(sharedState, arrayPath, transformIndex, cancelValidationDebounce);
  remapInitialFieldState(sharedState, arrayPath, transformIndex);
}

export function replaceManagedArrayValue(input: {
  sharedState: ManagedFormRuntimeSharedState;
  arrayPath: string;
  nextValue: unknown[];
  cancelValidationDebounce: (path: string) => void;
  clearErrors: (path?: string) => void;
  revalidateDependents: (path: string) => Promise<void>;
}) {
  input.sharedState.validationRuns.set(
    input.arrayPath,
    (input.sharedState.validationRuns.get(input.arrayPath) ?? 0) + 1
  );
  input.cancelValidationDebounce(input.arrayPath);
  input.sharedState.store.setValidating(input.arrayPath, false);
  const baseline = input.sharedState.initialFieldState.initialValues[input.arrayPath];
  input.sharedState.store.setDirty(input.arrayPath, !Object.is(baseline, input.nextValue));
  input.sharedState.store.setValue(input.arrayPath, input.nextValue);
  input.clearErrors(input.arrayPath);
  void input.revalidateDependents(input.arrayPath);
}

export function executeArrayMutation(ctx: {
  sharedState: ManagedFormRuntimeSharedState;
  scope: ScopeRef;
  arrayPath: string;
  arrayOperation: (current: unknown[]) => unknown[];
  indexTransform: (candidateIndex: number) => number | undefined;
  cancelValidationDebounce: (path: string) => void;
  clearErrors: (path?: string) => void;
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
    clearErrors: ctx.clearErrors,
    revalidateDependents: ctx.revalidateDependents
  });
}

import type { ScopeRef, ValidationError } from '@nop-chaos/flux-core';
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
  state: ReturnType<ManagedFormRuntimeSharedState['store']['getState']>
) {
  return {
    errors: remapErrorState(state.errors, arrayPath, transformIndex),
    touched: remapBooleanState(state.touched, arrayPath, transformIndex),
    dirty: remapBooleanState(state.dirty, arrayPath, transformIndex),
    visited: remapBooleanState(state.visited, arrayPath, transformIndex),
    validating: remapBooleanState(state.validating, arrayPath, transformIndex)
  };
}

export function replaceManagedArrayValue(input: {
  arrayPath: string;
  nextValue: unknown[];
  state: ReturnType<ManagedFormRuntimeSharedState['store']['getState']>;
  initialFieldState: ManagedFormRuntimeSharedState['initialFieldState'];
  remappedState: {
    errors: Record<string, ValidationError[]>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    validating: Record<string, boolean>;
  };
}) {
  const baseline = input.initialFieldState.initialValues[input.arrayPath];
  const isDirty = !Object.is(baseline, input.nextValue);

  const nextValidating = { ...input.remappedState.validating };
  delete nextValidating[input.arrayPath];

  const nextDirty = isDirty
    ? { ...input.remappedState.dirty, [input.arrayPath]: true }
    : (() => { const d = { ...input.remappedState.dirty }; delete d[input.arrayPath]; return d; })();

  const nextErrors = { ...input.remappedState.errors };
  delete nextErrors[input.arrayPath];

  return {
    values: setIn(input.state.values, input.arrayPath, input.nextValue),
    errors: nextErrors,
    touched: input.remappedState.touched,
    dirty: nextDirty,
    visited: input.remappedState.visited,
    validating: nextValidating
  };
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

  ctx.sharedState.validationRuns.set(
    ctx.arrayPath,
    (ctx.sharedState.validationRuns.get(ctx.arrayPath) ?? 0) + 1
  );
  ctx.cancelValidationDebounce(ctx.arrayPath);

  const state = ctx.sharedState.store.getState();
  const remappedState = remapArrayFieldState(ctx.sharedState, ctx.arrayPath, ctx.indexTransform, state);
  const nextStoreState = replaceManagedArrayValue({
    arrayPath: ctx.arrayPath,
    nextValue,
    state,
    initialFieldState: ctx.sharedState.initialFieldState,
    remappedState
  });

  ctx.sharedState.store.batchUpdate(nextStoreState);
  remapValidationRunState(ctx.sharedState, ctx.arrayPath, ctx.indexTransform, ctx.cancelValidationDebounce);
  remapInitialFieldState(ctx.sharedState, ctx.arrayPath, ctx.indexTransform);
  void ctx.revalidateDependents(ctx.arrayPath);
}

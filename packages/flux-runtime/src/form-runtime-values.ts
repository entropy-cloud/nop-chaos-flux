import type { ScopeChange, ValidationError } from '@nop-chaos/flux-core';
import { cancelValidationDebounce } from './form-runtime-validation';
import { applyFieldValuePatch } from './form-runtime-field-ops';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export interface SetValuesContext {
  sharedState: ManagedFormRuntimeSharedState;
  formId: string;
  setLastChange: (change: ScopeChange) => void;
  clearExternalErrorsForPath: (path: string) => boolean;
  rebuildStoreErrorsFromExternal: (errors: Record<string, ValidationError[]>) => Record<string, ValidationError[]>;
  revalidateDependents: (path: string) => Promise<void>;
}

export function executeSetValues(
  ctx: SetValuesContext,
  values: Record<string, unknown>
): void {
  const { sharedState, formId, setLastChange, clearExternalErrorsForPath, rebuildStoreErrorsFromExternal, revalidateDependents } = ctx;
  const { store, lifecycleState, validationRuns, initialFieldState } = sharedState;

  if (lifecycleState === 'disposed') return;

  const entries = Object.entries(values);

  if (entries.length === 0) {
    return;
  }

  const state = store.getState();
  let nextValues = state.values;
  let nextDirty = state.dirty;
  let nextErrors = state.errors;
  let nextValidating = state.validating;
  const changedPaths: string[] = [];

  for (const [name, value] of entries) {
    validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
    cancelValidationDebounce(sharedState, name);

    const baseline = initialFieldState.initialValues[name];
    const patch = applyFieldValuePatch(
      sharedState,
      {
        ...state,
        values: nextValues,
        dirty: nextDirty,
        errors: nextErrors,
        validating: nextValidating
      },
      name,
      value,
      !Object.is(baseline, value)
    );

    nextValues = patch.nextValues;
    nextDirty = patch.nextDirty;
    nextErrors = patch.nextErrors;
    nextValidating = patch.nextValidating;

    changedPaths.push(name);
  }

  setLastChange({
    paths: changedPaths.length > 0 ? changedPaths : ['*'],
    sourceScopeId: formId,
    kind: 'update'
  });

  store.batchUpdate({
    values: nextValues,
    dirty: nextDirty,
    errors: nextErrors,
    validating: nextValidating
  });

  let externalChanged = false;
  for (const changedPath of changedPaths) {
    if (clearExternalErrorsForPath(changedPath)) {
      externalChanged = true;
    }
  }

  if (externalChanged) {
    const nextStoreErrors = rebuildStoreErrorsFromExternal(store.getState().errors);
    store.setErrors(nextStoreErrors);
  }

  for (const changedPath of changedPaths) {
    void revalidateDependents(changedPath);
  }
}

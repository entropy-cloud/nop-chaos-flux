import type { FieldState, ScopeChange, ValidationError } from '@nop-chaos/flux-core';
import { cancelValidationDebounce } from './form-runtime-validation';
import { applyFieldValuePatch } from './form-runtime-field-ops';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';

export interface SetValuesContext {
  sharedState: ManagedFormRuntimeSharedState;
  formId: string;
  setLastChange: (change: ScopeChange) => void;
  clearExternalErrorsForPath: (path: string) => boolean;
  rebuildStoreErrorsFromExternal: (
    fieldStates: Record<string, FieldState>,
  ) => Record<string, ValidationError[]>;
  revalidateDependents: (
    path: string,
    reason?: import('@nop-chaos/flux-core').ValidationReason,
  ) => Promise<void>;
}

export function executeSetValues(ctx: SetValuesContext, values: Record<string, unknown>): void {
  const {
    sharedState,
    formId,
    setLastChange,
    clearExternalErrorsForPath,
    rebuildStoreErrorsFromExternal,
    revalidateDependents,
  } = ctx;
  const { store, lifecycleState, validationRuns, initialFieldState } = sharedState;

  if (lifecycleState === 'disposed') return;

  const entries = Object.entries(values);

  if (entries.length === 0) {
    return;
  }

  const state = store.getState();
  let nextValues = state.values;
  let nextFieldStates = state.fieldStates;
  const changedPaths: string[] = [];

  for (const [name, value] of entries) {
    validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
    cancelValidationDebounce(sharedState, name);

    const baseline = initialFieldState.initialValues[name];
    const patch = applyFieldValuePatch(
      sharedState,
      { values: nextValues, fieldStates: nextFieldStates },
      name,
      value,
      !Object.is(baseline, value),
    );

    nextValues = patch.nextValues;
    nextFieldStates = patch.nextFieldStates;

    changedPaths.push(name);
  }

  setLastChange({
    paths: changedPaths.length > 0 ? changedPaths : ['*'],
    sourceScopeId: formId,
    kind: 'update',
  });

  store.batchUpdate({
    values: nextValues,
    fieldStates: nextFieldStates,
  });

  let externalChanged = false;
  for (const changedPath of changedPaths) {
    if (clearExternalErrorsForPath(changedPath)) {
      externalChanged = true;
    }
  }

  if (externalChanged) {
    const currentFieldStates = store.getState().fieldStates;
    const nextErrors = rebuildStoreErrorsFromExternal(currentFieldStates);

    const updatedFieldStates = { ...currentFieldStates };
    for (const path of Object.keys(updatedFieldStates)) {
      const fs = updatedFieldStates[path];
      if (fs?.errors && !nextErrors[path]) {
        const { errors: _removed, ...rest } = fs;
        if (Object.keys(rest).length > 0) {
          updatedFieldStates[path] = rest;
        } else {
          delete updatedFieldStates[path];
        }
      }
    }
    for (const [path, pathErrors] of Object.entries(nextErrors)) {
      updatedFieldStates[path] = { ...updatedFieldStates[path], errors: pathErrors };
    }
    store.batchUpdate({ fieldStates: updatedFieldStates });
  }

  for (const changedPath of changedPaths) {
    void revalidateDependents(changedPath, 'change');
  }
}

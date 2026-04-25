import type {
  FormStatusSummary,
  FormStoreState,
  ScopeChange,
  ScopeRef
} from '@nop-chaos/flux-core';
import { validationErrorsEqual } from '@nop-chaos/flux-core';
import { createReadonlyScopeBinding } from './status-owner';

export { validationErrorsEqual };

export function buildFormStatusSummary(
  state: FormStoreState,
  id: string | undefined,
  name: string | undefined
): FormStatusSummary {
  let errorCount = 0;
  let validating = false;
  let dirty = false;
  let touched = false;
  let visited = false;

  for (const fieldState of Object.values(state.fieldStates)) {
    if (fieldState.errors) {
      errorCount += fieldState.errors.length;
    }
    if (fieldState.validating) validating = true;
    if (fieldState.dirty) dirty = true;
    if (fieldState.touched) touched = true;
    if (fieldState.visited) visited = true;
  }

  const hasErrors = errorCount > 0;

  return {
    id,
    name,
    submitting: state.submitting,
    validating,
    dirty,
    touched,
    visited,
    hasErrors,
    errorCount,
    valid: !hasErrors,
    invalid: hasErrors
  };
}

export function createFormScopeWithBinding(input: {
  scope: ScopeRef;
  formId: string;
  formName: string | undefined;
  getStoreState: () => FormStoreState;
}) {
  const formScopeWithBinding = createReadonlyScopeBinding(
    input.scope,
    '$form',
    () => buildFormStatusSummary(input.getStoreState(), input.formId, input.formName)
  );

  Object.defineProperty(formScopeWithBinding, 'value', {
    get() {
      return this.readVisible();
    },
    configurable: true,
    enumerable: false
  });

  return formScopeWithBinding;
}

export function createInitialFormScopeChange(formId: string): ScopeChange {
  return {
    paths: ['*'],
    sourceScopeId: formId,
    kind: 'replace',
    revision: 0
  } as const;
}

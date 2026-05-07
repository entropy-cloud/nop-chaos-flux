import type {
  FormStatusSummary,
  FormStoreState,
  ScopeChange,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { validationErrorsEqual } from '@nop-chaos/flux-core';
import { createReadonlyScopeBinding } from './status-owner.js';

export function hasPendingValidationWork(
  state: FormStoreState,
  pendingValidationDebounceCount = 0,
): boolean {
  if (pendingValidationDebounceCount > 0) {
    return true;
  }

  return Object.values(state.fieldStates).some((fieldState) => fieldState.validating === true);
}

export { validationErrorsEqual };

export function buildFormStatusSummary(
  state: FormStoreState,
  id: string | undefined,
  name: string | undefined,
  pendingValidationDebounceCount = 0,
): FormStatusSummary {
  let errorCount = 0;
  let dirty = false;
  let touched = false;
  let visited = false;

  for (const fieldState of Object.values(state.fieldStates)) {
    if (fieldState.errors) {
      errorCount += fieldState.errors.length;
    }
    if (fieldState.dirty) dirty = true;
    if (fieldState.touched) touched = true;
    if (fieldState.visited) visited = true;
  }

  const validating = hasPendingValidationWork(state, pendingValidationDebounceCount);
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
    invalid: hasErrors,
  };
}

export function createFormScopeWithBinding(input: {
  scope: ScopeRef;
  formId: string;
  formName: string | undefined;
  getStoreState: () => FormStoreState;
  getPendingValidationDebounceCount?: () => number;
}) {
  const formScopeWithBinding = createReadonlyScopeBinding(input.scope, '$form', () =>
    buildFormStatusSummary(
      input.getStoreState(),
      input.formId,
      input.formName,
      input.getPendingValidationDebounceCount?.() ?? 0,
    ),
  );

  Object.defineProperty(formScopeWithBinding, 'value', {
    get() {
      return this.readVisible();
    },
    configurable: true,
    enumerable: false,
  });

  return formScopeWithBinding;
}

export function createInitialFormScopeChange(formId: string): ScopeChange {
  return {
    paths: ['*'],
    sourceScopeId: formId,
    kind: 'replace',
    revision: 0,
  } as const;
}

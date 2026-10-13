import type {
  FormStatusSummary,
  FormStoreState,
  ScopeChange,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { validationErrorsEqual } from '@nop-chaos/flux-core';
import { summarizeFieldStates, type FormStoreSummaryState } from './form-store.js';
import { createReadonlyScopeBinding } from './status-owner.js';

type FormStoreStateWithSummary = FormStoreState & {
  summary?: FormStoreSummaryState;
};

function getFormStoreSummary(state: FormStoreState): FormStoreSummaryState {
  return (state as FormStoreStateWithSummary).summary ?? summarizeFieldStates(state.fieldStates);
}

export function hasPendingValidationWork(
  state: FormStoreState,
  pendingValidationDebounceCount = 0,
): boolean {
  if (pendingValidationDebounceCount > 0) {
    return true;
  }

  return getFormStoreSummary(state).validatingCount > 0;
}

export { validationErrorsEqual };

export function buildFormStatusSummary(
  state: FormStoreState,
  id: string | undefined,
  name: string | undefined,
  pendingValidationDebounceCount = 0,
): FormStatusSummary {
  const summaryState = getFormStoreSummary(state);
  const errorCount = summaryState.errorCount;
  const dirty = summaryState.dirtyCount > 0;
  const touched = summaryState.touchedCount > 0;
  const visited = summaryState.visitedCount > 0;

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

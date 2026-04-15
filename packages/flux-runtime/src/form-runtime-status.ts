import type {
  FormStatusSummary,
  FormStoreState,
  ScopeChange,
  ScopeRef,
  ValidationError
} from '@nop-chaos/flux-core';
import { createReadonlyScopeBinding } from './status-owner';

export function validationErrorsEqual(
  left: ValidationError[] | undefined,
  right: ValidationError[] | undefined
) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((error, index) => {
    const candidate = right[index];

    return candidate?.path === error.path && candidate?.rule === error.rule && candidate?.message === error.message;
  });
}

export function buildFormStatusSummary(
  state: FormStoreState,
  id: string | undefined,
  name: string | undefined
): FormStatusSummary {
  const errorEntries = Object.values(state.errors);
  const errorCount = errorEntries.reduce((acc, errs) => acc + errs.length, 0);
  const hasErrors = errorCount > 0;
  const validating = Object.values(state.validating).some(Boolean);
  const dirty = Object.values(state.dirty).some(Boolean);
  const touched = Object.values(state.touched).some(Boolean);
  const visited = Object.values(state.visited).some(Boolean);

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
    kind: 'replace'
  } as const;
}

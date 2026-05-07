import {
  shouldShowFieldError,
  selectCurrentFormFieldPresentation,
  useChildFieldState,
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationValues,
  useOwnedFieldState,
} from '@nop-chaos/flux-react';
import { isFieldEffectivelyRequired } from '@nop-chaos/flux-react';
import type { ValidationScopeRuntime } from '@nop-chaos/flux-core';
import { getValidationBehaviorForOwner } from './field-validation.js';

function useFormFieldState(name: string) {
  return useOwnedFieldState(name);
}

export function useCompositeChildFieldState(name: string) {
  return useChildFieldState(name);
}

export function useFieldPresentation(
  name: string,
  currentValidationScope: ValidationScopeRuntime | undefined,
  options?: {
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
  },
) {
  const fieldState = useFormFieldState(name);
  const currentForm = useCurrentForm();
  const behavior = getValidationBehaviorForOwner(name, currentValidationScope);
  const currentPresentation = useCurrentFormState(
    (state) =>
      selectCurrentFormFieldPresentation(state, {
        path: name,
        validation: currentValidationScope?.validation,
        disabled: options?.disabled,
        readOnly: options?.readOnly,
        required: options?.required,
        query: { path: name, ownerPath: name },
      }),
    (left, right) =>
      left.error === right.error &&
      left.validating === right.validating &&
      left.touched === right.touched &&
      left.dirty === right.dirty &&
      left.visited === right.visited &&
      left.submitting === right.submitting &&
      left.submitAttempted === right.submitAttempted &&
      left.effectiveDisabled === right.effectiveDisabled &&
      left.effectiveRequired === right.effectiveRequired &&
      left.showError === right.showError &&
      left.interactive === right.interactive &&
      left.readOnly === right.readOnly,
    { path: name },
  );
  const ownerEffectiveRequired = useCurrentValidationValues(
    (values) =>
      Boolean(options?.required) ||
      isFieldEffectivelyRequired(currentValidationScope?.validation, name, values as Record<string, any>),
    Object.is,
    { enabled: !currentForm, path: name },
  );
  const presentation = currentForm
    ? currentPresentation
    : {
        ...fieldState,
        effectiveDisabled: Boolean(options?.disabled),
        effectiveRequired: ownerEffectiveRequired,
        showError: Boolean(
          fieldState.error &&
          shouldShowFieldError(behavior, {
            touched: fieldState.touched,
            dirty: fieldState.dirty,
            visited: fieldState.visited,
            submitting: fieldState.submitting,
            submitAttempted: fieldState.submitAttempted,
          }),
        ),
        interactive: !options?.disabled && !options?.readOnly,
        readOnly: Boolean(options?.readOnly),
      };

  return {
    fieldState: {
      ...presentation,
      error: presentation.error,
    },
    effectiveDisabled: presentation.effectiveDisabled,
    effectiveRequired: presentation.effectiveRequired,
    interactive: presentation.interactive,
    readOnly: presentation.readOnly,
    showError: presentation.showError,
    className: undefined,
    'data-field-visited': presentation.visited ? '' : undefined,
    'data-field-touched': presentation.touched ? '' : undefined,
    'data-field-dirty': presentation.dirty ? '' : undefined,
    'data-field-invalid': presentation.showError ? '' : undefined,
  };
}

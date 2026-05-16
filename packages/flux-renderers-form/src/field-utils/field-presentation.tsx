import { useMemo } from 'react';
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
import { getCompiledValidationField, type ValidationScopeRuntime } from '@nop-chaos/flux-core';
import { getValidationBehaviorForOwner } from './field-validation.js';

function getDynamicRequiredDependencyPaths(field: { rules: Array<{ rule: { kind?: string; path?: string } }> } | undefined): readonly string[] {
  if (!field) {
    return [];
  }

  const dependencies = new Set<string>();

  for (const { rule } of field.rules) {
    if ((rule.kind === 'requiredWhen' || rule.kind === 'requiredUnless') && rule.path) {
      dependencies.add(rule.path);
    }
  }

  return [...dependencies];
}

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
  const behavior = getValidationBehaviorForOwner(name, currentValidationScope);
  const validationField = getCompiledValidationField(currentValidationScope?.validation, name);
  const dynamicRequiredDependencyPaths = getDynamicRequiredDependencyPaths(validationField);
  const hasDynamicRequiredRule = dynamicRequiredDependencyPaths.length > 0;
  const currentForm = useCurrentForm();
  const presentationPaths = useMemo(() => {
    const paths = new Set<string>();
    if (name) {
      paths.add(name);
    }
    for (const path of dynamicRequiredDependencyPaths) {
      paths.add(path);
    }
    return Array.from(paths);
  }, [dynamicRequiredDependencyPaths, name]);
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
    { paths: presentationPaths },
  );
  const ownerEffectiveRequired = useCurrentValidationValues(
    (values) =>
      (options?.required ?? false) ||
      isFieldEffectivelyRequired(currentValidationScope?.validation, name, values as Record<string, any>),
    Object.is,
    {
      enabled: !currentForm,
      paths: hasDynamicRequiredRule ? dynamicRequiredDependencyPaths : [name],
    },
  );
  const presentation = currentForm
    ? currentPresentation
    : {
        ...fieldState,
        effectiveDisabled: options?.disabled ?? false,
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
        readOnly: options?.readOnly ?? false,
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

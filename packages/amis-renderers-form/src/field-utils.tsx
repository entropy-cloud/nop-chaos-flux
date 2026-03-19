import React from 'react';
import type { CompiledValidationBehavior, FormFieldStateSnapshot, FormRuntime } from '@nop-chaos/amis-schema';
import { useAggregateError, useChildFieldState, useOwnedFieldState, useRenderScope } from '@nop-chaos/amis-react';

export const defaultValidationBehavior: CompiledValidationBehavior = {
  triggers: ['blur'],
  showErrorOn: ['touched', 'submit']
};

export function getFieldValidationBehavior(name: string, currentForm: FormRuntime | undefined): CompiledValidationBehavior {
  if (!currentForm || !name) {
    return defaultValidationBehavior;
  }

  const field = currentForm.validation?.fields[name];
  return field?.behavior ?? currentForm.validation?.behavior ?? defaultValidationBehavior;
}

export function shouldValidateOn(name: string, currentForm: FormRuntime | undefined, trigger: 'change' | 'blur' | 'submit') {
  return getFieldValidationBehavior(name, currentForm).triggers.includes(trigger);
}

export function shouldShowFieldError(
  behavior: CompiledValidationBehavior,
  state: { touched: boolean; dirty: boolean; visited: boolean; submitting: boolean }
) {
  return behavior.showErrorOn.some((trigger) => {
    switch (trigger) {
      case 'touched':
        return state.touched;
      case 'dirty':
        return state.dirty;
      case 'visited':
        return state.visited;
      case 'submit':
        return state.submitting;
    }
  });
}

export function readFieldValue(scope: ReturnType<typeof useRenderScope>, name: string): unknown {
  return name ? scope.get(name) ?? '' : '';
}

export function readCheckboxGroupValue(scope: ReturnType<typeof useRenderScope>, name: string): string[] {
  const value = readFieldValue(scope, name);
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function getFieldClassName(state: {
  visited: boolean;
  touched: boolean;
  dirty: boolean;
  showError: boolean;
}) {
  return [
    'na-field',
    state.visited ? 'na-field--visited' : '',
    state.touched ? 'na-field--touched' : '',
    state.dirty ? 'na-field--dirty' : '',
    state.showError ? 'na-field--invalid' : ''
  ]
    .filter(Boolean)
    .join(' ');
}

export function createFieldHandlers(args: {
  name: string;
  currentForm: FormRuntime | undefined;
  scope: ReturnType<typeof useRenderScope>;
  setValue: (value: string) => void;
}) {
  const { name, currentForm, scope, setValue } = args;

  return {
    onFocus() {
      if (currentForm && name) {
        currentForm.visitField(name);
      }
    },
    onChange(nextValue: string) {
      if (currentForm) {
        setValue(nextValue);

        if (shouldValidateOn(name, currentForm, 'change') && currentForm.isTouched(name)) {
          void currentForm.validateField(name);
        }

        return;
      }

      scope.update(name, nextValue);
    },
    onBlur() {
      if (currentForm && name) {
        currentForm.touchField(name);

        if (shouldValidateOn(name, currentForm, 'blur')) {
          void currentForm.validateField(name);
        }
      }
    }
  };
}

function useFormFieldState(name: string) {
  return useOwnedFieldState(name);
}

export function renderFieldHint(input: {
  errorMessage?: string;
  validating?: boolean;
  showError?: boolean;
}) {
  if (input.errorMessage && input.showError) {
    return <span className="na-field__error">{input.errorMessage}</span>;
  }

  if (input.validating) {
    return <span className="na-field__hint">Validating...</span>;
  }

  return null;
}

export function getChildFieldUiState(input: {
  behavior: CompiledValidationBehavior;
  fieldState: FormFieldStateSnapshot;
}) {
  const error = input.fieldState.error;
  const touched = input.fieldState.touched;
  const dirty = input.fieldState.dirty;
  const visited = input.fieldState.visited;
  const showError = Boolean(
    error &&
      shouldShowFieldError(input.behavior, {
        touched,
        dirty,
        visited,
        submitting: input.fieldState.submitting
      })
  );

  return {
    error,
    touched,
    dirty,
    visited,
    showError,
    className: [
      'na-child-field',
      visited ? 'na-child-field--visited' : '',
      touched ? 'na-child-field--touched' : '',
      dirty ? 'na-child-field--dirty' : '',
      showError ? 'na-child-field--invalid' : ''
    ]
      .filter(Boolean)
      .join(' ')
  };
}

export function useFieldPresentation(name: string, currentForm: FormRuntime | undefined) {
  const fieldState = useFormFieldState(name);
  const behavior = getFieldValidationBehavior(name, currentForm);
  const aggregateError = useAggregateError(name);
  const visibleError = aggregateError ?? fieldState.error;
  const showError = Boolean(
    visibleError &&
      shouldShowFieldError(behavior, {
        touched: fieldState.touched,
        dirty: fieldState.dirty,
        visited: fieldState.visited,
        submitting: fieldState.submitting
      })
  );

  return {
    fieldState: {
      ...fieldState,
      error: visibleError
    },
    showError,
    className: getFieldClassName({ ...fieldState, showError })
  };
}

export function useCompositeChildFieldState(path: string) {
  return useChildFieldState(path);
}

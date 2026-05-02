import { type CompiledValidationBehavior, type FormFieldStateSnapshot, type RendererComponentProps, type SchemaFieldRule, type ScopeRef } from '@nop-chaos/flux-core';
import { shouldShowFieldError, resolveRendererSlotContent } from '@nop-chaos/flux-react';

export const formLabelFieldRule: SchemaFieldRule = {
  key: 'label',
  kind: 'value-or-region',
  regionKey: 'label',
};

export function readFieldValue(scope: ScopeRef, name: string): unknown {
  return name ? (scope.get(name) ?? '') : scope.readOwn();
}

export function readCheckboxGroupValue(scope: ScopeRef, name: string): string[] {
  const value = readFieldValue(scope, name);
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function resolveFieldLabelContent(
  props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>,
) {
  return resolveRendererSlotContent(props, 'label');
}

export function resolveFieldLabelText(
  props: Pick<RendererComponentProps, 'props' | 'meta'>,
  fallback?: string,
) {
  if (typeof props.props.label === 'string' && props.props.label) {
    return props.props.label;
  }

  return fallback;
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
        submitting: input.fieldState.submitting,
        submitAttempted: input.fieldState.submitAttempted,
      }),
  );

  return {
    error,
    touched,
    dirty,
    visited,
    showError,
    className: undefined,
    'data-child-field-visited': visited ? '' : undefined,
    'data-child-field-touched': touched ? '' : undefined,
    'data-child-field-dirty': dirty ? '' : undefined,
    'data-child-field-invalid': showError ? '' : undefined,
  } satisfies {
    error: ValidationError | undefined;
    touched: boolean;
    dirty: boolean;
    visited: boolean;
    showError: boolean;
    className: undefined;
    'data-child-field-visited': '' | undefined;
    'data-child-field-touched': '' | undefined;
    'data-child-field-dirty': '' | undefined;
    'data-child-field-invalid': '' | undefined;
  };
}

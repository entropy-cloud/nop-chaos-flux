import {
  type CompiledValidationBehavior,
  type FormFieldStateSnapshot,
  type RendererComponentProps,
  type RendererPropContract,
  type SchemaFieldRule,
  type ValidationError,
} from '@nop-chaos/flux-core';
import { shouldShowFieldError, resolveRendererSlotContent } from '@nop-chaos/flux-react';

export const formLabelFieldRule: SchemaFieldRule = {
  key: 'label',
  kind: 'value-or-region',
  regionKey: 'label',
};

export const formBooleanFieldRules: SchemaFieldRule[] = [
  { key: 'readOnly', kind: 'prop', valueType: 'boolean' },
  { key: 'required', kind: 'prop', valueType: 'boolean' },
];

export const formFieldChromeRules: SchemaFieldRule[] = [
  { key: 'hint', kind: 'value-or-region', regionKey: 'hint' },
  { key: 'description', kind: 'value-or-region', regionKey: 'description' },
  { key: 'remark', kind: 'prop' },
  { key: 'labelRemark', kind: 'prop' },
  { key: 'labelAlign', kind: 'prop' },
  { key: 'labelWidth', kind: 'prop' },
];

/**
 * Plan 462: shared `propContracts` for the form-field fields that every
 * input renderer inherits via `formFieldRules`. Spread this into each
 * input renderer's `propContracts` to keep the contract surface
 * synchronized with the field-rule surface (single source of truth:
 * `formFieldRules` for the rule list, `formFieldContracts` for the
 * validator shapes). New fields added to `formFieldRules` MUST also be
 * added here.
 */
export const formFieldContracts: Record<string, RendererPropContract> = {
  readOnly: {
    displayName: 'Read Only',
    description: 'Renders the field as non-editable; user input is ignored.',
    shape: { kind: 'boolean' },
    editorType: 'switch',
  },
  required: {
    displayName: 'Required',
    description: 'Field is mandatory; empty submission fails validation.',
    shape: { kind: 'boolean' },
    editorType: 'switch',
  },
  labelAlign: {
    displayName: 'Label Align',
    description: 'Position of the label relative to the input. top stacks; left/right are inline.',
    shape: {
      kind: 'union',
      anyOf: ['top', 'left', 'right'].map((v) => ({ kind: 'literal', value: v })),
    },
    editorType: 'select',
    defaultValue: 'left',
  },
  format: {
    displayName: 'Format',
    description: 'Value format validation rule (email, url, integer).',
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'email' },
        { kind: 'literal', value: 'url' },
        { kind: 'literal', value: 'integer' },
      ],
    },
    editorType: 'select',
  },
};

export const formFieldRules: SchemaFieldRule[] = [
  formLabelFieldRule,
  { key: 'name', kind: 'prop' },
  { key: 'value', kind: 'prop' },
  ...formBooleanFieldRules,
  ...formFieldChromeRules,
];

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

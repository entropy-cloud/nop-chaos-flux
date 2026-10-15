import {
  type CompiledValidationBehavior,
  type FormFieldStateSnapshot,
  type RendererComponentProps,
  type RendererFieldContract,
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
const validationTriggerLiterals = ['change', 'blur', 'submit'].map((v) => ({
  kind: 'literal' as const,
  value: v,
}));

const validationVisibilityLiterals = ['touched', 'dirty', 'visited', 'submit'].map((v) => ({
  kind: 'literal' as const,
  value: v,
}));

const requiredDependentContract = (
  displayName: string,
  description: string,
): RendererFieldContract => ({
  displayName,
  description,
  shape: {
    kind: 'object',
    fields: {
      path: { kind: 'string' },
      equals: { kind: 'unknown' },
      message: { kind: 'string' },
    },
    optional: ['equals', 'message'],
  },
  editorType: 'object',
});

const formFieldContracts: Record<string, RendererFieldContract> = {
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
  validateOn: {
    displayName: 'Validate On',
    description: 'Validation triggers for this field (single trigger or array); defaults to the form policy.',
    shape: {
      kind: 'union',
      anyOf: [
        ...validationTriggerLiterals,
        { kind: 'array', item: { kind: 'union', anyOf: validationTriggerLiterals } },
      ],
    },
    editorType: 'select',
  },
  showErrorOn: {
    displayName: 'Show Error On',
    description: 'When this field\'s error becomes visible (single trigger or array); defaults to the form policy.',
    shape: {
      kind: 'union',
      anyOf: [
        ...validationVisibilityLiterals,
        { kind: 'array', item: { kind: 'union', anyOf: validationVisibilityLiterals } },
      ],
    },
    editorType: 'select',
  },
  equalsField: {
    displayName: 'Equals Field',
    description: 'Value must equal the current value of the named sibling field.',
    shape: { kind: 'string' },
  },
  notEqualsField: {
    displayName: 'Not Equals Field',
    description: 'Value must differ from the current value of the named sibling field.',
    shape: { kind: 'string' },
  },
  requiredWhen: requiredDependentContract(
    'Required When',
    'Field becomes mandatory when the referenced scope path equals the given value.',
  ),
  requiredUnless: requiredDependentContract(
    'Required Unless',
    'Field is mandatory unless the referenced scope path equals the given value.',
  ),
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
  // Compiler-consumed validation behavior/rules (flux-compiler
  // validation-collection + validation-lowering read these from any
  // field-contributing schema node).
  { key: 'validateOn', kind: 'prop' },
  { key: 'showErrorOn', kind: 'prop' },
  { key: 'equalsField', kind: 'prop' },
  { key: 'notEqualsField', kind: 'prop' },
  { key: 'requiredWhen', kind: 'prop' },
  { key: 'requiredUnless', kind: 'prop' },
  ...formFieldChromeRules,
];

/**
 * RM-4 (plan 606): contract-bearing variant of `formFieldRules` for the
 * input-renderer family that used to spread `formFieldContracts` into its
 * per-renderer prop-contract records. Each rule carries its
 * `formFieldContracts` entry by reference (single object, not a copy);
 * `format` existed only in the former contract record (no rule side) and
 * is appended as a standalone entry. The plain `formFieldRules` stays
 * contract-free for consumers that never declared the shared contract
 * surface (form-advanced fields, date/hidden renderers, ...) — attaching
 * the contracts there would have grown their resolved contract view.
 */
export const formFieldContractRules: SchemaFieldRule[] = [
  formLabelFieldRule,
  { key: 'name', kind: 'prop' },
  { key: 'value', kind: 'prop' },
  { key: 'readOnly', kind: 'prop', valueType: 'boolean', contract: formFieldContracts.readOnly },
  { key: 'required', kind: 'prop', valueType: 'boolean', contract: formFieldContracts.required },
  // Compiler-consumed validation behavior/rules (flux-compiler
  // validation-collection + validation-lowering read these from any
  // field-contributing schema node).
  { key: 'validateOn', kind: 'prop', contract: formFieldContracts.validateOn },
  { key: 'showErrorOn', kind: 'prop', contract: formFieldContracts.showErrorOn },
  { key: 'equalsField', kind: 'prop', contract: formFieldContracts.equalsField },
  { key: 'notEqualsField', kind: 'prop', contract: formFieldContracts.notEqualsField },
  { key: 'requiredWhen', kind: 'prop', contract: formFieldContracts.requiredWhen },
  { key: 'requiredUnless', kind: 'prop', contract: formFieldContracts.requiredUnless },
  { key: 'hint', kind: 'value-or-region', regionKey: 'hint' },
  { key: 'description', kind: 'value-or-region', regionKey: 'description' },
  { key: 'remark', kind: 'prop' },
  { key: 'labelRemark', kind: 'prop' },
  { key: 'labelAlign', kind: 'prop', contract: formFieldContracts.labelAlign },
  { key: 'labelWidth', kind: 'prop' },
  { key: 'format', kind: 'prop', contract: formFieldContracts.format },
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

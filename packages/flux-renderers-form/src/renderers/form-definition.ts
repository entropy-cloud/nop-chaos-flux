import {
  parsePath,
  type BaseSchema,
  type RendererDefinition,
  type RendererSchemaValidationContext,
} from '@nop-chaos/flux-core';
import { FormRenderer } from './form.js';
import type { FormSchema } from '../schemas.js';
import { validateHiddenFieldPolicySchema } from './hidden-field-policy-schema.js';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path)
    .filter((segment) => segment !== '$')
    .concat(segments.map((segment) => String(segment)));

  if (parts.length === 0) {
    return '';
  }

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

function validateFormSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'form') {
    return;
  }

  const schema = context.schema as FormSchema;
  const { path, emit } = context;

  if (schema.body !== undefined && !Array.isArray(schema.body)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'body'),
      message: 'form.body must be an array of schema nodes.',
    });
  }

  if (schema.actions !== undefined && !Array.isArray(schema.actions)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'actions'),
      message: 'form.actions must be an array of schema nodes.',
    });
  }

  if (
    schema.data !== undefined &&
    (!schema.data || typeof schema.data !== 'object' || Array.isArray(schema.data))
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'data'),
      message: 'form.data must be an object when provided.',
    });
  }

  if (schema.columnCount !== undefined) {
    if (typeof schema.columnCount !== 'number' || !Number.isFinite(schema.columnCount)) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'columnCount'),
        message: 'form.columnCount must be a number when provided.',
      });
    }
  }

  if (schema.rules !== undefined) {
    if (!Array.isArray(schema.rules)) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'rules'),
        message: 'form.rules must be an array of cross-field rule descriptors when provided.',
      });
    } else {
      schema.rules.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
          emit({
            code: 'invalid-property-shape',
            path: toJsonPointer(path, 'rules', index),
            message: 'form.rules entries must be objects.',
          });
          return;
        }
        if (entry.rule !== 'equalsField' && entry.rule !== 'notEqualsField') {
          emit({
            code: 'invalid-property-shape',
            path: toJsonPointer(path, 'rules', index, 'rule'),
            message:
              'form.rules entry.rule must be one of: equalsField, notEqualsField. Other rule kinds are managed per-field.',
          });
        }
        if (typeof entry.field !== 'string' || entry.field.length === 0) {
          emit({
            code: 'invalid-property-shape',
            path: toJsonPointer(path, 'rules', index, 'field'),
            message: 'form.rules entry.field must be a non-empty string.',
          });
        }
        if (typeof entry.target !== 'string' || entry.target.length === 0) {
          emit({
            code: 'invalid-property-shape',
            path: toJsonPointer(path, 'rules', index, 'target'),
            message: 'form.rules entry.target must be a non-empty string.',
          });
        }
      });
    }
  }

  validateHiddenFieldPolicySchema(context);
}

export const formRendererDefinition: RendererDefinition = {
  type: 'form',
  displayName: 'Form',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  defaultSchema: { type: 'form', body: [], actions: [] },
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'interaction-owner'],
  propContracts: {
    data: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Initial Data',
      description: 'Initial form values at mount time.',
      editorType: 'object',
    },
    statusPath: {
      shape: { kind: 'string' },
      displayName: 'Status Path',
      description:
        'Publishes the readonly form status summary to parent scope. Dynamic rerouting is supported and recreates the form owner so the old path is cleared during replacement disposal.',
      editorType: 'path',
    },
    valuesPath: {
      shape: { kind: 'string' },
      displayName: 'Values Path',
      description:
        'Publishes the readonly form values snapshot to parent scope. Dynamic rerouting is supported and recreates the form owner so the old path is cleared during replacement disposal.',
      editorType: 'path',
    },
    mode: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'normal' },
          { kind: 'literal', value: 'horizontal' },
          { kind: 'literal', value: 'inline' },
        ],
      },
      displayName: 'Mode',
      description: 'Controls form layout mode.',
      editorType: 'select',
      defaultValue: 'normal',
    },
    labelAlign: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'top' },
          { kind: 'literal', value: 'left' },
          { kind: 'literal', value: 'right' },
        ],
      },
      displayName: 'Label Align',
      description: 'Controls label alignment in horizontal layout.',
      editorType: 'select',
    },
    hiddenFieldPolicy: {
      shape: {
        kind: 'object',
        fields: {
          validateWhenHidden: { kind: 'boolean' },
          clearValueWhenHidden: { kind: 'boolean' },
        },
        optional: ['validateWhenHidden', 'clearValueWhenHidden'],
      },
      displayName: 'Hidden Field Policy',
      description: 'Controls how hidden fields participate in validation and clearing.',
      editorType: 'hidden-field-policy',
    },
    columnCount: {
      shape: { kind: 'number' },
      displayName: 'Column Count',
      description:
        'Renders the form body as a CSS grid with the given number of columns. Values < 1 are clamped to 1 (single column).',
      editorType: 'number',
    },
    submitOnChange: {
      shape: { kind: 'boolean' },
      displayName: 'Submit On Change',
      description:
        'When true and a submitAction is configured, debounced (300ms) submit is triggered automatically whenever form values change. The initial mount snapshot is ignored.',
      editorType: 'boolean',
      defaultValue: false,
    },
    preventEnterSubmit: {
      shape: { kind: 'boolean' },
      displayName: 'Prevent Enter Submit',
      description:
        'When true, pressing Enter inside the form does NOT trigger submit. Default behavior (when false or unset): Enter triggers submit if a submitAction is configured.',
      editorType: 'boolean',
      defaultValue: false,
    },
    autoFocus: {
      shape: { kind: 'boolean' },
      displayName: 'Auto Focus',
      description:
        'When true, focuses the first focusable control in the form body after mount.',
      editorType: 'boolean',
      defaultValue: false,
    },
    scrollToFirstError: {
      shape: { kind: 'boolean' },
      displayName: 'Scroll To First Error',
      description:
        'When true, the existing focus-on-first-invalid behavior additionally calls scrollIntoView({ behavior: "smooth", block: "center" }).',
      editorType: 'boolean',
      defaultValue: false,
    },
    static: {
      shape: {
        kind: 'union',
        anyOf: [{ kind: 'boolean' }, { kind: 'string' }],
      },
      displayName: 'Static (read-only preview)',
      description:
        'When truthy, propagates a read-only presentation snapshot to all child fields via FormLayoutContext. Actions region is not hidden.',
      editorType: 'static',
      defaultValue: false,
    },
    rules: {
      shape: { kind: 'array', item: { kind: 'unknown' } },
      displayName: 'Cross-field Rules',
      description:
        'Form-level cross-field validation rules. Each entry translates to a field-level rule on the referenced field. Supported rule kinds: equalsField, notEqualsField.',
      editorType: 'cross-field-rules',
    },
  },
  eventContracts: {
    initAction: {
      displayName: 'Init',
      description: 'Runs after the form runtime is created.',
    },
    submitAction: {
      displayName: 'Submit',
      description: 'Primary submit pipeline for the form.',
    },
    onSubmitSuccess: {
      displayName: 'Submit Success',
      description: 'Runs after submit resolves successfully.',
    },
    onSubmitError: {
      displayName: 'Submit Error',
      description: 'Runs after submit fails.',
    },
    onValidateError: {
      displayName: 'Validate Error',
      description: 'Runs when validation blocks submission.',
    },
  },
  componentCapabilityContracts: [
    {
      handle: 'submit',
      displayName: 'Submit',
      description: 'Submit the current form instance.',
    },
    {
      handle: 'validate',
      displayName: 'Validate',
      description: 'Validate the current form and return a validation result.',
      result: {
        kind: 'object',
        fields: {
          ok: { kind: 'boolean' },
          errors: { kind: 'array', item: { kind: 'unknown' } },
        },
        optional: ['errors'],
      },
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Reset the current form values.',
      args: {
        kind: 'object',
        fields: {
          values: { kind: 'object', fields: {} },
        },
        optional: ['values'],
      },
    },
    {
      handle: 'setValue',
      displayName: 'Set Value',
      description: 'Set one field value on the current form.',
      args: {
        kind: 'object',
        fields: {
          name: { kind: 'string' },
          value: { kind: 'unknown' },
        },
      },
    },
    {
      handle: 'setValues',
      displayName: 'Set Values',
      description: 'Merge multiple field values into the current form.',
      args: {
        kind: 'object',
        fields: {
          values: { kind: 'object', fields: {} },
        },
      },
    },
    {
      handle: 'getValues',
      displayName: 'Get Values',
      description: 'Read the current form values snapshot.',
      result: {
        kind: 'object',
        fields: {},
      },
    },
  ],
  scopeExportContracts: {
    $form: {
      kind: 'object',
      fields: {
        id: { kind: 'string' },
        name: { kind: 'string' },
        submitting: { kind: 'boolean' },
        validating: { kind: 'boolean' },
        dirty: { kind: 'boolean' },
        touched: { kind: 'boolean' },
        visited: { kind: 'boolean' },
        valid: { kind: 'boolean' },
        invalid: { kind: 'boolean' },
        hasErrors: { kind: 'boolean' },
        errorCount: { kind: 'number' },
      },
      optional: ['id', 'name'],
    },
  },
  injectedLocals: {
    $form: {
      kind: 'injected-local',
    },
  },
  component: FormRenderer,
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
    { key: 'data', kind: 'prop' },
    { key: 'initAction', kind: 'event' },
    { key: 'submitAction', kind: 'event' },
    { key: 'onSubmitSuccess', kind: 'event' },
    { key: 'onSubmitError', kind: 'event' },
    { key: 'onValidateError', kind: 'event' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'valuesPath', kind: 'prop' },
    { key: 'hiddenFieldPolicy', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'labelAlign', kind: 'prop' },
    { key: 'labelWidth', kind: 'prop' },
    { key: 'bodyClassName', kind: 'prop' },
    { key: 'actionsClassName', kind: 'prop' },
    { key: 'columnCount', kind: 'prop' },
    { key: 'submitOnChange', kind: 'prop', valueType: 'boolean' },
    { key: 'preventEnterSubmit', kind: 'prop', valueType: 'boolean' },
    { key: 'autoFocus', kind: 'prop', valueType: 'boolean' },
    { key: 'scrollToFirstError', kind: 'prop', valueType: 'boolean' },
    { key: 'static', kind: 'prop', valueType: 'boolean' },
    { key: 'rules', kind: 'prop' },
  ],
  scopePolicy: 'form',
  validationDefaults: {
    defaultChildContractMode: 'ignore',
  },
  componentRegistryPolicy: 'new',
  schemaValidator: validateFormSchema,
};

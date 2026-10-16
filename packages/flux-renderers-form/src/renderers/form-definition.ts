import { toJsonPointer, type BaseSchema, type RegisteredRendererDefinition, type RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { FormRenderer } from './form.js';
import type { FormSchema } from '../schemas.js';
import { validateHiddenFieldPolicySchema } from './hidden-field-policy-schema.js';

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

export const formRendererDefinition: RegisteredRendererDefinition = {
  type: 'form',
  displayName: 'Form',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  defaultSchema: { type: 'form', body: [], actions: [] },
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'interaction-owner'],
  componentCapabilityContracts: [
    {
      handle: 'submit',
      displayName: 'Submit',
      description: 'Submit the current form instance.',
    },
    {
      handle: 'refresh',
      displayName: 'Refresh',
      description:
        'Re-runs the form loadAction (same channel the loadAction event contract backs). Takes no args.',
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
  injectedLocals: {
    $form: {
      kind: 'injected-local',
      shape: {
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
  },
  component: FormRenderer,
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
    {
      key: 'data',
      kind: 'prop',
      contract: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Initial Data',
        description: 'Initial form values at mount time.',
        editorType: 'object',
      },
    },
    {
      key: 'validateOn',
      kind: 'prop',
      contract: {
        displayName: 'Validate On',
        description:
          'Default validation triggers for fields in this form (single trigger or array). Default: blur.',
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'change' },
            { kind: 'literal', value: 'blur' },
            { kind: 'literal', value: 'submit' },
            {
              kind: 'array',
              item: {
                kind: 'union',
                anyOf: [
                  { kind: 'literal', value: 'change' },
                  { kind: 'literal', value: 'blur' },
                  { kind: 'literal', value: 'submit' },
                ],
              },
            },
          ],
        },
        editorType: 'select',
      },
    },
    {
      key: 'showErrorOn',
      kind: 'prop',
      contract: {
        displayName: 'Show Error On',
        description:
          'Default error-visibility policy for fields in this form (single trigger or array). Default: touched + submit.',
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'touched' },
            { kind: 'literal', value: 'dirty' },
            { kind: 'literal', value: 'visited' },
            { kind: 'literal', value: 'submit' },
            {
              kind: 'array',
              item: {
                kind: 'union',
                anyOf: [
                  { kind: 'literal', value: 'touched' },
                  { kind: 'literal', value: 'dirty' },
                  { kind: 'literal', value: 'visited' },
                  { kind: 'literal', value: 'submit' },
                ],
              },
            },
          ],
        },
        editorType: 'select',
      },
    },
    {
      key: 'autoInit',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Auto Init',
        description: 'When true (default), initAction runs automatically after mount.',
        editorType: 'boolean',
        defaultValue: true,
      },
    },
    {
      key: 'initAction',
      kind: 'event',
      contract: {
        displayName: 'Init',
        description: 'Runs after the form runtime is created.',
      },
    },
    {
      key: 'loadAction',
      kind: 'event',
      contract: {
        displayName: 'Load',
        description:
          'Fetches initial values into the form after mount (gated by autoLoad). Also backs the form refresh handle.',
      },
    },
    {
      key: 'autoLoad',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Auto Load',
        description: 'When true (default), loadAction runs automatically after mount and its result becomes the form values.',
        editorType: 'boolean',
        defaultValue: true,
      },
    },
    {
      key: 'submitAction',
      kind: 'event',
      contract: {
        displayName: 'Submit',
        description: 'Primary submit pipeline for the form.',
      },
    },
    {
      key: 'onSubmitSuccess',
      kind: 'event',
      contract: {
        displayName: 'Submit Success',
        description: 'Runs after submit resolves successfully.',
      },
    },
    {
      key: 'onSubmitError',
      kind: 'event',
      contract: {
        displayName: 'Submit Error',
        description: 'Runs after submit fails.',
      },
    },
    {
      key: 'onValidateError',
      kind: 'event',
      contract: {
        displayName: 'Validate Error',
        description: 'Runs when validation blocks submission.',
      },
    },
    {
      key: 'statusPath',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description:
          'Scope path that publishes the form status summary (validation and touch state) to the parent scope.',
        editorType: 'path',
      },
    },
    {
      key: 'valuesPath',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Values Path',
        description:
          'Scope path that publishes a snapshot of the current form values to the parent scope.',
        editorType: 'path',
      },
    },
    {
      key: 'hiddenFieldPolicy',
      kind: 'prop',
      contract: {
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
    },
    {
      key: 'mode',
      kind: 'prop',
      contract: {
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
    },
    {
      key: 'labelAlign',
      kind: 'prop',
      contract: {
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
    },
    {
      key: 'labelWidth',
      kind: 'prop',
      contract: {
        shape: { kind: 'unknown' },
        displayName: 'Label Width',
        description: 'Label column width (e.g. "120px" or a grid ratio number); horizontal mode only.',
        editorType: 'text',
      },
    },
    {
      key: 'gap',
      kind: 'prop',
      contract: {
        shape: { kind: 'unknown' },
        displayName: 'Gap',
        description: 'Spacing between body fields (stack-*/hstack-* aliases or a raw length).',
        editorType: 'gap',
      },
    },
    {
      key: 'bodyClassName',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Body Class Name',
        description: 'Additional className applied to the form body region.',
        editorType: 'text',
      },
    },
    {
      key: 'actionsClassName',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Actions Class Name',
        description: 'Additional className applied to the form actions region.',
        editorType: 'text',
      },
    },
    {
      key: 'columnCount',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Column Count',
        description:
          'Renders the form body as a CSS grid with the given number of columns. Values < 1 are clamped to 1 (single column).',
        editorType: 'number',
      },
    },
    {
      key: 'submitScope',
      kind: 'prop',
      contract: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'local' },
            { kind: 'literal', value: 'surface' },
          ],
        },
        displayName: 'Submit Scope',
        description:
          "local (default): only this form's own lifecycle handlers fire. surface: submit also triggers the enclosing surface's onSubmitSuccess/onSubmitError callback.",
        editorType: 'select',
        defaultValue: 'local',
      },
    },
    {
      key: 'submitOnChange',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Submit On Change',
        description:
          'When true and a submitAction or target is configured, debounced (300ms) submit is triggered automatically whenever form values change. The initial mount snapshot is ignored.',
        editorType: 'boolean',
        defaultValue: false,
      },
    },
    {
      key: 'target',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Submit Target',
        description:
          'AMIS-parity: deliver form values to the named component (resolved via the component registry, typically a crud). The target querySubmit capability receives { values } and merges them into its query.',
        editorType: 'text',
      },
    },
    {
      key: 'preventEnterSubmit',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Prevent Enter Submit',
        description:
          'When true, pressing Enter inside the form does NOT trigger submit. Default behavior (when false or unset): Enter triggers submit if a submitAction is configured.',
        editorType: 'boolean',
        defaultValue: false,
      },
    },
    {
      key: 'autoFocus',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Auto Focus',
        description:
          'When true, focuses the first focusable control in the form body after mount.',
        editorType: 'boolean',
        defaultValue: false,
      },
    },
    {
      key: 'scrollToFirstError',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
        shape: { kind: 'boolean' },
        displayName: 'Scroll To First Error',
        description:
          'When true, the existing focus-on-first-invalid behavior additionally calls scrollIntoView({ behavior: "smooth", block: "center" }).',
        editorType: 'boolean',
        defaultValue: false,
      },
    },
    {
      key: 'static',
      kind: 'prop',
      valueType: 'boolean',
      contract: {
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
    },
    {
      key: 'rules',
      kind: 'prop',
      contract: {
        shape: { kind: 'array', item: { kind: 'unknown' } },
        displayName: 'Cross-field Rules',
        description:
          'Form-level cross-field validation rules. Each entry translates to a field-level rule on the referenced field. Supported rule kinds: equalsField, notEqualsField.',
        editorType: 'cross-field-rules',
      },
    },
  ],
  scopePolicy: 'form',
  validationDefaults: {
    defaultChildContractMode: 'ignore',
  },
  componentRegistryPolicy: 'new',
  schemaValidator: validateFormSchema,
};

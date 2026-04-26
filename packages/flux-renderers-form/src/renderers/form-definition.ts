import { parsePath, type BaseSchema, type RendererDefinition, type RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { FormRenderer } from './form';
import type { FormSchema } from '../schemas';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path).filter((segment) => segment !== '$').concat(segments.map((segment) => String(segment)));

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
      message: 'form.body must be an array of schema nodes.'
    });
  }

  if (schema.actions !== undefined && !Array.isArray(schema.actions)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'actions'),
      message: 'form.actions must be an array of schema nodes.'
    });
  }

  if (schema.data !== undefined && (!schema.data || typeof schema.data !== 'object' || Array.isArray(schema.data))) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'data'),
      message: 'form.data must be an object when provided.'
    });
  }
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
      editorType: 'object'
    },
    statusPath: {
      shape: { kind: 'string' },
      displayName: 'Status Path',
      description: 'Publishes the readonly form status summary to parent scope.',
      editorType: 'path'
    },
    valuesPath: {
      shape: { kind: 'string' },
      displayName: 'Values Path',
      description: 'Publishes the readonly form values snapshot to parent scope.',
      editorType: 'path'
    },
    hiddenFieldPolicy: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'validate' },
          { kind: 'literal', value: 'ignore' },
          {
            kind: 'object',
            fields: {
              validateWhenHidden: { kind: 'boolean' },
              clearValueWhenHidden: { kind: 'boolean' },
              submitWhenHidden: { kind: 'boolean' }
            },
            optional: ['validateWhenHidden', 'clearValueWhenHidden', 'submitWhenHidden']
          }
        ]
      },
      displayName: 'Hidden Field Policy',
      description: 'Controls how hidden fields participate in validation, submit, and clearing.',
      editorType: 'hidden-field-policy'
    }
  },
  eventContracts: {
    initAction: {
      displayName: 'Init',
      description: 'Runs after the form runtime is created.'
    },
    submitAction: {
      displayName: 'Submit',
      description: 'Primary submit pipeline for the form.'
    },
    onSubmitSuccess: {
      displayName: 'Submit Success',
      description: 'Runs after submit resolves successfully.'
    },
    onSubmitError: {
      displayName: 'Submit Error',
      description: 'Runs after submit fails.'
    },
    onValidateError: {
      displayName: 'Validate Error',
      description: 'Runs when validation blocks submission.'
    }
  },
  componentCapabilityContracts: [
    {
      handle: 'submit',
      displayName: 'Submit',
      description: 'Submit the current form instance.'
    },
    {
      handle: 'validate',
      displayName: 'Validate',
      description: 'Validate the current form and return a validation result.',
      result: {
        kind: 'object',
        fields: {
          ok: { kind: 'boolean' },
          errors: { kind: 'array', item: { kind: 'unknown' } }
        },
        optional: ['errors']
      }
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Reset the current form values.',
      args: {
        kind: 'object',
        fields: {
          values: { kind: 'object', fields: {} }
        },
        optional: ['values']
      }
    },
    {
      handle: 'setValue',
      displayName: 'Set Value',
      description: 'Set one field value on the current form.',
      args: {
        kind: 'object',
        fields: {
          name: { kind: 'string' },
          value: { kind: 'unknown' }
        }
      }
    },
    {
      handle: 'setValues',
      displayName: 'Set Values',
      description: 'Merge multiple field values into the current form.',
      args: {
        kind: 'object',
        fields: {
          values: { kind: 'object', fields: {} }
        }
      }
    }
  ],
  scopeExportContracts: {
    '$form': {
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
        errorCount: { kind: 'number' }
      },
      optional: ['id', 'name']
    }
  },
  injectedLocals: {
    '$form': {
      kind: 'injected-local'
    }
  },
  component: FormRenderer,
  regions: ['body', 'actions'],
  fields: [
    { key: 'initAction', kind: 'event' },
    { key: 'submitAction', kind: 'event' },
    { key: 'onSubmitSuccess', kind: 'event' },
    { key: 'onSubmitError', kind: 'event' },
    { key: 'onValidateError', kind: 'event' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'valuesPath', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'labelAlign', kind: 'prop' },
    { key: 'labelWidth', kind: 'prop' }
  ],
  scopePolicy: 'form',
  componentRegistryPolicy: 'new',
  schemaValidator: validateFormSchema
};

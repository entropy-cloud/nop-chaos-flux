import { describe, expect, it } from 'vitest';
import type { FluxSchemaDefinitionShape, RendererDefinition } from '@nop-chaos/flux-core';
import { matchesFluxValueShape } from '@nop-chaos/flux-core';
import { createSchemaCompilerDiagnosticsContext } from './schema-compiler/diagnostics.js';
import {
  summarizeExpectedFluxValueShape,
  validateFluxValueShape,
} from './schema-compiler/flux-value-shape-validation.js';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';

const dropdownItemShape: FluxSchemaDefinitionShape = {
  kind: 'schema-definition',
  fieldRules: {
    label: 'value',
    disabled: 'value',
    destructive: 'value',
    action: 'event',
    onClick: 'event',
  },
};

function validate(value: unknown, shape: FluxSchemaDefinitionShape) {
  const diagnostics = createSchemaCompilerDiagnosticsContext(undefined, 'validate');
  const valid = validateFluxValueShape(value, shape, '/items', diagnostics, {
    code: 'invalid-property-value',
    source: 'core',
    messagePrefix: 'Invalid items value.',
  });
  return { valid, diagnostics: diagnostics.diagnostics };
}

describe('schema-definition shape validation (flux-compiler)', () => {
  it('accepts items with action/onClick event fields and expression values', () => {
    const { valid, diagnostics } = validate(
      [
        { label: 'Edit', action: { action: 'openDialog', args: {} } },
        { label: 'Delete', onClick: [{ action: 'confirm' }], destructive: true },
        { label: '${row.label}', disabled: false },
      ],
      dropdownItemShape,
    );

    expect(valid).toBe(true);
    expect(diagnostics).toEqual([]);
  });

  it('rejects non-action event/action fields with diagnostics', () => {
    const { valid, diagnostics } = validate(
      [{ label: 'Edit', action: { args: { title: 'x' } } }],
      dropdownItemShape,
    );

    expect(valid).toBe(false);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/items/0/action',
        }),
      ]),
    );
  });

  it('reports missing required fields declared via object-form rules', () => {
    const ajaxArgsShape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        url: { kind: 'value', required: true, valueType: 'string', nonEmpty: true },
        method: { kind: 'value', valueType: 'string' },
      },
    };

    const { valid, diagnostics } = validate({ method: 'post' }, ajaxArgsShape);

    expect(valid).toBe(false);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/items/url',
          message: expect.stringContaining('Required field "url" is missing'),
        }),
      ]),
    );
  });

  it('validates valueType/nonEmpty constraints and exempts dynamic expressions', () => {
    const ajaxArgsShape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        url: { kind: 'value', required: true, valueType: 'string', nonEmpty: true },
        method: { kind: 'value', valueType: 'string' },
      },
    };

    expect(validate({ url: 42 }, ajaxArgsShape).valid).toBe(false);
    expect(validate({ url: '' }, ajaxArgsShape).valid).toBe(false);
    expect(validate({ url: '${apiUrl}' }, ajaxArgsShape).valid).toBe(true);
    expect(validate({ url: '/r/entity', method: 'post' }, ajaxArgsShape).valid).toBe(true);
  });

  it('validates actionValue whole-value semantics', () => {
    const searchSourceShape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {},
      actionValue: true,
    };

    const ok = validate({ action: 'ajax', args: { url: '/r/search' } }, searchSourceShape);
    expect(ok.valid).toBe(true);
    expect(ok.diagnostics).toEqual([]);

    const bad = validate({ args: { url: '/r/search' } }, searchSourceShape);
    expect(bad.valid).toBe(false);
    expect(bad.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/items',
          message: expect.stringContaining('Invalid items value.'),
        }),
      ]),
    );
  });

  it('validates schema and schema-array fields by container form', () => {
    const openDialogArgsShape: FluxSchemaDefinitionShape = {
      kind: 'schema-definition',
      fieldRules: {
        body: 'schema',
        actions: 'schema-array',
        onClose: 'action',
      },
    };

    expect(
      validate(
        {
          body: { type: 'form', body: [{ type: 'input-text', name: 'x' }] },
          actions: [{ type: 'button', label: 'OK' }],
          onClose: [{ action: 'closeSurface' }],
        },
        openDialogArgsShape,
      ).valid,
    ).toBe(true);

    expect(
      validate(
        {
          body: { type: 'form' },
          actions: { type: 'button', label: 'OK' },
          onClose: 'closeSurface',
        },
        openDialogArgsShape,
      ).valid,
    ).toBe(false);
  });
});

describe('schema-definition symmetry between matches and validate', () => {
  const cases: Array<{ value: unknown; shape: FluxSchemaDefinitionShape; label: string }> = [
    {
      label: 'static action item',
      value: { label: 'Edit', action: { action: 'openDialog' } },
      shape: dropdownItemShape,
    },
    {
      label: 'onClick action array',
      value: { label: 'X', onClick: [{ action: 'confirm' }] },
      shape: dropdownItemShape,
    },
    {
      label: 'broken action field',
      value: { label: 'Edit', action: { args: {} } },
      shape: dropdownItemShape,
    },
    {
      label: 'expression label is fine',
      value: { label: '${x}', action: { action: 'showToast' } },
      shape: dropdownItemShape,
    },
    {
      label: 'actionValue valid',
      value: { action: 'ajax', args: { url: '/r/x' } },
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
    },
    {
      label: 'actionValue invalid',
      value: { args: { url: '/r/x' } },
      shape: { kind: 'schema-definition', fieldRules: {}, actionValue: true },
    },
    {
      label: 'schema field broken',
      value: { body: 'form', onClose: [{ action: 'closeSurface' }] },
      shape: {
        kind: 'schema-definition',
        fieldRules: { body: 'schema', onClose: 'action' },
      },
    },
  ];

  for (const { label, value, shape } of cases) {
    it(`agree on: ${label}`, () => {
      const matchResult = matchesFluxValueShape(value, shape);
      const { valid } = validate(value, shape);
      expect(valid).toBe(matchResult);
    });
  }
});

describe('summarizeExpectedFluxValueShape for schema-definition', () => {
  it('summarizes fieldRules and actionValue marker', () => {
    expect(
      summarizeExpectedFluxValueShape({
        kind: 'schema-definition',
        fieldRules: { label: 'value', action: 'event', body: 'schema' },
      }),
    ).toBe('schema-definition{label: value, action: action, body: schema}');

    expect(
      summarizeExpectedFluxValueShape({
        kind: 'schema-definition',
        fieldRules: {},
        actionValue: true,
      }),
    ).toBe('schema-definition{} actionValue');
  });
});

describe('built-in action definition args validation', () => {
  const actionButtonRenderer: RendererDefinition = {
    type: 'button',
    displayName: 'Button',
    component: () => null,
    fields: [{ key: 'label', kind: 'prop' }, { key: 'onClick', kind: 'event' }],
  };
  const formRenderer: RendererDefinition = {
    type: 'form',
    displayName: 'Form',
    component: () => null,
    fields: [{ key: 'body', kind: 'region' }, { key: 'actions', kind: 'region' }],
  };
  const textRenderer: RendererDefinition = {
    type: 'input-text',
    displayName: 'Input Text',
    component: () => null,
    fields: [{ key: 'name', kind: 'prop' }],
  };

  it('rejects openDialog args whose body is not schema-shaped', () => {
    const compiler = makeCompiler([actionButtonRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: { action: 'openDialog', args: { body: 'not-a-schema', onClose: { action: 'closeSurface' } } },
    } as never);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/body',
        }),
      ]),
    );
  });

  it('accepts valid openDialog args with schema body and action-class hooks', () => {
    const compiler = makeCompiler([actionButtonRenderer, formRenderer, textRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Edit',
          size: 'md',
          body: { type: 'form', id: 'edit-form', body: [{ type: 'input-text', name: 'nickName' }] },
          actions: [{ type: 'button', label: 'OK' }],
          onClose: { action: 'closeSurface' },
          onSubmitSuccess: [{ action: 'closeSurface' }],
        },
      },
    } as never);

    expect(diagnostics).toEqual([]);
  });

  it('recurses args.body into analyzeSchemaInput (unknown renderer inside dialog body is reported)', () => {
    const compiler = makeCompiler([actionButtonRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: {
        action: 'openDialog',
        args: { body: { type: 'unknown-renderer-inside-dialog', id: 'x' } },
      },
    } as never);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-renderer-type',
          path: '/onClick/args/body/type',
        }),
      ]),
    );
  });

  it('validates ajax args constraints via definition (url required string)', () => {
    const compiler = makeCompiler([actionButtonRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: { action: 'ajax', args: { method: 'post', data: { a: 1 } } },
    } as never);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/url',
        }),
      ]),
    );
  });

  it('exempts expression strings from ajax url/data constraints', () => {
    const compiler = makeCompiler([actionButtonRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: { action: 'ajax', args: { url: '${apiUrl}', data: '${formData}' } },
    } as never);

    expect(diagnostics).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ path: '/onClick/args/url' }),
        expect.objectContaining({ path: '/onClick/args/data' }),
      ]),
    );
  });
});

import { describe, expect, it } from 'vitest';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry, resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import { hasClosedPropModel } from './schema-compiler/shape-validation-utils.js';
import { createSchemaCompiler } from './schema-compiler.js';

/**
 * RM-3 (plan 605) discriminative pins: a renderer that declares its prop
 * contracts INLINE on `fields` entries (`contract`, no `propContracts`) gets
 * the full contract surface — value-shape validation, required diagnostics,
 * closed-prop-model detection, schema-definition classification, and the
 * tooling authoring view. Before the dual-read switch every one of these
 * reads `propContracts` only and the assertions below fail.
 */
const mergedRenderer: RegisteredRendererDefinition = {
  type: 'field-contract-probe',
  component: () => null,
  fields: [
    {
      key: 'title',
      kind: 'prop',
      contract: { shape: { kind: 'string' }, displayName: 'Title', required: true },
    },
    {
      key: 'body',
      kind: 'prop',
      contract: {
        shape: {
          kind: 'schema-definition',
          fieldRules: {
            name: { kind: 'region' },
          },
        },
        displayName: 'Body',
      },
    },
  ],
} as unknown as RegisteredRendererDefinition;

function makeProbeCompiler() {
  const registry = createRendererRegistry([
    mergedRenderer,
    {
      type: 'text',
      component: () => null,
      fields: [{ key: 'text', kind: 'prop' }],
    },
  ]);
  return createSchemaCompiler({ registry });
}

describe('fields-inline contract (RM-3 new form)', () => {
  it('reports a missing required prop from the inline contract', () => {
    const compiler = makeProbeCompiler();
    const diagnostics = compiler.validate?.({ type: 'field-contract-probe' });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-shape',
          message: expect.stringContaining('Missing required property "title"'),
        }),
      ]),
    );
  });

  it('validates the inline value shape', () => {
    const compiler = makeProbeCompiler();
    const diagnostics = compiler.validate?.({
      type: 'field-contract-probe',
      title: 123,
    } as never);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/title',
        }),
      ]),
    );
  });

  it('closes the prop model via inline contracts (unknown keys diagnosed)', () => {
    expect(hasClosedPropModel(mergedRenderer)).toBe(true);
    const compiler = makeProbeCompiler();
    const diagnostics = compiler.validate?.({
      type: 'field-contract-probe',
      title: 'ok',
      notDeclared: true,
    } as never);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/notDeclared',
        }),
      ]),
    );
  });

  it('classifies schema-definition props declared inline (regions extracted)', () => {
    const compiler = makeProbeCompiler();
    const node = compiler.compileNode(
      {
        type: 'field-contract-probe',
        title: 'ok',
        body: { name: { type: 'text', text: 'N' } },
      } as never,
      { path: '$', renderer: mergedRenderer },
    );

    expect(node.regions['body.name']).toBeTruthy();
  });

  it('surfaces inline contracts on the tooling authoring view', () => {
    const authoring = resolveRendererAuthoringContract(mergedRenderer);
    expect(authoring.editableProps.title).toEqual({
      shape: { kind: 'string' },
      displayName: 'Title',
      description: undefined,
      editorType: undefined,
      defaultValue: undefined,
      required: true,
    });
    expect(authoring.editableProps.body?.displayName).toBe('Body');
  });
});

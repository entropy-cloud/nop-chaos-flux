import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaCompiler, validateSchema } from './index.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

describe('schema compiler renderer contract integration', () => {
  it('treats propContracts as a closed authoring prop model for diagnostics', () => {
    const renderer: RendererDefinition = {
      type: 'contract-button',
      component: () => null,
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label',
        },
      },
      eventContracts: {
        onClick: {
          displayName: 'Click',
        },
      },
      fields: [{ key: 'onClick', kind: 'event' }],
    };

    const diagnostics = validateSchema({
      schema: {
        type: 'contract-button',
        label: 'Hello',
        typo: 'unexpected',
      },
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      options: {
        validation: {
          unknownBarePropertyPolicy: 'error',
        },
      },
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-property',
        path: '/typo',
      }),
    ]);
  });

  it('runs authoringTransform before closed prop diagnostics', () => {
    const renderer: RendererDefinition = {
      type: 'contract-transform-button',
      component: () => null,
      authoringTransform: ({ schema }) => {
        const next = { ...schema } as Record<string, unknown>;
        if (next.legacyLabel !== undefined && next.label === undefined) {
          next.label = next.legacyLabel;
          delete next.legacyLabel;
        }
        return next as any;
      },
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label',
        },
      },
    };

    const diagnostics = validateSchema({
      schema: {
        type: 'contract-transform-button',
        legacyLabel: 'Hello',
      } as any,
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      options: {
        validation: {
          unknownBarePropertyPolicy: 'error',
        },
      },
    });

    expect(diagnostics).toEqual([]);
  });

  it('skips invalid finite prop values from prop lowering during compile', () => {
    const renderer: RendererDefinition = {
      type: 'contract-button',
      component: () => null,
      propContracts: {
        variant: {
          shape: {
            kind: 'union',
            anyOf: [{ kind: 'literal', value: 'default' }],
          },
          displayName: 'Variant',
        },
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile(
      { type: 'contract-button', variant: 'primary' } as any,
      {
        diagnostics: { enabled: true, continueOnError: true },
      },
    );

    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root).toBeTruthy();
    const propsProgram = root?.propsProgram as { kind: string; value?: Record<string, unknown> };
    expect(root?.schema.variant).toBe('primary');
    expect(propsProgram.kind).toBe('static');
    expect(propsProgram.value).toEqual({ type: 'contract-button' });
  });

  it('accepts ${expr} for boolean props and normalizes non-boolean runtime results to undefined', () => {
    const renderer: RendererDefinition = {
      type: 'contract-boolean',
      component: () => null,
      fields: [{ key: 'disabled', kind: 'prop', valueType: 'boolean' }],
    };

    const diagnostics = validateSchema({
      schema: {
        type: 'contract-boolean',
        disabled: '${flag}',
      },
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    expect(diagnostics).toEqual([]);

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'contract-boolean',
      disabled: '${flag}',
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root.propsProgram.kind).toBe('dynamic');
  });

  it('rejects ordinary string literals for boolean props', () => {
    const renderer: RendererDefinition = {
      type: 'contract-boolean',
      component: () => null,
      fields: [{ key: 'disabled', kind: 'prop', valueType: 'boolean' }],
    };

    const diagnostics = validateSchema({
      schema: {
        type: 'contract-boolean',
        disabled: 'false',
      },
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/disabled',
        }),
      ]),
    );
  });

  it('prefers explicit validation ownerResolution over scopePolicy form fallback', () => {
    const renderer: RendererDefinition = {
      type: 'owner-precedence',
      component: () => null,
      scopePolicy: 'form',
      validation: {
        ownerResolution: 'inherit-owner',
        childContractMode: 'summary-gate',
      },
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({ type: 'owner-precedence' });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(root.validationOwnerPlan).toEqual({
      boundary: 'inherit-owner',
      childContractMode: 'summary-gate',
    });
  });

  it('throws in strict mode when custom field compilation fails', () => {
    const renderer: RendererDefinition = {
      type: 'custom-compile',
      component: () => null,
      fields: [
        {
          key: 'config',
          kind: 'prop',
          compile: () => {
            throw new Error('broken compiler');
          },
        },
      ],
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    expect(() => compiler.compile({ type: 'custom-compile', config: { enabled: true } } as any)).toThrow(
      'Custom field compilation failed: broken compiler',
    );
  });

  it('replaces the node with an explicit failure surface in continueOnError mode', () => {
    const renderer: RendererDefinition = {
      type: 'custom-compile',
      component: () => null,
      fields: [
        {
          key: 'config',
          kind: 'prop',
          compile: () => {
            throw new Error('broken compiler');
          },
        },
      ],
    };

    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile(
      { type: 'custom-compile', config: { enabled: true } } as any,
      { diagnostics: { enabled: true, continueOnError: true } },
    );

    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    expect(root.rendererType).toBe('__compile-failure__');
    expect(root.schema.type).toBe('custom-compile');
    expect(root.propsProgram).toMatchObject({
      kind: 'static',
      value: expect.objectContaining({
        message: 'Custom field compilation failed: broken compiler',
        originalType: 'custom-compile',
      }),
    });
  });
});

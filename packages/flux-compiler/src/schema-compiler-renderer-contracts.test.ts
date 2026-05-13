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
});

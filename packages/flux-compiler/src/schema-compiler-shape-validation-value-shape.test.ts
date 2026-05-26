import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';
import { createSchemaCompilerDiagnosticsContext } from './schema-compiler/diagnostics.js';
import { validateFluxValueShape } from './schema-compiler/flux-value-shape-validation.js';

describe('shape validation finite prop and value-shape diagnostics', () => {
  it('reports invalid finite prop values from propContracts', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      propContracts: {
        variant: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'default' },
              { kind: 'literal', value: 'outline' },
            ],
          },
          displayName: 'Variant',
        },
      },
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'button', variant: 'primary' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/variant',
          message: expect.stringContaining('Option 1:'),
        }),
      ]),
    );
  });

  it('preserves union branch failure details in raw value-shape diagnostics', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(undefined, 'validate');

    const valid = validateFluxValueShape(
      'primary',
      {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'default' },
          { kind: 'literal', value: 'outline' },
        ],
      },
      '/variant',
      diagnostics,
      {
        code: 'invalid-property-value',
        source: 'core',
        messagePrefix: 'Invalid value for property "variant" on renderer type "button".',
      },
    );

    expect(valid).toBe(false);
    expect(diagnostics.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/variant',
          message: expect.stringContaining('Option 1:'),
        }),
      ]),
    );
  });

  it('accepts valid finite prop values from propContracts', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      propContracts: {
        variant: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'default' },
              { kind: 'literal', value: 'outline' },
            ],
          },
          displayName: 'Variant',
        },
      },
    };
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'button', variant: 'outline' })).toEqual([]);
  });

  it('skips dynamic prop values during compile-time finite-value validation', () => {
    const renderer: RendererDefinition = {
      type: 'button',
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
    const compiler = makeCompiler([renderer]);

    expect(compiler.validate?.({ type: 'button', variant: '${expr}' } as any)).toEqual([]);
  });

  it('validates record value shapes with keyed entry diagnostics', () => {
    const diagnostics = createSchemaCompilerDiagnosticsContext(undefined, 'validate');

    const valid = validateFluxValueShape(
      { nodeA: { dx: 1, dy: 'bad' } },
      {
        kind: 'record',
        value: {
          kind: 'object',
          fields: {
            dx: { kind: 'number' },
            dy: { kind: 'number' },
          },
          unknownKeys: 'reject',
        },
      },
      '/deltas',
      diagnostics,
      {
        code: 'invalid-property-value',
        source: 'core',
        messagePrefix: 'Invalid deltas payload.',
      },
    );

    expect(valid).toBe(false);
    expect(diagnostics.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-property-value',
          path: '/deltas/nodeA/dy',
        }),
      ]),
    );
  });
});

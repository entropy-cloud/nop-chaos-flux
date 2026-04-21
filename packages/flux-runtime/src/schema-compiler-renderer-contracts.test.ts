import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

describe('schema compiler renderer contract integration', () => {
  it('treats propContracts as a closed authoring prop model for diagnostics', () => {
    const renderer: RendererDefinition = {
      type: 'contract-button',
      component: () => null,
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label'
        }
      },
      eventContracts: {
        onClick: {
          displayName: 'Click'
        }
      },
      fields: [{ key: 'onClick', kind: 'event' }]
    };

    const diagnostics = validateSchema({
      schema: {
        type: 'contract-button',
        label: 'Hello',
        typo: 'unexpected'
      },
      registry: createRendererRegistry([renderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      options: {
        validation: {
          unknownBarePropertyPolicy: 'error'
        }
      }
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-property',
        path: '/typo'
      })
    ]);
  });
});

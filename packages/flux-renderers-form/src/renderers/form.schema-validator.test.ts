import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinition } from './form';

describe('form schemaValidator', () => {
  const compiler = createSchemaCompiler({
    registry: createRendererRegistry([formRendererDefinition]),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler())
  });

  it('reports invalid body and data shapes', () => {
    expect(compiler.validate?.({
      type: 'form',
      body: { type: 'input-text', name: 'keyword' },
      data: []
    } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/body',
        source: 'renderer'
      }),
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/data',
        source: 'renderer'
      })
    ]));
  });

  it('reports invalid actions shape', () => {
    expect(compiler.validate?.({
      type: 'form',
      actions: { type: 'button', label: 'Submit' }
    } as any)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-property-shape',
        path: '/actions',
        source: 'renderer'
      })
    ]));
  });
});

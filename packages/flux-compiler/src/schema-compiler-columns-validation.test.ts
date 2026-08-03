import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { validateSchema } from './schema-compiler.js';

const arrayEditorRenderer: RendererDefinition = {
  type: 'array-editor',
  component: (() => null) as any,
};
const inputNumberRenderer: RendererDefinition = {
  type: 'input-number',
  component: (() => null) as any,
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'onChange', kind: 'event' },
  ],
};
const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (() => null) as any,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const ec = createExpressionCompiler(createFormulaCompiler());
const registry = createRendererRegistry([arrayEditorRenderer, inputNumberRenderer, pageRenderer]);

describe('columns schema-array recursive validation', () => {
  it('reports diagnostics for column onEvent (AMIS event-map shape not recognized by flux)', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'array-editor',
        columns: [
          {
            type: 'input-number',
            name: 'quantity',
            onEvent: {
              change: {
                actions: [{ actionType: 'setValue', args: { value: { amount: '${a}' } } }],
              },
            },
          },
        ],
      },
      registry,
      expressionCompiler: ec,
    });
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(
      diagnostics.some((d) => d.path.includes('columns') && d.path.includes('onEvent')),
    ).toBe(true);
  });

  it('accepts column onChange (renderer-declared event) with valid flux action', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'array-editor',
        columns: [
          {
            type: 'input-number',
            name: 'quantity',
            onChange: { action: 'setValue', args: { value: { amount: '${a}' } } },
          },
        ],
      },
      registry,
      expressionCompiler: ec,
    });
    const onChangeErrors = diagnostics.filter((d) => d.path.includes('onChange'));
    expect(onChangeErrors).toEqual([]);
  });
});

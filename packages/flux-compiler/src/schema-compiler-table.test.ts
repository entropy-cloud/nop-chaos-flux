import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './index';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

describe('createSchemaCompiler', () => {
  it('extracts table column label fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: { type: 'text', text: 'Member header' },
          name: 'name',
        },
      ],
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.label']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].label).toBeUndefined();
    expect(node.propsProgram.value.columns[0].labelRegionKey).toBe('columns.0.label');
  });

  it('extracts table column cell fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: 'Member',
          name: 'name',
          cell: { type: 'text', text: 'User ${record.name}' },
        },
      ],
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.cell']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].cell).toBeUndefined();
    expect(node.propsProgram.value.columns[0].cellRegionKey).toBe('columns.0.cell');
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }],
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const plainCompiled = compiler.compile({
      type: 'table',
      empty: 'Nothing here',
    });
    const regionCompiled = compiler.compile({
      type: 'text',
      empty: { type: 'text', text: 'No rows' },
    } as any);
    const plainNode = plainCompiled.root as any;
    const regionNode = regionCompiled.root as any;

    expect(plainNode.propsProgram.value.empty).toBe('Nothing here');
    expect(plainNode.regions.empty).toBeUndefined();
    expect(regionNode.propsProgram?.value?.empty).toEqual({ type: 'text', text: 'No rows' });
    expect(regionNode.regions?.empty).toBeUndefined();
  });
});

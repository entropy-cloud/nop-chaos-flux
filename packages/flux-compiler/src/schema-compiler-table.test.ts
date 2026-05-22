import { describe, expect, it } from 'vitest';
import {
  createRendererRegistry,
  extractNestedSchemaRegions,
  type CompileSchemaOptions,
  type RendererDefinition,
  type SchemaInput,
  type TemplateNode,
  type TemplateRegion,
} from '@nop-chaos/flux-core';
import { createSchemaCompiler } from './index.js';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((column, index) => {
    if (!column || typeof column !== 'object') {
      return column;
    }

    return extractNestedSchemaRegions({
      candidate: column as Record<string, unknown>,
      itemRegionPath: `${path}.columns[${index}]`,
      itemRegionKeyPrefix: `columns.${index}`,
      rules: [
        { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
        {
          key: 'buttons',
          regionKeySuffix: 'buttons',
          compiledKey: 'buttonsRegionKey',
          params: ['record', 'index'],
          isolate: true,
        },
        {
          key: 'cell',
          regionKeySuffix: 'cell',
          compiledKey: 'cellRegionKey',
          params: ['record', 'index'],
          isolate: true,
        },
        {
          key: 'body',
          regionKeySuffix: 'quickEditBody',
          compiledKey: 'quickEditBodyRegionKey',
        },
      ],
      regions,
      compileSchema,
    }).value;
  });
}

const tableDeepFields = [
  {
    key: 'columns',
    nestedRegions: [
      { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
      {
        key: 'buttons',
        regionKeySuffix: 'buttons',
        compiledKey: 'buttonsRegionKey',
        params: ['record', 'index'] as const,
        isolate: true,
      },
      {
        key: 'cell',
        regionKeySuffix: 'cell',
        compiledKey: 'cellRegionKey',
        params: ['record', 'index'] as const,
        isolate: true,
      },
      {
        key: 'body',
        regionKeySuffix: 'quickEditBody',
        compiledKey: 'quickEditBodyRegionKey',
      },
    ],
    normalize(input: {
      value: unknown;
      path: string;
      regions: Record<string, TemplateRegion>;
      compileSchema: (
        input: SchemaInput,
        options?: CompileSchemaOptions,
        regionMeta?: { params?: readonly string[]; isolate?: boolean },
      ) => TemplateNode | TemplateNode[];
    }) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    },
  },
];

describe('createSchemaCompiler', () => {
  it('extracts table column label fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      deepFields: tableDeepFields,
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
      deepFields: tableDeepFields,
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
          cell: { type: 'text', text: 'User ${$slot.record.name}' },
        },
      ],
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.cell']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].cell).toBeUndefined();
    expect(node.propsProgram.value.columns[0].cellRegionKey).toBe('columns.0.cell');
  });

  it('extracts table column body fragments into quick edit compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      deepFields: tableDeepFields,
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
          body: { type: 'text', text: 'Quick edit ${$slot.record.name}' },
        },
      ],
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.quickEditBody']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].body).toBeUndefined();
    expect(node.propsProgram.value.columns[0].quickEditBodyRegionKey).toBe(
      'columns.0.quickEditBody',
    );
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }],
      deepFields: tableDeepFields,
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

  it('warns when table parameterized slots use bare record instead of $slot.record', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      deepFields: tableDeepFields,
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

    const diagnostics = compiler.validate?.({
      type: 'table',
      columns: [
        {
          name: 'name',
          cell: { type: 'text', text: 'User ${record.name}' },
        },
      ],
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-slot-param',
          severity: 'warning',
          path: '$.columns[0].cell.text',
        }),
      ]),
    );
  });

  it('accepts $slot.record in table parameterized slots without slot diagnostics', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      deepFields: tableDeepFields,
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

    const diagnostics = compiler.validate?.({
      type: 'table',
      columns: [
        {
          name: 'name',
          cell: { type: 'text', text: 'User ${$slot.record.name}' },
        },
      ],
    });

    expect(
      diagnostics?.filter(
        (issue) => issue.code === 'unknown-slot-param' || issue.code === 'slot-used-outside-region',
      ),
    ).toEqual([]);
  });
});

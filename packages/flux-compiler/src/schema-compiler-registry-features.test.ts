import { describe, expect, it } from 'vitest';
import {
  extractNestedSchemaRegions,
  type CompileSchemaOptions,
  type RendererDefinition,
  type SchemaInput,
  type TemplateNode,
  type TemplateRegion,
} from '@nop-chaos/flux-core';
import {
  importHostRenderer,
  createTestCompiler,
} from './schema-compiler-registry-fixtures.js';

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
  it('preserves xui:imports on compiled schema for runtime registration', () => {
    const compiler = createTestCompiler([importHostRenderer]);

    const compiled = compiler.compile({
      type: 'import-host',
      'xui:imports': [
        {
          from: 'demo-lib',
          as: 'demo',
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.schema['xui:imports']).toEqual([{ from: 'demo-lib', as: 'demo' }]);
  });

  it('extracts table operation buttons into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      deepFields: tableDeepFields,
    };
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, buttonRenderer]);

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Inspect' }],
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.regions['columns.0.buttons']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].buttons).toBeUndefined();
    expect(node.propsProgram.value.columns[0].buttonsRegionKey).toBe('columns.0.buttons');
  });

  it('extracts table column label fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      deepFields: tableDeepFields,
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, textRendererLocal]);

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: { type: 'text', text: 'Member header' },
          name: 'name',
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

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
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, textRendererLocal]);

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
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.regions['columns.0.cell']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].cell).toBeUndefined();
    expect(node.propsProgram.value.columns[0].cellRegionKey).toBe('columns.0.cell');
  });

  it('extracts deep-field nested regions without requiring a custom normalizer', () => {
    const variantFieldRenderer: RendererDefinition = {
      type: 'variant-field',
      component: () => null,
      deepFields: [
        {
          key: 'variants',
          nestedRegions: [
            {
              key: 'content',
              regionKeySuffix: 'content',
              compiledKey: 'contentRegionKey',
            },
            {
              key: 'viewer',
              regionKeySuffix: 'viewer',
              compiledKey: 'viewerRegionKey',
            },
          ],
        },
      ],
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([variantFieldRenderer, textRendererLocal]);

    const compiled = compiler.compile({
      type: 'variant-field',
      variants: [
        {
          key: 'alpha',
          content: { type: 'text', text: 'Alpha editor' },
          viewer: { type: 'text', text: 'Alpha viewer' },
        },
      ],
    });
    const node = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(node.regions['variants.0.content']?.node).toBeTruthy();
    expect(node.regions['variants.0.viewer']?.node).toBeTruthy();
    expect(node.propsProgram.value.variants[0].content).toBeUndefined();
    expect(node.propsProgram.value.variants[0].viewer).toBeUndefined();
    expect(node.propsProgram.value.variants[0].contentRegionKey).toBe('variants.0.content');
    expect(node.propsProgram.value.variants[0].viewerRegionKey).toBe('variants.0.viewer');
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }],
      deepFields: tableDeepFields,
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null,
    };
    const compiler = createTestCompiler([tableRenderer, textRendererLocal]);

    const plainCompiled = compiler.compile({
      type: 'table',
      empty: 'Nothing here',
    });
    const regionCompiled = compiler.compile({
      type: 'text',
      empty: { type: 'text', text: 'No rows' },
    });
    const plainNode = Array.isArray(plainCompiled.root)
      ? plainCompiled.root[0]
      : plainCompiled.root;
    const regionNode = Array.isArray(regionCompiled.root)
      ? regionCompiled.root[0]
      : regionCompiled.root;

    expect(plainNode.propsProgram.value.empty).toBe('Nothing here');
    expect(plainNode.regions.empty).toBeUndefined();
    expect(regionNode.propsProgram?.value?.empty).toEqual({ type: 'text', text: 'No rows' });
    expect(regionNode.regions?.empty).toBeUndefined();
  });
});

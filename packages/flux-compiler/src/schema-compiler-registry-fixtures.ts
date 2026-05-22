import {
  createRendererRegistry,
  extractNestedSchemaRegions,
  type RendererDefinition,
  type TemplateRegion,
  type SchemaInput,
  type CompileSchemaOptions,
  type TemplateNode,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

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

export const tableRenderer: RendererDefinition = {
  type: 'table',
  component: () => null,
  deepFields: [
    {
      key: 'columns',
      nestedRegions: [
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
      normalize(input) {
        return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
      },
    },
  ],
  fields: [
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSortChange', kind: 'event' },
    { key: 'onFilterChange', kind: 'event' },
    { key: 'onPageChange', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'loadingContent', kind: 'value-or-region', regionKey: 'loading' },
  ],
};

export const crudRenderer: RendererDefinition = {
  type: 'crud',
  component: () => null,
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'composite'],
  deepFields: [
    {
      key: 'columns',
      nestedRegions: [
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
      normalize(input) {
        return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
      },
    },
  ],
  fields: [
    { key: 'queryForm', kind: 'prop' },
    { key: 'toolbar', kind: 'region' },
    { key: 'listActions', kind: 'region' },
    { key: 'footerToolbar', kind: 'region' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
  ],
};

export const dataSourceRenderer: RendererDefinition = {
  type: 'data-source',
  component: () => null,
  compilation: {
    artifacts: ['data-source'],
  },
};

export const localDataRendererDefinitions: RendererDefinition[] = [
  tableRenderer,
  crudRenderer,
  dataSourceRenderer,
];

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const cardRenderer: RendererDefinition = {
  type: 'card',
  component: () => null,
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
};

export const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const importHostRenderer: RendererDefinition = {
  type: 'import-host',
  component: () => null,
};

export const formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
  ],
  scopePolicy: 'form',
  validation: {
    kind: 'container',
  },
  validationDefaults: {
    defaultChildContractMode: 'ignore',
  },
};

export const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: () => null,
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
};

export function createTestCompiler(definitions: RendererDefinition[]) {
  const registry = createRendererRegistry(definitions);
  return createSchemaCompiler({
    registry,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

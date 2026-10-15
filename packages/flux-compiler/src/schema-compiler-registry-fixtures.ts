import {
  createRendererRegistry,
  type RegisteredRendererDefinition,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

const tableColumnsShape = {
  kind: 'array' as const,
  item: {
    kind: 'schema-definition' as const,
    fieldRules: {
      label: { kind: 'value-or-region' as const, regionKey: 'labelRegionKey' },
      buttons: {
        kind: 'region' as const,
        regionKey: 'buttonsRegionKey',
        params: ['record', 'index'],
        isolate: true,
      },
      cell: {
        kind: 'region' as const,
        regionKey: 'cellRegionKey',
        params: ['record', 'index'],
        isolate: true,
      },
      body: {
        kind: 'region' as const,
        regionKey: 'quickEditBodyRegionKey',
        regionKeySuffix: 'quickEditBody',
      },
    },
  },
};

export const tableRenderer: RegisteredRendererDefinition = {
  type: 'table',
  component: () => null,
  propContracts: {
    columns: {
      shape: tableColumnsShape,
      displayName: 'Columns',
    },
  },
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

export const crudRenderer: RegisteredRendererDefinition = {
  type: 'crud',
  component: () => null,
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'composite'],
  propContracts: {
    columns: {
      shape: tableColumnsShape,
      displayName: 'Columns',
    },
  },
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

export const dataSourceRenderer: RegisteredRendererDefinition = {
  type: 'data-source',
  component: () => null,
  compilation: {
    artifacts: ['data-source'],
  },
};

export const localDataRendererDefinitions: RegisteredRendererDefinition[] = [
  tableRenderer,
  crudRenderer,
  dataSourceRenderer,
];

export const textRenderer: RegisteredRendererDefinition = {
  type: 'text',
  component: () => null,
};

export const pageRenderer: RegisteredRendererDefinition = {
  type: 'page',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const cardRenderer: RegisteredRendererDefinition = {
  type: 'card',
  component: () => null,
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
};

export const actionButtonRenderer: RegisteredRendererDefinition = {
  type: 'action-button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const importHostRenderer: RegisteredRendererDefinition = {
  type: 'import-host',
  component: () => null,
};

export const formRenderer: RegisteredRendererDefinition = {
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

export const inputRenderer: RegisteredRendererDefinition = {
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

export function createTestCompiler(definitions: RegisteredRendererDefinition[]) {
  const registry = createRendererRegistry(definitions);
  return createSchemaCompiler({
    registry,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

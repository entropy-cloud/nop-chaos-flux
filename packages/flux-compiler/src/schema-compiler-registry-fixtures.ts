import {
  createRendererRegistry,
  type RendererDefinition,
} from '@nop-chaos/flux-core';
import {
  createExpressionCompiler,
  createFormulaCompiler,
} from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index';

export const crudAuthoringTransform = (
  context: import('@nop-chaos/flux-core').RendererAuthoringTransformContext<
    import('@nop-chaos/flux-core').BaseSchema
  >,
) => {
  if (context.schema.type !== 'crud') {
    return context.schema;
  }

  const schema = context.schema as Record<string, unknown>;
  const nextSchema: Record<string, unknown> = { ...schema };

  if (nextSchema.filter !== undefined && nextSchema.queryForm === undefined) {
    nextSchema.queryForm = nextSchema.filter;
  }

  if (nextSchema.primaryField !== undefined && nextSchema.rowKey === undefined) {
    nextSchema.rowKey = nextSchema.primaryField;
  }

  if (nextSchema.perPageField !== undefined && nextSchema.pageSizeField === undefined) {
    nextSchema.pageSizeField = nextSchema.perPageField;
  }

  delete nextSchema.filter;
  delete nextSchema.primaryField;
  delete nextSchema.perPageField;

  if (nextSchema.bulkActions === undefined) {
    return nextSchema as import('@nop-chaos/flux-core').BaseSchema;
  }

  if (nextSchema.listActions !== undefined) {
    const { bulkActions, ...rest } = nextSchema;
    void bulkActions;
    return rest as import('@nop-chaos/flux-core').BaseSchema;
  }

  const { bulkActions, ...rest } = nextSchema;
  return {
    ...rest,
    listActions: bulkActions,
  } as unknown as import('@nop-chaos/flux-core').BaseSchema;
};

export const tableRenderer: RendererDefinition = {
  type: 'table',
  component: () => null,
  fields: [
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSortChange', kind: 'event' },
    { key: 'onFilterChange', kind: 'event' },
    { key: 'onPageChange', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'loadingSlot', kind: 'value-or-region', regionKey: 'loadingSlot' },
  ],
};

export const crudRenderer: RendererDefinition = {
  type: 'crud',
  component: () => null,
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'composite'],
  authoringTransform: crudAuthoringTransform,
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
  regions: ['body'],
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
  regions: ['body', 'actions'],
  scopePolicy: 'form',
  validation: {
    kind: 'container',
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

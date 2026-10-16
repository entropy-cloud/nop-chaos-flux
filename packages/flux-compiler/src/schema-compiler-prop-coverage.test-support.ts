import type { RegisteredRendererDefinition, RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

export function createCompiler(...definitions: RegisteredRendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

export const noop = () => null;

export function compileNode(
  compiler: ReturnType<typeof createSchemaCompiler>,
  schema: Record<string, unknown>,
) {
  const compiled = compiler.compile(schema as any);
  return Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
}

export const dialogRenderer: RegisteredRendererDefinition = {
  type: 'dialog',
  component: noop,
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
    { key: 'onOpen', kind: 'event' },
    { key: 'onClose', kind: 'event' },
    { key: 'container', kind: 'prop' },
    { key: 'showMask', kind: 'prop' },
  ],
};

export const drawerRenderer: RegisteredRendererDefinition = {
  type: 'drawer',
  component: noop,
  fields: [
    { key: 'title', kind: 'value-or-region', regionKey: 'title' },
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
    { key: 'onOpen', kind: 'event' },
    { key: 'onClose', kind: 'event' },
    { key: 'container', kind: 'prop' },
    { key: 'showMask', kind: 'prop' },
  ],
};

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: noop,
  fields: [
    { key: 'onClick', kind: 'event' },
    { key: 'label', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Label' } },
    {
      key: 'variant',
      kind: 'prop',
      contract: {
        shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'default' }] },
        displayName: 'Variant',
      },
    },
    {
      key: 'size',
      kind: 'prop',
      contract: {
        shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'default' }] },
        displayName: 'Size',
      },
    },
    { key: 'disabled', kind: 'prop', contract: { shape: { kind: 'boolean' }, displayName: 'Disabled' } },
  ],
};

export const loopRenderer: RegisteredRendererDefinition = {
  type: 'loop',
  component: noop,
  defaultSchema: { type: 'loop', body: [] },
  fields: [
    { key: 'empty', kind: 'region', regionKey: 'empty' },
    { key: 'items', kind: 'prop' },
    { key: 'itemName', kind: 'prop' },
    { key: 'indexName', kind: 'prop' },
    { key: 'keyName', kind: 'prop' },
    { key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index', 'key'] },
    { key: 'keyBy', kind: 'prop' },
    { key: 'body', kind: 'region', params: ['item', 'index'] },
  ],
};

export const recurseRenderer: RegisteredRendererDefinition = {
  type: 'recurse',
  component: noop,
  fields: [
    { key: 'items', kind: 'prop' },
    { key: 'itemName', kind: 'prop' },
    { key: 'indexName', kind: 'prop' },
    { key: 'keyName', kind: 'prop' },
    { key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index', 'key'] },
    { key: 'keyBy', kind: 'prop' },
    { key: 'maxDepth', kind: 'prop' },
  ],
};

export const tabsRenderer: RegisteredRendererDefinition = {
  type: 'tabs',
  component: noop,
  fields: [
    { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
    { key: 'onChange', kind: 'event' },
    { key: 'items', kind: 'prop', contract: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            title: {
              kind: 'value-or-region',
              regionKey: 'titleRegionKey',
              params: ['item', 'index', 'key'],
              isolate: true,
            },
            body: {
              kind: 'region',
              regionKey: 'bodyRegionKey',
              params: ['item', 'index', 'key'],
              isolate: true,
            },
            toolbar: {
              kind: 'region',
              regionKey: 'toolbarRegionKey',
              params: ['item', 'index', 'key'],
              isolate: true,
            },
            disabled: 'literal',
          },
        },
      },
      displayName: 'Items',
    } },
  ],
};

export const formRenderer: RegisteredRendererDefinition = {
  type: 'form',
  component: noop,
  defaultSchema: { type: 'form', body: [], actions: [] },
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
    { key: 'initAction', kind: 'event' },
    { key: 'submitAction', kind: 'event' },
    { key: 'onSubmitSuccess', kind: 'event' },
    { key: 'onSubmitError', kind: 'event' },
    { key: 'onValidateError', kind: 'event' },
    { key: 'statusPath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Status Path' } },
    { key: 'valuesPath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Values Path' } },
    { key: 'mode', kind: 'prop' },
    { key: 'labelAlign', kind: 'prop' },
    { key: 'labelWidth', kind: 'prop' },
  
    { key: 'data', kind: 'prop', contract: { shape: { kind: 'object', fields: {} }, displayName: 'Data' } },
    { key: 'hiddenFieldPolicy', kind: 'prop', contract: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'validate' },
          { kind: 'literal', value: 'ignore' },
          {
            kind: 'object',
            fields: {
              validateWhenHidden: { kind: 'boolean' },
              clearValueWhenHidden: { kind: 'boolean' },
            },
            optional: ['validateWhenHidden', 'clearValueWhenHidden'],
          },
        ],
      },
      displayName: 'Hidden Field Policy',
    } },],
  scopePolicy: 'form',
  validationDefaults: {
    defaultChildContractMode: 'ignore',
  },
};

export const tableRenderer: RegisteredRendererDefinition = {
  type: 'table',
  component: noop,
  fields: [
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSortChange', kind: 'event' },
    { key: 'onFilterChange', kind: 'event' },
    { key: 'onPageChange', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'loadingContent', kind: 'value-or-region', regionKey: 'loading' },
  
    { key: 'columns', kind: 'prop', contract: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            label: { kind: 'value-or-region', regionKey: 'labelRegionKey' },
            buttons: {
              kind: 'region',
              regionKey: 'buttonsRegionKey',
              params: ['record', 'index'],
              isolate: true,
            },
            cell: {
              kind: 'region',
              regionKey: 'cellRegionKey',
              params: ['record', 'index'],
              isolate: true,
            },
            body: {
              kind: 'region',
              regionKey: 'quickEditBodyRegionKey',
              regionKeySuffix: 'quickEditBody',
            },
          },
        },
      },
      displayName: 'Columns',
    } },],
};

export const treeRenderer: RegisteredRendererDefinition = {
  type: 'tree',
  component: noop,
  fields: [
    { key: 'data', kind: 'prop' },
    { key: 'childrenKey', kind: 'prop' },
    { key: 'labelField', kind: 'prop' },
    { key: 'keyField', kind: 'prop' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'initiallyExpanded', kind: 'prop' },
    { key: 'expandOnClickNode', kind: 'prop' },
    { key: 'statusPath', kind: 'prop' },
    {
      key: 'node',
      kind: 'region',
      params: ['node', 'index', 'depth', 'key', 'parentNode'],
      isolate: false,
    },
  ],
};

export const chartRenderer: RegisteredRendererDefinition = {
  type: 'chart',
  component: noop,
  fields: [
    { key: 'onClick', kind: 'event' },
    { key: 'onHover', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'componentId', kind: 'prop' },
  ],
};

export const crudRenderer: RegisteredRendererDefinition = {
  type: 'crud',
  component: noop,
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'queryForm', kind: 'prop', contract: { shape: { kind: 'object', fields: {} }, displayName: 'Query Form' } },
    { key: 'toolbar', kind: 'region' },
    { key: 'listActions', kind: 'region' },
    { key: 'footerToolbar', kind: 'region' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'onQuerySubmit', kind: 'event' },
    { key: 'onQueryReset', kind: 'event' },
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
  
    { key: 'statusPath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Status Path' } },
    { key: 'source', kind: 'prop', contract: { shape: { kind: 'union', anyOf: [] }, displayName: 'Source' } },
    { key: 'columns', kind: 'prop', contract: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            label: { kind: 'value-or-region', regionKey: 'labelRegionKey' },
            buttons: {
              kind: 'region',
              regionKey: 'buttonsRegionKey',
              params: ['record', 'index'],
              isolate: true,
            },
            cell: {
              kind: 'region',
              regionKey: 'cellRegionKey',
              params: ['record', 'index'],
              isolate: true,
            },
            body: {
              kind: 'region',
              regionKey: 'quickEditBodyRegionKey',
              regionKeySuffix: 'quickEditBody',
            },
          },
        },
      },
      displayName: 'Columns',
    } },
    { key: 'itemKey', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Row Key' } },
    { key: 'pageField', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Page Field' } },
    { key: 'pageSizeField', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Page Size Field' } },
    { key: 'defaultParams', kind: 'prop', contract: { shape: { kind: 'object', fields: {} }, displayName: 'Default Params' } },
    { key: 'toolbar', kind: 'prop', contract: { shape: { kind: 'unknown' }, displayName: 'Toolbar' } },
    { key: 'listActions', kind: 'prop', contract: { shape: { kind: 'unknown' }, displayName: 'List Actions' } },
    { key: 'footerToolbar', kind: 'prop', contract: { shape: { kind: 'unknown' }, displayName: 'Footer Toolbar' } },
    { key: 'toolbarLayout', kind: 'prop', contract: { shape: { kind: 'object', fields: {} }, displayName: 'Toolbar Layout' } },
    { key: 'selection', kind: 'prop', contract: { shape: { kind: 'object', fields: {} }, displayName: 'Selection' } },
    { key: 'selectionStatePath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Selection Path' } },
    { key: 'selectionOwnership', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Selection Ownership' } },
    { key: 'paginationOwnership', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Pagination Ownership' } },
    { key: 'paginationStatePath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Pagination Path' } },
    { key: 'sortOwnership', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Sort Ownership' } },
    { key: 'sortStatePath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Sort Path' } },
    { key: 'filterOwnership', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Filter Ownership' } },
    { key: 'filterStatePath', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Filter Path' } },
    { key: 'columnSettings', kind: 'prop', contract: { shape: { kind: 'object', fields: {} }, displayName: 'Column Settings' } },],
};

export const variantFieldRenderer: RegisteredRendererDefinition = {
  type: 'variant-field',
  component: noop,
  fields: [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'variants', kind: 'prop' },
    { key: 'selector', kind: 'prop' },
    { key: 'selectorMode', kind: 'prop' },
    { key: 'defaultVariant', kind: 'prop' },
    { key: 'detectVariantAction', kind: 'event' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' },
  ],
};

export const detailFieldRenderer: RegisteredRendererDefinition = {
  type: 'detail-field',
  component: noop,
  wrap: true,
  fields: [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'viewer', kind: 'region', regionKey: 'viewer' },
    { key: 'content', kind: 'region', regionKey: 'content' },
    { key: 'triggerLabel', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'surface', kind: 'ignored' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' },
  ],
};

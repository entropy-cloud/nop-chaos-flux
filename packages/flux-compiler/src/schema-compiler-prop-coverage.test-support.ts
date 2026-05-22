import type {
  CompileSchemaOptions,
  RendererDefinition,
  SchemaInput,
  TemplateNode,
  TemplateRegion,
} from '@nop-chaos/flux-core';
import { createRendererRegistry, extractNestedSchemaRegions } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

export function createCompiler(...definitions: RendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

export const noop = () => null;

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

export function compileNode(
  compiler: ReturnType<typeof createSchemaCompiler>,
  schema: Record<string, unknown>,
) {
  const compiled = compiler.compile(schema as any);
  return Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
}

export const dialogRenderer: RendererDefinition = {
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

export const drawerRenderer: RendererDefinition = {
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
  propContracts: {
    label: { shape: { kind: 'string' }, displayName: 'Label' },
    variant: {
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'default' }] },
      displayName: 'Variant',
    },
    size: {
      shape: { kind: 'union', anyOf: [{ kind: 'literal', value: 'default' }] },
      displayName: 'Size',
    },
    disabled: { shape: { kind: 'boolean' }, displayName: 'Disabled' },
  },
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const loopRenderer: RendererDefinition = {
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

export const recurseRenderer: RendererDefinition = {
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

export const tabsRenderer: RendererDefinition = {
  type: 'tabs',
  component: noop,
  deepFields: [
    {
      key: 'items',
      nestedRegions: [
        {
          key: 'title',
          regionKeySuffix: 'title',
          compiledKey: 'titleRegionKey',
          params: ['item', 'index', 'key'],
          isolate: true,
        },
        {
          key: 'body',
          regionKeySuffix: 'body',
          compiledKey: 'bodyRegionKey',
          params: ['item', 'index', 'key'],
          isolate: true,
        },
        {
          key: 'toolbar',
          regionKeySuffix: 'toolbar',
          compiledKey: 'toolbarRegionKey',
          params: ['item', 'index', 'key'],
          isolate: true,
        },
      ],
      booleanKeys: ['disabled'],
    },
  ],
  fields: [
    { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
    { key: 'onChange', kind: 'event' },
    { key: 'items', kind: 'prop' },
  ],
};

export const formRenderer: RendererDefinition = {
  type: 'form',
  component: noop,
  defaultSchema: { type: 'form', body: [], actions: [] },
  propContracts: {
    data: { shape: { kind: 'object', fields: {} }, displayName: 'Data' },
    statusPath: { shape: { kind: 'string' }, displayName: 'Status Path' },
    valuesPath: { shape: { kind: 'string' }, displayName: 'Values Path' },
    hiddenFieldPolicy: {
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
    },
  },
  fields: [
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'actions', kind: 'region', regionKey: 'actions' },
    { key: 'initAction', kind: 'event' },
    { key: 'submitAction', kind: 'event' },
    { key: 'onSubmitSuccess', kind: 'event' },
    { key: 'onSubmitError', kind: 'event' },
    { key: 'onValidateError', kind: 'event' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'valuesPath', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'labelAlign', kind: 'prop' },
    { key: 'labelWidth', kind: 'prop' },
  ],
  scopePolicy: 'form',
  validationDefaults: {
    defaultChildContractMode: 'ignore',
  },
};

export const tableRenderer: RendererDefinition = {
  type: 'table',
  component: noop,
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

export const treeRenderer: RendererDefinition = {
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

export const chartRenderer: RendererDefinition = {
  type: 'chart',
  component: noop,
  fields: [
    { key: 'onClick', kind: 'event' },
    { key: 'onHover', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'componentId', kind: 'prop' },
  ],
};

export const crudRenderer: RendererDefinition = {
  type: 'crud',
  component: noop,
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
  propContracts: {
    statusPath: { shape: { kind: 'string' }, displayName: 'Status Path' },
    source: { shape: { kind: 'union', anyOf: [] }, displayName: 'Source' },
    queryForm: { shape: { kind: 'object', fields: {} }, displayName: 'Query Form' },
    columns: {
      shape: { kind: 'array', item: { kind: 'object', fields: {} } },
      displayName: 'Columns',
    },
    rowKey: { shape: { kind: 'string' }, displayName: 'Row Key' },
    pageField: { shape: { kind: 'string' }, displayName: 'Page Field' },
    pageSizeField: { shape: { kind: 'string' }, displayName: 'Page Size Field' },
    defaultParams: { shape: { kind: 'object', fields: {} }, displayName: 'Default Params' },
    toolbar: { shape: { kind: 'unknown' }, displayName: 'Toolbar' },
    listActions: { shape: { kind: 'unknown' }, displayName: 'List Actions' },
    footerToolbar: { shape: { kind: 'unknown' }, displayName: 'Footer Toolbar' },
    toolbarLayout: { shape: { kind: 'object', fields: {} }, displayName: 'Toolbar Layout' },
    selection: { shape: { kind: 'object', fields: {} }, displayName: 'Selection' },
    selectionStatePath: { shape: { kind: 'string' }, displayName: 'Selection Path' },
    selectionOwnership: { shape: { kind: 'string' }, displayName: 'Selection Ownership' },
    paginationOwnership: { shape: { kind: 'string' }, displayName: 'Pagination Ownership' },
    paginationStatePath: { shape: { kind: 'string' }, displayName: 'Pagination Path' },
    sortOwnership: { shape: { kind: 'string' }, displayName: 'Sort Ownership' },
    sortStatePath: { shape: { kind: 'string' }, displayName: 'Sort Path' },
    filterOwnership: { shape: { kind: 'string' }, displayName: 'Filter Ownership' },
    filterStatePath: { shape: { kind: 'string' }, displayName: 'Filter Path' },
    columnSettings: { shape: { kind: 'object', fields: {} }, displayName: 'Column Settings' },
  },
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'queryForm', kind: 'prop' },
    { key: 'toolbar', kind: 'region' },
    { key: 'listActions', kind: 'region' },
    { key: 'footerToolbar', kind: 'region' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'onQuerySubmit', kind: 'event' },
    { key: 'onQueryReset', kind: 'event' },
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
  ],
};

export const variantFieldRenderer: RendererDefinition = {
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

export const detailFieldRenderer: RendererDefinition = {
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

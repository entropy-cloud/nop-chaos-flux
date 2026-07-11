import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createTemplateRegion, extractNestedSchemaRegions, isSchemaInput } from '@nop-chaos/flux-core';
import { CrudRenderer } from './crud-renderer.js';
import { transformCrudAuthoringSchema, validateCrudSchema } from './data-schema-validation.js';

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, import('@nop-chaos/flux-core').TemplateRegion>,
  compileSchema: (
    input: import('@nop-chaos/flux-core').SchemaInput,
    options?: import('@nop-chaos/flux-core').CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('@nop-chaos/flux-core').TemplateNode | import('@nop-chaos/flux-core').TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((column, index) => {
    if (!column || typeof column !== 'object') {
      return column;
    }

    const normalizedColumn = extractNestedSchemaRegions({
      candidate: column as Record<string, unknown>,
      itemRegionPath: `${path}.columns[${index}]`,
      itemRegionKeyPrefix: `columns.${index}`,
      rules: [
        { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
        {
          key: 'buttons',
          regionKeySuffix: 'buttons',
          compiledKey: 'buttonsRegionKey',
          params: ['record', 'index'] as readonly string[],
          isolate: true,
        },
        {
          key: 'cell',
          regionKeySuffix: 'cell',
          compiledKey: 'cellRegionKey',
          params: ['record', 'index'] as readonly string[],
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
    }).value as Record<string, unknown>;

    const quickEdit = normalizedColumn.quickEdit;
    if (
      quickEdit &&
      typeof quickEdit === 'object' &&
      !Array.isArray(quickEdit) &&
      isSchemaInput((quickEdit as Record<string, unknown>).body)
    ) {
      const quickEditBodyRegionKey =
        typeof normalizedColumn.quickEditBodyRegionKey === 'string'
          ? normalizedColumn.quickEditBodyRegionKey
          : `columns.${index}.quickEditBody`;
      const quickEditBodyRegionPath = `${path}.columns[${index}].quickEdit.body`;

      regions[quickEditBodyRegionKey] = createTemplateRegion(
        quickEditBodyRegionKey,
        (quickEdit as Record<string, unknown>).body,
        quickEditBodyRegionPath,
        compileSchema,
      );

      const nextQuickEdit = { ...(quickEdit as Record<string, unknown>) };
      delete nextQuickEdit.body;

      return {
        ...normalizedColumn,
        quickEdit: nextQuickEdit,
        quickEditBodyRegionKey,
      };
    }

    return normalizedColumn;
  });
}

export const crudRendererDefinition: RendererDefinition = {
  type: 'crud',
  displayName: 'CRUD',
  category: 'data',
  sourcePackage: '@nop-chaos/flux-renderers-data',
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'composite'],
  authoringTransform: transformCrudAuthoringSchema,
  schemaValidator: validateCrudSchema,
  propContracts: {
    statusPath: {
      shape: { kind: 'string' },
      displayName: 'Status Path',
      description: 'Publishes the readonly CRUD summary to scope.',
      editorType: 'path',
    },
    source: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'array', item: { kind: 'unknown' } },
          { kind: 'unknown', description: 'Data source expression or source schema.' },
        ],
      },
      displayName: 'Source',
      description: 'Rows rendered by the CRUD table.',
      editorType: 'source',
    },
    queryForm: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Query Form',
      description: 'Optional embedded query form configuration or migrated AMIS filter form.',
      editorType: 'object',
    },
    columns: {
      shape: { kind: 'unknown' },
      displayName: 'Columns',
      description:
        'Table column declarations, including operation, fixed, searchable, filterable, and quick-edit metadata.',
      editorType: 'crud-columns',
    },
    listMode: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'table' },
          { kind: 'literal', value: 'cards' },
          { kind: 'literal', value: 'list' },
        ],
      },
      displayName: 'List Mode',
      description:
        "Row rendering carrier: 'table' (default, zero-regression), 'cards', or 'list'. In cards/list modes CRUD self-holds selection and drives pagination.",
      editorType: 'select',
      defaultValue: 'table',
    },
    rowKey: {
      shape: { kind: 'string' },
      displayName: 'Row Key',
      description: 'Stable record key field used by CRUD/table selection and row identity.',
      editorType: 'text',
    },
    pageField: {
      shape: { kind: 'string' },
      displayName: 'Page Field',
      description: 'Request/query field name used for the current page parameter.',
      editorType: 'text',
    },
    pageSizeField: {
      shape: { kind: 'string' },
      displayName: 'Page Size Field',
      description: 'Request/query field name used for the page size parameter.',
      editorType: 'text',
    },
    defaultParams: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Default Params',
      description: 'Default query/refresh parameters merged into the CRUD workflow input.',
      editorType: 'object',
    },
    toolbar: {
      shape: { kind: 'unknown' },
      displayName: 'Toolbar',
      description: 'Top toolbar region or migrated headerToolbar content.',
      editorType: 'region',
    },
    listActions: {
      shape: { kind: 'unknown' },
      displayName: 'List Actions',
      description:
        'List-level actions such as create, refresh, export, or selection-driven batch actions.',
      editorType: 'region',
    },
    footerToolbar: {
      shape: { kind: 'unknown' },
      displayName: 'Footer Toolbar',
      description: 'Bottom toolbar region or migrated footerToolbar content.',
      editorType: 'region',
    },
    toolbarLayout: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Toolbar Layout',
      description: 'Structured toolbar blocks such as pagination, statistics, and columns toggler.',
      editorType: 'object',
    },
    selection: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Selection',
      description: 'CRUD selection configuration such as checkbox/radio mode and selection limits.',
      editorType: 'object',
    },
    selectionStatePath: {
      shape: { kind: 'string' },
      displayName: 'Selection Path',
      description: 'Scope path used when selection ownership is scope-based.',
      editorType: 'path',
    },
    selectionOwnership: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'local' },
          { kind: 'literal', value: 'controlled' },
          { kind: 'literal', value: 'scope' },
        ],
      },
      displayName: 'Selection Ownership',
      description: 'Controls whether selection state is local, controlled, or scope-owned.',
      editorType: 'select',
      defaultValue: 'local',
    },
    paginationOwnership: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'local' },
          { kind: 'literal', value: 'controlled' },
          { kind: 'literal', value: 'scope' },
        ],
      },
      displayName: 'Pagination Ownership',
      description: 'Controls whether pagination state is local, controlled, or scope-owned.',
      editorType: 'select',
      defaultValue: 'local',
    },
    paginationStatePath: {
      shape: { kind: 'string' },
      displayName: 'Pagination Path',
      description: 'Scope path used when pagination ownership is scope-based.',
      editorType: 'path',
    },
    sortOwnership: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'local' },
          { kind: 'literal', value: 'controlled' },
          { kind: 'literal', value: 'scope' },
        ],
      },
      displayName: 'Sort Ownership',
      description: 'Controls whether sort state is local, controlled, or scope-owned.',
      editorType: 'select',
      defaultValue: 'local',
    },
    sortStatePath: {
      shape: { kind: 'string' },
      displayName: 'Sort Path',
      description: 'Scope path used when sort ownership is scope-based.',
      editorType: 'path',
    },
    filterOwnership: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'local' },
          { kind: 'literal', value: 'controlled' },
          { kind: 'literal', value: 'scope' },
        ],
      },
      displayName: 'Filter Ownership',
      description: 'Controls whether filter state is local, controlled, or scope-owned.',
      editorType: 'select',
      defaultValue: 'local',
    },
    filterStatePath: {
      shape: { kind: 'string' },
      displayName: 'Filter Path',
      description: 'Scope path used when filter ownership is scope-based.',
      editorType: 'path',
    },
    columnSettings: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Column Settings',
      description:
        'Column visibility and order management, including overlay and inline entry modes; drag reorder is still deferred.',
      editorType: 'object',
    },
    polling: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Polling',
      description:
        'Polling orchestration that toggles the upstream data-source controller start/stop based on the enabled gate and optional sourceId addressing.',
      editorType: 'object',
    },
    filterTogglable: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Filter Togglable',
      description:
        'Collapsible query region configuration; when truthy the queryForm region renders inside a collapse container with a toggle button.',
      editorType: 'object',
    },
    pagination: {
      shape: {
        kind: 'object',
        fields: {
          mode: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'pages' },
              { kind: 'literal', value: 'infinite' },
            ],
          },
        },
      },
      displayName: 'Pagination',
      description:
        "Pagination mode: 'pages' (default, standard pagination) or 'infinite' (infinite scroll with IntersectionObserver).",
      editorType: 'object',
      defaultValue: 'pages',
    },
    loadAction: {
      shape: { kind: 'unknown' },
      displayName: 'Load Action',
      description:
        'Action dispatched to fetch CRUD data. Receives pagination/query/sort/filters bindings. Replaces the source + onRefresh pattern.',
      editorType: 'object',
    },
    loadAllData: {
      shape: { kind: 'boolean' },
      displayName: 'Load All Data',
      description:
        'When true, fetch all data on first load and perform pagination/sort/filter client-side. Only effective when loadAction is set.',
      editorType: 'boolean',
      defaultValue: false,
    },
  },
  eventContracts: {
    onQuerySubmit: {
      displayName: 'Query Submit',
      description: 'Runs when the CRUD query form submits.',
    },
    onQueryReset: {
      displayName: 'Query Reset',
      description: 'Runs when the CRUD query form resets.',
    },
    onRowClick: {
      displayName: 'Row Click',
      description: 'Runs when the user activates a row.',
    },
    onSelectionChange: {
      displayName: 'Selection Change',
      description: 'Runs when CRUD selection changes.',
      payload: {
        kind: 'object',
        fields: {
          selectedRowKeys: { kind: 'array', item: { kind: 'string' } },
        },
      },
    },
    onRefresh: {
      displayName: 'Refresh',
      description: 'Runs when the CRUD refresh action executes.',
    },
    onError: {
      displayName: 'Load Error',
      description:
        'Runs when a loadAction dispatch fails. When omitted, the default behavior shows an error toast and keeps the current data.',
    },
  },
  componentCapabilityContracts: [
    {
      handle: 'refresh',
      displayName: 'Refresh',
      description: 'Refresh the CRUD table source.',
    },
    {
      handle: 'getSelection',
      displayName: 'Get Selection',
      description: 'Return selected row keys.',
      result: { kind: 'array', item: { kind: 'string' } },
    },
    {
      handle: 'clearSelection',
      displayName: 'Clear Selection',
      description: 'Clear the current selection.',
    },
    {
      handle: 'toggleSelection',
      displayName: 'Toggle Selection',
      description:
        'Toggle a single row key in the CRUD-owned selectionStatePath (used by non-table carrier templates to express selection).',
      args: { kind: 'object', fields: { key: { kind: 'string' } } },
    },
    {
      handle: 'loadMore',
      displayName: 'Load More',
      description:
        'Load the next page of data when the CRUD pagination mode is "infinite". Triggers the loadAction or source refresh.',
    },
  ],
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
  scopeExportContracts: {
    $crud: {
      kind: 'object',
      fields: {
        loading: { kind: 'boolean' },
        refreshing: { kind: 'boolean' },
        itemCount: { kind: 'number' },
        total: { kind: 'number' },
        hasSelection: { kind: 'boolean' },
        selectionCount: { kind: 'number' },
        selectedRowKeys: { kind: 'array', item: { kind: 'string' } },
        query: { kind: 'object', fields: {} },
        pagination: { kind: 'object', fields: {} },
        sort: { kind: 'object', fields: {} },
        filters: { kind: 'object', fields: {} },
        visibleColumnNames: { kind: 'array', item: { kind: 'string' } },
      },
      optional: ['total', 'query', 'pagination', 'sort', 'filters', 'visibleColumnNames'],
    },
  },
  injectedLocals: {
    $crud: {
      kind: 'injected-local',
    },
  },
  component: CrudRenderer,
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'statusPath', kind: 'prop' },
    { key: 'source', kind: 'prop', allowSource: true },
    { key: 'columns', kind: 'prop' },
    { key: 'listMode', kind: 'prop' },
    { key: 'card', kind: 'region', params: ['item', 'index'], isolate: false },
    { key: 'item', kind: 'region', params: ['item', 'index'], isolate: false },
    { key: 'rowKey', kind: 'prop' },
    { key: 'selection', kind: 'prop' },
    { key: 'selectionOwnership', kind: 'prop' },
    { key: 'selectionStatePath', kind: 'prop' },
    { key: 'paginationOwnership', kind: 'prop' },
    { key: 'paginationStatePath', kind: 'prop' },
    { key: 'sortOwnership', kind: 'prop' },
    { key: 'sortStatePath', kind: 'prop' },
    { key: 'filterOwnership', kind: 'prop' },
    { key: 'filterStatePath', kind: 'prop' },
    { key: 'pageField', kind: 'prop' },
    { key: 'pageSizeField', kind: 'prop' },
    { key: 'defaultParams', kind: 'prop' },
    { key: 'syncLocation', kind: 'prop' },
    { key: 'columnSettings', kind: 'prop' },
    { key: 'responsive', kind: 'prop' },
    { key: 'autoClearSelectionOnRefresh', kind: 'prop' },
    { key: 'autoGenerateQueryForm', kind: 'prop' },
    { key: 'clientMode', kind: 'prop' },
    { key: 'polling', kind: 'prop' },
    { key: 'filterTogglable', kind: 'prop' },
    { key: 'pagination', kind: 'prop' },
    { key: 'quickSaveAction', kind: 'prop' },
    { key: 'quickSaveItemAction', kind: 'prop' },
    { key: 'loadAction', kind: 'reaction' },
    { key: 'loadAllData', kind: 'prop' },
    { key: 'dataStatePath', kind: 'prop' },
    { key: 'autoJumpToTopOnPagerChange', kind: 'prop', valueType: 'boolean' },
    { key: 'totalField', kind: 'prop' },
    { key: 'hideQuickSaveBtn', kind: 'prop', valueType: 'boolean' },
    { key: 'queryForm', kind: 'prop' },
    { key: 'queryFormRegion', kind: 'region', regionKey: 'queryFormRegion' },
    { key: 'toolbar', kind: 'region' },
    { key: 'listActions', kind: 'region' },
    { key: 'footerToolbar', kind: 'region' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'onQuerySubmit', kind: 'event' },
    { key: 'onQueryReset', kind: 'event' },
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
    { key: 'onError', kind: 'event' },
  ],
};

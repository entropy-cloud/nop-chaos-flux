import { registerRendererDefinitions, type RendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { TableRenderer } from './table-renderer';
import { DataSourceRenderer } from './data-source-renderer';
import { ChartRenderer } from './chart-renderer';
import { TreeRenderer } from './tree-renderer';
import { CrudRenderer } from './crud-renderer';
import { validateTableSchema, validateCrudSchema, transformCrudAuthoringSchema } from './data-schema-validation';

export * from './schemas';
export * from './crud-schema';
export { TableRenderer } from './table-renderer';
export { DataSourceRenderer } from './data-source-renderer';
export { ChartRenderer } from './chart-renderer';
export { TreeRenderer } from './tree-renderer';
export { CrudRenderer } from './crud-renderer';

export const dataRendererDefinitions: RendererDefinition[] = [
  {
    type: 'table',
    displayName: 'Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TableRenderer,
    schemaValidator: validateTableSchema,
    fields: [
      { key: 'onRowClick', kind: 'event' },
      { key: 'onSortChange', kind: 'event' },
      { key: 'onFilterChange', kind: 'event' },
      { key: 'onPageChange', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onRefresh', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'loadingSlot', kind: 'value-or-region', regionKey: 'loadingSlot' }
    ]
  },
  {
    type: 'data-source',
    displayName: 'Data Source',
    category: 'logic',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: DataSourceRenderer
  },
  {
    type: 'chart',
    displayName: 'Chart',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: ChartRenderer,
    fields: [
      { key: 'onClick', kind: 'event' },
      { key: 'onHover', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'componentId', kind: 'prop' }
    ]
  },
  {
    type: 'tree',
    displayName: 'Tree',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-data',
    component: TreeRenderer,
    fields: [
      { key: 'data', kind: 'prop' },
      { key: 'childrenKey', kind: 'prop' },
      { key: 'labelField', kind: 'prop' },
      { key: 'keyField', kind: 'prop' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'initiallyExpanded', kind: 'prop' },
      { key: 'expandOnClickNode', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'node', kind: 'region', params: ['node', 'index', 'depth', 'key', 'parentNode'], isolate: false }
    ]
  },
  {
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
        editorType: 'path'
      },
      source: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'array', item: { kind: 'unknown' } },
            { kind: 'unknown', description: 'Data source expression or source schema.' }
          ]
        },
        displayName: 'Source',
        description: 'Rows rendered by the CRUD table.',
        editorType: 'source'
      },
      queryForm: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Query Form',
        description: 'Optional embedded query form configuration or migrated AMIS filter form.',
        editorType: 'object'
      },
      columns: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Columns',
        description: 'Table column declarations, including operation, fixed, searchable, filterable, and quick-edit metadata.',
        editorType: 'crud-columns'
      },
      rowKey: {
        shape: { kind: 'string' },
        displayName: 'Row Key',
        description: 'Stable record key field used by CRUD/table selection and row identity.',
        editorType: 'text'
      },
      pageField: {
        shape: { kind: 'string' },
        displayName: 'Page Field',
        description: 'Request/query field name used for the current page parameter.',
        editorType: 'text'
      },
      pageSizeField: {
        shape: { kind: 'string' },
        displayName: 'Page Size Field',
        description: 'Request/query field name used for the page size parameter.',
        editorType: 'text'
      },
      defaultParams: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Default Params',
        description: 'Default query/refresh parameters merged into the CRUD workflow input.',
        editorType: 'object'
      },
      toolbar: {
        shape: { kind: 'unknown' },
        displayName: 'Toolbar',
        description: 'Top toolbar region or migrated headerToolbar content.',
        editorType: 'region'
      },
      listActions: {
        shape: { kind: 'unknown' },
        displayName: 'List Actions',
        description: 'List-level actions such as create, refresh, export, or selection-driven batch actions.',
        editorType: 'region'
      },
      footerToolbar: {
        shape: { kind: 'unknown' },
        displayName: 'Footer Toolbar',
        description: 'Bottom toolbar region or migrated footerToolbar content.',
        editorType: 'region'
      },
      toolbarLayout: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Toolbar Layout',
        description: 'Structured toolbar blocks such as pagination, statistics, and columns toggler.',
        editorType: 'object'
      },
      selection: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Selection',
        description: 'CRUD selection configuration such as checkbox/radio mode and selection limits.',
        editorType: 'object'
      },
      selectionStatePath: {
        shape: { kind: 'string' },
        displayName: 'Selection Path',
        description: 'Scope path used when selection ownership is scope-based.',
        editorType: 'path'
      },
      selectionOwnership: {
        shape: { kind: 'string' },
        displayName: 'Selection Ownership',
        description: 'Controls whether selection state is local, controlled, or scope-owned.',
        editorType: 'select'
      },
      paginationOwnership: {
        shape: { kind: 'string' },
        displayName: 'Pagination Ownership',
        description: 'Controls whether pagination state is local, controlled, or scope-owned.',
        editorType: 'select'
      },
      paginationStatePath: {
        shape: { kind: 'string' },
        displayName: 'Pagination Path',
        description: 'Scope path used when pagination ownership is scope-based.',
        editorType: 'path'
      },
      sortOwnership: {
        shape: { kind: 'string' },
        displayName: 'Sort Ownership',
        description: 'Controls whether sort state is local, controlled, or scope-owned.',
        editorType: 'select'
      },
      sortStatePath: {
        shape: { kind: 'string' },
        displayName: 'Sort Path',
        description: 'Scope path used when sort ownership is scope-based.',
        editorType: 'path'
      },
      filterOwnership: {
        shape: { kind: 'string' },
        displayName: 'Filter Ownership',
        description: 'Controls whether filter state is local, controlled, or scope-owned.',
        editorType: 'select'
      },
      filterStatePath: {
        shape: { kind: 'string' },
        displayName: 'Filter Path',
        description: 'Scope path used when filter ownership is scope-based.',
        editorType: 'path'
      },
      columnSettings: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Column Settings',
        description: 'Column visibility and order management, including overlay and inline entry modes; drag reorder is still deferred.',
        editorType: 'object'
      }
    },
    eventContracts: {
      onQuerySubmit: {
        displayName: 'Query Submit',
        description: 'Runs when the CRUD query form submits.'
      },
      onQueryReset: {
        displayName: 'Query Reset',
        description: 'Runs when the CRUD query form resets.'
      },
      onRowClick: {
        displayName: 'Row Click',
        description: 'Runs when the user activates a row.'
      },
      onSelectionChange: {
        displayName: 'Selection Change',
        description: 'Runs when CRUD selection changes.',
        payload: {
          kind: 'object',
          fields: {
            selectedRowKeys: { kind: 'array', item: { kind: 'string' } }
          }
        }
      },
      onRefresh: {
        displayName: 'Refresh',
        description: 'Runs when the CRUD refresh action executes.'
      }
    },
    componentCapabilityContracts: [
      {
        handle: 'refresh',
        displayName: 'Refresh',
        description: 'Refresh the CRUD table source.'
      },
      {
        handle: 'getSelection',
        displayName: 'Get Selection',
        description: 'Return selected row keys.',
        result: { kind: 'array', item: { kind: 'string' } }
      },
      {
        handle: 'clearSelection',
        displayName: 'Clear Selection',
        description: 'Clear the current selection.'
      }
    ],
    scopeExportContracts: {
      '$crud': {
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
          visibleColumnNames: { kind: 'array', item: { kind: 'string' } }
        },
        optional: ['total', 'query', 'pagination', 'sort', 'filters', 'visibleColumnNames']
      }
    },
    component: CrudRenderer,
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
      { key: 'onRefresh', kind: 'event' }
    ]
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}

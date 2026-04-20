import { parsePath, type BaseSchema, type RendererDefinition, type RendererRegistry, type RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { TableRenderer } from './table-renderer';
import { DataSourceRenderer } from './data-source-renderer';
import { ChartRenderer } from './chart-renderer';
import { TreeRenderer } from './tree-renderer';
import { CrudRenderer } from './crud-renderer';
import type { TableSchema } from './schemas';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path).filter((segment) => segment !== '$').concat(segments.map((segment) => String(segment)));

  if (parts.length === 0) {
    return '';
  }

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

function validateStringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateNumberArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function validateTableSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'table') {
    return;
  }

  const schema = context.schema as TableSchema;
  const { path, emit } = context;

  if (schema.columns !== undefined && !Array.isArray(schema.columns)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'columns'),
      message: 'table.columns must be an array when provided.'
    });
  }

  if (Array.isArray(schema.columns)) {
    schema.columns.forEach((column, index) => {
      if (!column || typeof column !== 'object' || Array.isArray(column)) {
        emit({
          code: 'invalid-property-shape',
          path: toJsonPointer(path, 'columns', index),
          message: 'table.columns entries must be objects.'
        });
      }
    });
  }

  if (schema.paginationOwnership === 'scope' && typeof schema.paginationStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'paginationStatePath'),
      message: 'table.paginationStatePath is required when paginationOwnership is "scope".'
    });
  }

  if (schema.selectionOwnership === 'scope' && typeof schema.selectionStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'selectionStatePath'),
      message: 'table.selectionStatePath is required when selectionOwnership is "scope".'
    });
  }

  if (schema.pagination?.pageSizeOptions !== undefined && !validateNumberArray(schema.pagination.pageSizeOptions)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'pagination', 'pageSizeOptions'),
      message: 'table.pagination.pageSizeOptions must be an array of finite numbers.'
    });
  }

  if (schema.rowSelection?.selectedRowKeys !== undefined && !validateStringArray(schema.rowSelection.selectedRowKeys)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'rowSelection', 'selectedRowKeys'),
      message: 'table.rowSelection.selectedRowKeys must be an array of strings.'
    });
  }

  if (schema.expandable?.expandedRowKeys !== undefined && !validateStringArray(schema.expandable.expandedRowKeys)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'expandable', 'expandedRowKeys'),
      message: 'table.expandable.expandedRowKeys must be an array of strings.'
    });
  }
}

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
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' }
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
        description: 'Optional embedded query form configuration.',
        editorType: 'object'
      },
      columns: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Columns',
        description: 'Table column declarations.',
        editorType: 'crud-columns'
      },
      selectionStatePath: {
        shape: { kind: 'string' },
        displayName: 'Selection Path',
        description: 'Scope path used when selection ownership is scope-based.',
        editorType: 'path'
      }
    },
    eventContracts: {
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
          selectedRowKeys: { kind: 'array', item: { kind: 'string' } }
        },
        optional: ['total']
      }
    },
    component: CrudRenderer,
    fields: [
      { key: 'toolbar', kind: 'region' },
      { key: 'bulkActions', kind: 'region' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'onRowClick', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onRefresh', kind: 'event' }
    ]
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}

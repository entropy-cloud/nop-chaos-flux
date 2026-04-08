import { parsePath, type BaseSchema, type RendererDefinition, type RendererRegistry, type RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { TableRenderer } from './table-renderer';
import { DataSourceRenderer } from './data-source-renderer';
import { ChartRenderer } from './chart-renderer';
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
export { TableRenderer } from './table-renderer';
export { DataSourceRenderer } from './data-source-renderer';
export { ChartRenderer } from './chart-renderer';

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
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' }
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
      { key: 'empty', kind: 'value-or-region' }
    ]
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}

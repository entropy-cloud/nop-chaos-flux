import {
  parsePath,
  type BaseSchema,
  type RendererSchemaValidationContext,
} from '@nop-chaos/flux-core';
import type { CrudSchema } from './crud-schema.js';
import { createCrudQueryFormId } from './crud-query-form-id.js';
import type { TableSchema } from './schemas.js';

function createCrudQueryFormRegion(schema: CrudSchema, path: string) {
  const queryForm = schema.queryForm;
  if (!queryForm?.body) {
    return undefined;
  }

  const region: BaseSchema & Record<string, unknown> = {
    type: 'form',
    id: createCrudQueryFormId(schema.id, path),
    body: queryForm.body,
    mode: queryForm.layout === 'horizontal' ? 'horizontal' : 'normal',
  };

  if (queryForm.actions !== undefined) {
    region.actions = queryForm.actions;
  }

  if (queryForm.statusPath !== undefined) {
    region.statusPath = queryForm.statusPath;
  }

  return region;
}

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path)
    .filter((segment) => segment !== '$')
    .concat(segments.map((segment) => String(segment)));

  if (parts.length === 0) {
    return '';
  }

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

function validateStringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateNumberArray(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

export function validateTableSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'table') {
    return;
  }

  const schema = context.schema as TableSchema;
  const { path, emit } = context;

  if (schema.columns !== undefined && !Array.isArray(schema.columns)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'columns'),
      message: 'table.columns must be an array when provided.',
    });
  }

  if (Array.isArray(schema.columns)) {
    schema.columns.forEach((column, index) => {
      if (!column || typeof column !== 'object' || Array.isArray(column)) {
        emit({
          code: 'invalid-property-shape',
          path: toJsonPointer(path, 'columns', index),
          message: 'table.columns entries must be objects.',
        });
      }
    });
  }

  if (schema.paginationOwnership === 'scope' && typeof schema.paginationStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'paginationStatePath'),
      message: 'table.paginationStatePath is required when paginationOwnership is "scope".',
    });
  }

  if (schema.selectionOwnership === 'scope' && typeof schema.selectionStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'selectionStatePath'),
      message: 'table.selectionStatePath is required when selectionOwnership is "scope".',
    });
  }

  if (
    schema.pagination?.pageSizeOptions !== undefined &&
    !validateNumberArray(schema.pagination.pageSizeOptions)
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'pagination', 'pageSizeOptions'),
      message: 'table.pagination.pageSizeOptions must be an array of finite numbers.',
    });
  }

  if (
    schema.rowSelection?.selectedRowKeys !== undefined &&
    !validateStringArray(schema.rowSelection.selectedRowKeys)
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'rowSelection', 'selectedRowKeys'),
      message: 'table.rowSelection.selectedRowKeys must be an array of strings.',
    });
  }

  if (
    schema.expandable?.expandedRowKeys !== undefined &&
    !validateStringArray(schema.expandable.expandedRowKeys)
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'expandable', 'expandedRowKeys'),
      message: 'table.expandable.expandedRowKeys must be an array of strings.',
    });
  }
}

export function validateCrudSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'crud') {
    return;
  }

  const schema = context.schema as CrudSchema;
  const { path, emit } = context;

  if (schema.columns !== undefined && !Array.isArray(schema.columns)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'columns'),
      message: 'crud.columns must be an array when provided.',
    });
  }

  if (Array.isArray(schema.columns)) {
    schema.columns.forEach((column, index) => {
      if (!column || typeof column !== 'object' || Array.isArray(column)) {
        emit({
          code: 'invalid-property-shape',
          path: toJsonPointer(path, 'columns', index),
          message: 'crud.columns entries must be objects.',
        });
      }
    });
  }

  if (schema.paginationOwnership === 'scope' && typeof schema.paginationStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'paginationStatePath'),
      message: 'crud.paginationStatePath is required when paginationOwnership is "scope".',
    });
  }

  if (schema.selectionOwnership === 'scope' && typeof schema.selectionStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'selectionStatePath'),
      message: 'crud.selectionStatePath is required when selectionOwnership is "scope".',
    });
  }

  if (schema.sortOwnership === 'scope' && typeof schema.sortStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'sortStatePath'),
      message: 'crud.sortStatePath is required when sortOwnership is "scope".',
    });
  }

  if (schema.filterOwnership === 'scope' && typeof schema.filterStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'filterStatePath'),
      message: 'crud.filterStatePath is required when filterOwnership is "scope".',
    });
  }
}

export function transformCrudAuthoringSchema(
  context: import('@nop-chaos/flux-core').RendererAuthoringTransformContext<BaseSchema>,
) {
  if (context.schema.type !== 'crud') {
    return context.schema;
  }

  const schema = context.schema as CrudSchema & {
    bulkActions?: unknown;
    filter?: unknown;
    primaryField?: unknown;
    perPageField?: unknown;
  };

  if (schema.filter !== undefined) {
    context.emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(context.path, 'filter'),
      message: 'crud.filter is no longer supported. Use canonical crud.queryForm.',
    });
  }

  if (schema.primaryField !== undefined) {
    context.emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(context.path, 'primaryField'),
      message: 'crud.primaryField is no longer supported. Use canonical crud.rowKey.',
    });
  }

  if (schema.perPageField !== undefined) {
    context.emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(context.path, 'perPageField'),
      message: 'crud.perPageField is no longer supported. Use canonical crud.pageSizeField.',
    });
  }

  if (schema.bulkActions !== undefined) {
    context.emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(context.path, 'bulkActions'),
      message: 'crud.bulkActions is no longer supported. Use canonical crud.listActions.',
    });
  }

  const baseSchema = schema as CrudSchema;
  const queryFormRegion = createCrudQueryFormRegion(baseSchema, context.path);

  return queryFormRegion
    ? ({ ...baseSchema, queryFormRegion } as CrudSchema & { queryFormRegion: BaseSchema })
    : baseSchema;
}

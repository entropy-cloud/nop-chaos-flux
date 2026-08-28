import {
  createNodeId,
  parsePath,
  type BaseSchema,
  type SchemaInput,
  type RendererSchemaValidationContext,
} from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import type { CrudSchema } from './crud-schema.js';
import { createCrudQueryFormId } from './crud-query-form-id.js';
import type { TableSchema } from './schemas.js';

// The form renderer recognizes these label position values:
//   'normal'     → labels above inputs (default)
//   'horizontal' → labels left of inputs (same row, labelWidth applies)
//   'inline'     → labels and inputs on same line (compact)
// 'vertical' is an alias for 'normal' (used in `layout`); we normalize it.
const LABEL_POSITION_MODES = new Set(['normal', 'horizontal', 'inline']);
const MODE_TO_FORM_MODE: Record<string, string> = {
  horizontal: 'horizontal',
  inline: 'inline',
  normal: 'normal',
  vertical: 'normal', // alias
};

/**
 * Resolve the rendered form mode from `queryForm.mode` and `queryForm.layout`.
 *
 * Priority:
 *   1. Explicit `mode` if it is a label position value ('normal' | 'horizontal'
 *      | 'inline'). 'vertical' is accepted as an alias for 'normal' and
 *      normalized — the form renderer only recognizes 'normal' for vertical
 *      label stacking.
 *   2. Fallback to `layout`-based derivation:
 *        horizontal → horizontal, inline → inline, vertical/undefined → normal.
 *
 * The legacy `'manual' | 'auto'` mode values (autoGenerateQueryFilter behavior)
 * never collide with label position values, so they fall through to the layout
 * branch — preserving backwards compatibility for existing callers that use
 * `mode: 'manual'` without a layout.
 *
 * Exported for unit testing.
 */
export function resolveFormMode(
  layout: string | undefined,
  mode: string | undefined,
): string {
  if (mode && (LABEL_POSITION_MODES.has(mode) || mode in MODE_TO_FORM_MODE)) {
    return MODE_TO_FORM_MODE[mode];
  }
  if (layout && layout in MODE_TO_FORM_MODE) {
    return MODE_TO_FORM_MODE[layout];
  }
  return 'normal';
}

function createCrudQueryFormRegion(schema: CrudSchema, path: string) {
  const queryForm = schema.queryForm;
  if (!queryForm?.body) {
    return undefined;
  }

  const region: BaseSchema & Record<string, unknown> = {
    type: 'form',
    id: createCrudQueryFormId(createNodeId(path, schema), path),
    body: queryForm.body,
    mode: resolveFormMode(queryForm.layout, queryForm.mode),
    actionsClassName: 'flex justify-end gap-2',
  };

  if (queryForm.columnCount !== undefined) {
    region.columnCount = queryForm.columnCount;
  }

  if (queryForm.gap !== undefined) {
    region.gap = queryForm.gap;
  }

  if (queryForm.labelWidth !== undefined) {
    region.labelWidth = queryForm.labelWidth;
  }

  if (queryForm.labelAlign !== undefined) {
    region.labelAlign = queryForm.labelAlign;
  }

  if (queryForm.actions !== undefined) {
    region.actions = queryForm.actions;
  } else {
    const crudComponentId = schema.id ?? schema.name;
    if (crudComponentId !== undefined) {
      region.actions = [
        {
          type: 'button',
          label: t('flux.common.search'),
          variant: 'primary',
          onClick: { action: 'component:querySubmit', componentId: String(crudComponentId) },
        },
        {
          type: 'button',
          label: t('flux.common.reset'),
          variant: 'outline',
          onClick: { action: 'component:queryReset', componentId: String(crudComponentId) },
        },
      ] as SchemaInput;
    }
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

  if (schema.sortOwnership === 'scope' && typeof schema.sortStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'sortStatePath'),
      message: 'table.sortStatePath is required when sortOwnership is "scope".',
    });
  }

  if (schema.filterOwnership === 'scope' && typeof schema.filterStatePath !== 'string') {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'filterStatePath'),
      message: 'table.filterStatePath is required when filterOwnership is "scope".',
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

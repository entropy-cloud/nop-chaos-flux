import { createNodeId, toJsonPointer, type BaseSchema, type RendererSchemaValidationContext, type SchemaInput } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import type { CrudSchema, CrudSelectionConfig } from './crud-schema.js';
import { createCrudQueryFormId } from './crud-query-form-id.js';
import type { TableSchema } from './schemas.js';
import { validateColumnEditableConfig, validateTableGroupConfig } from './table-schema-validation.js';
import { buildEmbeddedQueryFormCarrier } from './query-form-carrier.js';

export { resolveFormMode } from './query-form-carrier.js';

function createCrudQueryFormRegion(schema: CrudSchema, path: string) {
  const queryForm = schema.queryForm;
  if (!queryForm?.body) {
    return undefined;
  }

  const region = buildEmbeddedQueryFormCarrier({
    id: createCrudQueryFormId(createNodeId(path, schema), path),
    body: queryForm.body,
    layout: queryForm.layout,
    mode: queryForm.mode,
    columnCount: queryForm.columnCount,
    gap: queryForm.gap,
  });

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
          variant: 'default',
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

function validateStringArray(value: unknown) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateNumberArray(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

// Template/expression sources (`'${...}'`) resolve at runtime — the raw-schema
// shape checks must not reject them (T29 dynamic columns, controlled selection
// binding). Runtime handles invalid resolved shapes with its own degradation.
function isTemplateSource(value: unknown): boolean {
  return typeof value === 'string' && value.includes('${');
}

export function validateTableSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'table') {
    return;
  }

  const schema = context.schema as TableSchema;
  const { path, emit } = context;

  if (schema.columns !== undefined && !Array.isArray(schema.columns) && !isTemplateSource(schema.columns)) {
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
        return;
      }
      validateColumnEditableConfig(
        // 13-04 (plan 483 Phase 7 batch c): single assertion suffices — the
        // value flows into an `unknown` parameter anyway.
        (column as Record<string, unknown>).editable,
        path,
        index,
        emit,
      );
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
    !validateStringArray(schema.rowSelection.selectedRowKeys) &&
    !isTemplateSource(schema.rowSelection.selectedRowKeys)
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'rowSelection', 'selectedRowKeys'),
      message: 'table.rowSelection.selectedRowKeys must be an array of strings.',
    });
  }

  if (
    schema.rowSelection?.modifierSelect !== undefined &&
    typeof schema.rowSelection.modifierSelect !== 'boolean'
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'rowSelection', 'modifierSelect'),
      message: 'table.rowSelection.modifierSelect must be a boolean when provided.',
    });
  }

  if (
    schema.rowSelection?.selectAllMode !== undefined &&
    schema.rowSelection.selectAllMode !== 'all' &&
    schema.rowSelection.selectAllMode !== 'page'
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'rowSelection', 'selectAllMode'),
      message: 'table.rowSelection.selectAllMode must be "all" or "page" when provided.',
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

  validateTableGroupConfig(schema, path, emit);
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

  if (
    typeof schema.selection === 'object' &&
    schema.selection !== null &&
    !Array.isArray(schema.selection) &&
    (schema.selection as CrudSelectionConfig).selectAllMode !== undefined &&
    (schema.selection as CrudSelectionConfig).selectAllMode !== 'all' &&
    (schema.selection as CrudSelectionConfig).selectAllMode !== 'page'
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'selection', 'selectAllMode'),
      message: 'crud.selection.selectAllMode must be "all" or "page" when provided.',
    });
  }
}

const QUERY_FORM_DEAD_TOGGLE_FIELDS = [
  'defaultCollapsed',
  'collapsedLabel',
  'expandedLabel',
] as const;

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

  const queryFormConfig = schema.queryForm;
  if (queryFormConfig) {
    for (const key of QUERY_FORM_DEAD_TOGGLE_FIELDS) {
      if ((queryFormConfig as Record<string, unknown>)[key] !== undefined) {
        context.emit({
          code: 'unknown-property',
          severity: 'warning',
          path: toJsonPointer(context.path, 'queryForm', key),
          message: `crud.queryForm.${key} is dead config (declared but never consumed); the collapse toggle is owned by crud.filterTogglable — use filterTogglable.${key} instead.`,
        });
      }
    }
  }

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
      message: 'crud.primaryField is no longer supported. Use canonical crud.itemKey.',
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

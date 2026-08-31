import type { BaseSchema, RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import type { TableGroupConfig, TableSchema } from './schemas.js';

type Emit = RendererSchemaValidationContext<BaseSchema>['emit'];

/** D1 G-D validation helpers split out of data-schema-validation.ts (file-size governance). */

const TABLE_COLUMN_EDITABLE_EDITORS = new Set(['text', 'number', 'select', 'date', 'checkbox']);

export function validateColumnEditableConfig(
  editable: unknown,
  path: string,
  columnIndex: number,
  emit: Emit,
) {
  if (editable === undefined || editable === null || typeof editable === 'boolean') {
    return;
  }
  if (typeof editable !== 'object' || Array.isArray(editable)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'columns', columnIndex, 'editable'),
      message: 'table.columns[].editable must be a boolean or an object when provided.',
    });
    return;
  }

  const config = editable as Record<string, unknown>;
  if (
    config.editor !== undefined &&
    (typeof config.editor !== 'string' || !TABLE_COLUMN_EDITABLE_EDITORS.has(config.editor))
  ) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'columns', columnIndex, 'editable', 'editor'),
      message:
        'table.columns[].editable.editor must be one of "text", "number", "select", "date", "checkbox".',
    });
  }

  if (config.options !== undefined) {
    if (!Array.isArray(config.options)) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'columns', columnIndex, 'editable', 'options'),
        message: 'table.columns[].editable.options must be an array when provided.',
      });
    } else {
      config.options.forEach((option, optionIndex) => {
        if (!option || typeof option !== 'object' || Array.isArray(option)) {
          emit({
            code: 'invalid-property-shape',
            path: toJsonPointer(path, 'columns', columnIndex, 'editable', 'options', optionIndex),
            message: 'table.columns[].editable.options entries must be objects.',
          });
        }
      });
    }
  }

  if (config.required !== undefined && typeof config.required !== 'boolean') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'columns', columnIndex, 'editable', 'required'),
      message: 'table.columns[].editable.required must be a boolean when provided.',
    });
  }
}

const TABLE_GROUP_AGGREGATE_FNS = new Set(['sum', 'avg', 'min', 'max', 'count']);

export function validateTableGroupConfig(schema: TableSchema, path: string, emit: Emit) {
  const group = schema.group;
  if (group === undefined) {
    return;
  }
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'group'),
      message: 'table.group must be an object when provided.',
    });
    return;
  }

  const groupConfig = group as TableGroupConfig;
  if (typeof groupConfig.field !== 'string' || groupConfig.field.length === 0) {
    emit({
      code: 'missing-required-field',
      path: toJsonPointer(path, 'group', 'field'),
      message: 'table.group.field is required when group is declared.',
    });
  }

  if (groupConfig.missingLabel !== undefined && typeof groupConfig.missingLabel !== 'string') {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'group', 'missingLabel'),
      message: 'table.group.missingLabel must be a string when provided.',
    });
  }

  if (groupConfig.aggregates === undefined) {
    return;
  }
  if (!Array.isArray(groupConfig.aggregates)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'group', 'aggregates'),
      message: 'table.group.aggregates must be an array when provided.',
    });
    return;
  }

  groupConfig.aggregates.forEach((aggregate, index) => {
    if (!aggregate || typeof aggregate !== 'object' || Array.isArray(aggregate)) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'group', 'aggregates', index),
        message: 'table.group.aggregates entries must be objects.',
      });
      return;
    }

    if (typeof aggregate.fn !== 'string' || !TABLE_GROUP_AGGREGATE_FNS.has(aggregate.fn)) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'group', 'aggregates', index, 'fn'),
        message: 'table.group.aggregates[].fn must be one of "sum", "avg", "min", "max", "count".',
      });
    }

    if (
      aggregate.fn !== 'count' &&
      (typeof aggregate.field !== 'string' || aggregate.field.length === 0)
    ) {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'group', 'aggregates', index, 'field'),
        message:
          'table.group.aggregates[].field is required for non-count aggregates (sum/avg/min/max).',
      });
    }

    if (aggregate.label !== undefined && typeof aggregate.label !== 'string') {
      emit({
        code: 'invalid-property-shape',
        path: toJsonPointer(path, 'group', 'aggregates', index, 'label'),
        message: 'table.group.aggregates[].label must be a string when provided.',
      });
    }
  });
}

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = [path, ...segments.map((segment) => String(segment))].map((segment) =>
    escapeJsonPointerSegment(segment),
  );
  return `/${parts.join('/')}`;
}

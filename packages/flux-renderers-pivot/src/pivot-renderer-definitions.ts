import type { BaseSchema, RendererDefinition, RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import type { PivotTableSchema } from './schemas.js';
import { PivotTableRenderer } from './pivot-renderer.js';

const VALID_AGGREGATION_TYPES = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'NONE'];
const VALID_CELL_TYPES = ['text', 'progressbar', 'sparkline'];
const VALID_CORNER_VALUES = ['row', 'column', 'none', 'all'];

function toPointer(path: string, ...segments: Array<string | number>): string {
  return [path, ...segments.map((segment) => String(segment))].join('.');
}

/** 校验 dimensions/indicators 结构，非法 dev warn（schema 级 emit，不抛错）。 */
function validatePivotSchema(context: RendererSchemaValidationContext<BaseSchema>): void {
  if (context.schema.type !== 'pivot-table') {
    return;
  }
  const schema = context.schema as PivotTableSchema;
  const { path, emit } = context;
  if (schema.indicators !== undefined && !Array.isArray(schema.indicators)) {
    emit({
      code: 'invalid-property-shape',
      path: toPointer(path, 'indicators'),
      message: 'pivot-table.indicators must be an array when provided.',
    });
  }
  if (Array.isArray(schema.indicators)) {
    schema.indicators.forEach((indicator, index) => {
      if (!indicator || typeof indicator !== 'object' || Array.isArray(indicator)) {
        emit({
          code: 'invalid-property-shape',
          path: toPointer(path, 'indicators', index),
          message: 'pivot-table.indicators entries must be objects.',
        });
        return;
      }
      if (typeof indicator.field !== 'string' || indicator.field.length === 0) {
        emit({
          code: 'missing-required-field',
          path: toPointer(path, 'indicators', index, 'field'),
          message: 'pivot-table indicator requires a non-empty field.',
        });
      }
      if (
        indicator.aggregationType !== undefined &&
        !VALID_AGGREGATION_TYPES.includes(indicator.aggregationType)
      ) {
        emit({
          code: 'invalid-property-value',
          path: toPointer(path, 'indicators', index, 'aggregationType'),
          message: `pivot-table indicator aggregationType must be one of ${VALID_AGGREGATION_TYPES.join(', ')}.`,
        });
      }
      if (indicator.cellType !== undefined && !VALID_CELL_TYPES.includes(indicator.cellType)) {
        emit({
          code: 'invalid-property-value',
          path: toPointer(path, 'indicators', index, 'cellType'),
          message: `pivot-table indicator cellType must be one of ${VALID_CELL_TYPES.join(', ')}.`,
        });
      }
    });
  }
  for (const key of ['rowDimensions', 'columnDimensions'] as const) {
    const dimensions = schema[key];
    if (dimensions === undefined) {
      continue;
    }
    if (!Array.isArray(dimensions)) {
      emit({
        code: 'invalid-property-shape',
        path: toPointer(path, key),
        message: `pivot-table.${key} must be an array when provided.`,
      });
      continue;
    }
    dimensions.forEach((dimension, index) => {
      if (typeof dimension === 'string') {
        if (dimension.length === 0) {
          emit({
            code: 'invalid-property-value',
            path: toPointer(path, key, index),
            message: `pivot-table.${key} string entries must be non-empty.`,
          });
        }
        return;
      }
      if (!dimension || typeof dimension !== 'object' || Array.isArray(dimension)) {
        emit({
          code: 'invalid-property-shape',
          path: toPointer(path, key, index),
          message: `pivot-table.${key} entries must be strings or dimension objects.`,
        });
        return;
      }
      if (typeof dimension.dimensionKey !== 'string' || dimension.dimensionKey.length === 0) {
        emit({
          code: 'missing-required-field',
          path: toPointer(path, key, index, 'dimensionKey'),
          message: `pivot-table.${key} dimension objects require a non-empty dimensionKey.`,
        });
      }
    });
  }
  if (
    schema.cornerTitleOnDimension !== undefined &&
    !VALID_CORNER_VALUES.includes(schema.cornerTitleOnDimension)
  ) {
    emit({
      code: 'invalid-property-value',
      path: toPointer(path, 'cornerTitleOnDimension'),
      message: `pivot-table.cornerTitleOnDimension must be one of ${VALID_CORNER_VALUES.join(', ')}.`,
    });
  }
}

export const pivotRendererDefinitions: RendererDefinition[] = [
  {
    type: 'pivot-table',
    displayName: 'Pivot Table',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-pivot',
    component: PivotTableRenderer,
    schemaValidator: validatePivotSchema,
    propContracts: {
      records: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Records',
        description:
          '直接数据入口（对象数组）。与 source 互斥，二者同设时 source 优先 + dev warn。',
        editorType: 'expression',
      },
      source: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Source',
        description: '原始数据集入口（对象数组），优先于 records。',
        editorType: 'expression',
      },
      rowDimensions: {
        shape: {
          kind: 'array',
          item: {
            kind: 'union',
            anyOf: [
              { kind: 'string' },
              {
                kind: 'object',
                fields: { dimensionKey: { kind: 'string' }, title: { kind: 'string' } },
                optional: ['title'],
              },
            ],
          },
        },
        displayName: 'Row Dimensions',
        description: '行维度：字符串或 { dimensionKey, title?, headerStyle? } 对象。',
        editorType: 'array',
      },
      columnDimensions: {
        shape: {
          kind: 'array',
          item: {
            kind: 'union',
            anyOf: [
              { kind: 'string' },
              {
                kind: 'object',
                fields: { dimensionKey: { kind: 'string' }, title: { kind: 'string' } },
                optional: ['title'],
              },
            ],
          },
        },
        displayName: 'Column Dimensions',
        description: '列维度：字符串或 { dimensionKey, title?, headerStyle? } 对象。',
        editorType: 'array',
      },
      indicators: {
        shape: {
          kind: 'array',
          item: {
            kind: 'object',
            fields: {
              field: { kind: 'string' },
              title: { kind: 'string' },
              aggregationType: {
                kind: 'union',
                anyOf: [
                  { kind: 'literal', value: 'SUM' },
                  { kind: 'literal', value: 'AVG' },
                  { kind: 'literal', value: 'COUNT' },
                  { kind: 'literal', value: 'MIN' },
                  { kind: 'literal', value: 'MAX' },
                  { kind: 'literal', value: 'NONE' },
                ],
              },
              cellType: {
                kind: 'union',
                anyOf: [
                  { kind: 'literal', value: 'text' },
                  { kind: 'literal', value: 'progressbar' },
                  { kind: 'literal', value: 'sparkline' },
                ],
              },
            },
            optional: ['title', 'aggregationType', 'cellType'],
          },
        },
        displayName: 'Indicators',
        description: '指标（值列）：field + 聚合类型 + cellType。',
        editorType: 'array',
      },
      dataConfig: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Data Config',
        description: '聚合/排序/过滤/小计总计配置（totals/sortRules/filterRules）。',
        editorType: 'object',
      },
      cornerTitleOnDimension: {
        shape: {
          kind: 'union',
          anyOf: [
            { kind: 'literal', value: 'row' },
            { kind: 'literal', value: 'column' },
            { kind: 'literal', value: 'none' },
            { kind: 'literal', value: 'all' },
          ],
        },
        displayName: 'Corner Title On Dimension',
        description: '角标 titleOnDimension 映射。',
        editorType: 'select',
      },
      height: {
        shape: {
          kind: 'union',
          anyOf: [{ kind: 'number' }, { kind: 'string' }],
        },
        displayName: 'Height',
        defaultValue: 320,
      },
      loading: { shape: { kind: 'boolean' }, displayName: 'Loading', defaultValue: false },
      theme: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Theme',
        description: 'VTable theme 覆盖（映射层产出后按 key 覆盖）。',
        editorType: 'object',
      },
    },
    eventContracts: {
      onCellClick: {
        displayName: 'On Cell Click',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'literal', value: 'pivot:cell-click' },
            col: { kind: 'number' },
            row: { kind: 'number' },
          },
        },
      },
      onSelectionChange: {
        displayName: 'On Selection Change',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'literal', value: 'pivot:selection-change' },
          },
        },
      },
      onSort: {
        displayName: 'On Sort Click',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'literal', value: 'pivot:sort-click' },
          },
        },
      },
      onDrill: {
        displayName: 'On Drill Click',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'literal', value: 'pivot:drill-click' },
          },
        },
      },
      onCellEdit: {
        displayName: 'On Cell Edit',
        payload: {
          kind: 'object',
          fields: {
            type: { kind: 'literal', value: 'pivot:cell-edit' },
          },
        },
      },
    },
    fields: [
      { key: 'label', kind: 'prop' },
      { key: 'records', kind: 'prop' },
      { key: 'source', kind: 'prop' },
      { key: 'rowDimensions', kind: 'prop' },
      { key: 'columnDimensions', kind: 'prop' },
      { key: 'indicators', kind: 'prop' },
      { key: 'dataConfig', kind: 'prop' },
      { key: 'cornerTitleOnDimension', kind: 'prop' },
      { key: 'height', kind: 'prop' },
      { key: 'loading', kind: 'prop' },
      { key: 'theme', kind: 'prop' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'onCellClick', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
      { key: 'onSort', kind: 'event' },
      { key: 'onDrill', kind: 'event' },
      { key: 'onCellEdit', kind: 'event' },
    ],
  },
];

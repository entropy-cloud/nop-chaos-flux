import type { BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

export type PivotDimension = string | PivotDimensionSchema;

export interface PivotDimensionSchema extends SchemaObject {
  dimensionKey: string;
  title?: string;
  headerStyle?: Record<string, SchemaValue>;
}

export type PivotAggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE';

export type PivotCellType = 'text' | 'progressbar' | 'sparkline';

export interface PivotIndicatorSchema extends SchemaObject {
  field: string;
  title?: string;
  aggregationType?: PivotAggregationType;
  cellType?: PivotCellType;
}

export interface PivotTotalsSchema extends SchemaObject {
  showGrandTotals?: boolean;
  showSubTotals?: boolean;
  subTotalsDimensions?: string[];
  grandTotalLabel?: string;
  subTotalLabel?: string;
}

export type PivotSortType = 'ASC' | 'DESC';

export interface PivotSortRuleSchema extends SchemaObject {
  field: string;
  sortType?: PivotSortType;
}

export type PivotFilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'IN'
  | 'NOT_IN'
  | 'LIKE';

export interface PivotFilterRuleSchema extends SchemaObject {
  field: string;
  operator: PivotFilterOperator;
  value: SchemaValue;
}

export interface PivotTotalsConfigSchema extends SchemaObject {
  row?: PivotTotalsSchema;
  column?: PivotTotalsSchema;
}

export interface PivotDataConfigSchema extends SchemaObject {
  totals?: PivotTotalsConfigSchema;
  sortRules?: PivotSortRuleSchema[];
  filterRules?: PivotFilterRuleSchema[];
}

export type PivotCornerTitleOnDimension = 'row' | 'column' | 'none' | 'all';

export interface PivotTableSchema extends BaseSchema {
  type: 'pivot-table';
  /** 直接数据入口（数组）；与 `source` 互斥，二者同设时 `source` 优先 + dev warn。 */
  records?: SchemaValue;
  /** 原始数据集入口（数组）；与 `records` 互斥，二者同设时优先。 */
  source?: SchemaValue;
  rowDimensions?: PivotDimension[];
  columnDimensions?: PivotDimension[];
  indicators?: PivotIndicatorSchema[];
  dataConfig?: PivotDataConfigSchema;
  cornerTitleOnDimension?: PivotCornerTitleOnDimension;
  height?: number | string;
  loading?: boolean;
  empty?: SchemaInput | string;
  /** VTable theme 覆盖（映射层产出后按 key 覆盖）。 */
  theme?: Record<string, SchemaValue>;
}

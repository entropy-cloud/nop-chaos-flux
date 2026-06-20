import type { BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';
import type { ActionSchema } from '@nop-chaos/flux-core';

export interface TableColumnFilterOption extends SchemaObject {
  label: string;
  value: string;
}

export interface TableColumnFilterConfig extends SchemaObject {
  options?: TableColumnFilterOption[];
  source?: SchemaValue;
  searchable?: boolean;
  searchConfig?: SchemaValue;
  multiple?: boolean;
}

export interface TableColumnQuickEditConfig extends SchemaObject {
  mode?: 'dialog' | 'inline';
  body?: SchemaInput;
  saveImmediately?: boolean | SchemaValue;
}

export interface TableColumnSettingsConfig extends SchemaObject {
  enabled?: boolean;
  draggable?: boolean;
  overlay?: boolean;
  align?: 'left' | 'right';
  toggledColumnsStatePath?: string;
  orderedColumnsStatePath?: string;
}

export interface TableResponsiveConfig extends SchemaObject {
  mode?: 'table' | 'expand';
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | number;
  expandTrigger?: 'button' | 'row';
  defaultExpanded?: boolean;
}

export interface TableColumnSchema extends BaseSchema {
  label?: string;
  labelRegionKey?: string;
  name?: string;
  cellRegionKey?: string;
  buttons?: BaseSchema[];
  buttonsRegionKey?: string;
  quickEditBodyRegionKey?: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  hidden?: boolean;
  toggled?: boolean;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  searchable?: boolean | SchemaInput;
  filterable?: boolean | TableColumnFilterConfig;
  filterOptions?: TableColumnFilterOption[];
  quickEdit?: boolean | TableColumnQuickEditConfig;
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
}

export interface TableSummaryCell extends SchemaObject {
  column: string;
  value: SchemaInput | string;
  align?: 'left' | 'center' | 'right';
}

export interface TableSummaryRow extends SchemaObject {
  cells: TableSummaryCell[];
}

export interface TableColumnSchemaInput extends Omit<TableColumnSchema, 'label'> {
  label?: SchemaInput | string;
  cell?: SchemaInput;
  body?: SchemaInput;
}

export interface TableSchema extends BaseSchema {
  type: 'table';
  source?: SchemaValue;
  rowKey?: string;
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  sortOwnership?: 'local' | 'controlled' | 'scope';
  filterOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  selectionStatePath?: string;
  sortStatePath?: string;
  filterStatePath?: string;
  columns?: TableColumnSchema[];
  onRowClick?: BaseSchema;
  header?: SchemaInput | string;
  footer?: SchemaInput | string;
  empty?: BaseSchema | BaseSchema[] | string;
  loading?: boolean;
  loadingContent?: BaseSchema | BaseSchema[] | string;
  stripe?: boolean;
  bordered?: boolean;
  virtualThreshold?: number;
  scrollHeight?: number;
  columnSettings?: TableColumnSettingsConfig;
  responsive?: TableResponsiveConfig;
  columnResize?: boolean;
  affixHeader?: boolean;
  prefixRow?: TableSummaryRow;
  affixRow?: TableSummaryRow;
  combineNum?: number;
  pagination?: {
    enabled?: boolean;
    currentPage?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
  };
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: string[];
    keepOnPageChange?: boolean;
    maxSelectionLength?: number;
    checkableWhen?: string;
  };
  expandable?: {
    expandedRowKeys?: string[];
    expandRowByClick?: boolean;
    expandedRow?: SchemaInput;
    expandedRowRegionKey?: string;
  };
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
  onSortChange?: BaseSchema;
  onFilterChange?: BaseSchema;
  onPageChange?: BaseSchema;
  onSelectionChange?: BaseSchema;
  onRefresh?: BaseSchema;
}

export type TableSchemaProps = Omit<TableSchema, 'columns'> & {
  columns?: TableColumnSchema[];
};

export interface TableSchemaInput extends Omit<TableSchema, 'columns'> {
  columns?: TableColumnSchemaInput[];
}

export interface TreeSchema extends BaseSchema {
  type: 'tree';
  data?: SchemaValue;
  childrenKey?: string;
  labelField?: string;
  keyField?: string;
  node?: SchemaInput;
  empty?: SchemaInput | string;
  initiallyExpanded?: boolean | number;
  expandOnClickNode?: boolean;
  statusPath?: string;
  multiple?: boolean;
}

export * from './chart-schemas.js';

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

export type TableColumnPopOverTrigger = 'click' | 'hover';

export type TableColumnPopOverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end';

export interface TableColumnPopOverConfig extends SchemaObject {
  trigger?: TableColumnPopOverTrigger;
  placement?: TableColumnPopOverPlacement;
  icon?: string;
  content?: BaseSchema[];
  contentRegionKey?: string;
  title?: string;
  showOnOverflow?: boolean;
  onEmpty?: 'hide' | 'show';
  emptyText?: string;
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
  children?: TableColumnSchema[];
  copyable?: boolean;
  popOver?: TableColumnPopOverConfig;
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
  draggable?: boolean;
  orderField?: string;
  rowChildrenField?: string;
  columnWidthsOwnership?: 'local' | 'controlled' | 'scope';
  columnWidthsStatePath?: string;
  multiSort?: boolean;
  pagination?: {
    enabled?: boolean;
    currentPage?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    showSizeChanger?: boolean;
    mode?: 'pages' | 'infinite';
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
  searchable?: boolean;
  showIcon?: boolean;
  iconField?: string;
  showGuideLine?: boolean;
}

export type ListSelectionMode = 'single' | 'multiple' | 'none';

export interface ListSchema extends BaseSchema {
  type: 'list';
  items?: SchemaValue;
  item?: SchemaInput;
  empty?: SchemaInput | string;
  selectionMode?: ListSelectionMode;
  keyField?: string;
  onItemClick?: BaseSchema;
  onSelectionChange?: BaseSchema;
}

// ───────────────────────────── W2a 数据组合组 ─────────────────────────────

export interface ServiceSchema extends BaseSchema {
  type: 'service';
  body?: SchemaInput;
  /** 局部数据初始值注入（表达式，编译期求值） */
  data?: SchemaValue;
  /** 表达式值绑定：从 scope 读已加载数据（由外部或内部 `<data-source>` 加载）。只读 scope，不触发 HTTP */
  items?: SchemaValue;
  /** 发布 service 可视层状态摘要的 scope 路径 */
  statusPath?: string;
  /** 空态（value-or-region）—— items 解析为空/null 时显示 */
  empty?: SchemaInput | string;
  /** 错误态（value-or-region）—— items 解析显式 error 时显示 */
  error?: SchemaInput | string;
  /** 加载态（value-or-region）—— 基于 items 解析派生，非请求镜像 */
  loading?: SchemaInput | string;
}

export type PaginationMode = 'simple' | 'with-page-size';

export interface PaginationSchema extends BaseSchema {
  type: 'pagination';
  /** 当前页码（1-based） */
  currentPage?: number;
  /** 每页条数，默认 10 */
  pageSize?: number;
  /** 总条数 */
  total?: number;
  /** 可选页大小选项，默认 [10, 20, 50, 100] */
  pageSizeOptions?: number[];
  /** 模式：simple（仅页码）/ with-page-size（含页大小切换），默认 simple */
  mode?: PaginationMode;
  /** 分页所有权：local controlled（renderer 自维护交互态） */
  pageOwnership?: 'local' | 'controlled' | 'scope';
  /** 发布分页状态摘要的 scope 路径 */
  pageStatePath?: string;
  /** 发布只读 summary 的 scope 路径 */
  statusPath?: string;
  onChange?: BaseSchema;
  onPageSizeChange?: BaseSchema;
}

export * from './chart-schemas.js';

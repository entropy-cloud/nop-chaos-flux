import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

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
  /** Header cell horizontal alignment (overrides column align for the header only). amis: headerAlign. */
  headerAlign?: 'left' | 'center' | 'right';
  /** Cell vertical alignment. amis: vAlign. */
  vAlign?: 'top' | 'middle' | 'bottom';
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
  /** Cell-level conditional className expression (raw, no `${}`). amis: classNameExpr. */
  classNameExpr?: string;
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
  /**
   * Fill the table container to the remaining viewport height of its parent.
   * `true` computes the height via ResizeObserver (parent height minus table top
   * offset minus following siblings); `{ height: N }` uses a fixed N px;
   * `{ maxHeight: N }` uses maxHeight N px. Coexists with `affixHeader` (header
   * becomes sticky inside the scroll container rather than being disabled).
   */
  autoFillHeight?: boolean | { height?: number; maxHeight?: number };
  columnSettings?: TableColumnSettingsConfig;
  responsive?: TableResponsiveConfig;
  columnResize?: boolean;
  affixHeader?: boolean;
  /** Show/hide the table header row (default true). amis: showHeader. */
  showHeader?: boolean;
  prefixRow?: TableSummaryRow;
  affixRow?: TableSummaryRow;
  combineNum?: number;
  /** Start column index for cell merging (companion to combineNum). amis: combineFromIndex. */
  combineFromIndex?: number;
  draggable?: boolean;
  orderField?: string;
  orderOwnership?: 'local' | 'controlled' | 'scope';
  orderStatePath?: string;
  rowChildrenField?: string;
  /** On-demand action schema for lazy child loading in tree mode. When a tree
   * node with `childrenSource` is expanded and no cached children exist, the
   * action is dispatched with the row record available in scope. Results are
   * cached per node and reused on subsequent collapse/expand. */
  childrenSource?: ActionSchema;
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
    serverPaged?: boolean;
    total?: number;
    hideBar?: boolean;
  };
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: string[];
    keepOnPageChange?: boolean;
    maxSelectionLength?: number;
    checkableWhen?: string;
    /** Click a row (outside interactive controls) to toggle its selection. amis: checkOnItemClick. */
    toggleOnRowClick?: boolean;
  };
  expandable?: {
    expandedRowKeys?: string[];
    expandRowByClick?: boolean;
    expandedRow?: SchemaInput;
    expandedRowRegionKey?: string;
    /** Per-row expand eligibility expression (raw, no `${}`). amis: expandableOn. */
    expandableWhen?: string;
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

export type ListPaginationOwnership = 'local' | 'controlled' | 'scope';

export type ListPaginationMode = 'page' | 'infinite';

export interface ListPaginationConfig extends SchemaObject {
  /** Opt-in gate. When falsy, list renders all items (no slicing). */
  enabled?: boolean;
  /** 'page' = slice by current page; 'infinite' = cumulative load-more via sentinel. Defaults to 'page'. */
  mode?: ListPaginationMode;
  /** Items per page. Defaults to 10. */
  pageSize?: number;
  /** Selectable page sizes (host UI hint). Defaults to [10, 20, 50, 100]. */
  pageSizeOptions?: number[];
  /** 1-based current page seed (controlled/local) or value (controlled). */
  currentPage?: number;
  /** Total item count used for totalPages + last-page detection. Defaults to items.length. */
  total?: number;
  /** Infinite mode: explicit "more available" flag. Defaults derived from total, else true. */
  hasMore?: boolean;
  /** Host UI hint to show a page-size selector. */
  showSizeChanger?: boolean;
}

export interface ListSchema extends BaseSchema {
  type: 'list';
  items?: SchemaValue;
  item?: SchemaInput;
  empty?: SchemaInput | string;
  selectionMode?: ListSelectionMode;
  keyField?: string;
  /** Pagination / infinite-scroll configuration. Opt-in via `pagination.enabled`. */
  pagination?: ListPaginationConfig;
  /** Where pagination interaction state lives. Defaults to 'local'. */
  paginationOwnership?: ListPaginationOwnership;
  /** Scope path holding `{ currentPage, pageSize }` (scope ownership). */
  paginationStatePath?: string;
  /** Optional separate scope path for pageSize (scope ownership). */
  pageSizeStatePath?: string;
  onItemClick?: BaseSchema;
  onSelectionChange?: BaseSchema;
  /** Dispatched when the list's resolved current page changes. Payload: { currentPage, pageSize, totalPages, total }. */
  onPageChange?: BaseSchema;
  /** Dispatched when the infinite sentinel intersects (bottom reached). Payload: { currentPage, pageSize, total }. List never self-requests. */
  onLoadMore?: BaseSchema;
}

// ───────────────────────────── W2a 数据组合组 ─────────────────────────────

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
  /** 发布只读 summary 的 scope 路径 */
  statusPath?: string;
  onChange?: BaseSchema;
  onPageSizeChange?: BaseSchema;
}

export interface StatisticsSchema extends BaseSchema {
  type: 'statistics';
  /** 总条数 */
  total?: number;
}

export * from './chart-schemas.js';

import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';
import type {
  TableCellEditableConfig,
  TableGroupConfig,
} from './table-group-schemas.js';

export type * from './table-group-schemas.js';

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
  /** Compiled region key when `searchable` is authored as SchemaInput (region-ized). */
  searchableRegionKey?: string;
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
  /** Cell-level in-place edit two-state machine (D1 G-D). Takes precedence over quickEdit. */
  editable?: boolean | TableCellEditableConfig;
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

export type SortInputEntry = { column: string; direction: 'asc' | 'desc' };

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
  /** Controlled sort input (sortOwnership: 'controlled'). Single mode:
   * `{ column, direction }`; multi-sort mode: array of entries. */
  sort?: { column?: string; direction?: 'asc' | 'desc' } | SortInputEntry[];
  /** Controlled multi-sort input (sortOwnership: 'controlled' + multiSort). */
  sortEntries?: SortInputEntry[];
  /** Legacy controlled single-sort column input (sortOwnership: 'controlled'). */
  sortColumn?: string;
  /** Legacy controlled single-sort direction input (sortOwnership: 'controlled'). */
  sortDirection?: 'asc' | 'desc';
  /** Controlled filter input (filterOwnership: 'controlled'): column → { filters?, keyword? }. */
  filters?: Record<string, { filters?: string[]; keyword?: string }>;
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
    /**
     * Modifier-key selection gestures (D1 G-B2, checkbox mode only — inert
     * under radio): shift-click additive range from the last acted row (anchor),
     * meta/ctrl-click independent toggle, ⌘/ctrl+A select-all within the table.
     * Default false.
     */
    modifierSelect?: boolean;
    /**
     * Header select-all scope (D1 G-B3). 'all' (default) = the full row set
     * (existing behavior, zero regression). 'page' = the current display page
     * for client-paged tables (check/uncheck-all-visible: union with the
     * existing selection / remove the page rows); server-paged tables keep the
     * flowed-in row set as the select-all scope. Inert under radio (no header
     * select-all shape).
     */
    selectAllMode?: 'all' | 'page';
  };
  /** Interaction-state channel: selected-value binding + state marker output. */
  optionRow?: OptionRowConfig;
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
  /** Client-side grouping/aggregate declaration (D1 G-D). Inert without a valid `field`. */
  group?: TableGroupConfig;
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
  /** Renderer-level display label used as the tree aria-label (falls back to `title`, then node id). */
  label?: string;
  /** Renderer-level display title used as the tree aria-label (falls back to node id). */
  title?: string;
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

/**
 * Option-row interaction-state contract (D1 G-F primitive). Shared by row-like
 * renderers (`list`, `table`). Marker output protocol:
 * `docs/references/renderer-interfaces.md` §Option-Row Interaction-State Contract.
 */
export interface OptionRowConfig extends SchemaObject {
  /** Selected-value binding evaluated against the owner scope (e.g. `"${selectedId}"`).
   * Array bindings use any-match. Failed/empty resolution degrades to no selection. */
  value?: SchemaValue;
  /** Item field compared against `value`. Defaults to the renderer's row key field. */
  valueField?: string;
  /** Extra class applied to rows in the selected state (schema-level consumption channel). */
  selectedClass?: string;
}

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
  /** Interaction-state channel: selected-value binding + state marker output. */
  optionRow?: OptionRowConfig;
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

/**
 * Batch-operation bar semantic component (D1 G-B3). Selection-set-driven
 * envelope: count template + action area + built-in clear + built-in non-empty
 * visibility gate. Contract:
 * `docs/references/renderer-interfaces.md` §Batch Bar Semantic Component.
 */
export interface BatchBarSchema extends BaseSchema {
  type: 'batch-bar';
  /**
   * Raw scope path (no `${}`) of the selection string array. Crud host: nest
   * the bar in `toolbar`/`listActions`/`footerToolbar` and bind
   * `$crud.selectedRowKeys`; table host: the table's `selectionStatePath`
   * (e.g. `issueSelection`) — the table only writes that path under
   * `selectionOwnership: 'scope'` (the default `'local'` never touches it, so
   * the bar renders nothing with a one-time dev warn). Required.
   */
  selectionPath?: string;
  /**
   * Count label template evaluated against a child scope
   * `{ count, selectedRowKeys }` (e.g. `'已选择 ${count} 项'`). Defaults to
   * the i18n selected-count message. Evaluation failure falls back to the raw
   * count with a dev warn; the envelope never breaks.
   */
  countTemplate?: string;
  /**
   * Component id of the owning crud/table. Declaring it renders the built-in
   * clear button: resolution prefers the crud `clearSelection` handle, then
   * the table `setSelection` handle with an empty set. Missing target →
   * no-op + one-time dev warn (`batch-bar-target-invalid`).
   */
  clearTarget?: string;
  /** Label of the built-in clear button (defaults to the i18n message). */
  clearLabel?: string;
  /** Batch actions rendered between the count text and the clear button. */
  actions?: SchemaInput;
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

// ───────────────────────────── stat-tile（BI KPI 卡片） ─────────────────────────────

/** 涨跌方向。`up`/`down` 驱动涨跌色，`neutral` 中性。 */
export type StatTileStatus = 'up' | 'down' | 'neutral';

export interface StatTileDeltaSchema extends SchemaObject {
  /** 同比/环比数值（百分数，如 12.5 表示 +12.5%）。 */
  value?: number;
  /** 展示标签，缺省为带符号百分数（如 `+12.5%`）。 */
  label?: string;
  /** 方向，缺省由 `value` 符号推导（正→up、负→down、零→neutral）。 */
  direction?: StatTileStatus;
}

export interface StatTileFormatterSchema extends SchemaObject {
  /** 千分位分隔，缺省 false。 */
  thousands?: boolean;
  /** 小数位，缺省 0。 */
  decimals?: number;
}

export interface StatTileSchema extends BaseSchema {
  type: 'stat-tile';
  /** KPI 数字（支持 `${expr}` 表达式；null/undefined/非数字渲染 `--`）。 */
  value?: SchemaValue;
  /** 数值前缀（如货币符号 `¥`）。 */
  prefix?: string;
  /** 数值后缀（如单位 `万`）。 */
  suffix?: string;
  /** 同比/环比：数字（百分数）或 `{ value, label, direction }`。 */
  delta?: number | StatTileDeltaSchema;
  /** sparkline 数据（`number[]`；也支持 `${expr}` 表达式解析出数组）。 */
  sparkline?: SchemaValue;
  /** 数值格式化：千分位/小数位。 */
  formatter?: StatTileFormatterSchema;
  /** 涨跌色显式声明，覆盖 delta 符号推导。 */
  status?: StatTileStatus;
  // NOTE: `label` 沿用 BaseSchema 的 `label?: string`（编译期按
  // value-or-region 处理——author 可写字符串或 schema fragment，运行时经
  // resolveRendererSlotContent 双形态消费，与 chart `title` 同一 authoring 模式）。
}

export * from './chart-schemas.js';
export * from './sparkline-schemas.js';

export interface QueryFilterToggleConfig extends SchemaObject {
  defaultCollapsed?: boolean;
  /** Label shown in the collapsed state summary (defaults to the i18n expand hint). */
  collapsedLabel?: string;
  /** Label of the collapse control while expanded (defaults to the i18n collapse hint). */
  expandedLabel?: string;
}

export interface QueryFilterSchema extends BaseSchema {
  type: 'query-filter';
  /**
   * Query fields rendered through the embedded form (region carrier). The
   * authoring transform lowers this into a nested `{ type: 'form' }` on the
   * `filterForm` region (crud `queryFormRegion` precedent).
   */
  body?: SchemaInput;
  /** Custom action buttons; replaces the default Search/Reset pair. */
  actions?: SchemaInput;
  /** Label position forwarded to the embedded form (same resolution as crud queryForm). */
  mode?: 'normal' | 'horizontal' | 'vertical' | 'inline';
  /** Label position alias resolved by `mode` when both are declared. */
  layout?: 'horizontal' | 'vertical' | 'inline';
  /** Grid columns forwarded to the embedded form. */
  columnCount?: number;
  /** Grid gap forwarded to the embedded form. */
  gap?: number | string;
  /** Label of the default Search button (defaults to the i18n search message). */
  submitLabel?: string;
  /** Label of the default Reset button (defaults to the i18n reset message). */
  resetLabel?: string;
  /**
   * Expand/collapse semantics: `true` or a config object enables the toggle
   * envelope around the embedded form.
   */
  togglable?: boolean | QueryFilterToggleConfig;
  /**
   * Query chain dispatched through the embedded form's submit pipeline
   * (validation then submit). Consumed by the authoring transform — declared
   * as a prop, not an event contract (the renderer never reads props.events).
   */
  onSubmit?: ActionSchema | ActionSchema[];
  /** Reset chain dispatched after the embedded form resets. Consumed by the authoring transform. */
  onReset?: ActionSchema | ActionSchema[];
}

import type {
  ActionSchema,
  BaseSchema,
  ReactiveActionSchema,
  SchemaInput,
  SchemaObject,
  SchemaValue,
} from '@nop-chaos/flux-core';

export interface CrudQueryFormConfig extends SchemaObject {
  data?: SchemaValue;
  body?: SchemaInput;
  actions?: SchemaInput;
  statusPath?: string;
  layout?: 'horizontal' | 'vertical' | 'inline';
  mode?: 'manual' | 'auto';
  syncLocation?: boolean;
  defaultParams?: Record<string, SchemaValue>;
  parsePrimitiveQuery?:
    | boolean
    | {
        enable?: boolean;
        types?: Array<'boolean' | 'number'>;
      };
  defaultCollapsed?: boolean;
  collapsedLabel?: string;
  expandedLabel?: string;
}

export interface CrudPollingConfig extends SchemaObject {
  enabled?: boolean | string;
  sourceId?: string;
  stopWhen?: string;
}

export interface CrudFilterToggleConfig extends SchemaObject {
  defaultCollapsed?: boolean;
  collapsedLabel?: string;
  expandedLabel?: string;
}

export interface CrudColumnFilterOption extends SchemaObject {
  label: string;
  value: string;
}

export interface CrudColumnFilterConfig extends SchemaObject {
  options?: CrudColumnFilterOption[];
  source?: SchemaValue;
  searchable?: boolean;
  searchConfig?: SchemaValue;
  multiple?: boolean;
}

export interface CrudQuickEditConfig extends SchemaObject {
  mode?: 'dialog' | 'inline';
  body?: SchemaInput;
  saveImmediately?: boolean | SchemaValue;
}

export interface CrudColumnSchema extends SchemaObject {
  type?: string;
  name?: string;
  label?: SchemaValue;
  cell?: SchemaInput;
  width?: number | string;
  fixed?: 'left' | 'right';
  hidden?: boolean;
  toggled?: boolean;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  searchable?: boolean | SchemaInput;
  filterable?: boolean | CrudColumnFilterConfig;
  filterOptions?: CrudColumnFilterOption[];
  quickEdit?: boolean | CrudQuickEditConfig;
  buttons?: SchemaInput;
}

export interface CrudToolbarItemConfig extends SchemaObject {
  type?: 'listActions' | 'pagination' | 'statistics' | 'switch-per-page' | 'columns-toggler';
  align?: 'left' | 'right';
  draggable?: boolean;
  overlay?: boolean;
  footerBtnSize?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export interface CrudToolbarLayoutConfig extends SchemaObject {
  header?: SchemaInput;
  footer?: SchemaInput;
  showPagination?: boolean;
  showStatistics?: boolean;
  showSwitchPerPage?: boolean;
  showListActions?: boolean;
}

export interface CrudColumnSettingsConfig extends SchemaObject {
  enabled?: boolean;
  draggable?: boolean;
  overlay?: boolean;
  toggledColumnsStatePath?: string;
  orderedColumnsStatePath?: string;
}

export interface CrudResponsiveConfig extends SchemaObject {
  mode?: 'table' | 'expand';
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | number;
  expandTrigger?: 'button' | 'row';
  defaultExpanded?: boolean;
}

export interface CrudClientModeConfig extends SchemaObject {
  loadDataOnce?: boolean;
  fetchOnFilter?: boolean;
  filterOnAllColumns?: boolean;
  matchFunc?: SchemaValue;
}

export interface CrudSelectionConfig extends SchemaObject {
  type?: 'checkbox' | 'radio';
  keepOnPageChange?: boolean;
  maxSelectionLength?: number;
  checkableWhen?: string;
  /** Click a row (outside interactive controls) to toggle its selection. amis: checkOnItemClick. */
  toggleOnRowClick?: boolean;
  /** Display template for selected items (e.g. summary chips). amis: labelTpl. */
  labelTpl?: string;
}

export interface CrudMigrationHints extends SchemaObject {
  amisApi?: SchemaValue;
  amisFilter?: SchemaInput;
  amisHeaderToolbar?: SchemaInput;
  amisFooterToolbar?: SchemaInput;
  notes?: string[];
}

export interface CrudSchema extends BaseSchema {
  type: 'crud';
  name?: string;
  statusPath?: string;
  queryForm?: CrudQueryFormConfig;
  queryFormRegion?: SchemaInput;
  source?: SchemaValue;
  listActions?: SchemaInput;
  toolbar?: SchemaInput;
  footerToolbar?: SchemaInput;
  toolbarLayout?: CrudToolbarLayoutConfig;
  columns?: CrudColumnSchema[];
  empty?: SchemaInput | string;
  /**
   * Row rendering carrier. `'table'` (default) renders rows through the internal
   * `<TableRenderer>` (zero-regression default path). `'cards'` / `'list'` render
   * the row set through the corresponding carrier renderer; in those modes CRUD
   * self-holds selection (carrier `selectionMode: 'none'`) and drives pagination
   * itself. See `docs/components/crud/design.md` §4.1 for the carrier boundary.
   */
  listMode?: 'table' | 'cards' | 'list';
  /** Cards-mode row template (per-record region, `item`/`index` params). Consumed only when `listMode: 'cards'`. */
  card?: SchemaInput;
  /** List-mode row template (per-record region, `item`/`index` params). Consumed only when `listMode: 'list'`. */
  item?: SchemaInput;
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  selectionStatePath?: string;
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  sortOwnership?: 'local' | 'controlled' | 'scope';
  sortStatePath?: string;
  filterOwnership?: 'local' | 'controlled' | 'scope';
  filterStatePath?: string;
  rowKey?: string;
  autoClearSelectionOnRefresh?: boolean;
  selection?: CrudSelectionConfig;
  pageField?: string;
  pageSizeField?: string;
  defaultParams?: Record<string, SchemaValue>;
  syncLocation?: boolean;
  columnSettings?: CrudColumnSettingsConfig;
  responsive?: CrudResponsiveConfig;
  autoGenerateQueryForm?:
    | boolean
    | {
        columnsCount?: number;
        showFieldPicker?: boolean;
      };
  clientMode?: CrudClientModeConfig;
  polling?: CrudPollingConfig;
  filterTogglable?: boolean | CrudFilterToggleConfig;
  pagination?: CrudPaginationConfig;
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
  migrationHints?: CrudMigrationHints;
  onQuerySubmit?: ActionSchema;
  onQueryReset?: ActionSchema;
  onRowClick?: ActionSchema;
  onSelectionChange?: ActionSchema;
  onRefresh?: ActionSchema;
  loadAction?: ReactiveActionSchema;
  loadAllData?: boolean;
  onError?: ActionSchema;
  dataStatePath?: string;
  /** Scroll the table container to the top when the page changes. amis: autoJumpToTopOnPagerChange. */
  autoJumpToTopOnPagerChange?: boolean;
  /** Response data field name for the total count (default 'total'). amis: totalField. */
  totalField?: string;
  /** Globally hide the quick-save button. amis: hideQuickSaveBtn. */
  hideQuickSaveBtn?: boolean;
}

export interface CrudPaginationConfig extends SchemaObject {
  mode?: 'pages' | 'infinite';
  /** Always show the pagination bar even when there is only one page. amis: alwaysShowPagination. */
  alwaysShow?: boolean;
}

export interface CrudStatusSummary {
  loading: boolean;
  refreshing: boolean;
  itemCount: number;
  total?: number;
  hasSelection: boolean;
  selectionCount: number;
  selectedRowKeys: string[];
  query?: Record<string, unknown>;
  pagination?: {
    currentPage?: number;
    pageSize?: number;
  };
  sort?: {
    column?: string;
    direction?: 'asc' | 'desc';
  };
  filters?: Record<string, unknown>;
  visibleColumnNames?: string[];
}

export function normalizeCrudSchema(schema: CrudSchema): CrudSchema {
  return {
    ...schema,
    rowKey: schema.rowKey ?? 'id',
    listMode: schema.listMode ?? 'table',
    autoClearSelectionOnRefresh: schema.autoClearSelectionOnRefresh ?? true,
    selectionOwnership: schema.selection ? (schema.selectionOwnership ?? 'local') : undefined,
    paginationOwnership: schema.paginationOwnership ?? 'local',
    sortOwnership: schema.sortOwnership ?? 'local',
    filterOwnership: schema.filterOwnership ?? 'local',
    syncLocation: schema.syncLocation ?? false,
    pageField: schema.pageField ?? 'page',
    pageSizeField: schema.pageSizeField ?? 'perPage',
  };
}

export function createDefaultCrudStatusSummary(): CrudStatusSummary {
  return {
    loading: false,
    refreshing: false,
    itemCount: 0,
    total: undefined,
    hasSelection: false,
    selectionCount: 0,
    selectedRowKeys: [],
    query: undefined,
    pagination: undefined,
    sort: undefined,
    filters: undefined,
    visibleColumnNames: undefined,
  };
}

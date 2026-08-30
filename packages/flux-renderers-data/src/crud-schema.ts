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
  columnCount?: number;
  gap?: number | string;
  /**
   * Form mode controlling label position OR auto-generation behavior.
   *
   * **Label position values** (used directly as rendered form mode):
   *   - 'normal'     → labels above inputs (default)
   *   - 'horizontal' → labels left of inputs (same row, labelWidth applies)
   *   - 'inline'     → labels and inputs on same line (compact)
   *   - 'vertical'   → vertical stacking (alias of 'normal')
   *
   * **Auto-generation behavior** values (legacy, for autoGenerateQueryFilter):
   *   - 'manual' → manual query form (authored explicitly)
   *   - 'auto'   → auto-generated from filterable columns
   *
   * When this field is set to a label position value, it takes precedence over
   * `layout` for determining the rendered form's mode. When unset or set to
   * `'manual' | 'auto'`, the `layout` field determines the rendered form mode:
   *   layout: 'horizontal' → mode: 'horizontal'
   *   layout: 'inline'     → mode: 'inline'
   *   layout: 'vertical'   → mode: 'normal'
   *
   * History: previously only `layout` was read by the validator, making `mode`
   * a no-op for label position control; resolution lives in data-schema-validation.ts.
   */
  mode?: 'manual' | 'auto' | 'normal' | 'horizontal' | 'vertical' | 'inline';
  /** Reserved — URL state sync is not implemented (design §9); retained for authoring compatibility. */
  syncLocation?: boolean;
  defaultParams?: Record<string, SchemaValue>;
  parsePrimitiveQuery?:
    | boolean
    | {
        enable?: boolean;
        types?: Array<'boolean' | 'number'>;
      };
  /**
   * @deprecated Dead config — declared but never consumed (D1 G-A plan
   * Decision 4). The collapse toggle is owned by crud-level `filterTogglable`;
   * use `filterTogglable.defaultCollapsed` instead. Authoring emits a
   * `unknown-property` warning diagnostic when set.
   */
  defaultCollapsed?: boolean;
  /** @deprecated Dead config — use `filterTogglable.collapsedLabel` (consumed). */
  collapsedLabel?: string;
  /** @deprecated Dead config — use `filterTogglable.expandedLabel` (consumed). */
  expandedLabel?: string;
}

export interface CrudPollingConfig extends SchemaObject {
  enabled?: boolean | string;
  sourceId?: string;
  /**
   * @reserved — the `stopWhen` field was removed from this interface (2-1
   * adjudication): polling stop conditions are configured on the upstream
   * data-source itself (`stopWhen` is compiled into
   * `CompiledRuntimeValue<boolean>` by `source-compiler.ts` and consumed by the
   * data-source controller, see `api-data-source-controller-state.ts`).
   * The remaining `enabled`/`sourceId` fields ARE consumed by `useCrudPolling`
   * (crud orchestrates the upstream data-source start/cancel capability).
   * See docs/components/crud/design.md §Polling 启停状态发布.
   */
}

export interface CrudFilterToggleConfig extends SchemaObject {
  /** Collapse the query region on first render (mobile always starts collapsed). */
  defaultCollapsed?: boolean;
  /** Label shown in the collapsed state summary (overrides the active-filter/i18n default). */
  collapsedLabel?: string;
  /** Label of the collapse control while expanded (overrides the i18n default). */
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
  /** Compiled region key when `searchable` is authored as SchemaInput (region-ized). */
  searchableRegionKey?: string;
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

/**
 * Selection enablement & configuration.
 *
 * Shorthand forms:
 * - `true` / `'multiple'` → checkbox multi-select (all defaults)
 * - `'single'` → radio single-select
 * - `CrudSelectionConfig` object → advanced config (`type`/`maxSelectionLength`/…)
 *
 * Semantics: **setting this field (truthy) ENABLES selection**; omitting it
 * disables the selection column. The legacy empty-object form (`selection: {}`)
 * is still accepted and means "enable with all defaults".
 */
export type CrudSelectionInput = boolean | 'single' | 'multiple' | CrudSelectionConfig;

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
   * Row selection enablement & configuration. Setting this field (truthy)
   * enables the selection column:
   * - `true` / `'multiple'` → checkbox multi-select
   * - `'single'` → radio single-select
   * - object → advanced config (see `CrudSelectionConfig`)
   * Omit to disable. Legacy `selection: {}` is accepted as "enable, all defaults".
   */
  selection?: CrudSelectionInput;
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
  /**
   * Ownership mode for the selection slice. The CRUD composite always owns
   * this state in scope (per-instance `$_crud.<id>.selection`, overridable via
   * `selectionStatePath`); `'local'`/`'controlled'` values are accepted for
   * schema compatibility but behave as scope-owned (docs/components/crud/design.md §4).
   */
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  selectionStatePath?: string;
  /** Ownership mode for the pagination slice — see `selectionOwnership` (scope-owned composition). */
  paginationOwnership?: 'local' | 'controlled' | 'scope';
  paginationStatePath?: string;
  /** Ownership mode for the sort slice — see `selectionOwnership` (scope-owned composition). */
  sortOwnership?: 'local' | 'controlled' | 'scope';
  sortStatePath?: string;
  /** Ownership mode for the filter slice — see `selectionOwnership` (scope-owned composition). */
  filterOwnership?: 'local' | 'controlled' | 'scope';
  filterStatePath?: string;
  rowKey?: string;
  autoClearSelectionOnRefresh?: boolean;
  pageField?: string;
  pageSizeField?: string;
  /** 选中行键发布到按钮 action scope 的变量名（AMIS 兼容：批量操作 URL 用 ${ids}）。
   * 默认 `'ids'`，与 pageField/pageSizeField 相同的参数名映射模式。 */
  selectionField?: string;
  defaultParams?: Record<string, SchemaValue>;
  /** Reserved — URL state sync is not implemented (design §9); retained for authoring compatibility. */
  syncLocation?: boolean;
  columnSettings?: CrudColumnSettingsConfig;
  responsive?: CrudResponsiveConfig;
  /**
   * Reserved — automatic query-form generation is not implemented (design §9);
   * retained for authoring compatibility. Author the `queryForm` region explicitly.
   */
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
  /** Authoring-only migration metadata (AMIS import hints); not consumed at runtime. */
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
    selectionField: schema.selectionField ?? 'ids',
  };
}

import type { BaseSchema, TemplateNode } from '@nop-chaos/flux-core';
import type { CrudSchema } from './crud-schema.js';
import type { TableSchema } from './schemas.js';
import { DEFAULT_PAGE_SIZE_OPTIONS } from './crud-renderer-state.js';

export function buildCrudTableSchema(input: {
  id: string;
  source: unknown[];
  schema: CrudSchema;
  selectionStatePath: string;
  paginationStatePath: string;
  sortStatePath: string;
  filterStatePath: string;
  paginationMode: 'pages' | 'infinite';
  paginationState: { currentPage: number; pageSize: number };
  useLoadAction: boolean;
  loadAllData: boolean;
  total: number | undefined;
  loading: boolean;
  selectedRowKeys: string[];
  empty: unknown;
  hideBar: boolean;
}): TableSchema {
  const {
    id,
    source,
    schema,
    selectionStatePath,
    paginationStatePath,
    sortStatePath,
    filterStatePath,
    paginationMode,
    paginationState,
    useLoadAction,
    loadAllData,
    total,
    loading,
    selectedRowKeys,
    empty,
    hideBar,
  } = input;

  const base: Record<string, unknown> = {
    type: 'table',
    id: `${id}-table`,
    source,
    columns: schema.columns ?? [],
    rowKey: schema.rowKey,
    selectionOwnership: 'scope',
    selectionStatePath,
    paginationOwnership: 'scope',
    paginationStatePath,
    sortOwnership: 'scope',
    sortStatePath,
    filterOwnership: 'scope',
    filterStatePath,
    pagination: {
      enabled: paginationMode === 'pages',
      serverPaged: useLoadAction && !loadAllData,
      total: useLoadAction && !loadAllData ? total : undefined,
      currentPage: paginationState.currentPage,
      pageSize:
        paginationMode === 'infinite'
          ? Math.max(paginationState.pageSize, paginationState.currentPage * paginationState.pageSize)
          : paginationState.pageSize,
      pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
      showSizeChanger: paginationMode === 'pages',
      mode: paginationMode,
      hideBar: hideBar || undefined,
    },
    // loadAction 模式下把 fetch 中状态透传给内部 table，四态-加载态有真实 UI
    // （TableLoadingOverlay）。infinite 模式由 infinite-status 区表达加载，
    // 不再叠加整表 overlay。
    loading: useLoadAction && paginationMode === 'pages' ? loading : undefined,
    empty,
    quickSaveAction: schema.quickSaveAction,
    quickSaveItemAction: schema.quickSaveItemAction,
  };

  if (schema.selection) {
    base.rowSelection = {
      type: schema.selection.type ?? 'checkbox',
      selectedRowKeys,
      keepOnPageChange: schema.selection.keepOnPageChange,
      maxSelectionLength: schema.selection.maxSelectionLength,
      checkableWhen: schema.selection.checkableWhen,
      toggleOnRowClick: schema.selection.toggleOnRowClick,
    };
  }

  if (schema.onRefresh) {
    base.onRefresh = schema.onRefresh;
  }

  if (schema.onRowClick) {
    base.onRowClick = schema.onRowClick;
  }

  if (schema.columnSettings) {
    base.columnSettings = schema.columnSettings;
  }

  if (schema.responsive) {
    base.responsive = schema.responsive;
  }

  return base as TableSchema;
}

function extractRegionSchema(
  region: { templateNode: unknown } | undefined,
): BaseSchema | undefined {
  if (!region?.templateNode) return undefined;
  const nodes = Array.isArray(region.templateNode) ? region.templateNode : [region.templateNode];
  const schemas = nodes.map((n) => (n as TemplateNode).schema);
  if (schemas.length === 0) return undefined;
  if (schemas.length === 1) return schemas[0] as BaseSchema;
  return schemas as unknown as BaseSchema;
}

/**
 * Build the nested carrier schema (list/cards). The React Compiler auto-memoizes this,
 * and the carrier wrapper is keyed on pagination/selection state AND data version so the
 * nested `helpers.render` subtree remounts (and re-evaluates template bindings) when data
 * loads or pagination/selection changes. Without the data-version segment, the initial
 * load (0→N rows) re-renders with memoized stale empty items — only pagination changes
 * would force remount, causing the "cards empty until next page" bug.
 * item/card are consumed from compiled region handles instead of raw props.schema (compile-once).
 */
export function buildCrudCarrierSchema(input: {
  listMode: 'cards' | 'list';
  filteredRows: unknown[];
  paginationState: { currentPage: number; pageSize: number };
  rowKey: string | undefined;
  empty: unknown;
  itemRegion?: { templateNode: unknown };
  cardRegion?: { templateNode: unknown };
  paginationStatePath: string;
}): BaseSchema | null {
  const {
    listMode,
    filteredRows,
    paginationState,
    rowKey,
    empty,
    itemRegion,
    cardRegion,
    paginationStatePath,
  } = input;

  const carrierRows =
    listMode === 'cards'
      ? filteredRows.slice(
          (paginationState.currentPage - 1) * paginationState.pageSize,
          paginationState.currentPage * paginationState.pageSize,
        )
      : filteredRows;
  const base: Record<string, unknown> = {
    items: carrierRows as BaseSchema['data'],
    selectionMode: 'none' as const,
    keyField: rowKey,
    empty,
  };
  if (listMode === 'list') {
    return {
      ...base,
      type: 'list',
      item: extractRegionSchema(itemRegion),
      pagination: { enabled: true, mode: 'page', pageSize: paginationState.pageSize },
      paginationOwnership: 'scope',
      paginationStatePath,
    } as BaseSchema;
  }
  return {
    ...base,
    type: 'cards',
    card: extractRegionSchema(cardRegion),
  } as BaseSchema;
}

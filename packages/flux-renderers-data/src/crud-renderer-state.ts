import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getIn,
  type ActionContext,
  type ActionResult,
  type ReactionHandle,
  type RendererEnv,
  type RendererHelpers,
  type RendererComponentProps,
  type ScopeRef,
} from '@nop-chaos/flux-core';
import {
  useCurrentComponentRegistry,
  useScopeSelector,
  useStatusPathPublication,
} from '@nop-chaos/flux-react';
import type { CrudSchema, CrudStatusSummary } from './crud-schema.js';

export const EMPTY_ROWS: unknown[] = [];
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface InternalTableHandle {
  refreshSource?: () => void;
  getSelection?: () => string[];
  clearSelection?: () => void;
}

export interface CrudPaginationState {
  currentPage: number;
  pageSize: number;
}

export interface CrudSortState {
  column?: string;
  direction?: 'asc' | 'desc';
}

export type CrudFilterState = Record<string, { filters?: string[]; keyword?: string }>;

// Flat query state: query fields are stored directly under the query scope path
// (e.g. $_crud.<id>.query.keyword) with no `values` wrapper. `refreshCount` is
// tracked internally by the component (not exposed to CRUD scope/bindings).
export type CrudQueryState = Record<string, unknown>;

export interface CrudResolvedSource {
  rows: unknown[];
  total?: number;
  serverPagination?: { currentPage?: number; pageSize?: number };
}

export interface CrudNormalizedSourceContext {
  rows: unknown[];
  total: number;
  page?: number;
  pageSize?: number;
}

import {
  isRecord,
  toRecord,
  toPositiveNumber,
  toStringArray,
  shallowEqualRecords,
} from '@nop-chaos/flux-core';
import { toPartialActionContext } from './table-renderer/capability-action-context.js';

export function normalizePagination(value: unknown, fallbackPageSize: number): CrudPaginationState {
  const record = toRecord(value);
  return {
    currentPage: toPositiveNumber(record.currentPage, 1),
    pageSize: toPositiveNumber(record.pageSize, fallbackPageSize),
  };
}

export function normalizeSort(value: unknown): CrudSortState {
  const record = toRecord(value);
  const column =
    typeof record.column === 'string'
      ? record.column
      : typeof record.field === 'string'
        ? record.field
        : undefined;
  const direction =
    record.direction === 'asc' || record.direction === 'desc'
      ? record.direction
      : record.order === 'asc' || record.order === 'desc'
        ? record.order
        : undefined;
  return {
    column,
    direction,
  };
}

function normalizeCrudFilterEntry(value: unknown) {
  if (typeof value === 'string' && value.length > 0) {
    return { filters: [value] };
  }

  if (Array.isArray(value)) {
    const filters = value.filter((item): item is string => typeof item === 'string');
    return filters.length > 0 ? { filters } : undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const filters = Array.isArray(value.filters)
    ? value.filters.filter((item): item is string => typeof item === 'string')
    : undefined;
  const keyword = typeof value.keyword === 'string' && value.keyword.length > 0 ? value.keyword : undefined;

  if ((!filters || filters.length === 0) && keyword === undefined) {
    return undefined;
  }

  return { filters, keyword };
}

export function normalizeCrudFilters(value: unknown): CrudFilterState {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: CrudFilterState = {};

  for (const [key, entry] of Object.entries(value)) {
    const nextEntry = normalizeCrudFilterEntry(entry);
    if (nextEntry !== undefined) {
      normalized[key] = nextEntry;
    }
  }

  return normalized;
}

function areCrudFilterStatesEqual(left: CrudFilterState, right: CrudFilterState): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftEntry = left[key];
    const rightEntry = right[key];

    if (!leftEntry || !rightEntry) {
      return leftEntry === rightEntry;
    }

    if (leftEntry.keyword !== rightEntry.keyword) {
      return false;
    }

    const leftFilters = leftEntry.filters ?? [];
    const rightFilters = rightEntry.filters ?? [];

    if (leftFilters.length !== rightFilters.length) {
      return false;
    }

    return leftFilters.every((value, index) => value === rightFilters[index]);
  });
}

export function applyQueryToRows(rows: unknown[], query: Record<string, unknown>) {
  const entries = Object.entries(query).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });

  if (entries.length === 0) {
    return rows;
  }

  return rows.filter((row) => {
    if (!isRecord(row)) {
      return false;
    }

    return entries.every(([field, value]) => {
      const cell = row[field];
      if (Array.isArray(value)) {
        return value.includes(cell as never);
      }
      if (typeof value === 'string') {
        const needle = value.trim().toLowerCase();
        if (!needle) {
          return true;
        }
        if (field.toLowerCase().includes('keyword')) {
          return Object.values(row).some((part) =>
            String(part ?? '')
              .toLowerCase()
              .includes(needle),
          );
        }
        return String(cell ?? '')
          .toLowerCase()
          .includes(needle);
      }
      return cell === value;
    });
  });
}

export function normalizeCrudSourceValue(value: unknown): CrudResolvedSource {
  if (Array.isArray(value)) {
    return {
      rows: value,
      total: value.length,
    };
  }

  const record = toRecord(value);
  const rows = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.rows)
      ? record.rows
      : Array.isArray(record.records)
        ? record.records
        : Array.isArray(record.list)
          ? record.list
          : EMPTY_ROWS;

  const total =
    typeof record.total === 'number' && Number.isFinite(record.total)
      ? record.total
      : typeof record.count === 'number' && Number.isFinite(record.count)
        ? record.count
        : rows.length;

  const serverPage =
    typeof record.page === 'number' && Number.isFinite(record.page)
      ? record.page
      : typeof record.currentPage === 'number' && Number.isFinite(record.currentPage)
        ? record.currentPage
        : undefined;
  const serverPageSize =
    typeof record.pageSize === 'number' && Number.isFinite(record.pageSize)
      ? record.pageSize
      : typeof record.perPage === 'number' && Number.isFinite(record.perPage)
        ? record.perPage
        : undefined;

  const serverPagination =
    serverPage !== undefined || serverPageSize !== undefined
      ? { currentPage: serverPage, pageSize: serverPageSize }
      : undefined;

  return {
    rows,
    total,
    serverPagination,
  };
}

export function createCrudNormalizedSourceContext(value: unknown): CrudNormalizedSourceContext {
  const normalized = normalizeCrudSourceValue(value);
  return {
    rows: normalized.rows,
    total: normalized.total ?? normalized.rows.length,
    page: normalized.serverPagination?.currentPage,
    pageSize: normalized.serverPagination?.pageSize,
  };
}

export function useCrudStatusPublisher(
  scope: ScopeRef | undefined,
  statusPath: string | undefined,
  summary: CrudStatusSummary,
) {
  useStatusPathPublication(scope, statusPath, summary);
}

export function createCrudEvaluationBindings(args: {
  pagination: CrudPaginationState;
  query: Record<string, unknown>;
  sort: CrudSortState;
  filters: CrudFilterState;
  selection: string[];
}): Record<string, unknown> {
  return {
    pagination: { currentPage: args.pagination.currentPage, pageSize: args.pagination.pageSize },
    query: { ...args.query },
    sort: { column: args.sort.column, direction: args.sort.direction },
    filters: { ...args.filters },
    selection: [...args.selection],
  };
}

export function useCrudHandle(
  props: RendererComponentProps<CrudSchema>,
  selectedRowKeys: unknown[],
  clearSelection: () => void,
  handleRefresh: (ctx?: Partial<ActionContext>) => void,
  toggleSelection: (key: unknown) => void,
  handleLoadMore: () => Promise<unknown> | void,
) {
  const componentRegistry = useCurrentComponentRegistry();
  const cid = props.meta.cid;
  const id = props.id;
  const name = (props.props as CrudSchema).name as string | undefined;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }

    return componentRegistry.register(
      {
        id,
        name,
        type: 'crud',
        capabilities: {
          hasMethod(method) {
            return ['refresh', 'getSelection', 'clearSelection', 'toggleSelection', 'loadMore'].includes(method);
          },
          listMethods() {
            return ['refresh', 'getSelection', 'clearSelection', 'toggleSelection', 'loadMore'];
          },
          async invoke(method, payload, ctx) {
            switch (method) {
              case 'refresh':
                handleRefresh(toPartialActionContext(ctx));
                return { ok: true };
              case 'getSelection':
                return { ok: true, data: selectedRowKeys };
              case 'clearSelection':
                clearSelection();
                return { ok: true };
              case 'toggleSelection':
                toggleSelection((payload as { key?: unknown } | undefined)?.key);
                return { ok: true };
              case 'loadMore':
                handleLoadMore();
                return { ok: true };
              default:
                return { ok: false, error: new Error(`Unknown method: ${method}`) };
            }
          },
        },
      },
      { cid },
    );
  }, [clearSelection, componentRegistry, cid, handleRefresh, id, name, selectedRowKeys, toggleSelection, handleLoadMore]);
}

export function useCrudRuntimeState(args: {
  scope: ScopeRef | undefined;
  queryStatePath: string;
  paginationStatePath: string;
  sortStatePath: string;
  filterStatePath: string;
  selectionStatePath: string;
  defaultQuery: Record<string, unknown>;
  fallbackPageSize: number;
}) {
  const {
    scope,
    queryStatePath,
    paginationStatePath,
    sortStatePath,
    filterStatePath,
    selectionStatePath,
    defaultQuery,
    fallbackPageSize,
  } = args;

  const queryState = useScopeSelector(
    (scopeData) => {
      const query = getIn(scopeData, queryStatePath);
      return isRecord(query) ? toRecord(query) : defaultQuery;
    },
    shallowEqualRecords,
    { paths: [queryStatePath] },
  );

  const paginationState = useScopeSelector(
    (scopeData) => normalizePagination(getIn(scopeData, paginationStatePath), fallbackPageSize),
    (a, b) => a.currentPage === b.currentPage && a.pageSize === b.pageSize,
    { paths: [paginationStatePath] },
  );

  const sortState = useScopeSelector(
    (scopeData) => normalizeSort(getIn(scopeData, sortStatePath)),
    (a, b) => a.column === b.column && a.direction === b.direction,
    { paths: [sortStatePath] },
  );

  const filterState = useScopeSelector(
    (scopeData) => normalizeCrudFilters(getIn(scopeData, filterStatePath)),
    areCrudFilterStatesEqual,
    { paths: [filterStatePath] },
  );

  const selectedRowKeys = useScopeSelector(
    (scopeData) => toStringArray(getIn(scopeData, selectionStatePath)),
    (a, b) => a.length === b.length && a.every((value, index) => value === b[index]),
    { paths: [selectionStatePath] },
  );

  useEffect(() => {
    if (!scope) {
      return;
    }

    const snapshot = scope.readVisible();

    if (!isRecord(getIn(snapshot, queryStatePath))) {
      scope.update(queryStatePath, defaultQuery);
    }
    if (!getIn(snapshot, paginationStatePath)) {
      scope.update(paginationStatePath, { currentPage: 1, pageSize: fallbackPageSize });
    }
    if (!isRecord(getIn(snapshot, sortStatePath))) {
      scope.update(sortStatePath, {});
    }
    if (!isRecord(getIn(snapshot, filterStatePath))) {
      scope.update(filterStatePath, {});
    }
    if (!Array.isArray(getIn(snapshot, selectionStatePath))) {
      scope.update(selectionStatePath, []);
    }
  }, [
    fallbackPageSize,
    filterStatePath,
    defaultQuery,
    paginationStatePath,
    queryStatePath,
    scope,
    selectionStatePath,
    sortStatePath,
  ]);

  return useMemo(
    () => ({ queryState, paginationState, sortState, filterState, selectedRowKeys }),
    [queryState, paginationState, sortState, filterState, selectedRowKeys],
  );
}

export interface CrudLoadActionResult {
  rows: unknown[];
  total: number | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
}

export function useCrudLoadAction(args: {
  enabled: boolean;
  loadReaction: ReactionHandle | undefined;
  loadAllData: boolean;
  onError: RendererComponentProps<CrudSchema>['events']['onError'];
  helpers: RendererHelpers;
  env: RendererEnv | undefined;
  scope: ScopeRef | undefined;
  nodeScope: ScopeRef | undefined;
  pagination: CrudPaginationState;
  query: Record<string, unknown>;
  sort: CrudSortState;
  filters: CrudFilterState;
  selection: string[];
  paginationStatePath: string;
  queryStatePath: string;
  sortStatePath: string;
  filterStatePath: string;
  selectionStatePath: string;
}): CrudLoadActionResult {
  const {
    enabled,
    loadReaction,
    loadAllData,
    onError,
    env,
    scope,
    nodeScope,
    pagination,
    query,
    sort,
    filters,
    selection,
    paginationStatePath,
    queryStatePath,
    sortStatePath,
    filterStatePath,
    selectionStatePath,
  } = args;

  const [rows, setRows] = useState<unknown[]>(EMPTY_ROWS);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const loadedAllRef = useRef(false);
  // reload() re-triggers the imperative dispatch in the load effect below (the
  // only path that captures the result into rows/total). force() alone fires the
  // reaction's ajax but its result is not captured, so a nonce state is bumped
  // to make the effect re-run and re-dispatch.
  const [reloadNonce, setReloadNonce] = useState(0);

  const reload = useCallback(() => {
    loadedAllRef.current = false;
    setReloadNonce((value) => value + 1);
  }, []);

  const reportError = useCallback(
    (err: Error, evaluationBindings: Record<string, unknown>) => {
      setError(err);
      if (onError) {
        void onError(
          { type: 'load-error', error: err },
          {
            scope: scope ?? nodeScope,
            event: { type: 'load-error', error: err },
            evaluationBindings: { ...evaluationBindings, error: err },
          },
        );
        return;
      }
      env?.notify?.('error', err.message);
    },
    [env, nodeScope, onError, scope],
  );

  // Activate the reaction handle on mount and register a bindings provider
  // so that reactive triggers (external binding changes) and manual refresh
  // (force/reload) inject CRUD internal state into the action's
  // evaluationBindings — same context as imperative dispatch.
  useEffect(() => {
    if (!enabled || !loadReaction) {
      return;
    }

    // Register bindings provider: reads current CRUD state directly from scope
    // (NOT from React state closures) to avoid stale-data issues during
    // synchronous scope-change notification.
    const proxyHandle = loadReaction as ReactionHandle & {
      __setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void;
    };
    proxyHandle.__setBindingsProvider?.(() => {
      const activeScope = scope ?? nodeScope;
      const snapshot = activeScope?.readVisible() ?? {};
      return createCrudEvaluationBindings({
        pagination: normalizePagination(
          getIn(snapshot, paginationStatePath),
          pagination.pageSize,
        ),
        query: (getIn(snapshot, queryStatePath) as Record<string, unknown>) ?? {},
        sort: (getIn(snapshot, sortStatePath) as CrudSortState) ?? {},
        filters: (getIn(snapshot, filterStatePath) as CrudFilterState) ?? {},
        selection: toStringArray(getIn(snapshot, selectionStatePath)),
      });
    });

    loadReaction.ready();

    return () => {
      proxyHandle.__setBindingsProvider?.(undefined);
    };
  }, [enabled, loadReaction, scope, nodeScope, paginationStatePath, queryStatePath, sortStatePath, filterStatePath, selectionStatePath, pagination.pageSize]);

  useEffect(() => {
    if (!enabled || !loadReaction) {
      return;
    }

    if (loadAllData && loadedAllRef.current) {
      return;
    }

    let cancelled = false;

    const evaluationBindings = createCrudEvaluationBindings({
      pagination,
      query,
      sort,
      filters,
      selection,
    });

    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result: ActionResult = await loadReaction.dispatch({ evaluationBindings });

        if (cancelled || result.cancelled) {
          return;
        }

        if (!result.ok) {
          const err =
            result.error instanceof Error
              ? result.error
              : typeof result.error === 'string'
                ? new Error(result.error)
                : new Error('loadAction failed');
          reportError(err, evaluationBindings);
          setLoading(false);
          return;
        }

        const normalized = normalizeCrudSourceValue(result.data);
        setRows(normalized.rows);
        setTotal(normalized.total);

        if (normalized.serverPagination && (scope ?? nodeScope)) {
          const correctedPage = normalized.serverPagination.currentPage ?? pagination.currentPage;
          const correctedPageSize = normalized.serverPagination.pageSize ?? pagination.pageSize;
          (scope ?? nodeScope)!.update(paginationStatePath, {
            currentPage: correctedPage,
            pageSize: correctedPageSize,
          });
        }

        if (loadAllData) {
          loadedAllRef.current = true;
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        reportError(error, evaluationBindings);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Note: all CRUD internal state (pagination/query/sort/filters/selection)
    // is intentionally in deps. In table mode, pagination/pageSize changes
    // bypass CRUD handlers — TableRenderer writes directly to scope, and the
    // CRUD detects the change via useScopeSelector → re-render → this effect.
    // Server-correction loop prevention relies on scope.update value
    // comparison (Fix 3) once implemented; until then, the loop is
    // self-stabilizing (at most 1 extra fetch).
  }, [
    enabled,
    loadReaction,
    loadAllData,
    reportError,
    scope,
    nodeScope,
    pagination,
    query,
    sort,
    filters,
    selection,
    paginationStatePath,
    reloadNonce,
  ]);

  return useMemo(
    () => ({ rows, total, loading, error, reload }),
    [rows, total, loading, error, reload],
  );
}

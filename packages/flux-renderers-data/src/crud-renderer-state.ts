import { useEffect, useMemo } from 'react';
import {
  getIn,
  type ActionContext,
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

/**
 * Normalizes a CRUD source value into a compact source context
 * (rows/total/page/pageSize) for host-side consumption.
 *
 * Exported from the package root barrel as a stable public utility. Currently
 * has no external consumers; kept public as an intentional maintenance
 * surface (see docs/audits/multi-audit-r2-verdicts.md 01-03).
 */
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
  pageField?: string;
  pageSizeField?: string;
}): Record<string, unknown> {
  return {
    pagination: { currentPage: args.pagination.currentPage, pageSize: args.pagination.pageSize },
    query: { ...args.query },
    sort: { column: args.sort.column, direction: args.sort.direction },
    filters: { ...args.filters },
    selection: [...args.selection],
    __autoPagination: {
      [args.pageField ?? 'page']: args.pagination.currentPage,
      [args.pageSizeField ?? 'perPage']: args.pagination.pageSize,
    },
  };
}

export function useCrudHandle(
  props: RendererComponentProps<CrudSchema>,
  selectedRowKeys: unknown[],
  clearSelection: () => void,
  handleRefresh: (ctx?: Partial<ActionContext>) => void,
  toggleSelection: (key: unknown) => void,
  handleLoadMore: () => Promise<unknown> | void,
  querySubmit?: () => Promise<void>,
  queryReset?: () => void,
) {
  const componentRegistry = useCurrentComponentRegistry();
  const cid = props.meta.cid;
  const id = props.id;
  const name = (props.props as CrudSchema).name as string | undefined;
  const nodeScope = props.node?.scope;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }

    const methods = ['refresh', 'getSelection', 'clearSelection', 'toggleSelection', 'loadMore'];
    if (querySubmit) methods.push('querySubmit');
    if (queryReset) methods.push('queryReset');

    return componentRegistry.register(
      {
        id,
        name,
        type: 'crud',
        scope: nodeScope,
        capabilities: {
          hasMethod(method) {
            return methods.includes(method);
          },
          listMethods() {
            return methods;
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
              case 'querySubmit':
                if (querySubmit) {
                  await querySubmit();
                  return { ok: true };
                }
                return { ok: false, error: new Error('querySubmit not available') };
              case 'queryReset':
                if (queryReset) {
                  queryReset();
                  return { ok: true };
                }
                return { ok: false, error: new Error('queryReset not available') };
              default:
                return { ok: false, error: new Error(`Unknown method: ${method}`) };
            }
          },
        },
      },
      { cid },
    );
  }, [clearSelection, componentRegistry, cid, handleRefresh, id, name, nodeScope, selectedRowKeys, toggleSelection, handleLoadMore, querySubmit, queryReset]);
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


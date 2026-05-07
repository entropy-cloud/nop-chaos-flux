import { useEffect, useMemo } from 'react';
import { getIn, type RendererComponentProps, type ScopeRef } from '@nop-chaos/flux-core';
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
  field?: string;
  order?: 'asc' | 'desc';
}

export type CrudFilterState = Record<string, unknown>;

export interface CrudQueryState {
  values: Record<string, unknown>;
  refreshCount: number;
}

export interface CrudResolvedSource {
  rows: unknown[];
  total?: number;
}

import {
  isRecord,
  toRecord,
  toPositiveNumber,
  toStringArray,
  shallowEqualRecords,
} from '@nop-chaos/flux-core';

export function normalizePagination(value: unknown, fallbackPageSize: number): CrudPaginationState {
  const record = toRecord(value);
  return {
    currentPage: toPositiveNumber(record.currentPage, 1),
    pageSize: toPositiveNumber(record.pageSize, fallbackPageSize),
  };
}

export function normalizeSort(value: unknown): CrudSortState {
  const record = toRecord(value);
  return {
    field: typeof record.field === 'string' ? record.field : undefined,
    order: record.order === 'asc' || record.order === 'desc' ? record.order : undefined,
  };
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

  return {
    rows,
    total,
  };
}

export function useCrudStatusPublisher(
  scope: ScopeRef | undefined,
  statusPath: string | undefined,
  summary: CrudStatusSummary,
) {
  useStatusPathPublication(scope, statusPath, summary);
}

export function useCrudHandle(
  props: RendererComponentProps<CrudSchema>,
  internalTableRef: React.RefObject<InternalTableHandle>,
  handleRefresh: () => void,
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
            return ['refresh', 'getSelection', 'clearSelection'].includes(method);
          },
          listMethods() {
            return ['refresh', 'getSelection', 'clearSelection'];
          },
          async invoke(method) {
            switch (method) {
              case 'refresh':
                handleRefresh();
                return { ok: true };
              case 'getSelection':
                return { ok: true, data: internalTableRef.current?.getSelection?.() ?? [] };
              case 'clearSelection':
                internalTableRef.current?.clearSelection?.();
                return { ok: true };
              default:
                return { ok: false, error: new Error(`Unknown method: ${method}`) };
            }
          },
        },
      },
      { cid },
    );
  }, [componentRegistry, cid, handleRefresh, id, internalTableRef, name]);
}

export function useCrudRuntimeState(args: {
  scope: ScopeRef | undefined;
  ownerStatePath: string;
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
    ownerStatePath,
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
      const owner = toRecord(getIn(scopeData, ownerStatePath));
      const ownerQuery = toRecord(owner.query);
      const query = toRecord(getIn(scopeData, queryStatePath));
      return {
        values:
          isRecord(query) && isRecord(query.values)
            ? toRecord(query.values)
            : isRecord(ownerQuery.values)
              ? toRecord(ownerQuery.values)
              : defaultQuery,
        refreshCount: isRecord(query)
          ? toPositiveNumber(query.refreshCount, 0)
          : toPositiveNumber(ownerQuery.refreshCount, 0),
      } satisfies CrudQueryState;
    },
    (a, b) => a.refreshCount === b.refreshCount && shallowEqualRecords(a.values, b.values),
  );

  const paginationState = useScopeSelector(
    (scopeData) => {
      const owner = toRecord(getIn(scopeData, ownerStatePath));
      const pagination = getIn(scopeData, paginationStatePath);
      return normalizePagination(pagination ?? owner.pagination, fallbackPageSize);
    },
    (a, b) => a.currentPage === b.currentPage && a.pageSize === b.pageSize,
  );

  const sortState = useScopeSelector(
    (scopeData) => {
      const owner = toRecord(getIn(scopeData, ownerStatePath));
      const sort = getIn(scopeData, sortStatePath);
      return normalizeSort(sort ?? owner.sort);
    },
    (a, b) => a.field === b.field && a.order === b.order,
  );

  const filterState = useScopeSelector((scopeData) => {
    const owner = toRecord(getIn(scopeData, ownerStatePath));
    const filters = getIn(scopeData, filterStatePath);
    return toRecord(filters ?? owner.filters);
  }, shallowEqualRecords);

  const selectedRowKeys = useScopeSelector(
    (scopeData) => {
      const owner = toRecord(getIn(scopeData, ownerStatePath));
      const selection = getIn(scopeData, selectionStatePath);
      return toStringArray(selection ?? owner.selection);
    },
    (a, b) => a.length === b.length && a.every((value, index) => value === b[index]),
  );

  useEffect(() => {
    if (!scope) {
      return;
    }

    const snapshot = scope.readVisible();

    if (!isRecord(getIn(snapshot, queryStatePath))) {
      scope.update(queryStatePath, { values: defaultQuery, refreshCount: 0 });
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

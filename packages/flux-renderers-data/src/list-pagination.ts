import { useEffect, useState } from 'react';
import { getIn, isRecord, toRecord, toPositiveNumber, type ScopeRef } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { ListPaginationConfig, ListPaginationMode, ListPaginationOwnership } from './schemas.js';

export const DEFAULT_LIST_PAGE_SIZE = 10;

export function resolveListPaginationOwnership(value: unknown): ListPaginationOwnership {
  return value === 'controlled' || value === 'scope' ? value : 'local';
}

export function resolveListPaginationMode(value: unknown): ListPaginationMode {
  return value === 'infinite' ? 'infinite' : 'page';
}

export function computeTotalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.ceil(total / pageSize);
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  if (page > totalPages) {
    return totalPages;
  }
  return Math.trunc(page);
}

function resolveFallbackPageSize(config: ListPaginationConfig | undefined): number {
  const ps = toPositiveNumber(config?.pageSize, DEFAULT_LIST_PAGE_SIZE);
  return ps >= 1 ? ps : DEFAULT_LIST_PAGE_SIZE;
}

function resolveSeedPage(config: ListPaginationConfig | undefined): number {
  return toPositiveNumber(config?.currentPage, 1);
}

export interface ResolvedListPagination {
  enabled: boolean;
  mode: ListPaginationMode;
  ownership: ListPaginationOwnership;
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  /**
   * Apply (clamp + write per ownership) a new page. Returns the clamped applied
   * page, or `undefined` when no write occurred (pagination disabled, controlled
   * pure-view, or scope path missing). Does NOT dispatch events — the caller
   * decides whether to dispatch onPageChange.
   */
  applyPage(next: number): number | undefined;
}

interface ScopePaginationRead {
  currentPage: number | undefined;
  pageSize: number;
}

export interface UseListPaginationArgs {
  config: ListPaginationConfig | undefined;
  ownership: ListPaginationOwnership;
  paginationStatePath: string | undefined;
  pageSizeStatePath: string | undefined;
  scope: ScopeRef | undefined;
  itemCount: number;
}

export function useListPagination(args: UseListPaginationArgs): ResolvedListPagination {
  const { config, ownership, paginationStatePath, pageSizeStatePath, scope, itemCount } = args;
  const enabled = config?.enabled === true;
  const mode = resolveListPaginationMode(config?.mode);
  const fallbackPageSize = resolveFallbackPageSize(config);
  const seedPage = resolveSeedPage(config);
  const explicitTotal =
    typeof config?.total === 'number' && Number.isFinite(config.total) ? config.total : undefined;
  const total = explicitTotal ?? itemCount;

  const [localPage, setLocalPage] = useState<number>(() => seedPage);

  const scopePaths = [paginationStatePath, pageSizeStatePath].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );

  const scopeRead = useScopeSelector<ScopePaginationRead>(
    (scopeData) => {
      if (!paginationStatePath) {
        return { currentPage: undefined, pageSize: fallbackPageSize };
      }
      const pagRecord = toRecord(getIn(scopeData, paginationStatePath));
      const rawPage = toPositiveNumber(pagRecord.currentPage, Number.NaN);
      const psSource = pageSizeStatePath
        ? toRecord(getIn(scopeData, pageSizeStatePath))
        : pagRecord;
      const ps = toPositiveNumber(psSource.pageSize, fallbackPageSize);
      return {
        currentPage: Number.isFinite(rawPage) ? rawPage : undefined,
        pageSize: ps >= 1 ? ps : fallbackPageSize,
      };
    },
    (a, b) => a.currentPage === b.currentPage && a.pageSize === b.pageSize,
    { paths: scopePaths },
  );

  useEffect(() => {
    if (ownership !== 'scope') {
      return;
    }
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
      ?.NODE_ENV;
    if (nodeEnv === 'production') {
      return;
    }
    if (!paginationStatePath) {
      console.warn(
        '[flux:list] paginationOwnership="scope" but paginationStatePath is missing. ' +
          'Falling back to pagination.currentPage seed; list renders without crashing.',
      );
      return;
    }
    if (!scope) {
      return;
    }
    const snapshot = scope.readVisible();
    if (!isRecord(getIn(snapshot, paginationStatePath))) {
      console.warn(
        `[flux:list] paginationStatePath "${paginationStatePath}" has no value in scope. ` +
          'Falling back to pagination.currentPage seed; list renders without crashing.',
      );
    }
  }, [ownership, paginationStatePath, scope]);

  let resolvedPage: number;
  let resolvedPageSize: number;

  if (ownership === 'scope') {
    resolvedPage = scopeRead.currentPage ?? seedPage;
    resolvedPageSize = scopeRead.pageSize;
  } else if (ownership === 'controlled') {
    resolvedPage = seedPage;
    resolvedPageSize = fallbackPageSize;
  } else {
    resolvedPage = localPage;
    resolvedPageSize = fallbackPageSize;
  }

  const pageSize = Math.max(1, Math.trunc(resolvedPageSize));
  const totalPages = computeTotalPages(total, pageSize);
  const currentPage = enabled ? clampPage(resolvedPage, totalPages) : 1;

  const hasMore =
    config?.hasMore === false
      ? false
      : explicitTotal !== undefined
        ? currentPage < totalPages
        : true;

  function applyPage(next: number): number | undefined {
    if (!enabled) {
      return undefined;
    }
    const clamped = clampPage(next, totalPages);
    if (clamped === currentPage) {
      return undefined;
    }
    if (ownership === 'controlled') {
      return undefined;
    }
    if (ownership === 'scope') {
      if (!scope || !paginationStatePath) {
        return undefined;
      }
      const existing = toRecord(getIn(scope.readVisible(), paginationStatePath));
      scope.update(paginationStatePath, { ...existing, currentPage: clamped });
      return clamped;
    }
    setLocalPage(clamped);
    return clamped;
  }

  return {
    enabled,
    mode,
    ownership,
    currentPage,
    pageSize,
    total,
    totalPages,
    hasMore,
    applyPage,
  };
}

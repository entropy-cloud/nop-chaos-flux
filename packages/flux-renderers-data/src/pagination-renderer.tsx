import React, { useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  NativeSelect,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  cn,
} from '@nop-chaos/ui';
import { useStatusPathPublication } from '@nop-chaos/flux-react';
import type { PaginationMode, PaginationSchema } from './schemas.js';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

function toPositiveNumber(value: number, min: number): number {
  return Number.isFinite(value) && value >= min ? Math.trunc(value) : min;
}

function computeTotalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) {
    return 1;
  }
  return Math.ceil(total / pageSize);
}

/**
 * Normalize currentPage into the valid [1, totalPages] range.
 * Per design §7: out-of-range currentPage must clamp to last page; onChange reports the normalized value.
 */
function normalizeCurrentPage(currentPage: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }
  if (currentPage < 1) {
    return 1;
  }
  if (currentPage > totalPages) {
    return totalPages;
  }
  return currentPage;
}

function resolveMode(value: unknown): PaginationMode {
  return value === 'with-page-size' ? 'with-page-size' : 'simple';
}

function buildPageWindow(current: number, totalPages: number, windowSize = 5): number[] {
  if (totalPages <= 0) {
    return [1];
  }
  if (totalPages <= windowSize + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = current - half;
  let end = current + half;
  if (start < 1) {
    start = 1;
    end = Math.min(totalPages, windowSize);
  }
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, totalPages - windowSize + 1);
  }
  const pages: number[] = [];
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  return pages;
}

function shouldShowLeadingEllipsis(pages: number[]): boolean {
  return pages.length > 0 && pages[0] > 2;
}

function shouldShowTrailingEllipsis(pages: number[], totalPages: number): boolean {
  return pages.length > 0 && pages[pages.length - 1] < totalPages - 1;
}

function shouldShowFirstPage(pages: number[]): boolean {
  return pages.length > 0 && pages[0] > 1;
}

function shouldShowLastPage(pages: number[], totalPages: number): boolean {
  return pages.length > 0 && pages[pages.length - 1] < totalPages;
}

export function PaginationRenderer(props: RendererComponentProps<PaginationSchema>) {
  const schemaProps = props.props;
  const mode = resolveMode(schemaProps.mode);
  const pageSizeOptionsProp = Array.isArray(schemaProps.pageSizeOptions)
    ? (schemaProps.pageSizeOptions.filter((n): n is number => typeof n === 'number') as number[])
    : undefined;
  const pageSizeOptions =
    pageSizeOptionsProp && pageSizeOptionsProp.length > 0
      ? pageSizeOptionsProp
      : Array.from(DEFAULT_PAGE_SIZE_OPTIONS);
  const initialPageSize = toPositiveNumber(
    toNumber(schemaProps.pageSize, DEFAULT_PAGE_SIZE),
    1,
  );
  const initialTotal = Math.max(0, toNumber(schemaProps.total, 0));
  const totalPages = computeTotalPages(initialTotal, initialPageSize);

  // Local controlled interaction state (design §7): the schema prop seeds the
  // initial value; subsequent mutations are local to the renderer. This avoids
  // the controlled-vs-local feedback loop where each local setCurrentPage gets
  // clobbered by the unchanged schema prop.
  const [currentPage, setCurrentPage] = useState<number>(() =>
    normalizeCurrentPage(
      Math.max(1, toNumber(schemaProps.currentPage, 1)),
      totalPages,
    ),
  );
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  // H2: `total` is a server/schema-derived value (not user-mutated interaction
  // state like currentPage/pageSize), so it must follow `schemaProps.total` at
  // render time. The previous `useState(initialTotal)` captured the first value
  // forever, so the first server refresh left totalPages / canGoNext stale.
  const total = initialTotal;

  const currentTotalPages = computeTotalPages(total, pageSize);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < currentTotalPages;

  const statusPath =
    typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined;
  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, statusPath, {
    kind: 'pagination' as const,
    currentPage,
    pageSize,
    total,
    totalPages: currentTotalPages,
    canGoNext,
    canGoPrev,
  });

  const handlePageChange = (nextRaw: number) => {
    const next = normalizeCurrentPage(nextRaw, currentTotalPages);
    if (next === currentPage) {
      return;
    }
    setCurrentPage(next);
    void props.events.onChange?.(
      { type: 'pagination:change', currentPage: next, pageSize, total },
      { scope: props.node.scope },
    );
  };

  const handlePageSizeChange = (nextRaw: number) => {
    const next = toPositiveNumber(nextRaw, 1);
    if (next === pageSize) {
      return;
    }
    // Per design §7 decision: page-size change resets currentPage to 1 to avoid empty pages.
    const nextTotalPages = computeTotalPages(total, next);
    setPageSize(next);
    setCurrentPage(1);
    void props.events.onPageSizeChange?.(
      {
        type: 'pagination:page-size-change',
        pageSize: next,
        currentPage: 1,
        totalPages: nextTotalPages,
        total,
      },
      { scope: props.node.scope },
    );
    void props.events.onChange?.(
      { type: 'pagination:change', currentPage: 1, pageSize: next, total },
      { scope: props.node.scope },
    );
  };

  const pages = buildPageWindow(currentPage, currentTotalPages);
  const showFirst = shouldShowFirstPage(pages);
  const showLeadingEllipsis = shouldShowLeadingEllipsis(pages);
  const showTrailingEllipsis = shouldShowTrailingEllipsis(pages, currentTotalPages);
  const showLast = shouldShowLastPage(pages, currentTotalPages);

  return (
    <div
      className={cn('nop-pagination', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="pagination-root"
      data-current-page={currentPage}
      data-page-size={pageSize}
      data-total={total}
      data-total-pages={currentTotalPages}
    >
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              data-testid="pagination-prev"
              aria-disabled={!canGoPrev}
              data-disabled={!canGoPrev || undefined}
              onClick={(event) => {
                event.preventDefault();
                if (canGoPrev) {
                  handlePageChange(currentPage - 1);
                }
              }}
            />
          </PaginationItem>

          {showFirst ? (
            <>
              <PaginationItem>
                <PaginationLink
                  data-page={1}
                  isActive={currentPage === 1}
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(1);
                  }}
                >
                  {1}
                </PaginationLink>
              </PaginationItem>
              {showLeadingEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
            </>
          ) : null}

          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                data-page={page}
                isActive={page === currentPage}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  handlePageChange(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {showLast ? (
            <>
              {showTrailingEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
              <PaginationItem>
                <PaginationLink
                  data-page={currentTotalPages}
                  isActive={currentPage === currentTotalPages}
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(currentTotalPages);
                  }}
                >
                  {currentTotalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          ) : null}

          <PaginationItem>
            <PaginationNext
              data-testid="pagination-next"
              aria-disabled={!canGoNext}
              data-disabled={!canGoNext || undefined}
              onClick={(event) => {
                event.preventDefault();
                if (canGoNext) {
                  handlePageChange(currentPage + 1);
                }
              }}
            />
          </PaginationItem>

          {mode === 'with-page-size' ? (
            <PaginationItem>
              <NativeSelect
                data-testid="pagination-page-size"
                value={String(pageSize)}
                onChange={(event) => {
                  const next = toNumber(event.target.value, pageSize);
                  handlePageSizeChange(next);
                }}
                aria-label={t('flux.pagination.rowsPerPage')}
                className="ml-2 h-8 w-[5rem] text-xs"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={String(opt)}>
                    {String(opt)}
                  </option>
                ))}
              </NativeSelect>
            </PaginationItem>
          ) : null}
        </PaginationContent>
      </Pagination>
    </div>
  );
}

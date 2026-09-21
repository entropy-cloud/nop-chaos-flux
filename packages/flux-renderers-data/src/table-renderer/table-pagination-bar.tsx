import {
  NativeSelect,
  NativeSelectOption,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import {
  buildPageWindow,
  shouldShowFirstPage,
  shouldShowLastPage,
  shouldShowLeadingEllipsis,
  shouldShowTrailingEllipsis,
} from '../pagination-window.js';

interface TablePaginationBarProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number, uiEvent?: unknown) => void;
  onPageSizeChange: (pageSize: number, uiEvent?: unknown) => void;
}

export function TablePaginationBar({
  currentPage,
  pageSize,
  totalPages,
  totalRows,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: TablePaginationBarProps) {
  // [G3-视角10-01] same window algorithm as the standalone pagination renderer.
  const pages = buildPageWindow(currentPage, totalPages);
  const showFirst = shouldShowFirstPage(pages);
  const showLeadingEllipsis = shouldShowLeadingEllipsis(pages);
  const showTrailingEllipsis = shouldShowTrailingEllipsis(pages, totalPages);
  const showLast = shouldShowLastPage(pages, totalPages);
  const pageSizeLabelId = 'table-pagination-page-size-label';

  return (
    <div
      data-slot="table-pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span id={pageSizeLabelId} className="text-sm text-muted-foreground">
          {t('flux.pagination.rowsPerPage')}
        </span>
        <NativeSelect
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value), event)}
          size="sm"
          className="min-w-16"
          aria-labelledby={pageSizeLabelId}
        >
          {pageSizeOptions?.map((size) => (
            <NativeSelectOption key={size} value={String(size)}>
              {size}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <Pagination>
        <PaginationContent>
          {/* [G3-视角10-01] disabled state rides aria-disabled — consumed by the
              ui pagination primitive (aria-disabled:opacity-50 +
              pointer-events-none); no per-call-site class duplication. */}
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={currentPage <= 1}
              onClick={(event) => {
                event.preventDefault();
                if (currentPage > 1) {
                  onPageChange(currentPage - 1, event);
                }
              }}
            />
          </PaginationItem>

          {showFirst && (
            <>
              <PaginationItem>
                <PaginationLink
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(1, event);
                  }}
                  isActive={currentPage === 1}
                  className="cursor-pointer"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {showLeadingEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(page, event);
                }}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {showLast && (
            <>
              {showTrailingEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(totalPages, event);
                  }}
                  isActive={currentPage === totalPages}
                  className="cursor-pointer"
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              aria-disabled={currentPage >= totalPages}
              onClick={(event) => {
                event.preventDefault();
                if (currentPage < totalPages) {
                  onPageChange(currentPage + 1, event);
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {t('flux.pagination.range', {
          from: (currentPage - 1) * pageSize + 1,
          to: Math.min(currentPage * pageSize, totalRows),
          total: totalRows,
        })}
      </div>
    </div>
  );
}

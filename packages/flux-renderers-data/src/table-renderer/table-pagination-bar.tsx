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

export function computeWindowRange(currentPage: number, totalPages: number): [number, number] {
  if (totalPages <= 7) return [1, totalPages];

  let start = currentPage - 1;
  let end = currentPage + 1;

  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > totalPages) {
    start -= end - totalPages;
    end = totalPages;
  }

  return [Math.max(1, start), Math.min(totalPages, end)];
}

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
  const [winStart, winEnd] = computeWindowRange(currentPage, totalPages);
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
          <PaginationItem>
            <PaginationPrevious
              onClick={(event) => currentPage > 1 && onPageChange(currentPage - 1, event)}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {winStart > 1 && (
            <>
              <PaginationItem>
                <PaginationLink
                  onClick={(event) => onPageChange(1, event)}
                  isActive={currentPage === 1}
                  className="cursor-pointer"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {winStart > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={(event) => onPageChange(page, event)}
                isActive={page === currentPage}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {winEnd < totalPages && (
            <>
              {winEnd < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  onClick={(event) => onPageChange(totalPages, event)}
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
              onClick={(event) => currentPage < totalPages && onPageChange(currentPage + 1, event)}
              aria-disabled={currentPage === totalPages}
              className={
                currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalRows)} of ${totalRows}`}
      </div>
    </div>
  );
}

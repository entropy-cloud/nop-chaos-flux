import { Fragment } from 'react';
import { NativeSelect, NativeSelectOption, Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

export function computePaginationPages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

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
  start = Math.max(1, start);
  end = Math.min(totalPages, end);

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = start; i <= end; i++) {
    pages.add(i);
  }

  return [...pages].sort((a, b) => a - b);
}

interface TablePaginationBarProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function TablePaginationBar({
  currentPage,
  pageSize,
  totalPages,
  totalRows,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange
}: TablePaginationBarProps) {
  const pages = computePaginationPages(currentPage, totalPages);

  return (
    <div data-slot="table-pagination" className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('flux.pagination.rowsPerPage')}</span>
        <NativeSelect
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          size="sm"
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
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {pages.map((page, index) => {
            const prevPage = index > 0 ? pages[index - 1] : page;
            const needsEllipsis = index > 0 && page - prevPage > 1;

            return (
              <Fragment key={page}>
                {needsEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              </Fragment>
            );
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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

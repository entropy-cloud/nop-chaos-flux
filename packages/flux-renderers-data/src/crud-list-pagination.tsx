import { t } from '@nop-chaos/flux-i18n';
import { PaginationFirst, PaginationLast, PaginationNext, PaginationPrevious } from '@nop-chaos/ui';
import type { CrudPaginationState } from './crud-renderer-state.js';

export function CrudListPagination({
  paginationState,
  listTotalPages,
  listAtLastPage,
  onPageChange,
}: {
  paginationState: CrudPaginationState;
  listTotalPages: number;
  listAtLastPage: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div
      className="nop-crud-list-pagination mt-3 flex flex-wrap items-center justify-end gap-2"
      data-slot="crud-list-pagination"
    >
      <PaginationFirst
        onClick={() => onPageChange(1)}
        className={paginationState.currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
        aria-disabled={paginationState.currentPage <= 1 || undefined}
      />
      <PaginationPrevious
        onClick={() => onPageChange(Math.max(1, paginationState.currentPage - 1))}
        className={paginationState.currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
        aria-disabled={paginationState.currentPage <= 1 || undefined}
      />
      <span className="text-sm text-muted-foreground">
        {t('flux.pagination.page', {
          current: paginationState.currentPage,
          total: listTotalPages,
        })}
      </span>
      <PaginationNext
        onClick={() => onPageChange(paginationState.currentPage + 1)}
        className={listAtLastPage ? 'pointer-events-none opacity-50' : undefined}
        aria-disabled={listAtLastPage || undefined}
      />
      <PaginationLast
        onClick={() => onPageChange(listTotalPages)}
        className={listAtLastPage ? 'pointer-events-none opacity-50' : undefined}
        aria-disabled={listAtLastPage || undefined}
      />
    </div>
  );
}

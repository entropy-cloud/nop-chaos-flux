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
      className="nop-crud-list-pagination mt-[var(--space-block-gap)] flex flex-wrap items-center justify-end gap-2"
      data-slot="crud-list-pagination"
    >
      {/* [G3-视角10-01] disabled state rides aria-disabled, consumed by the ui
          pagination primitive — no per-call-site opacity/pointer class copies. */}
      <PaginationFirst
        onClick={() => onPageChange(1)}
        aria-disabled={paginationState.currentPage <= 1 || undefined}
      />
      <PaginationPrevious
        onClick={() => onPageChange(Math.max(1, paginationState.currentPage - 1))}
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
        aria-disabled={listAtLastPage || undefined}
      />
      <PaginationLast
        onClick={() => onPageChange(listTotalPages)}
        aria-disabled={listAtLastPage || undefined}
      />
    </div>
  );
}

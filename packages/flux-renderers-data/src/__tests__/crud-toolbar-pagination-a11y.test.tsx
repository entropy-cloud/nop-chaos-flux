import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrudToolbarBlocks } from '../crud-renderer-toolbar.js';
import type { CrudPaginationState } from '../crud-renderer-state.js';
import type { CrudStatusSummary } from '../crud-schema.js';

afterEach(cleanup);

function makeSummary(total?: number): CrudStatusSummary {
  return {
    loading: false,
    refreshing: false,
    itemCount: total ?? 0,
    total,
    hasSelection: false,
    selectionCount: 0,
    selectedRowKeys: [],
  } as CrudStatusSummary;
}

function renderPagination(currentPage: number, total: number, onPageChange = vi.fn()) {
  const pagination: CrudPaginationState = { currentPage, pageSize: 10 };
  const { container } = render(
    <CrudToolbarBlocks
      slot="header"
      blocks={[{ type: 'pagination' }]}
      summary={makeSummary(total)}
      listActionsContent={null}
      hasListActions={false}
      pagination={pagination}
      onPageChange={onPageChange}
      onPageSizeChange={() => {}}
    />,
  );
  return {
    container,
    previous: Array.from(container.querySelectorAll('[data-slot="pagination-link"]'))[0] as HTMLElement,
    next: Array.from(container.querySelectorAll('[data-slot="pagination-link"]'))[1] as HTMLElement,
  };
}

describe('20-10 crud toolbar PaginationPrevious aria-disabled (WCAG 4.1.2)', () => {
  it('marks PaginationPrevious as aria-disabled on the first page (symmetric with Next)', () => {
    const { previous, next } = renderPagination(1, 100);
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    expect(next.hasAttribute('aria-disabled')).toBe(false);
  });

  it('removes aria-disabled from PaginationPrevious on a later page', () => {
    const { previous } = renderPagination(3, 100);
    expect(previous.hasAttribute('aria-disabled')).toBe(false);
  });

  it('does not invoke onPageChange when activating Previous on the first page', () => {
    const onPageChange = vi.fn();
    const { previous } = renderPagination(1, 100, onPageChange);
    fireEvent.click(previous);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

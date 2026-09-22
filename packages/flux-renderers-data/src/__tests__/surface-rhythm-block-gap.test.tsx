import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TablePaginationBar } from '../table-renderer/table-pagination-bar.js';
import { CrudListPagination } from '../crud-list-pagination.js';
import { PaginationRenderer } from '../pagination-renderer.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { PaginationSchema } from '../schemas.js';

// plan 490 Phase 3: all three pagination bars plus the table footer slot share
// one vertical rhythm token — `margin-block-start: var(--space-block-gap)`.
// The real-computed-style proof lives in the e2e surface-rhythm spec; this
// suite pins the class contract at the unit level.

const BLOCK_GAP_CLASS = 'mt-[var(--space-block-gap)]';

afterEach(() => {
  cleanup();
});

describe('surface rhythm — shared pagination block-gap contract (plan 490)', () => {
  it('TablePaginationBar root carries the block-gap top margin', () => {
    const { container } = render(
      <TablePaginationBar
        currentPage={1}
        pageSize={10}
        totalPages={3}
        totalRows={30}
        pageSizeOptions={[10]}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    const bar = container.querySelector('[data-slot="table-pagination"]');
    expect(bar?.className).toContain(BLOCK_GAP_CLASS);
    expect(bar?.className).not.toContain('mt-3');
  });

  it('CrudListPagination rides the token instead of a bare mt-3', () => {
    const { container } = render(
      <CrudListPagination
        paginationState={{ currentPage: 1, pageSize: 10 }}
        listTotalPages={3}
        listAtLastPage={false}
        onPageChange={() => {}}
      />,
    );
    const bar = container.querySelector('[data-slot="crud-list-pagination"]');
    expect(bar?.className).toContain(BLOCK_GAP_CLASS);
    expect(bar?.className).not.toMatch(/\bmt-3\b/);
  });

  it('standalone pagination renderer root carries the block-gap top margin', () => {
    const scope = { id: 'test-scope' } as never;
    const props = {
      props: {
        total: 25,
        pageSize: 10,
      },
      meta: {},
      events: {},
      helpers: {},
      regions: {},
      node: { scope },
    } as unknown as RendererComponentProps<PaginationSchema>;
    const { container } = render(<PaginationRenderer {...props} />);
    const root = container.querySelector('[data-slot="pagination-root"]');
    expect(root?.className).toContain(BLOCK_GAP_CLASS);
  });
});

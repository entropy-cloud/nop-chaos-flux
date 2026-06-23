// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function paginationRoot() {
  return document.querySelector('.nop-pagination') as HTMLElement;
}

describe('PaginationRenderer (W2a — standalone pagination interaction owner)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the nop-pagination marker and clamps currentPage into [1, totalPages]', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-clamp"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              testid: 'demo-pagination',
              currentPage: 99,
              pageSize: 10,
              total: 25,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = paginationRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('pagination-root');
    // total=25, pageSize=10 → totalPages=3; currentPage=99 → clamped to 3.
    expect(root.getAttribute('data-total-pages')).toBe('3');
    expect(root.getAttribute('data-current-page')).toBe('3');
    expect(root.getAttribute('data-page-size')).toBe('10');
    expect(root.getAttribute('data-total')).toBe('25');
  });

  it('clamps currentPage below 1 to 1', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-clamp-low"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              currentPage: -5,
              pageSize: 10,
              total: 25,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(paginationRoot().getAttribute('data-current-page')).toBe('1');
  });

  it('fires onChange with the normalized current page when a page link is clicked', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-onchange"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              testid: 'demo-pagination',
              currentPage: 1,
              pageSize: 10,
              total: 25,
              onChange: {
                action: 'setValue',
                args: { path: 'changeReported', value: true },
              },
            },
            {
              type: 'text',
              text: 'change:${changeReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Click page 2
    const page2 = screen.getByText('2');
    fireEvent.click(page2);
    expect(paginationRoot().getAttribute('data-current-page')).toBe('2');
    expect(paginationRoot().getAttribute('data-page-size')).toBe('10');
    expect(screen.getByText('change:reported')).toBeTruthy();
  });

  it('enables prev/next navigation within bounds and disables at edges', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-edges"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              currentPage: 1,
              pageSize: 10,
              total: 25,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const prev = screen.getByTestId('pagination-prev');
    const next = screen.getByTestId('pagination-next');
    // At page 1: prev disabled, next enabled.
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(next.getAttribute('aria-disabled')).toBe('false');

    fireEvent.click(next);
    expect(paginationRoot().getAttribute('data-current-page')).toBe('2');

    // Go to last page.
    fireEvent.click(screen.getByText('3'));
    expect(paginationRoot().getAttribute('data-current-page')).toBe('3');
    expect(screen.getByTestId('pagination-next').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('pagination-prev').getAttribute('aria-disabled')).toBe('false');
  });

  it('resets currentPage to 1 and dispatches onPageSizeChange when page size changes (mode with-page-size)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-size-change"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              testid: 'demo-pagination',
              currentPage: 3,
              pageSize: 10,
              total: 100,
              mode: 'with-page-size',
              pageSizeOptions: [10, 20, 50, 100],
              onPageSizeChange: {
                action: 'setValue',
                args: { path: 'sizeReported', value: true },
              },
            },
            {
              type: 'text',
              text: 'size:${sizeReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Start at page 3 (last page of 10 per page, total=100).
    expect(paginationRoot().getAttribute('data-current-page')).toBe('3');

    // Change page size to 20 → totalPages=5, currentPage reset to 1.
    const select = screen.getByTestId('pagination-page-size') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '20' } });

    expect(paginationRoot().getAttribute('data-page-size')).toBe('20');
    expect(paginationRoot().getAttribute('data-current-page')).toBe('1');
    expect(paginationRoot().getAttribute('data-total-pages')).toBe('5');
    expect(screen.getByText('size:reported')).toBeTruthy();
  });

  it('does not render the page-size selector when mode is simple (default)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-simple"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              currentPage: 1,
              pageSize: 10,
              total: 25,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('pagination-page-size')).toBeNull();
  });

  it('shows ellipsis when total pages exceed the window', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/pagination-ellipsis"
        schema={{
          type: 'page',
          body: [
            {
              type: 'pagination',
              currentPage: 5,
              pageSize: 10,
              total: 200,
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // total=200, pageSize=10 → totalPages=20; current=5 should produce leading+trailing ellipsis.
    expect(paginationRoot().getAttribute('data-total-pages')).toBe('20');
    expect(paginationRoot().getAttribute('data-current-page')).toBe('5');
    const ellipses = document.querySelectorAll('[data-slot="pagination-ellipsis"]');
    expect(ellipses.length).toBeGreaterThan(0);
  });
});

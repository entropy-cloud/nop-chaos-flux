import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function nextPageButton(): HTMLElement {
  return document.querySelector(
    '.nop-table [data-slot="table-pagination"] [aria-label="Next page"]',
  ) as HTMLElement;
}

function activePageLabel(): string | null {
  const active = document.querySelector(
    '.nop-table [data-slot="table-pagination"] [aria-current="page"]',
  );
  return active ? active.textContent : null;
}

const ROWS_11 = Array.from({ length: 11 }, (_, index) => ({
  id: index + 1,
  name: `item-${index + 1}`,
}));
const ROWS_5 = ROWS_11.slice(0, 5);

describe('table pagination render-time clamp (B3.1 / T5)', () => {
  afterEach(() => {
    cleanup();
  });

  it('clamps currentPage to the last non-empty page when client-side source shrinks (T5-data-shrink)', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-clamp-shrink"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: '${rows}',
              rowKey: 'id',
              pagination: { currentPage: 1, pageSize: 10 },
            },
            {
              type: 'button',
              label: 'Shrink to 5 rows',
              onClick: { action: 'setValue', args: { path: 'rows', value: ROWS_5 } },
            },
          ],
        }}
        data={{ rows: ROWS_11 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('item-1')).toBeTruthy());

    fireEvent.click(nextPageButton());
    await waitFor(() => expect(screen.getByText('item-11')).toBeTruthy());

    fireEvent.click(screen.getByText('Shrink to 5 rows'));

    await waitFor(() => {
      expect(screen.getByText('item-1')).toBeTruthy();
      expect(screen.queryByText('item-11')).toBeNull();
    });
    expect(screen.queryByText('item-6')).toBeNull();
    expect(activePageLabel()).toBe('1');
  });

  it('keeps currentPage on the current page when source shrinks but the page is still in range', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-clamp-in-range"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: '${rows}',
              rowKey: 'id',
              pagination: { currentPage: 1, pageSize: 5 },
            },
            {
              type: 'button',
              label: 'Trim to 8 rows',
              onClick: { action: 'setValue', args: { path: 'rows', value: ROWS_11.slice(0, 8) } },
            },
          ],
        }}
        data={{ rows: ROWS_11 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('item-1')).toBeTruthy());
    fireEvent.click(nextPageButton());
    await waitFor(() => expect(screen.getByText('item-6')).toBeTruthy());

    fireEvent.click(screen.getByText('Trim to 8 rows'));

    await waitFor(() => {
      expect(screen.getByText('item-6')).toBeTruthy();
      expect(screen.queryByText('item-1')).toBeNull();
    });
    expect(activePageLabel()).toBe('2');
  });

  it('does not get stuck on an empty page when source becomes empty (totalPages clamps to 1)', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-clamp-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: '${rows}',
              rowKey: 'id',
              pagination: { currentPage: 1, pageSize: 10 },
            },
            {
              type: 'button',
              label: 'Clear rows',
              onClick: { action: 'setValue', args: { path: 'rows', value: [] } },
            },
          ],
        }}
        data={{ rows: ROWS_11 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(nextPageButton());
    await waitFor(() => expect(screen.getByText('item-11')).toBeTruthy());

    fireEvent.click(screen.getByText('Clear rows'));

    await waitFor(() => {
      expect(screen.queryByText('item-11')).toBeNull();
      expect(screen.queryByText('item-1')).toBeNull();
    });
  });

  it('clamps display through the CRUD -> table path when the source shrinks (T5-server-shrink)', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-clamp-shrink"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              source: '${rows}',
              rowKey: 'id',
              paginationOwnership: 'scope',
              paginationStatePath: 'crudState.pagination',
              columns: [{ name: 'name', label: 'Name' }],
            },
            {
              type: 'button',
              label: 'Shrink to 5 rows',
              onClick: { action: 'setValue', args: { path: 'rows', value: ROWS_5 } },
            },
          ],
        }}
        data={{
          rows: ROWS_11,
          crudState: { pagination: { currentPage: 2, pageSize: 10 } },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('item-11')).toBeTruthy());

    fireEvent.click(screen.getByText('Shrink to 5 rows'));

    await waitFor(() => {
      expect(screen.getByText('item-1')).toBeTruthy();
      expect(screen.queryByText('item-11')).toBeNull();
    });
  });
});

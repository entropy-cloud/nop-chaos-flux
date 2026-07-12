import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('dataRendererDefinitions table pagination and selection', () => {
  it('uses local pagination state by default', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Carol' },
              ],
              pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    fireEvent.click(
      document.querySelector('[data-slot="table-pagination"] [aria-label="Next page"]')!,
    );
    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
  });

  it('uses controlled pagination when configured and waits for external prop updates', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    const controlledSchema = {
      type: 'page',
      body: [
        {
          type: 'table',
          paginationOwnership: 'controlled',
          onPageChange: { action: 'setValue', args: { path: 'pageState', value: '${page}' } },
          columns: [{ label: 'Name', name: 'name' }],
          source: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Carol' },
          ],
          pagination: { currentPage: '${pageState || 1}', pageSize: 1, pageSizeOptions: [1] },
        },
      ],
    } as const;
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://data/table-controlled-pagination"
        schema={controlledSchema}
        data={{ pageState: 1 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(
      document.querySelector('[data-slot="table-pagination"] [aria-label="Next page"]')!,
    );
    rerender(
      <SchemaRenderer
        schemaUrl="test://data/table-controlled-pagination"
        schema={controlledSchema}
        data={{ pageState: 2 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
  });

  it('uses scope-backed pagination when configured and updates through scope state', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              paginationOwnership: 'scope',
              paginationStatePath: 'tableState.pagination',
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Carol' },
              ],
              pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] },
            },
            { type: 'text', text: 'Page state: ${tableState.pagination.currentPage}' },
          ],
        }}
        data={{ tableState: { pagination: { currentPage: 1, pageSize: 1 } } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(
      document.querySelector('[data-slot="table-pagination"] [aria-label="Next page"]')!,
    );
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy();
      expect(screen.getByText('Page state: 2')).toBeTruthy();
    });
  });

  it('uses local row selection state by default', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              rowSelection: { type: 'checkbox', selectedRowKeys: [] },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1]!);
    await waitFor(() => expect(checkboxes[1]?.getAttribute('aria-checked')).toBe('true'));
  });

  it('uses controlled row selection and waits for external prop updates', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    const controlledSchema = {
      type: 'page',
      body: [
        {
          type: 'table',
          selectionOwnership: 'controlled',
          rowSelection: { type: 'checkbox', selectedRowKeys: '${selectedKeys || []}' },
          columns: [{ label: 'Name', name: 'name' }],
          source: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        },
      ],
    } as const;
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://data/table-controlled-selection"
        schema={controlledSchema}
        data={{ selectedKeys: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const initialCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(initialCheckboxes[1]!);
    rerender(
      <SchemaRenderer
        schemaUrl="test://data/table-controlled-selection"
        schema={controlledSchema}
        data={{ selectedKeys: ['1'] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      const updatedCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(updatedCheckboxes[1]?.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('uses scope-backed row selection when configured and updates through scope state', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              selectionOwnership: 'scope',
              selectionStatePath: 'tableState.selectedKeys',
              rowSelection: { type: 'checkbox', selectedRowKeys: [] },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            },
            { type: 'text', text: 'Selected state: ${tableState.selectedKeys}' },
          ],
        }}
        data={{ tableState: { selectedKeys: [] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1]!);
    await waitFor(() => {
      const updatedCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(updatedCheckboxes[1]?.getAttribute('aria-checked')).toBe('true');
      expect(screen.getByText('Selected state: 1')).toBeTruthy();
    });
  });

  it('exposes table selection through component handle actions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              id: 'users-table',
              rowSelection: { type: 'checkbox', selectedRowKeys: [] },
              columns: [{ label: 'Name', name: 'name' }],
              source: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            },
            {
              type: 'button',
              label: 'Select Alice',
              onClick: {
                action: 'component:setSelection',
                componentId: 'users-table',
                args: { selectedRowKeys: ['1'] },
              },
            },
            {
              type: 'button',
              label: 'Read Selection',
              onClick: {
                action: 'component:getSelection',
                componentId: 'users-table',
                then: {
                  action: 'setValue',
                  args: { path: 'selectionResult', value: '${result.data}' },
                },
              },
            },
            { type: 'text', text: '${selectionResult}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Select Alice'));
    await waitFor(() => {
      const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(checkboxes[1]?.getAttribute('aria-checked')).toBe('true');
    });
    fireEvent.click(screen.getByText('Read Selection'));
    await waitFor(() => expect(screen.getByText('1')).toBeTruthy());
  });

  it('exposes table refresh through component handle actions', async () => {
    cleanup();
    let responseCount = 0;
    const fetcherSpy = vi.fn(async () => {
      responseCount += 1;
      return { ok: true, status: 200, data: { value: `refreshed-${responseCount}` } };
    });
    const fetcher = (async () => fetcherSpy()) as typeof env.fetcher;
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-refresh"
        schema={{
          type: 'page',
          body: [
            {
              type: 'data-source',
              id: 'table-source',
              action: 'ajax',
              args: { url: '/api/table-refresh', cacheTTL: 0 },
              name: 'tableData',
            },
            {
              type: 'table',
              id: 'refreshable-table',
              source: '${tableData ? [tableData] : []}',
              onRefresh: { action: 'refreshSource', targetId: 'tableData' },
              columns: [{ label: 'Value', name: 'value' }],
            },
            {
              type: 'button',
              label: 'Refresh Table',
              onClick: { action: 'component:refresh', componentId: 'refreshable-table' },
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(fetcherSpy).toHaveBeenCalled());
    const initialCalls = fetcherSpy.mock.calls.length;
    fireEvent.click(screen.getByText('Refresh Table'));
    await waitFor(() => {
      expect(fetcherSpy.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(screen.getByText(`refreshed-${fetcherSpy.mock.calls.length}`)).toBeTruthy();
    });
  });
});

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('dataRendererDefinitions table columns', () => {
  it('renders left fixed columns as sticky cells', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-fixed-left"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                { label: 'Name', name: 'name', fixed: 'left', width: 120 },
                { label: 'Email', name: 'email', width: 180 },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const fixedHeader = await screen.findByText('Name');
    const fixedCell = screen
      .getByText('Alice')
      .closest('[data-slot="table-cell"]') as HTMLElement | null;
    expect(
      (fixedHeader.closest('[data-slot="table-head"]') as HTMLElement | null)?.dataset.fixed,
    ).toBe('left');
    expect(fixedCell?.dataset.fixed).toBe('left');
    expect(fixedCell?.style.position).toBe('sticky');
    expect(fixedCell?.style.left).toBe('0px');
  });

  it('keeps operation columns fixed on the right when configured', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-fixed-operation"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                { label: 'Name', name: 'name', fixed: 'left', width: 120 },
                {
                  type: 'operation',
                  label: 'Actions',
                  fixed: 'right',
                  width: 160,
                  buttons: [{ type: 'button', label: 'Inspect' }],
                },
              ],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const operationHeader = await screen.findByText('Actions');
    const operationCell = screen
      .getByText('Inspect')
      .closest('[data-slot="table-cell"]') as HTMLElement | null;
    expect(
      (operationHeader.closest('[data-slot="table-head"]') as HTMLElement | null)?.dataset.fixed,
    ).toBe('right');
    expect(operationCell?.dataset.fixed).toBe('right');
    expect(operationCell?.style.position).toBe('sticky');
    expect(operationCell?.style.right).toBe('0px');
  });

  it('filters rows through header search input for searchable columns', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-header-search"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Name', name: 'name', searchable: true }],
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
    fireEvent.click(screen.getByRole('button', { name: t('flux.table.filter') }));
    const input = document.querySelector(
      '[data-slot="dropdown-menu-content"] input',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: 'Ali' } });
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });
  });

  it('clears combined header search and filter state from the column menu', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-header-filter-clear"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [
                {
                  label: 'Name',
                  name: 'name',
                  searchable: true,
                  filterable: {
                    options: [
                      { label: 'Alice', value: 'Alice' },
                      { label: 'Bob', value: 'Bob' },
                    ],
                  },
                },
              ],
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

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.filter') }));
    const popup = document.querySelector(
      '[data-slot="dropdown-menu-content"]',
    ) as HTMLElement | null;
    expect(popup).toBeTruthy();
    fireEvent.change(within(popup!).getByRole('textbox'), { target: { value: 'Ali' } });
    fireEvent.click(within(popup!).getByRole('menuitemcheckbox', { name: 'Alice' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: t('flux.table.filterActive') })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Alice' })).toBeTruthy();
      expect(screen.queryByRole('cell', { name: 'Bob' })).toBeNull();
    });

    const activePopup = document.querySelector(
      '[data-slot="dropdown-menu-content"]',
    ) as HTMLElement | null;
    expect(activePopup).toBeTruthy();
    fireEvent.click(
      within(activePopup!).getByRole('button', { name: t('flux.table.clearFilters') }),
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: t('flux.table.filter') })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Alice' })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Bob' })).toBeTruthy();
    });
  });

  it('toggles visible columns through column settings menu', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-column-settings"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columnSettings: { enabled: true },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Email' }));
    await waitFor(() => {
      expect(screen.queryByText('alice@example.com')).toBeNull();
      expect(screen.getByText('Alice')).toBeTruthy();
    });
  });

  it('uses scope-backed ordered columns state for header and body order', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-column-settings-order-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columnSettings: {
                enabled: true,
                orderedColumnsStatePath: 'tableState.orderedColumns',
              },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
                { label: 'Role', name: 'role' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' }],
            },
            { type: 'text', text: 'Order state: ${tableState.orderedColumns}' },
          ],
        }}
        data={{ tableState: { orderedColumns: ['role', 'name', 'email'] } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(headers).toEqual(['Role', 'Name', 'Email']);

      const cells = Array.from(
        document.querySelectorAll('[data-slot="table-row"] [data-slot="table-cell"]'),
      ).map((node) => node.textContent?.trim());
      expect(cells).toEqual(['Admin', 'Alice', 'alice@example.com']);
      expect(screen.getByText('Order state: role,name,email')).toBeTruthy();
    });
  });

  it('reorders columns through column settings move controls', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-column-settings-order-local"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columnSettings: { enabled: true },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
                { label: 'Role', name: 'role' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));
    fireEvent.click(screen.getByRole('menuitem', { name: `${t('flux.table.moveDown')} Name` }));

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(headers).toEqual(['Email', 'Name', 'Role']);

      const cells = Array.from(
        document.querySelectorAll('[data-slot="table-row"] [data-slot="table-cell"]'),
      ).map((node) => node.textContent?.trim());
      expect(cells).toEqual(['alice@example.com', 'Alice', 'Admin']);
    });
  });

  it('renders inline column settings when overlay is disabled', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-column-settings-inline"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columnSettings: { enabled: true, overlay: false, align: 'left' },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="table-column-settings-inline"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="table-column-settings"]')?.className).toContain(
        'items-start',
      );
    });

    const inlinePanel = document.querySelector(
      '[data-slot="table-column-settings-inline"]',
    ) as HTMLElement | null;
    expect(inlinePanel).toBeTruthy();
    fireEvent.click(within(inlinePanel!).getByRole('checkbox', { name: 'Email' }));

    await waitFor(() => {
      expect(screen.queryByText('alice@example.com')).toBeNull();
    });
  });

  it('moves secondary columns into an expanded row when responsive expand mode is active', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-responsive-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              responsive: { mode: 'expand', breakpoint: 1400, expandTrigger: 'row' },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
                { label: 'Role', name: 'role' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(headers).toEqual(['Name']);
      expect(screen.queryByText('alice@example.com')).toBeNull();
    });

    fireEvent.click(screen.getByText('Alice'));

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeTruthy();
      expect(screen.getByText('alice@example.com')).toBeTruthy();
      expect(screen.getByText('Role')).toBeTruthy();
      expect(screen.getByText('Admin')).toBeTruthy();
    });
  });
});

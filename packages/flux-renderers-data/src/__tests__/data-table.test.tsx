import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import {
  buttonRenderer,
  createDataSchemaRenderer,
  dispatchProbeRenderer,
  env,
  formulaCompiler,
  nodeInstanceProbeRenderer,
  registerProbeNamespace,
  rowScopeIdProbeRenderer,
} from '../test-support';

describe('dataRendererDefinitions table behavior', () => {
  it('renders row-scope actions that open dialogs with row data', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }], columns: [{ label: 'Name', name: 'name' }, { type: 'operation', label: 'Actions', buttons: [{ type: 'button', label: 'Inspect', onClick: { action: 'openDialog', args: { title: 'Record details', body: [{ type: 'text', text: 'User: ${$slot.record.name}' }] } } }] }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    const inspectButtons = screen.getAllByText('Inspect');
    fireEvent.click(inspectButtons[1]);
    expect(await screen.findByText('Record details')).toBeTruthy();
    expect(screen.getByText('User: Bob')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => expect(screen.queryByText('Record details')).toBeNull());
  });

  it('renders left fixed columns as sticky cells', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table-fixed-left" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Name', name: 'name', fixed: 'left', width: 120 }, { label: 'Email', name: 'email', width: 180 }], source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    const fixedHeader = await screen.findByText('Name');
    const fixedCell = screen.getByText('Alice').closest('[data-slot="table-cell"]') as HTMLElement | null;
    expect((fixedHeader.closest('[data-slot="table-head"]') as HTMLElement | null)?.dataset.fixed).toBe('left');
    expect(fixedCell?.dataset.fixed).toBe('left');
    expect(fixedCell?.style.position).toBe('sticky');
    expect(fixedCell?.style.left).toBe('0px');
  });

  it('keeps operation columns fixed on the right when configured', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(<SchemaRenderer schemaUrl="test://data/table-fixed-operation" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Name', name: 'name', fixed: 'left', width: 120 }, { type: 'operation', label: 'Actions', fixed: 'right', width: 160, buttons: [{ type: 'button', label: 'Inspect' }] }], source: [{ id: 1, name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    const operationHeader = await screen.findByText('Actions');
    const operationCell = screen.getByText('Inspect').closest('[data-slot="table-cell"]') as HTMLElement | null;
    expect((operationHeader.closest('[data-slot="table-head"]') as HTMLElement | null)?.dataset.fixed).toBe('right');
    expect(operationCell?.dataset.fixed).toBe('right');
    expect(operationCell?.style.position).toBe('sticky');
    expect(operationCell?.style.right).toBe('0px');
  });

  it('filters rows through header search input for searchable columns', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table-header-search" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Name', name: 'name', searchable: true }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    fireEvent.click(screen.getByRole('button', { name: t('flux.table.filter') }));
    const input = document.querySelector('[data-slot="dropdown-menu-content"] input') as HTMLInputElement | null;
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
    render(<SchemaRenderer schemaUrl="test://data/table-header-filter-clear" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Name', name: 'name', searchable: true, filterable: { options: [{ label: 'Alice', value: 'Alice' }, { label: 'Bob', value: 'Bob' }] } }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }] }} env={env} formulaCompiler={formulaCompiler} />);

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.filter') }));
    const popup = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement | null;
    expect(popup).toBeTruthy();
    fireEvent.change(within(popup!).getByRole('textbox'), { target: { value: 'Ali' } });
    fireEvent.click(within(popup!).getByRole('menuitemcheckbox', { name: 'Alice' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: t('flux.table.filterActive') })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Alice' })).toBeTruthy();
      expect(screen.queryByRole('cell', { name: 'Bob' })).toBeNull();
    });

    const activePopup = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement | null;
    expect(activePopup).toBeTruthy();
    fireEvent.click(within(activePopup!).getByRole('button', { name: t('flux.table.clearFilters') }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: t('flux.table.filter') })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Alice' })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Bob' })).toBeTruthy();
    });
  });

  it('toggles visible columns through column settings menu', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table-column-settings" schema={{ type: 'page', body: [{ type: 'table', columnSettings: { enabled: true }, columns: [{ label: 'Name', name: 'name' }, { label: 'Email', name: 'email' }], source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
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
    render(<SchemaRenderer schemaUrl="test://data/table-column-settings-order-scope" schema={{ type: 'page', body: [{ type: 'table', columnSettings: { enabled: true, orderedColumnsStatePath: 'tableState.orderedColumns' }, columns: [{ label: 'Name', name: 'name' }, { label: 'Email', name: 'email' }, { label: 'Role', name: 'role' }], source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' }] }, { type: 'text', text: 'Order state: ${tableState.orderedColumns}' }] }} data={{ tableState: { orderedColumns: ['role', 'name', 'email'] } }} env={env} formulaCompiler={formulaCompiler} />);

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
      expect(headers).toEqual(['Role', 'Name', 'Email']);

      const cells = Array.from(document.querySelectorAll('[data-slot="table-row"] [data-slot="table-cell"]')).map((node) => node.textContent?.trim());
      expect(cells).toEqual(['Admin', 'Alice', 'alice@example.com']);
      expect(screen.getByText('Order state: role,name,email')).toBeTruthy();
    });
  });

  it('reorders columns through column settings move controls', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table-column-settings-order-local" schema={{ type: 'page', body: [{ type: 'table', columnSettings: { enabled: true }, columns: [{ label: 'Name', name: 'name' }, { label: 'Email', name: 'email' }, { label: 'Role', name: 'role' }], source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' }] }] }} env={env} formulaCompiler={formulaCompiler} />);

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));
    fireEvent.click(screen.getByRole('menuitem', { name: `${t('flux.table.moveDown')} Name` }));

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
      expect(headers).toEqual(['Email', 'Name', 'Role']);

      const cells = Array.from(document.querySelectorAll('[data-slot="table-row"] [data-slot="table-cell"]')).map((node) => node.textContent?.trim());
      expect(cells).toEqual(['alice@example.com', 'Alice', 'Admin']);
    });
  });

  it('renders inline column settings when overlay is disabled', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table-column-settings-inline" schema={{ type: 'page', body: [{ type: 'table', columnSettings: { enabled: true, overlay: false, align: 'left' }, columns: [{ label: 'Name', name: 'name' }, { label: 'Email', name: 'email' }], source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }] }] }} env={env} formulaCompiler={formulaCompiler} />);

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="table-column-settings-inline"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="table-column-settings"]')?.className).toContain('items-start');
    });

    const inlinePanel = document.querySelector('[data-slot="table-column-settings-inline"]') as HTMLElement | null;
    expect(inlinePanel).toBeTruthy();
    fireEvent.click(within(inlinePanel!).getByRole('checkbox', { name: 'Email' }));

    await waitFor(() => {
      expect(screen.queryByText('alice@example.com')).toBeNull();
    });
  });

  it('moves secondary columns into an expanded row when responsive expand mode is active', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table-responsive-expand" schema={{ type: 'page', body: [{ type: 'table', responsive: { mode: 'expand', breakpoint: 1400, expandTrigger: 'row' }, columns: [{ label: 'Name', name: 'name' }, { label: 'Email', name: 'email' }, { label: 'Role', name: 'role' }], source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' }] }] }} env={env} formulaCompiler={formulaCompiler} />);

    await waitFor(() => {
      const headers = Array.from(document.querySelectorAll('[data-slot="table-head"]')).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
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

  it('dispatches row click events against the row scope', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }], onRowClick: { action: 'openDialog', args: { title: 'Row click', body: [{ type: 'text', text: 'Selected ${record.name}' }] } }, columns: [{ label: 'Name', name: 'name' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    fireEvent.click(screen.getByText('Bob'));
    expect(await screen.findByText('Row click')).toBeTruthy();
    expect(screen.getByText((content) => content.includes('Selected') && content.includes('Bob'))).toBeTruthy();
  });

  it('renders header, footer, and schema-based empty content through normalized regions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', header: [{ type: 'text', text: 'Table header' }], footer: [{ type: 'text', text: 'Table footer' }], empty: { type: 'text', text: 'No rows for ${team}' }, columns: [{ label: 'Name', name: 'name' }], source: [] }] }} data={{ team: 'Ops' }} env={env} formulaCompiler={formulaCompiler} />);
    expect(await screen.findByText('Table header')).toBeTruthy();
    expect(screen.getByText('Table footer')).toBeTruthy();
    expect(screen.getByText('No rows for Ops')).toBeTruthy();
    const tableRoot = document.querySelector('.nop-table');
    expect(tableRoot).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-header-region"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-container"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-header"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-empty-row"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-empty-cell"]')?.textContent).toContain('No rows for Ops');
    expect(tableRoot?.querySelector('[data-slot="table-footer"]')).toBeTruthy();
  });

  it('renders plain-value empty content through value-or-region fallback', () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', empty: 'Nothing here', columns: [{ label: 'Name', name: 'name' }], source: [] }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders schema-based column labels through compiled column regions', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: { type: 'text', text: 'Member ${team}' }, name: 'name' }], source: [{ id: 1, name: 'Alice' }] }] }} data={{ team: 'Roster' }} env={env} formulaCompiler={formulaCompiler} />);
    expect(await screen.findByText('Member Roster')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('uses local pagination state by default', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }], pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] } }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!);
    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
  });

  it('uses controlled pagination when configured and waits for external prop updates', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    const controlledSchema = { type: 'page', body: [{ type: 'table', paginationOwnership: 'controlled', onPageChange: { action: 'setValue', args: { path: 'pageState', value: '${page}' } }, columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }], pagination: { currentPage: '${pageState || 1}', pageSize: 1, pageSizeOptions: [1] } }] } as const;
    const { rerender } = render(<SchemaRenderer schemaUrl="test://data/table-controlled-pagination" schema={controlledSchema} data={{ pageState: 1 }} env={env} formulaCompiler={formulaCompiler} />);
    fireEvent.click(document.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!);
    rerender(<SchemaRenderer schemaUrl="test://data/table-controlled-pagination" schema={controlledSchema} data={{ pageState: 2 }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
  });

  it('uses scope-backed pagination when configured and updates through scope state', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', paginationOwnership: 'scope', paginationStatePath: 'tableState.pagination', columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }], pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] } }, { type: 'text', text: 'Page state: ${tableState.pagination.currentPage}' }] }} data={{ tableState: { pagination: { currentPage: 1, pageSize: 1 } } }} env={env} formulaCompiler={formulaCompiler} />);
    fireEvent.click(document.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!);
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy();
      expect(screen.getByText('Page state: 2')).toBeTruthy();
    });
  });

  it('uses local row selection state by default', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', rowSelection: { type: 'checkbox', selectedRowKeys: [] }, columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1]!);
    await waitFor(() => expect(checkboxes[1]?.getAttribute('aria-checked')).toBe('true'));
  });

  it('uses controlled row selection and waits for external prop updates', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    const controlledSchema = { type: 'page', body: [{ type: 'table', selectionOwnership: 'controlled', rowSelection: { type: 'checkbox', selectedRowKeys: '${selectedKeys || []}' }, columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }] } as const;
    const { rerender } = render(<SchemaRenderer schemaUrl="test://data/table-controlled-selection" schema={controlledSchema} data={{ selectedKeys: [] }} env={env} formulaCompiler={formulaCompiler} />);
    const initialCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(initialCheckboxes[1]!);
    rerender(<SchemaRenderer schemaUrl="test://data/table-controlled-selection" schema={controlledSchema} data={{ selectedKeys: ['1'] }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => {
      const updatedCheckboxes = document.querySelectorAll('[data-slot="checkbox"]');
      expect(updatedCheckboxes[1]?.getAttribute('aria-checked')).toBe('true');
    });
  });

  it('uses scope-backed row selection when configured and updates through scope state', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', selectionOwnership: 'scope', selectionStatePath: 'tableState.selectedKeys', rowSelection: { type: 'checkbox', selectedRowKeys: [] }, columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }, { type: 'text', text: 'Selected state: ${tableState.selectedKeys}' }] }} data={{ tableState: { selectedKeys: [] } }} env={env} formulaCompiler={formulaCompiler} />);
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
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', id: 'users-table', rowSelection: { type: 'checkbox', selectedRowKeys: [] }, columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] }, { type: 'button', label: 'Select Alice', onClick: { action: 'component:setSelection', componentId: 'users-table', args: { selectedRowKeys: ['1'] } } }, { type: 'button', label: 'Read Selection', onClick: { action: 'component:getSelection', componentId: 'users-table', then: { action: 'setValue', args: { path: 'selectionResult', value: '${result.data}' } } } }, { type: 'text', text: '${selectionResult}' }] }} env={env} formulaCompiler={formulaCompiler} />);
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
    render(<SchemaRenderer schemaUrl="test://data/table-refresh" schema={{ type: 'page', body: [{ type: 'data-source', id: 'table-source', action: 'ajax', args: { url: '/api/table-refresh', cacheTTL: 0 }, name: 'tableData' }, { type: 'table', id: 'refreshable-table', source: '${tableData ? [tableData] : []}', onRefresh: { action: 'refreshSource', targetId: 'table-source' }, columns: [{ label: 'Value', name: 'value' }] }, { type: 'button', label: 'Refresh Table', onClick: { action: 'component:refresh', componentId: 'refreshable-table' } }] }} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(fetcherSpy).toHaveBeenCalled());
    const initialCalls = fetcherSpy.mock.calls.length;
    fireEvent.click(screen.getByText('Refresh Table'));
    await waitFor(() => {
      expect(fetcherSpy.mock.calls.length).toBeGreaterThan(initialCalls);
      expect(screen.getByText(`refreshed-${fetcherSpy.mock.calls.length}`)).toBeTruthy();
    });
  });

  it('renders schema-based column cells through compiled cell regions with row scope', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Summary', name: 'name', cell: { type: 'text', text: 'Member ${$slot.record.name}' } }], source: [{ id: 1, name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect(await screen.findByText('Member Alice')).toBeTruthy();
  });

  it('keeps table root marker non-visual and merges schema className onto the root', () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', className: 'stack-sm border', columns: [{ label: 'Name', name: 'name' }], source: [] }] }} env={env} formulaCompiler={formulaCompiler} />);
    const tableRoot = document.querySelector('.nop-table') as HTMLElement | null;
    expect(tableRoot?.className).toContain('nop-table');
    expect(tableRoot?.className).toContain('stack-sm');
    expect(tableRoot?.className).toContain('border');
    expect(tableRoot?.className).not.toContain('grid');
    expect(tableRoot?.className).not.toContain('gap-4');
  });

  it('publishes table row and pagination structure through data-slot markers', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Name', name: 'name' }], source: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }], pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] } }] }} env={env} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    const tableRoot = document.querySelector('.nop-table');
    expect(tableRoot?.querySelector('[data-slot="table-row"]')).toBeTruthy();
    expect(tableRoot?.querySelector('[data-slot="table-pagination"]')).toBeTruthy();
  });

  it('propagates repeated table row instancePath into row child nodes', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    const onComponentRegistryChange = vi.fn((registry) => registry?.setDebugEnabled?.(true));
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', columns: [{ type: 'operation', buttons: [{ type: 'button', label: 'Row action' }] }], source: [{ id: 1, name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} onComponentRegistryChange={onComponentRegistryChange} />);
    const rowButton = await screen.findByText('Row action');
    const cid = Number(rowButton.getAttribute('data-cid'));
    const registry = onComponentRegistryChange.mock.calls[0]?.[0];
    await waitFor(() => {
      expect(registry?.getHandleDebugData?.(cid)?.nodeInstance).toMatchObject({ instancePath: [{ repeatedTemplateId: expect.stringMatching(/^table-row:/), instanceKey: '1' }] });
    });
  });

  it('passes row instancePath through helpers.dispatch action context', async () => {
    cleanup();
    const observedLocators: unknown[] = [];
    const SchemaRenderer = createDataSchemaRenderer([dispatchProbeRenderer]);
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', columns: [{ label: 'Dispatch', cell: { type: 'dispatch-probe' } }], source: [{ id: 1, name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} onActionScopeChange={registerProbeNamespace(observedLocators)} />);
    fireEvent.click(await screen.findByTestId('dispatch-probe'));
    await waitFor(() => {
      expect(observedLocators).toEqual([expect.objectContaining({ instancePath: [{ repeatedTemplateId: expect.stringMatching(/^table-row:/), instanceKey: '1' }] })]);
    });
  });

  it('uses schema rowKey as stable repeated identity instead of source index', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([nodeInstanceProbeRenderer]);
    render(<SchemaRenderer schemaUrl="test://data/table" schema={{ type: 'page', body: [{ type: 'table', rowKey: '__rowKey', columns: [{ label: 'Probe', cell: { type: 'node-instance-probe' } }], source: [{ id: 99, __rowKey: 'client-a', name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect((await screen.findByTestId('node-instance-probe')).textContent).toContain('client-a');
  });

  it('reuses one stable row scope per materialized row key', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([rowScopeIdProbeRenderer]);
    const { rerender } = render(<SchemaRenderer schemaUrl="test://data/table-row-scope" schema={{ type: 'page', body: [{ type: 'table', rowKey: 'id', columns: [{ label: 'Scope', cell: { type: 'row-scope-id-probe' } }], source: [{ id: 1, name: 'Alice' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    const initialScopeId = (await screen.findByTestId('row-scope-id-probe')).textContent;
    rerender(<SchemaRenderer schemaUrl="test://data/table-row-scope" schema={{ type: 'page', body: [{ type: 'table', rowKey: 'id', columns: [{ label: 'Scope', cell: { type: 'row-scope-id-probe' } }], source: [{ id: 1, name: 'Alice updated' }] }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect((await screen.findByTestId('row-scope-id-probe')).textContent).toBe(initialScopeId);
  });

  it('binds form controls in cells via $slot.record.fieldName path', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-form-controls"
        schema={{
          type: 'page',
          body: [{
            type: 'table',
            columns: [
              {
                label: 'Active',
                name: 'active',
                cell: {
                  type: 'switch',
                  name: '$slot.record.active'
                }
              },
              {
                label: 'Verified',
                name: 'verified',
                cell: {
                  type: 'checkbox',
                  name: '$slot.record.verified',
                  option: 'Verified'
                }
              },
              {
                label: 'Region',
                name: 'region',
                cell: {
                  type: 'select',
                  name: '$slot.record.region',
                  options: [
                    { label: 'APAC', value: 'apac' },
                    { label: 'EMEA', value: 'emea' }
                  ]
                }
              },
              {
                label: 'Score',
                name: 'scoreBand',
                cell: {
                  type: 'radio-group',
                  name: '$slot.record.scoreBand',
                  options: [
                    { label: 'Low', value: 'low' },
                    { label: 'High', value: 'high' }
                  ]
                }
              }
            ],
            source: [
              { id: 1, active: true, verified: false, region: 'apac', scoreBand: 'low' },
              { id: 2, active: false, verified: true, region: 'emea', scoreBand: 'high' }
            ]
          }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const switches = await screen.findAllByRole('switch');
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    expect(switches[1].getAttribute('aria-checked')).toBe('false');

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('true');

    const selects = screen.getAllByRole('combobox');
    expect(selects[0].textContent).toContain('APAC');
    expect(selects[1].textContent).toContain('EMEA');
  });

  it('does not bind form controls in cells via bare fieldName (isolated scope)', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-form-controls-bare"
        schema={{
          type: 'page',
          body: [{
            type: 'table',
            columns: [{
              label: 'Active',
              name: 'active',
              cell: {
                type: 'switch',
                name: 'active'
              }
            }],
            source: [
              { id: 1, active: true }
            ]
          }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    const sw = await screen.findByRole('switch');
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });
});

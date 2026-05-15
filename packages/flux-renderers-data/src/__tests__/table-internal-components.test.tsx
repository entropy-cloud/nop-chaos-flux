import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { TableBodyRows } from '../table-renderer/table-body-rows.js';
import { TableLoadingOverlay } from '../table-renderer/table-loading-overlay.js';
import { TablePaginationBar } from '../table-renderer/table-pagination-bar.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(cleanup);

function makeTableProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: { render: () => null },
    regions: {},
    events: {},
    node: { instancePath: [] },
    meta: {},
    ...overrides,
  } as any;
}

function makeRowScope(record: Record<string, unknown>, index: number) {
  return {
    id: `scope-${index}`,
    path: `$rows.${index}`,
    value: { record, index },
    get(path: string) {
      if (path === 'record') return record;
      if (path === 'index') return index;
      return undefined;
    },
    has: () => false,
    readOwn: () => ({ record, index }),
    readVisible: () => ({ record, index }),
    materializeVisible: () => ({ record, index }),
    update() {},
    merge() {},
  } as any;
}

describe('table internal components', () => {
  it('renders loading overlay with and without custom content', () => {
    const { rerender } = render(<TableLoadingOverlay loadingContent="Loading rows" />);
    expect(document.querySelector('[data-slot="table-loading-overlay"]')).toBeTruthy();
    expect(screen.getByText('Loading rows')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-loading-overlay"]')?.textContent).toContain(
      'Loading rows',
    );

    rerender(<TableLoadingOverlay loadingContent={null} />);
    expect(document.querySelector('[data-slot="table-loading-overlay"]')).toBeTruthy();
    expect(screen.queryByText('Loading rows')).toBeNull();
    expect(document.querySelector('[data-slot="table-loading-overlay"]')?.textContent).toContain(
      'Loading',
    );
  });

  it('renders simple pagination and triggers navigation handlers', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <TablePaginationBar
        currentPage={2}
        pageSize={10}
        totalPages={3}
        totalRows={25}
        pageSizeOptions={[10, 20]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(document.querySelector('[aria-label="Go to next page"]')!);
    fireEvent.click(document.querySelector('[aria-label="Go to previous page"]')!);
    fireEvent.change(document.querySelector('[data-slot="native-select"]')!, {
      target: { value: '20' },
    });

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    expect(screen.getByText('11-20 of 25')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Rows per page/i })).toBeTruthy();
  });

  it('renders long pagination with ellipsis and disabled edges', () => {
    const onPageChange = vi.fn();
    render(
      <TablePaginationBar
        currentPage={1}
        pageSize={10}
        totalPages={10}
        totalRows={100}
        onPageChange={onPageChange}
        onPageSizeChange={() => {}}
      />,
    );

    expect(document.querySelector('[aria-label="Go to previous page"]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Go to next page"]')).toBeTruthy();
  });

  it('renders empty non-virtual table body', () => {
    render(
      <table>
        <TableBodyRows
          props={makeTableProps()}
          columns={[]}
          responsiveHiddenColumns={[]}
          processedData={[]}
          rowScopeCache={new Map()}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set()}
          columnCount={2}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={<span>No data</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>,
    );

    expect(screen.getByText('No data')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-empty-row"]')).toBeTruthy();
  });

  it('renders non-virtual data rows, expand rows, and row-click expansion', () => {
    const onToggleExpand = vi.fn();
    const rowScopeCache = new Map<string, any>([['1', makeRowScope({ name: 'Alice' }, 0)]]);
    const processedData = [{ rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } }];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({ props: { expandable: {}, rowSelection: undefined }, events: {} })}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[{ label: 'Email', name: 'email' } as any]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set(['1'])}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={true}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={true}
          expandRowByClick={true}
          onToggleExpand={onToggleExpand}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>,
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-expanded-row"]')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Collapse'));
    expect(onToggleExpand).toHaveBeenCalledWith('1');
  });

  it('supports keyboard activation for interactive rows', () => {
    const onRowClick = vi.fn();
    const rowScopeCache = new Map<string, any>([['1', makeRowScope({ name: 'Alice' }, 0)]]);
    const processedData = [{ rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } }];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({ events: { onRowClick } })}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>,
    );

    const row = document.querySelector('[data-slot="table-row"]') as HTMLElement;
    expect(row.tabIndex).toBe(0);

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });

    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('publishes aria-expanded on rows when row-click expansion is enabled', () => {
    const rowScopeCache = new Map<string, any>([['1', makeRowScope({ name: 'Alice' }, 0)]]);
    const processedData = [{ rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } }];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({ events: {} })}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set(['1'])}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={false}
          expandRowByClick={true}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>,
    );

    expect(document.querySelector('[data-slot="table-row"]')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('renders data rows with checkbox selection cells and correct field values', () => {
    const onSelectRow = vi.fn();
    const rowScopeCache = new Map<string, any>([
      ['1', makeRowScope({ name: 'Alice', status: 'active' }, 0)],
      ['2', makeRowScope({ name: 'Bob', status: 'draft' }, 1)],
    ]);
    const processedData = [
      { rowKey: '1', sourceIndex: 0, record: { name: 'Alice', status: 'active' } },
      { rowKey: '2', sourceIndex: 1, record: { name: 'Bob', status: 'draft' } },
    ];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({
            props: { expandable: undefined, rowSelection: { type: 'checkbox' } },
            events: {},
          })}
          columns={[
            { label: 'Name', name: 'name' } as any,
            { label: 'Status', name: 'status' } as any,
          ]}
          responsiveHiddenColumns={[]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set(['2'])}
          columnCount={3}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={onSelectRow}
          virtualEnabled={false}
        />
      </table>,
    );

    const rows = document.querySelectorAll('[data-slot="table-row"]');
    expect(rows.length).toBe(2);

    const row1Cells = rows[0].querySelectorAll('td');
    expect(row1Cells.length).toBe(3);
    expect(row1Cells[0].getAttribute('data-slot')).toBe('table-select-cell');
    expect(row1Cells[1].textContent).toBe('Alice');
    expect(row1Cells[2].textContent).toBe('active');

    const row2Cells = rows[1].querySelectorAll('td');
    expect(row2Cells.length).toBe(3);
    expect(row2Cells[0].getAttribute('data-slot')).toBe('table-select-cell');
    expect(row2Cells[1].textContent).toBe('Bob');
    expect(row2Cells[2].textContent).toBe('draft');

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('true');

    fireEvent.click(checkboxes[0]);
    expect(onSelectRow).toHaveBeenCalledWith('1', true);
  });

  it('renders data rows with radio selection cells (circle shape)', () => {
    const onSelectRow = vi.fn();
    const rowScopeCache = new Map<string, any>([
      ['1', makeRowScope({ name: 'Alice' }, 0)],
      ['2', makeRowScope({ name: 'Bob' }, 1)],
    ]);
    const processedData = [
      { rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } },
      { rowKey: '2', sourceIndex: 1, record: { name: 'Bob' } },
    ];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({
            props: { expandable: undefined, rowSelection: { type: 'radio' } },
            events: {},
          })}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set(['1'])}
          columnCount={2}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={onSelectRow}
          virtualEnabled={false}
        />
      </table>,
    );

    expect(document.querySelector('[data-slot="table-row"]')).toBeTruthy();
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);

    const selectCells = document.querySelectorAll('[data-slot="table-select-cell"]');
    expect(selectCells.length).toBe(2);

    const radios = document.querySelectorAll('[data-slot="checkbox"][data-shape="circle"]');
    expect(radios.length).toBe(2);

    fireEvent.click(radios[1]);
    expect(onSelectRow).toHaveBeenCalledWith('2', true);
  });

  it('renders data rows without selection cells when rowSelection is not set', () => {
    const rowScopeCache = new Map<string, any>([
      ['1', makeRowScope({ name: 'Alice' }, 0)],
    ]);
    const processedData = [
      { rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } },
    ];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({ props: { expandable: undefined }, events: {} })}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>,
    );

    expect(document.querySelector('[data-slot="table-row"]')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-select-cell"]')).toBeNull();
  });

  it('renders duplicate rowKey entries through distinct cacheKey row identities', () => {
    const rowScopeCache = new Map<string, any>([
      ['dup', makeRowScope({ name: 'Alice' }, 0)],
      ['dup::dup:1', makeRowScope({ name: 'Bob' }, 1)],
    ]);
    const processedData = [
      { rowKey: 'dup', cacheKey: 'dup', sourceIndex: 0, record: { name: 'Alice' } },
      { rowKey: 'dup', cacheKey: 'dup::dup:1', sourceIndex: 1, record: { name: 'Bob' } },
    ];

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({ props: { expandable: {}, rowSelection: undefined }, events: {} })}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={processedData as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="row"
          expandedRowKeys={new Set(['dup::dup:1'])}
          selectedRowKeys={new Set(['dup'])}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={null}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>,
    );

    const rows = Array.from(document.querySelectorAll('[data-slot="table-row"]'));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Alice');
    expect(rows[1]?.textContent).toContain('Bob');
    expect(rows[0]?.getAttribute('data-expanded')).toBeNull();
    expect(rows[1]?.getAttribute('data-expanded')).toBe('true');
    expect(document.querySelector('[data-slot="table-expanded-row"]')).toBeNull();
  });
});

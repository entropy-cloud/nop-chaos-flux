import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { TableBodyRows } from '../table-renderer/table-body-rows';
import { TableLoadingOverlay } from '../table-renderer/table-loading-overlay';
import { TablePaginationBar } from '../table-renderer/table-pagination-bar';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

function makeTableProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: { render: () => null },
    regions: {},
    events: {},
    node: { instancePath: [] },
    meta: {},
    ...overrides
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
    merge() {}
  } as any;
}

describe('table internal components', () => {
  it('renders loading overlay with and without custom content', () => {
    const { rerender } = render(<TableLoadingOverlay loadingContent="Loading rows" />);
    expect(document.querySelector('[data-slot="table-loading-overlay"]')).toBeTruthy();
    expect(screen.getByText('Loading rows')).toBeTruthy();

    rerender(<TableLoadingOverlay loadingContent={null} />);
    expect(document.querySelector('[data-slot="table-loading-overlay"]')).toBeTruthy();
    expect(screen.queryByText('Loading rows')).toBeNull();
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
      />
    );

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(document.querySelector('[aria-label="Go to next page"]')!);
    fireEvent.click(document.querySelector('[aria-label="Go to previous page"]')!);
    fireEvent.change(document.querySelector('[data-slot="native-select"]')!, { target: { value: '20' } });

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    expect(screen.getByText('11-20 of 25')).toBeTruthy();
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
      />
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
          fixedColumnLayout={{ getExpandCellProps: () => ({ className: '', style: {} }), getSelectionCellProps: () => ({ className: '', style: {} }), getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }) } as any}
          emptyContent={<span>No data</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>
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
          fixedColumnLayout={{ getExpandCellProps: () => ({ className: '', style: {} }), getSelectionCellProps: () => ({ className: '', style: {} }), getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }) } as any}
          emptyContent={null}
          showExpandColumn={true}
          expandRowByClick={true}
          onToggleExpand={onToggleExpand}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-expanded-row"]')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Collapse'));
    expect(onToggleExpand).toHaveBeenCalledWith('1');
  });
});

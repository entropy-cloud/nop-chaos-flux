import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { TableColumnSchema } from '../schemas.js';
import { TableHeaderRow } from '../table-renderer/table-header-row.js';
import {
  computeHeaderRows,
  extractLeafColumns,
  hasNestedColumns,
} from '../table-renderer/table-header-tree.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: () => undefined,
}));

afterEach(cleanup);

function makeParentProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: {
      render: vi.fn(() => null),
      evaluate: vi.fn((value: unknown) => value),
    },
    regions: {},
    events: {},
    node: {
      instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }],
      scope: { id: 'table-scope', get: () => undefined },
    },
    meta: {},
    ...overrides,
  } as any;
}

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

describe('table-header-tree helpers', () => {
  it('hasNestedColumns detects children', () => {
    const flat = [{ name: 'a' }, { name: 'b' }] as TableColumnSchema[];
    const nested = [
      { name: 'group', children: [{ name: 'a' }, { name: 'b' }] },
    ] as TableColumnSchema[];
    expect(hasNestedColumns(flat)).toBe(false);
    expect(hasNestedColumns(nested)).toBe(true);
    expect(hasNestedColumns([{ name: 'x', children: [] } as unknown as TableColumnSchema])).toBe(false);
  });

  it('extractLeafColumns returns only leaves preserving order', () => {
    const columns = [
      {
        name: 'group1',
        children: [
          { name: 'a' },
          { name: 'b' },
          { name: 'sub', children: [{ name: 'c' }, { name: 'd' }] },
        ],
      },
      { name: 'e' },
    ] as TableColumnSchema[];
    expect(extractLeafColumns(columns).map((c) => c.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('computeHeaderRows computes colSpan/rowSpan for 2-level tree', () => {
    const columns = [
      {
        name: 'group1',
        children: [{ name: 'a' }, { name: 'b' }],
      },
      { name: 'c' },
    ] as TableColumnSchema[];
    const rows = computeHeaderRows(columns);
    expect(rows.length).toBe(2);
    expect(rows[0]!.cells.length).toBe(2);
    expect(rows[0]!.cells[0]).toMatchObject({ colSpan: 2, rowSpan: 1 });
    expect(rows[0]!.cells[1]).toMatchObject({ colSpan: 1, rowSpan: 2 });
    expect(rows[1]!.cells.length).toBe(2);
    expect(rows[1]!.cells[0]).toMatchObject({ colSpan: 1, rowSpan: 1 });
  });

  it('computeHeaderRows computes colSpan/rowSpan for 3-level tree', () => {
    const columns = [
      {
        name: 'top',
        children: [
          { name: 'a' },
          { name: 'mid', children: [{ name: 'b' }, { name: 'c' }] },
        ],
      },
    ] as TableColumnSchema[];
    const rows = computeHeaderRows(columns);
    expect(rows.length).toBe(3);
    expect(rows[0]!.cells[0]).toMatchObject({ colSpan: 3, rowSpan: 1 });
    expect(rows[1]!.cells.length).toBe(2);
    expect(rows[1]!.cells[0]).toMatchObject({ colSpan: 1, rowSpan: 2 });
    expect(rows[1]!.cells[1]).toMatchObject({ colSpan: 2, rowSpan: 1 });
    expect(rows[2]!.cells.length).toBe(2);
    expect(rows[2]!.cells[0]).toMatchObject({ colSpan: 1, rowSpan: 1 });
  });

  it('computeHeaderRows returns empty when flat', () => {
    expect(computeHeaderRows([{ name: 'a' }, { name: 'b' }] as TableColumnSchema[])).toEqual([]);
  });
});

describe('TableHeaderRow nested rendering', () => {
  it('renders single row when no children (flat baseline)', () => {
    const columns = [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
    ] as TableColumnSchema[];
    const props = makeParentProps();
    render(
      <table>
        <thead>
          <TableHeaderRow
            props={props}
            columns={columns}
            sourceLength={0}
            sortState={{ column: '', direction: null }}
            filterState={{}}
            allSelected={false}
            selectedRowCount={0}
            fixedColumnLayout={noopFixedLayout}
            showExpandColumn={false}
            onSort={() => {}}
            onFilter={() => {}}
            onSearch={() => {}}
            onClearFilters={() => {}}
            onSelectAll={() => {}}
          />
        </thead>
      </table>,
    );

    const rows = document.querySelectorAll('tr');
    expect(rows.length).toBe(1);
    const heads = document.querySelectorAll('[data-slot="table-head"]');
    expect(heads.length).toBe(2);
  });

  it('renders multiple header rows when children present', () => {
    const columns = [
      {
        name: 'group',
        label: 'Group',
        children: [
          { name: 'a', label: 'A' },
          { name: 'b', label: 'B' },
        ],
      },
      { name: 'c', label: 'C' },
    ] as TableColumnSchema[];
    const props = makeParentProps();
    const { container } = render(
      <table>
        <thead>
          <TableHeaderRow
            props={props}
            columns={columns}
            sourceLength={0}
            sortState={{ column: '', direction: null }}
            filterState={{}}
            allSelected={false}
            selectedRowCount={0}
            fixedColumnLayout={noopFixedLayout}
            showExpandColumn={false}
            onSort={() => {}}
            onFilter={() => {}}
            onSearch={() => {}}
            onClearFilters={() => {}}
            onSelectAll={() => {}}
          />
        </thead>
      </table>,
    );

    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(2);

    const groupHeads = container.querySelectorAll('[data-slot="table-head-group"]');
    expect(groupHeads.length).toBe(2);
    expect(groupHeads[0]!.getAttribute('colspan')).toBe('2');
    expect(groupHeads[0]!.getAttribute('rowspan')).toBe('1');
    expect(groupHeads[1]!.getAttribute('colspan')).toBe('1');
    expect(groupHeads[1]!.getAttribute('rowspan')).toBe('2');

    const leafHeads = container.querySelectorAll('[data-slot="table-head"]');
    expect(leafHeads.length).toBe(3);
  });

  it('renders resize handle only on leaf cells (not group cells)', () => {
    const columns = [
      {
        name: 'group',
        label: 'Group',
        children: [{ name: 'a', label: 'A' }],
      },
    ] as TableColumnSchema[];
    const props = makeParentProps();

    function Harness() {
      const resizeApi = useColumnResize(columns, true);
      return (
        <table>
          <thead>
            <TableHeaderRow
              props={props}
              columns={columns}
              sourceLength={0}
              sortState={{ column: '', direction: null }}
              filterState={{}}
              allSelected={false}
              selectedRowCount={0}
              fixedColumnLayout={noopFixedLayout}
              showExpandColumn={false}
              onSort={() => {}}
              onFilter={() => {}}
              onSearch={() => {}}
              onClearFilters={() => {}}
              onSelectAll={() => {}}
              columnResize={true}
              resizeApi={resizeApi}
            />
          </thead>
        </table>
      );
    }

    const { container } = render(<Harness />);
    const groupCells = container.querySelectorAll('[data-slot="table-head-group"]');
    const handles = container.querySelectorAll('[data-slot="table-column-resize-handle"]');
    expect(groupCells.length).toBe(1);
    expect(handles.length).toBe(1);
    const leafRow = container.querySelectorAll('tr')[1]!;
    const groupRow = container.querySelectorAll('tr')[0]!;
    expect(leafRow.querySelector('[data-slot="table-column-resize-handle"]')).toBeTruthy();
    expect(groupRow.querySelector('[data-slot="table-column-resize-handle"]')).toBeNull();
  });

  it('affixHeader applies sticky style to all nested header rows', () => {
    const columns = [
      {
        name: 'group',
        label: 'Group',
        children: [{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }],
      },
    ] as TableColumnSchema[];
    const props = makeParentProps();
    const { container } = render(
      <table>
        <thead>
          <TableHeaderRow
            props={props}
            columns={columns}
            sourceLength={0}
            sortState={{ column: '', direction: null }}
            filterState={{}}
            allSelected={false}
            selectedRowCount={0}
            fixedColumnLayout={noopFixedLayout}
            showExpandColumn={false}
            onSort={() => {}}
            onFilter={() => {}}
            onSearch={() => {}}
            onClearFilters={() => {}}
            onSelectAll={() => {}}
            affixHeader={true}
          />
        </thead>
      </table>,
    );

    const rows = container.querySelectorAll('tr.nop-table-header-sticky');
    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect((row as HTMLElement).style.position).toBe('sticky');
    });
  });

  it('renders selection + expand control columns spanning all header rows', () => {
    const columns = [
      {
        name: 'group',
        label: 'Group',
        children: [{ name: 'a', label: 'A' }],
      },
    ] as TableColumnSchema[];
    const props = makeParentProps({
      props: {
        expandable: {},
        rowSelection: { type: 'checkbox' },
      },
    });
    const { container } = render(
      <table>
        <thead>
          <TableHeaderRow
            props={props}
            columns={columns}
            sourceLength={0}
            sortState={{ column: '', direction: null }}
            filterState={{}}
            allSelected={false}
            selectedRowCount={0}
            fixedColumnLayout={noopFixedLayout}
            showExpandColumn={true}
            onSort={() => {}}
            onFilter={() => {}}
            onSearch={() => {}}
            onClearFilters={() => {}}
            onSelectAll={() => {}}
          />
        </thead>
      </table>,
    );

    const expandCol = container.querySelector('[data-slot="table-expand-column"]');
    const selectCol = container.querySelector('[data-slot="table-select-column"]');
    expect(expandCol).toBeTruthy();
    expect(selectCol).toBeTruthy();
    expect(expandCol!.getAttribute('rowspan')).toBe('2');
    expect(selectCol!.getAttribute('rowspan')).toBe('2');
  });
});

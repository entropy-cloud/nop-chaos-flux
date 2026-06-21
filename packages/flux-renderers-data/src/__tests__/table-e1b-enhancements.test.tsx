import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema, TableSummaryRow } from '../schemas.js';
import {
  computeCombinePlan,
  getCellRowSpan,
  type CombinePlan,
} from '../table-renderer/combine-cells.js';
import {
  isColumnResizable,
  resolveColumnMaxWidth,
  resolveColumnMinWidth,
  resolveColumnWidth,
  useColumnResize,
} from '../table-renderer/use-column-resize.js';
import { TableHeaderRow } from '../table-renderer/table-header-row.js';
import { TableSummaryRowView } from '../table-renderer/table-summary-row.js';
import {
  renderDataRow,
  type FlattenedRow,
} from '../table-renderer/table-body-row-rendering.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';
import type { TableRowEntry } from '../table-renderer/types.js';

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

function makeRowScope(record: Record<string, unknown>, index: number): ScopeRef {
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
    update: vi.fn(),
    merge() {},
  };
}

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

describe('useColumnResize hook helpers', () => {
  it('resolveColumnWidth parses number, "px" string, and falls back to default', () => {
    expect(resolveColumnWidth({ width: 200 } as TableColumnSchema, 100)).toBe(200);
    expect(resolveColumnWidth({ width: '180px' } as TableColumnSchema, 100)).toBe(180);
    expect(resolveColumnWidth({ width: undefined } as TableColumnSchema, 100)).toBe(100);
    expect(resolveColumnWidth({ width: 'bad' } as TableColumnSchema, 100)).toBe(100);
  });

  it('resolveColumnMinWidth applies configured value and enforces default floor', () => {
    expect(resolveColumnMinWidth({ minWidth: 80 } as TableColumnSchema)).toBe(80);
    expect(resolveColumnMinWidth({} as TableColumnSchema)).toBe(40);
  });

  it('resolveColumnMaxWidth returns undefined when not set or invalid', () => {
    expect(resolveColumnMaxWidth({ maxWidth: 400 } as TableColumnSchema)).toBe(400);
    expect(resolveColumnMaxWidth({} as TableColumnSchema)).toBeUndefined();
    expect(resolveColumnMaxWidth({ maxWidth: -1 } as TableColumnSchema)).toBeUndefined();
  })

  it('isColumnResizable respects columnResize:false override and per-column resizable flag', () => {
    expect(isColumnResizable({} as TableColumnSchema, undefined)).toBe(true);
    expect(isColumnResizable({} as TableColumnSchema, false)).toBe(false);
    expect(isColumnResizable({ resizable: false } as TableColumnSchema, undefined)).toBe(false);
    expect(isColumnResizable({ resizable: true } as TableColumnSchema, undefined)).toBe(true);
    expect(isColumnResizable({ resizable: false } as TableColumnSchema, true)).toBe(false);
  });
});

describe('useColumnResize hook runtime', () => {
  it('exposes initial widths from columns and applies min/max clamp during drag', () => {
    const columns = [
      { type: 'column', name: 'a', width: 100, minWidth: 50, maxWidth: 200 },
      { type: 'column', name: 'b', width: '120px' },
    ] as TableColumnSchema[];

    function Probe() {
      const api = useColumnResize(columns, undefined);
      return (
        <div>
          <span data-testid="width-a">{api.widths.a ?? ''}</span>
          <span data-testid="width-b">{api.widths.b ?? ''}</span>
          <button
            type="button"
            data-testid="start"
            onClick={() => api.startResize(columns[0]!, 0, 200)}
          >
            start
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<Probe />);
    const widthA = () => getByTestId('width-a').textContent;
    const widthB = () => getByTestId('width-b').textContent;

    expect(widthA()).toBe('100');
    expect(widthB()).toBe('120');

    act(() => {
      fireEvent.click(getByTestId('start'));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 280 }));
    });
    expect(widthA()).toBe('180');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 1000 }));
    });
    expect(widthA()).toBe('200');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: -1000 }));
    });
    expect(widthA()).toBe('50');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });
  });
});

describe('TableHeaderRow affixHeader + resize handle', () => {
  beforeEach(() => {
    if (typeof PointerEvent === 'undefined') {
      (globalThis as any).PointerEvent = class MockPointerEvent extends Event {
        clientX: number;
        constructor(type: string, init: { clientX?: number } = {}) {
          super(type);
          this.clientX = init.clientX ?? 0;
        }
      };
    }
  });

  it('applies position:sticky when affixHeader is true', () => {
    const columns = [{ name: 'a', label: 'A' }] as TableColumnSchema[];
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
            affixHeader={true}
          />
        </thead>
      </table>,
    );

    const row = document.querySelector('[data-slot="table-row"]') as HTMLElement;
    expect(row).toBeTruthy();
    const computed = row.style.position;
    expect(computed).toBe('sticky');
    expect(row.style.top).toBe('0px');
    expect(row.className).toContain('nop-table-header-sticky');
  });

  it('does not apply sticky when affixHeader is absent', () => {
    const columns = [{ name: 'a', label: 'A' }] as TableColumnSchema[];
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

    const row = document.querySelector('[data-slot="table-row"]') as HTMLElement;
    expect(row.style.position).not.toBe('sticky');
  });

  it('renders resize handle when columnResize not false and omits when columnResize:false', () => {
    const columns = [{ name: 'a', label: 'A' }] as TableColumnSchema[];
    const props = makeParentProps();

    function Harness({ columnResize }: { columnResize: boolean | undefined }) {
      const resizeApi = useColumnResize(columns, columnResize);
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
              columnResize={columnResize}
              resizeApi={resizeApi}
            />
          </thead>
        </table>
      );
    }

    const { rerender } = render(<Harness columnResize={undefined} />);
    expect(document.querySelector('[data-slot="table-column-resize-handle"]')).toBeTruthy();

    rerender(<Harness columnResize={false} />);
    expect(document.querySelector('[data-slot="table-column-resize-handle"]')).toBeNull();
  });
});

describe('TableSummaryRowView', () => {
  it('renders cells aligned to columns by name and skips missing columns', () => {
    const columns = [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
      { name: 'c', label: 'C' },
    ] as TableColumnSchema[];
    const row: TableSummaryRow = {
      cells: [
        { column: 'a', value: 'Sum-A' },
        { column: 'c', value: 'Sum-C' },
      ],
    };
    const props = makeParentProps();
    render(
      <table>
        <tbody>
          <TableSummaryRowView
            row={row}
            variant="affix"
            columns={columns}
            showExpandColumn={false}
            hasSelection={false}
            fixedColumnLayout={noopFixedLayout}
            parentProps={props}
          />
        </tbody>
      </table>,
    );

    const cells = document.querySelectorAll('[data-slot="table-summary-cell"]');
    expect(cells.length).toBe(3);
    expect(cells[0]!.textContent).toBe('Sum-A');
    expect(cells[1]!.textContent).toBe('');
    expect(cells[2]!.textContent).toBe('Sum-C');
    expect(document.querySelector('[data-slot="table-summary-row-affix"]')).toBeTruthy();
  });

  it('resolves expression values via helpers.evaluate', () => {
    const columns = [{ name: 'total', label: 'Total' }] as TableColumnSchema[];
    const row: TableSummaryRow = {
      cells: [{ column: 'total', value: { __expr: 'sum' } as any }],
    };
    const props = makeParentProps({
      helpers: {
        ...makeParentProps().helpers,
        evaluate: vi.fn(() => 42),
      },
    });
    render(
      <table>
        <tbody>
          <TableSummaryRowView
            row={row}
            variant="prefix"
            columns={columns}
            showExpandColumn={false}
            hasSelection={false}
            fixedColumnLayout={noopFixedLayout}
            parentProps={props}
          />
        </tbody>
      </table>,
    );

    const cell = document.querySelector('[data-slot="table-summary-cell"]') as HTMLElement;
    expect(cell.textContent).toBe('42');
    expect(props.helpers.evaluate).toHaveBeenCalled();
    expect(document.querySelector('[data-slot="table-summary-row-prefix"]')).toBeTruthy();
  });

  it('applies align class to summary cells', () => {
    const columns = [{ name: 'amount', label: 'Amount' }] as TableColumnSchema[];
    const row: TableSummaryRow = {
      cells: [{ column: 'amount', value: '100', align: 'right' }],
    };
    const props = makeParentProps();
    render(
      <table>
        <tbody>
          <TableSummaryRowView
            row={row}
            variant="affix"
            columns={columns}
            showExpandColumn={false}
            hasSelection={false}
            fixedColumnLayout={noopFixedLayout}
            parentProps={props}
          />
        </tbody>
      </table>,
    );

    const cell = document.querySelector('[data-slot="table-summary-cell"]') as HTMLElement;
    expect(cell.className).toContain('text-right');
  });
});

describe('combine-cells helper', () => {
  it('returns empty plan when combineNum is undefined/zero or rows empty', () => {
    const rows: TableRowEntry[] = [
      { rowKey: '1', sourceIndex: 0, record: { a: 1 } },
      { rowKey: '2', sourceIndex: 1, record: { a: 1 } },
    ];
    const columns: TableColumnSchema[] = [{ type: 'column', name: 'a' }] as TableColumnSchema[];

    expect(computeCombinePlan(rows, columns, undefined)).toEqual([]);
    expect(computeCombinePlan(rows, columns, 0)).toEqual([]);
    expect(computeCombinePlan([], columns, 1)).toEqual([]);
  });

  it('returns a stable singleton empty plan when no merging is active', () => {
    const rows: TableRowEntry[] = [
      { rowKey: '1', sourceIndex: 0, record: { a: 1 } },
      { rowKey: '2', sourceIndex: 1, record: { a: 1 } },
    ];
    const columns: TableColumnSchema[] = [{ type: 'column', name: 'a' }] as TableColumnSchema[];

    const planA = computeCombinePlan(rows, columns, undefined);
    const planB = computeCombinePlan(rows, columns, 0);
    const planC = computeCombinePlan(rows, columns, 1, { virtualEnabled: true });
    expect(planA).toBe(planB);
    expect(planA).toBe(planC);
    expect(getCellRowSpan(planA, 0, columns[0]!, 0)).toBeUndefined();
    expect(getCellRowSpan(planA, 1, columns[0]!, 0)).toBeUndefined();
  });

  it('degrades to no-merge plan when virtualEnabled is true', () => {
    const rows: TableRowEntry[] = [
      { rowKey: '1', sourceIndex: 0, record: { a: 1 } },
      { rowKey: '2', sourceIndex: 1, record: { a: 1 } },
    ];
    const columns: TableColumnSchema[] = [{ type: 'column', name: 'a' }] as TableColumnSchema[];
    const plan = computeCombinePlan(rows, columns, 1, { virtualEnabled: true });
    expect(plan).toEqual([]);
  });

  it('computes rowSpan plan for first N columns merging consecutive same values', () => {
    const rows: TableRowEntry[] = [
      { rowKey: '1', sourceIndex: 0, record: { a: 'x', b: 'm', c: 1 } },
      { rowKey: '2', sourceIndex: 1, record: { a: 'x', b: 'n', c: 2 } },
      { rowKey: '3', sourceIndex: 2, record: { a: 'y', b: 'n', c: 3 } },
    ];
    const columns: TableColumnSchema[] = [
      { type: 'column', name: 'a' },
      { type: 'column', name: 'b' },
      { type: 'column', name: 'c' },
    ] as TableColumnSchema[];
    const plan: CombinePlan = computeCombinePlan(rows, columns, 2);
    expect(plan[0]!.a).toBe(2);
    expect(plan[1]!.a).toBe(0);
    expect(plan[2]!.a).toBeUndefined();
    expect(plan[1]!.b).toBe(2);
    expect(plan[2]!.b).toBe(0);
    expect(plan[0]!.c).toBeUndefined();
    expect(plan[1]!.c).toBeUndefined();
    expect(plan[2]!.c).toBeUndefined();
  });

  it('getCellRowSpan returns 0 (hidden), number (span start), or undefined (no rule)', () => {
    const plan: CombinePlan = [{ a: 2 }, { a: 0 }, {}];
    const columnA: TableColumnSchema = { type: 'column', name: 'a' } as TableColumnSchema;
    const columnB: TableColumnSchema = { type: 'column', name: 'b' } as TableColumnSchema;
    expect(getCellRowSpan(plan, 0, columnA, 0)).toBe(2);
    expect(getCellRowSpan(plan, 1, columnA, 0)).toBe(0);
    expect(getCellRowSpan(plan, 2, columnA, 0)).toBeUndefined();
    expect(getCellRowSpan(plan, 0, columnB, 1)).toBeUndefined();
  });
});

describe('combineNum applied to renderDataRow', () => {
  function buildRow(
    record: Record<string, unknown>,
    index: number,
    rowKey: string,
  ): FlattenedRow {
    return {
      kind: 'data',
      entry: { rowKey, sourceIndex: index, record },
      rowScope: makeRowScope(record, index),
      rowKey,
      rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: rowKey }],
      isExpanded: false,
      isSelected: false,
      isEven: index % 2 === 0,
    };
  }

  it('renders rowSpan attribute on merged cells and skips hidden cells', () => {
    const columns: TableColumnSchema[] = [
      { type: 'column', name: 'a' },
      { type: 'column', name: 'b' },
    ] as TableColumnSchema[];
    const rows: TableRowEntry[] = [
      { rowKey: '1', sourceIndex: 0, record: { a: 'x', b: '1' } },
      { rowKey: '2', sourceIndex: 1, record: { a: 'x', b: '2' } },
    ];
    const plan = computeCombinePlan(rows, columns, 1);
    const parentProps = makeParentProps();

    const { container } = render(
      <table>
        <tbody>
          {renderDataRow(
            buildRow({ a: 'x', b: '1' }, 0, '1'),
            { type: 'table' } as TableSchema,
            columns,
            parentProps.helpers,
            parentProps,
            noopFixedLayout,
            false,
            false,
            () => {},
            () => {},
            false,
            undefined,
            undefined,
            plan,
            0,
          )}
          {renderDataRow(
            buildRow({ a: 'x', b: '2' }, 1, '2'),
            { type: 'table' } as TableSchema,
            columns,
            parentProps.helpers,
            parentProps,
            noopFixedLayout,
            false,
            false,
            () => {},
            () => {},
            false,
            undefined,
            undefined,
            plan,
            1,
          )}
        </tbody>
      </table>,
    );

    const rowsRendered = container.querySelectorAll('[data-slot="table-row"]');
    expect(rowsRendered.length).toBe(2);
    const firstRowCells = rowsRendered[0]!.querySelectorAll('td');
    const secondRowCells = rowsRendered[1]!.querySelectorAll('td');
    expect(firstRowCells.length).toBe(2);
    expect(firstRowCells[0]!.getAttribute('rowspan')).toBe('2');
    expect(secondRowCells.length).toBe(1);
    expect(secondRowCells[0]!.textContent).toBe('2');
  });

  it('does not merge when no combinePlan provided', () => {
    const columns: TableColumnSchema[] = [
      { type: 'column', name: 'a' },
      { type: 'column', name: 'b' },
    ] as TableColumnSchema[];
    const parentProps = makeParentProps();
    const { container } = render(
      <table>
        <tbody>
          {renderDataRow(
            buildRow({ a: 'x', b: '1' }, 0, '1'),
            { type: 'table' } as TableSchema,
            columns,
            parentProps.helpers,
            parentProps,
            noopFixedLayout,
            false,
            false,
            () => {},
            () => {},
            false,
          )}
        </tbody>
      </table>,
    );

    const cells = container.querySelectorAll('[data-slot="table-row"] td');
    expect(cells.length).toBe(2);
    cells.forEach((cell) => {
      expect(cell.getAttribute('rowspan')).toBeNull();
    });
  });
});

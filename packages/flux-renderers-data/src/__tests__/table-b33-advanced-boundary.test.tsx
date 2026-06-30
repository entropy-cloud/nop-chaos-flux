import React, { Profiler } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema, TableSummaryRow } from '../schemas.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';
import { createFixedColumnLayout } from '../table-renderer/fixed-columns.js';
import { TableSummaryRowView } from '../table-renderer/table-summary-row.js';
import {
  renderDataRow,
  type FlattenedRow,
} from '../table-renderer/table-body-row-rendering.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';
import {
  SelectionProbe,
  createHelpers,
  resetTableControlTestState,
} from './use-table-controls.test-support.js';

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

function buildRow(
  record: Record<string, unknown>,
  index: number,
  rowKey: string,
): FlattenedRow {
  return {
    kind: 'data',
    entry: { rowKey, cacheKey: rowKey, sourceIndex: index, record },
    rowScope: makeRowScope(record, index),
    rowKey,
    rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: rowKey }],
    isExpanded: false,
    isSelected: false,
    isEven: index % 2 === 0,
  };
}

// ---------------------------------------------------------------------------
// T15 — column resize: repeated (re-resize) drags accumulate from current width
// ---------------------------------------------------------------------------

describe('B3.3 T15 — column resize supports repeated drags (re-resize) and is delta-based', () => {
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

  it('accumulates width across a second drag starting from the post-first-drag width', () => {
    const columns = [
      { type: 'column', name: 'a', width: 100, minWidth: 40, maxWidth: 300 },
    ] as TableColumnSchema[];

    function Probe() {
      const api = useColumnResize(columns, undefined);
      return (
        <div>
          <span data-testid="width-a">{api.widths.a ?? ''}</span>
          <button type="button" data-testid="drag1" onClick={() => api.startResize(columns[0]!, 0, 200)}>
            d1
          </button>
          <button type="button" data-testid="drag2" onClick={() => api.startResize(columns[0]!, 0, 300)}>
            d2
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<Probe />);
    const widthA = () => getByTestId('width-a').textContent;

    expect(widthA()).toBe('100');

    // First drag: startClientX=200 -> move to 280 (+80) => 180
    act(() => {
      fireEvent.click(getByTestId('drag1'));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 280 }));
    });
    expect(widthA()).toBe('180');
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    // Second drag MUST start from the current width (180), not the schema default (100).
    // startClientX=300 -> move to 360 (+60) => 240 (proves re-resize, not reset to default).
    act(() => {
      fireEvent.click(getByTestId('drag2'));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 360 }));
    });
    expect(widthA()).toBe('240');
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });
  });

  it('delta math is client-absolute, so dragging works identically when the table overflows (scrolled)', () => {
    // The resize handler computes `delta = event.clientX - active.startClientX`, which is
    // independent of container scrollLeft. Overshooting far beyond the viewport still
    // clamps to maxWidth (the same clamp path that fires under overflow scroll).
    const columns = [
      { type: 'column', name: 'a', width: 100, minWidth: 40, maxWidth: 200 },
    ] as TableColumnSchema[];

    function Probe() {
      const api = useColumnResize(columns, undefined);
      return (
        <div>
          <span data-testid="width-a">{api.widths.a ?? ''}</span>
          <button type="button" data-testid="drag" onClick={() => api.startResize(columns[0]!, 0, 0)}>
            d
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<Probe />);
    const widthA = () => getByTestId('width-a').textContent;
    expect(widthA()).toBe('100');

    act(() => {
      fireEvent.click(getByTestId('drag'));
      // clientX far beyond any viewport still clamps to maxWidth (overflow-safe).
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 5000 }));
    });
    expect(widthA()).toBe('200');
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: -5000 }));
    });
    expect(widthA()).toBe('40');
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });
  });
});

// ---------------------------------------------------------------------------
// T18 — summary row re-aligns to visible columns at runtime (toggle column)
// ---------------------------------------------------------------------------

describe('B3.3 T18 — summary row re-aligns to visible columns at runtime', () => {
  it('re-renders aligned to A/C when column B is toggled hidden at runtime', () => {
    const summaryRow: TableSummaryRow = {
      cells: [
        { column: 'a', value: 'Sum-A' },
        { column: 'c', value: 'Sum-C' },
      ],
    };
    const props = makeParentProps();

    const columnsABC: TableColumnSchema[] = [
      { name: 'a', label: 'A' },
      { name: 'b', label: 'B' },
      { name: 'c', label: 'C' },
    ] as TableColumnSchema[];
    const columnsAC: TableColumnSchema[] = [
      { name: 'a', label: 'A' },
      { name: 'c', label: 'C' },
    ] as TableColumnSchema[];

    const { rerender } = render(
      <table>
        <tbody>
          <TableSummaryRowView
            row={summaryRow}
            variant="affix"
            columns={columnsABC}
            showExpandColumn={false}
            hasSelection={false}
            fixedColumnLayout={noopFixedLayout}
            parentProps={props}
          />
        </tbody>
      </table>,
    );

    // Initial: 3 visible columns -> 3 summary cells, B empty (aligned by name).
    let cells = document.querySelectorAll('[data-slot="table-summary-cell"]');
    expect(cells.length).toBe(3);
    expect(cells[0]!.textContent).toBe('Sum-A');
    expect(cells[1]!.textContent).toBe('');
    expect(cells[2]!.textContent).toBe('Sum-C');

    // Runtime: column B toggled hidden -> effective visible columns = [A, C].
    rerender(
      <table>
        <tbody>
          <TableSummaryRowView
            row={summaryRow}
            variant="affix"
            columns={columnsAC}
            showExpandColumn={false}
            hasSelection={false}
            fixedColumnLayout={noopFixedLayout}
            parentProps={props}
          />
        </tbody>
      </table>,
    );

    // Summary reactively re-aligns: now 2 cells for the 2 visible columns, no B spacer.
    cells = document.querySelectorAll('[data-slot="table-summary-cell"]');
    expect(cells.length).toBe(2);
    expect(cells[0]!.textContent).toBe('Sum-A');
    expect(cells[1]!.textContent).toBe('Sum-C');
  });
});

// ---------------------------------------------------------------------------
// T9 — pure selection column + fixed:left data column offset (no expand column)
// ---------------------------------------------------------------------------

describe('B3.3 T9 — rowSelection + fixed:left offset (pure selection-column variant)', () => {
  it('places selection control at left:0 and first left-fixed data column at left:40px (no expand column)', () => {
    // Existing layout test (table-data-and-layout) covers expand+selection combined (80px).
    // This is the residual variant: rowSelection WITHOUT expandable, so only the 40px
    // selection control column precedes the first left-fixed data column.
    const layout = createFixedColumnLayout(
      { type: 'table', rowSelection: { type: 'checkbox' } } as TableSchema,
      [{ name: 'name', fixed: 'left', width: 120 } as TableColumnSchema],
      false, // showExpandColumn=false: no expand column, only selection control
    );

    expect(layout.hasStickyColumns).toBe(true);
    const selectionProps = layout.getSelectionCellProps();
    expect(selectionProps).toMatchObject({ fixed: 'left' });
    expect(selectionProps.style).toMatchObject({ left: '0px' });

    const dataProps = layout.getColumnCellProps(
      { name: 'name', fixed: 'left', width: 120 } as TableColumnSchema,
      0,
    );
    expect(dataProps).toMatchObject({
      fixed: 'left',
      style: expect.objectContaining({ left: '40px', width: 120 }),
    });
  });
});

// ---------------------------------------------------------------------------
// T10 — setSelection(['k1','k99']) cross-page + keepOnPageChange
// ---------------------------------------------------------------------------

describe('B3.3 T10 — setSelection cross-page retention depends on keepOnPageChange', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('keeps k99 (on page 2) when keepOnPageChange is true', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: [], keepOnPageChange: true },
        }}
        // Page 1 rows: k1 is present, k99 (page 2) is intentionally absent.
        source={[{ id: 'k1' }, { id: 'k2' }]}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    // External setSelection with a key that lives on another page.
    act(() => {
      api.setSelectionExternal(new Set(['k1', 'k99']));
    });

    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['k1', 'k99']);
    expect(api.selectedRowKeys.size).toBe(2);
  });

  it('prunes k99 (on page 2) when keepOnPageChange is false (default)', () => {
    const helpers = createHelpers();
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'local',
          rowSelection: { type: 'checkbox', selectedRowKeys: [] },
        }}
        // Page 1 rows: k1 present, k99 absent.
        source={[{ id: 'k1' }]}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.setSelectionExternal(new Set(['k1', 'k99']));
    });

    // Render-time pruner drops k99 because it is not on the current page.
    expect(Array.from(api.selectedRowKeys).sort()).toEqual(['k1']);
  });
});

// ---------------------------------------------------------------------------
// T29 — hover/focus produces zero sibling re-renders (CSS-only interaction)
// ---------------------------------------------------------------------------

describe('B3.3 T29 — hover/focus does not re-render sibling rows (CSS-only interaction)', () => {
  it('records no React commit when focusing / hovering a cell, and feedback is CSS-driven', () => {
    const columns: TableColumnSchema[] = [
      { type: 'column', name: 'name', label: 'Name' },
    ] as TableColumnSchema[];
    const parentProps = makeParentProps({
      props: { expandable: {}, rowSelection: undefined },
      events: { onRowClick: vi.fn() },
    });

    const rows: FlattenedRow[] = ['r0', 'r1', 'r2'].map((key, index) =>
      buildRow({ id: key, name: key }, index, key),
    );

    const commits: string[] = [];
    const onRender = (_id: string, phase: string) => {
      commits.push(phase);
    };

    render(
      <Profiler id="table-body" onRender={onRender}>
        <table>
          <tbody>
            {rows.map((row) =>
              renderDataRow(
                row,
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
              ),
            )}
          </tbody>
        </table>
      </Profiler>,
    );

    const afterMount = commits.length;
    expect(afterMount).toBeGreaterThanOrEqual(1);

    const renderedRows = document.querySelectorAll('[data-slot="table-row"]');
    expect(renderedRows.length).toBe(3);

    const middleRow = renderedRows[1]!;
    // A clickable row carries the focus feedback purely as a CSS class (no JS state).
    expect(middleRow.className).toContain('focus-visible:ring');

    const cell = middleRow.querySelector('td') as HTMLElement;

    // Fire focus + hover (mouseover/mouseenter) on the middle row's cell.
    act(() => {
      cell.focus();
      fireEvent.mouseOver(cell);
      fireEvent.mouseMove(cell);
    });

    // No React commit happens for hover/focus: the interaction styling is CSS-only
    // and DataRowView holds no hover/focus state -> zero sibling re-renders.
    expect(commits.length).toBe(afterMount);
  });
});

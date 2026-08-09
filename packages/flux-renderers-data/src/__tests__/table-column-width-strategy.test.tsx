import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { createFixedColumnLayout } from '../table-renderer/fixed-columns.js';
import { TableHeaderRow } from '../table-renderer/table-header-row.js';
import {
  useColumnResize,
  type ColumnResizeApi,
} from '../table-renderer/use-column-resize.js';
import { renderDataRow } from '../table-renderer/table-body-row-rendering.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: () => undefined,
}));

afterEach(cleanup);

function makeRowScope(record: Record<string, unknown>, index: number): ScopeRef {
  const $slot = { record, index };
  return {
    id: `scope-${index}`,
    path: `$rows.${index}`,
    value: { ...record, $slot },
    get(path: string) {
      if (path === '$slot') return $slot;
      if (path === '$slot.record') return record;
      if (path === '$slot.index') return index;
      if (path in record) return (record as any)[path];
      return undefined;
    },
    has: () => false,
    readOwn: () => ({ ...record, $slot }),
    readVisible: () => ({ ...record, $slot }),
    materializeVisible: () => ({ ...record, $slot }),
    update: vi.fn(),
    merge() {},
  };
}

function makeParentProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: {
      render: vi.fn((node, options) => (
        <span data-testid="helper-render">{JSON.stringify({ node, options })}</span>
      )),
    },
    regions: {},
    events: {},
    node: { instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }] },
    meta: {},
    ...overrides,
  } as any;
}

// Plan 2026-08-09-1140-1: column-width strategy must be class-aware. The WIP
// maxWidth fix pinned EVERY header cell at `resolvedWidth` (120 fallback),
// breaking default tables (P1-01); control columns were only pinned when sticky,
// leaving non-sticky selection/expand columns stretchable (P1-02). These tests
// pin the per-category strategy: no-width data columns stay stretchable,
// explicit-width and control columns are pinned with width/minWidth/maxWidth.
describe('column-width strategy (P1-01/P1-02, plan 2026-08-09-1140-1)', () => {
  function WidthStrategyHarness({
    columns,
    schemaProps = {},
    showExpandColumn = false,
  }: {
    columns: TableColumnSchema[];
    schemaProps?: Partial<TableSchema>;
    showExpandColumn?: boolean;
  }) {
    const resizeApi = useColumnResize(columns, true);
    const fixedColumnLayout = createFixedColumnLayout(
      schemaProps as TableSchema,
      columns,
      showExpandColumn,
    );
    return (
      <table>
        <thead>
          <TableHeaderRow
            props={makeParentProps({ props: schemaProps })}
            columns={columns}
            sourceLength={0}
            sortState={{ column: '', direction: null }}
            filterState={{}}
            allSelected={false}
            selectedRowCount={0}
            fixedColumnLayout={fixedColumnLayout}
            showExpandColumn={showExpandColumn}
            onSort={() => {}}
            onFilter={() => {}}
            onSearch={() => {}}
            onClearFilters={() => {}}
            onSelectAll={() => {}}
            columnResize
            resizeApi={resizeApi}
          />
        </thead>
      </table>
    );
  }

  it('no-width data column header cell gets NO width/minWidth/maxWidth (must stay stretchable)', () => {
    render(
      <WidthStrategyHarness
        columns={[{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }] as TableColumnSchema[]}
      />,
    );

    const heads = document.querySelectorAll<HTMLElement>('[data-slot="table-head"]');
    expect(heads.length).toBe(2);
    heads.forEach((head) => {
      expect(head.style.width).toBe('');
      expect(head.style.minWidth).toBe('');
      expect(head.style.maxWidth).toBe('');
    });
  });

  it('explicit-width data column header cell is pinned at width/minWidth/maxWidth = declared width', () => {
    render(
      <WidthStrategyHarness
        columns={[{ name: 'a', label: 'A', width: 150 }] as TableColumnSchema[]}
      />,
    );

    const head = document.querySelector<HTMLElement>('[data-slot="table-head"]');
    expect(head!.style.width).toBe('150px');
    expect(head!.style.minWidth).toBe('150px');
    expect(head!.style.maxWidth).toBe('150px');
  });

  it('non-sticky selection control column header is pinned at 40px without position', () => {
    render(
      <WidthStrategyHarness
        columns={[{ name: 'a', label: 'A' }, { name: 'b', label: 'B' }] as TableColumnSchema[]}
        schemaProps={{ rowSelection: { type: 'checkbox' } }}
      />,
    );

    const selectHead = document.querySelector<HTMLElement>('[data-slot="table-select-column"]');
    expect(selectHead).toBeTruthy();
    expect(selectHead!.style.width).toBe('40px');
    expect(selectHead!.style.minWidth).toBe('40px');
    expect(selectHead!.style.maxWidth).toBe('40px');
    expect(selectHead!.style.position).toBe('');
  });

  it('non-sticky control columns pin width via layout props when no fixed data columns exist', () => {
    const layout = createFixedColumnLayout({} as TableSchema, [], false);
    expect(layout.getSelectionCellProps().fixed).toBeUndefined();
    expect(layout.getSelectionCellProps().style).toEqual(
      expect.objectContaining({ width: 40, minWidth: 40, maxWidth: 40 }),
    );
    expect(layout.getExpandCellProps().style).toEqual(
      expect.objectContaining({ width: 40, minWidth: 40, maxWidth: 40 }),
    );
  });

  it('body selection cell consumes the pinned non-sticky width', () => {
    const parentProps = makeParentProps({
      props: { rowSelection: { type: 'checkbox' } },
    });
    const layout = createFixedColumnLayout(
      { rowSelection: { type: 'checkbox' } } as TableSchema,
      [],
      false,
    );
    render(
      <table>
        <tbody>
          {renderDataRow(
            {
              kind: 'data',
              entry: { rowKey: 'r1', sourceIndex: 0, record: { a: 'x' } },
              rowScope: makeRowScope({ a: 'x' }, 0),
              rowKey: 'r1',
              rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: 'r1' }],
              isExpanded: false,
              isSelected: false,
              isEven: true,
            },
            { rowSelection: { type: 'checkbox' } } as TableSchema,
            [{ name: 'a', label: 'A' }] as TableColumnSchema[],
            parentProps.helpers,
            parentProps,
            layout,
            false,
            false,
            vi.fn(),
            vi.fn(),
            true,
          )}
        </tbody>
      </table>,
    );

    const selectCell = document.querySelector<HTMLElement>('[data-slot="table-select-cell"]');
    expect(selectCell!.style.width).toBe('40px');
    expect(selectCell!.style.minWidth).toBe('40px');
    expect(selectCell!.style.maxWidth).toBe('40px');
  });

  it('sticky control/data columns keep position + width/minWidth/maxWidth (contract preserved)', () => {
    const layout = createFixedColumnLayout(
      { rowSelection: { type: 'checkbox' } } as TableSchema,
      [{ name: 'a', fixed: 'left', width: 120 }] as TableColumnSchema[],
      false,
    );
    expect(layout.getSelectionCellProps()).toMatchObject({
      fixed: 'left',
      style: expect.objectContaining({
        position: 'sticky',
        left: '0px',
        width: 40,
        minWidth: 40,
        maxWidth: 40,
      }),
    });
    expect(
      layout.getColumnCellProps({ name: 'a', fixed: 'left', width: 120 } as TableColumnSchema, 0),
    ).toMatchObject({
      fixed: 'left',
      style: expect.objectContaining({
        position: 'sticky',
        left: '40px',
        width: 120,
        minWidth: 120,
        maxWidth: 120,
      }),
    });
  });

  it('columnResize:false converges — getColumnWidth returns declared width or undefined, never a 120 fallback', () => {
    function ResizeOffProbe({ onApi }: { onApi: (api: ColumnResizeApi) => void }) {
      const api = useColumnResize([{ name: 'a', label: 'A' }] as TableColumnSchema[], false);
      React.useEffect(() => {
        onApi(api);
      });
      return null;
    }
    let api: ColumnResizeApi | undefined;
    render(<ResizeOffProbe onApi={(value) => (api = value)} />);

    expect(Object.keys(api!.widths).length).toBe(0);
    expect(api!.getColumnWidth({ name: 'a', label: 'A' } as TableColumnSchema, 0)).toBeUndefined();
    expect(api!.getColumnWidth({ name: 'a', label: 'A', width: 100 } as TableColumnSchema, 0)).toBe(100);
    expect(api!.getColumnWidth({ name: 'a', label: 'A', width: '180px' } as TableColumnSchema, 0)).toBe(
      '180px',
    );
  });

  it('resizable explicit-width columns are still tracked in widths for resize', () => {
    function ResizeOnProbe({ onApi }: { onApi: (api: ColumnResizeApi) => void }) {
      const api = useColumnResize(
        [
          { name: 'a', label: 'A', width: 100 },
          { name: 'b', label: 'B' },
        ] as TableColumnSchema[],
        true,
      );
      React.useEffect(() => {
        onApi(api);
      });
      return null;
    }
    let api: ColumnResizeApi | undefined;
    render(<ResizeOnProbe onApi={(value) => (api = value)} />);

    expect(api!.widths).toEqual({ a: 100 });
    expect(api!.getColumnWidth({ name: 'a', label: 'A', width: 100 } as TableColumnSchema, 0)).toBe(100);
    expect(api!.getColumnWidth({ name: 'b', label: 'B' } as TableColumnSchema, 1)).toBeUndefined();
  });

  it('H10 (P2-01): fixedColumnLayout identity churn without content change keeps row locality', () => {
    // The comparator covers every `fixedColumnLayout` content input BY CONTENT
    // (columns via areColumnsRenderEquivalent incl. fixed/width, rowSelection,
    // showExpandColumn). A content-equal layout identity churn must NOT
    // re-render the row — a direct identity check would break the table
    // single-row locality contract (playground performance-table diagnostic:
    // sibling probe delta 0 → 2, verified 2026-08-09).
    const cellRegion = vi.fn(() => <span>cell</span>);
    const parentProps = makeParentProps({
      props: { expandable: {}, rowSelection: { type: 'checkbox' } },
      regions: { cell: { render: cellRegion } },
    });
    const columns = [{ name: 'name', cellRegionKey: 'cell' }] as TableColumnSchema[];
    const rowScope = makeRowScope({ name: 'Alice' }, 0);
    const item = {
      kind: 'data' as const,
      entry: { rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } },
      rowScope,
      rowKey: 'r1',
      rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: 'r1' }],
      isExpanded: false,
      isSelected: false,
      isEven: true,
    };
    const onToggleExpand = vi.fn();
    const onSelectRow = vi.fn();
    const schemaProps = { rowSelection: { type: 'checkbox' } } as TableSchema;
    const renderRow = (layout: FixedColumnLayout) => (
      <table>
        <tbody>
          {renderDataRow(
            item,
            schemaProps,
            columns,
            parentProps.helpers,
            parentProps,
            layout,
            false,
            false,
            onToggleExpand,
            onSelectRow,
            true,
          )}
        </tbody>
      </table>
    );
    const layoutA = createFixedColumnLayout({ rowSelection: { type: 'checkbox' } } as TableSchema, [], false);
    const layoutB = createFixedColumnLayout({ rowSelection: { type: 'checkbox' } } as TableSchema, [], false);
    expect(layoutA).not.toBe(layoutB);

    const { rerender } = render(renderRow(layoutA));
    expect(cellRegion).toHaveBeenCalledTimes(1);
    cellRegion.mockClear();

    // Same layout identity → locality preserved.
    rerender(renderRow(layoutA));
    expect(cellRegion).not.toHaveBeenCalled();

    // Content-equal layout identity churn → locality still preserved
    // (sticky styles derive from the compared content inputs).
    cellRegion.mockClear();
    rerender(renderRow(layoutB));
    expect(cellRegion).not.toHaveBeenCalled();
  });
});

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TableColumnSchema } from '../schemas.js';
import { TableHeaderRow } from '../table-renderer/table-header-row.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

function noopFixedLayout(): FixedColumnLayout {
  return {
    getColumnCellProps: () => ({ className: '', style: {} }),
    getDragCellProps: () => ({ className: '', style: {} }),
    getExpandCellProps: () => ({ className: '', style: {} }),
    getSelectionCellProps: () => ({ className: '', style: {} }),
  } as unknown as FixedColumnLayout;
}

function makeParentProps() {
  return {
    props: {} as never,
    regions: {},
    events: {},
    node: { scope: {}, instancePath: '' },
    meta: {},
    helpers: {},
  } as never;
}

/**
 * V12f Phase 1 — [G3-R4-视角8-02] 嵌套表头 + affixHeader：所有表头行共用
 * `top: 0` 粘性定位，滚动后组表头被叶子表头完全覆盖（表头塌成一行）。
 * 契约：每行粘性 top 必须按其上方表头行的实测高度逐行推入（首行 0），
 * 且层级 z-index 组行 > 叶子行（重叠瞬态下组行可绘制在叶行之上）。
 */
describe('V12f [G3-R4-视角8-02] affix nested header sticky stacking', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('gives each header row a distinct sticky top from measured row heights', async () => {
    const columns = [
      {
        name: 'group',
        label: 'Group',
        children: [
          { name: 'a', label: 'A' },
          { name: 'b', label: 'B' },
        ],
      },
    ] as unknown as TableColumnSchema[];

    const rowHeights = new Map<string, number>();
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const height =
          rowHeights.get(this.className) ??
          (this.classList.contains('nop-table-header-leaf')
            ? 36
            : this.classList.contains('nop-table-header-group')
              ? 40
              : 0);
        return {
          width: 100,
          height,
          top: 0,
          left: 0,
          right: 100,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });
    void rectSpy;

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
            fixedColumnLayout={noopFixedLayout()}
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

    const rows = container.querySelectorAll<HTMLElement>('tr.nop-table-header-sticky');
    expect(rows.length).toBe(2);

    const groupRow = rows[0]!;
    const leafRow = rows[1]!;
    expect(groupRow.classList.contains('nop-table-header-group')).toBe(true);
    expect(leafRow.classList.contains('nop-table-header-leaf')).toBe(true);

    // Group row sticks at the very top; leaf row sticks right below the
    // measured group-row height (40px) instead of sharing `top: 0`.
    expect(groupRow.style.top).toBe('0px');
    expect(leafRow.style.top).toBe('40px');

    // Layering contract: on transient overlap the group row paints above.
    expect(Number(groupRow.style.zIndex)).toBeGreaterThan(Number(leafRow.style.zIndex));
  });
});

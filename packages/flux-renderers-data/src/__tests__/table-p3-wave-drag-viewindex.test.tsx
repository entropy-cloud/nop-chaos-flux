import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { act } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { renderDataRow, type FlattenedRow } from '../table-renderer/table-body-row-rendering.js';
import { useRowDragSort } from '../table-renderer/use-row-drag-sort.js';
import type { TableRowEntry } from '../table-renderer/types.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

const scopeUpdate = vi.fn();
vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: scopeUpdate }),
  useRendererEnv: () => ({ notify: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  scopeUpdate.mockClear();
});

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

function makeParentProps() {
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
  } as any;
}

function makeRowEntry(id: string, index: number, viewIndex: number): TableRowEntry {
  return { rowKey: id, cacheKey: id, sourceIndex: index, viewIndex, record: { id, name: id } };
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

function buildRow(id: string, viewIndex: number): FlattenedRow {
  return {
    kind: 'data',
    entry: makeRowEntry(id, viewIndex, viewIndex),
    rowScope: makeRowScope({ id, name: id }, viewIndex),
    rowKey: id,
    rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: id }],
    isExpanded: false,
    isSelected: false,
    isEven: viewIndex % 2 === 0,
  };
}

const columns: TableColumnSchema[] = [{ type: 'column', name: 'name' }] as TableColumnSchema[];

/**
 * [G3-R4-视角4-01] drag reorder indexes are DATA-ROW positions (entry.viewIndex),
 * not flattened render positions. Simulated virtual window: an expanded detail
 * row occupies flattened position 1, so row "b" renders at rowIndex=2 while its
 * data-row viewIndex stays 1. ArrowDown must swap b with the NEXT DATA ROW (c),
 * not fall off the end of orderedKeys.
 */
describe('[G3-R4-视角4-01] drag reorder uses the data-row viewIndex', () => {
  it('keyboard reorder from a shifted render index still swaps with the next data row', () => {
    const onReorder = vi.fn();
    const rows = [
      makeRowEntry('a', 0, 0),
      makeRowEntry('b', 1, 1),
      makeRowEntry('c', 2, 2),
    ];

    function Harness({ api }: { api: ReturnType<typeof useRowDragSort> }) {
      // "b" renders at flattened index 2 (an expanded detail row sits at 1).
      return (
        <table>
          <tbody>
            {renderDataRow(
              buildRow('b', 1),
              { type: 'table', draggable: true } as TableSchema,
              columns,
              makeParentProps().helpers,
              makeParentProps(),
              noopFixedLayout,
              false,
              false,
              () => {},
              () => {},
              false,
              undefined,
              undefined,
              undefined,
              2,
              false,
              new Set<string>(),
              () => {},
              () => {},
              undefined,
              true,
              api,
            )}
          </tbody>
        </table>
      );
    }

    function Sink({ onReady }: { onReady: (api: ReturnType<typeof useRowDragSort>) => void }) {
      const api = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows,
        onReorder,
      });
      React.useEffect(() => {
        onReady(api);
      });
      return api ? <Harness api={api} /> : null;
    }

    const { container } = render(<Sink onReady={() => {}} />);
    const dragHandle = container.querySelector('[data-slot="table-row-drag-handle"]') as HTMLElement;
    expect(dragHandle).toBeTruthy();

    fireEvent.keyDown(dragHandle, { key: 'ArrowDown' });

    // OLD (buggy) behavior: rowIndex 2 + 1 = 3 → out of bounds → no reorder at
    // all. NEW behavior: reorderIndex 1 → swap b with c.
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('drop reorder also lands on the data-row position (pointer path)', () => {
    const onReorder = vi.fn();
    const rows = [makeRowEntry('a', 0, 0), makeRowEntry('b', 1, 1), makeRowEntry('c', 2, 2)];

    function Probe({ onReady }: { onReady: (api: ReturnType<typeof useRowDragSort>) => void }) {
      const api = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows,
        onReorder,
      });
      React.useEffect(() => {
        onReady(api);
      });
      return null;
    }

    let api: ReturnType<typeof useRowDragSort>;
    render(<Probe onReady={(v) => (api = v)} />);
    act(() => {
      // dragStart records fromIndex=1 (b's viewIndex), drop on c (viewIndex=2):
      // with the flattened index (3) the drop would be a silent no-op.
      api!.dragHandleProps('b', 1).onDragStart({
        dataTransfer: { effectAllowed: '', setData: () => {} },
      } as unknown as React.DragEvent<HTMLElement>);
      api!.dragHandleProps('c', 2).onDrop({
        preventDefault: () => {},
        dataTransfer: { dropEffect: '' },
      } as unknown as React.DragEvent<HTMLElement>);
    });
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });
});

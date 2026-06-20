import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { act } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { renderDataRow, type FlattenedRow } from '../table-renderer/table-body-row-rendering.js';
import { useRowDragSort } from '../table-renderer/use-row-drag-sort.js';
import type { TableRowEntry } from '../table-renderer/types.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: vi.fn() }),
}));

afterEach(cleanup);

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

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

function makeRowEntry(record: Record<string, unknown>, sourceIndex: number, rowKey?: string): TableRowEntry {
  return {
    rowKey: rowKey ?? String(record.id ?? sourceIndex),
    cacheKey: rowKey ?? String(record.id ?? sourceIndex),
    sourceIndex,
    record,
  };
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

function buildRow(record: Record<string, unknown>, index: number, rowKey: string): FlattenedRow {
  return {
    kind: 'data',
    entry: makeRowEntry(record, index, rowKey),
    rowScope: makeRowScope(record, index),
    rowKey,
    rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: rowKey }],
    isExpanded: false,
    isSelected: false,
    isEven: index % 2 === 0,
  };
}

describe('useRowDragSort hook', () => {
  it('returns null when disabled', () => {
    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useRowDragSort({
        enabled: false,
        orderField: 'order',
        ownership: 'local',
        rows: [makeRowEntry({ id: '1' }, 0, '1')],
      });
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }
    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);
    expect(api).toBeNull();
  });

  it('returns api with dragHandleProps when enabled', () => {
    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows: [makeRowEntry({ id: '1' }, 0, '1')],
      });
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }
    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);
    expect(api).not.toBeNull();
    const handleProps = api.dragHandleProps('1', 0);
    expect(handleProps['data-slot']).toBe('table-row-drag-handle');
    expect(handleProps.draggable).toBe(true);
    expect(handleProps.role).toBe('button');
  });

  it('invokes onReorder with reordered keys when drag completes', () => {
    const onReorder = vi.fn();
    const rows = [
      makeRowEntry({ id: 'a' }, 0, 'a'),
      makeRowEntry({ id: 'b' }, 1, 'b'),
      makeRowEntry({ id: 'c' }, 2, 'c'),
    ];

    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows,
        onReorder,
      });
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }
    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);

    const sourceHandle = api.dragHandleProps('a', 0);
    const targetHandle = api.dragHandleProps('c', 2);

    act(() => {
      sourceHandle.onDragStart({ dataTransfer: { effectAllowed: 'move', setData: () => {} } } as any);
    });
    act(() => {
      targetHandle.onDragOver({ preventDefault: () => {}, dataTransfer: { dropEffect: 'move' } } as any);
    });
    act(() => {
      targetHandle.onDrop({ preventDefault: () => {} } as any);
    });

    expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
  });

  it('warns when orderField is missing (Failure Path e1c-drag-no-orderField)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useRowDragSort({
        enabled: true,
        ownership: 'local',
        rows: [makeRowEntry({ id: '1' }, 0, '1')],
      });
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }
    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('orderField'));
    expect(api).not.toBeNull();
    warnSpy.mockRestore();
  });
});

describe('renderDataRow draggable rendering', () => {
  const columns: TableColumnSchema[] = [{ type: 'column', name: 'name' }] as TableColumnSchema[];

  it('renders drag handle cell when draggable + rowDragSortApi provided', () => {
    function Harness() {
      const api = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows: [makeRowEntry({ id: 'a' }, 0, 'a')],
      });
      return (
        <table>
          <tbody>
            {renderDataRow(
              buildRow({ name: 'row-a' }, 0, 'a'),
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
              0,
              false,
              undefined,
              undefined,
              true,
              api,
            )}
          </tbody>
        </table>
      );
    }

    const { container } = render(<Harness />);
    const dragCell = container.querySelector('[data-slot="table-drag-cell"]');
    expect(dragCell).toBeTruthy();
    const dragHandle = container.querySelector('[data-slot="table-row-drag-handle"]');
    expect(dragHandle).toBeTruthy();
    const row = container.querySelector('[data-slot="table-row"]') as HTMLElement;
    expect(row.getAttribute('data-draggable')).toBe('true');
  });

  it('does not render drag handle when not draggable (baseline)', () => {
    const parentProps = makeParentProps();
    const { container } = render(
      <table>
        <tbody>
          {renderDataRow(
            buildRow({ name: 'a' }, 0, 'a'),
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

    expect(container.querySelector('[data-slot="table-drag-cell"]')).toBeNull();
    expect(container.querySelector('[data-slot="table-row-drag-handle"]')).toBeNull();
  });
});

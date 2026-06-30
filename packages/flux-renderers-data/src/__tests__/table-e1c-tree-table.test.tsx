import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { act, fireEvent } from '@testing-library/react';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import { renderDataRow, type FlattenedRow } from '../table-renderer/table-body-row-rendering.js';
import {
  flattenTreeRows,
  useTableTree,
  type TreeRowEntry,
} from '../table-renderer/use-table-tree.js';
import type { TableRowEntry } from '../table-renderer/types.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

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

function buildTreeFlattenedRow(
  record: Record<string, unknown>,
  index: number,
  rowKey: string,
  level: number,
  hasChildren: boolean,
): FlattenedRow {
  const entry: TreeRowEntry = {
    ...makeRowEntry(record, index, rowKey),
    level,
    hasChildren,
    treePath: [rowKey],
  };
  return {
    kind: 'data',
    entry,
    rowScope: makeRowScope(record, index),
    rowKey,
    rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: rowKey }],
    isExpanded: false,
    isSelected: false,
    isEven: index % 2 === 0,
  };
}

describe('flattenTreeRows helper', () => {
  it('flattens 2-level tree without expanding (only roots visible)', () => {
    const rows: TableRowEntry[] = [
      makeRowEntry({ id: '1', name: 'root1', children: [{ id: '1-1', name: 'child' }] }, 0, '1'),
      makeRowEntry({ id: '2', name: 'root2' }, 1, '2'),
    ];

    const result = flattenTreeRows(rows, {
      rowChildrenField: 'children',
      expandedTreeRowKeys: new Set(),
    });

    expect(result.length).toBe(2);
    expect(result[0]).toMatchObject({ rowKey: '1', level: 0, hasChildren: true });
    expect(result[1]).toMatchObject({ rowKey: '2', level: 0, hasChildren: false });
  });

  it('expands children when rowKey in expandedTreeRowKeys', () => {
    const rows: TableRowEntry[] = [
      makeRowEntry(
        { id: '1', name: 'root1', children: [{ id: '1-1', name: 'c1' }, { id: '1-2', name: 'c2' }] },
        0,
        '1',
      ),
    ];

    const result = flattenTreeRows(rows, {
      rowChildrenField: 'children',
      expandedTreeRowKeys: new Set(['1']),
    });

    expect(result.length).toBe(3);
    expect(result[0]).toMatchObject({ rowKey: '1', level: 0 });
    expect(result[1]).toMatchObject({ level: 1, parentRowKey: '1' });
    expect(result[2]).toMatchObject({ level: 1, parentRowKey: '1' });
  });

  it('supports 3-level expansion when both parent and grandparent expanded', () => {
    const rows: TableRowEntry[] = [
      makeRowEntry(
        {
          id: '1',
          children: [
            {
              id: '1-1',
              children: [{ id: '1-1-1', name: 'grand' }],
            },
          ],
        },
        0,
        '1',
      ),
    ];

    const result = flattenTreeRows(rows, {
      rowChildrenField: 'children',
      expandedTreeRowKeys: new Set(['1', '1-1']),
    });

    expect(result.length).toBe(3);
    expect(result[2]).toMatchObject({ level: 2 });
  });

  it('detects and truncates cycle without infinite recursion', () => {
    const cyclical: Record<string, unknown> = { id: '1', name: 'loop' };
    cyclical.children = [cyclical];

    const rows: TableRowEntry[] = [makeRowEntry(cyclical, 0, '1')];

    const result = flattenTreeRows(rows, {
      rowChildrenField: 'children',
      expandedTreeRowKeys: new Set(['1']),
    });

    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({ rowKey: '1' });
  });

  it('respects custom rowChildrenField', () => {
    const rows: TableRowEntry[] = [
      makeRowEntry({ id: '1', items: [{ id: '1-1' }] }, 0, '1'),
    ];

    const result = flattenTreeRows(rows, {
      rowChildrenField: 'items',
      expandedTreeRowKeys: new Set(['1']),
    });

    expect(result.length).toBe(2);
    expect(result[0]).toMatchObject({ hasChildren: true });
  });
});

describe('useTableTree hook', () => {
  it('returns flat data when rowChildrenField not declared', () => {
    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useTableTree({ type: 'table' } as TableSchema, [
        makeRowEntry({ id: '1' }, 0, '1'),
        makeRowEntry({ id: '2' }, 1, '2'),
      ]);
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }

    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);

    expect(api.treeMode).toBe(false);
    expect(api.treeRows.length).toBe(2);
  });

  it('toggles tree expansion on click', () => {
    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useTableTree(
        { type: 'table', rowChildrenField: 'children' } as TableSchema,
        [makeRowEntry({ id: '1', children: [{ id: '1-1' }] }, 0, '1')],
      );
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }

    let api: any;
    const { rerender } = render(<Probe onReady={(value) => (api = value)} />);

    expect(api.treeMode).toBe(true);
    expect(api.treeRows.length).toBe(1);
    expect(api.expandedTreeRowKeys.has('1')).toBe(false);

    act(() => api.handleToggleTreeExpand('1'));
    rerender(<Probe onReady={(value) => (api = value)} />);
    expect(api.expandedTreeRowKeys.has('1')).toBe(true);
  });
});

// B3.3 T11 — preload-only tree model: expand/collapse reads preloaded `children`
// synchronously and performs NO per-node lazy / on-expand fetch (locks Decision B:
// lazy-children is DESIGN-ACK-NOT-IMPL, candidate future mirroring input-tree
// `childrenSource`). See `docs/components/table/design.md` §7 B3.3 T11.
describe('B3.3 T11 — preload-only tree (no lazy fetch; locks Decision B)', () => {
  function TreeProbe({
    rows,
    onReady,
  }: {
    rows: TableRowEntry[];
    onReady: (api: any) => void;
  }) {
    const api = useTableTree({ type: 'table', rowChildrenField: 'children' } as TableSchema, rows);
    React.useEffect(() => {
      onReady(api);
    }, [api, onReady]);
    return null;
  }

  it('expand/collapse only reads preloaded children (no fetch fills empty children)', () => {
    const rowsWithChildren: TableRowEntry[] = [
      makeRowEntry({ id: '1', children: [{ id: '1-1' }, { id: '1-2' }] }, 0, '1'),
    ];
    // A node whose `children` field is ABSENT — under a lazy contract, expanding it
    // would fetch children; under the preload-only contract (Decision B), expanding it
    // must yield NO additional rows.
    const rowsWithoutChildren: TableRowEntry[] = [
      makeRowEntry({ id: 'empty', name: 'no-children-field' }, 0, 'empty'),
    ];

    let api: any;
    const { rerender } = render(<TreeProbe rows={rowsWithChildren} onReady={(v) => (api = v)} />);

    expect(api.treeRows.length).toBe(1);
    expect(api.expandedTreeRowKeys.has('1')).toBe(false);

    // Expand a node WITH preloaded children -> children appear synchronously from preload.
    act(() => api.handleToggleTreeExpand('1'));
    rerender(<TreeProbe rows={rowsWithChildren} onReady={(v) => (api = v)} />);
    expect(api.treeRows.length).toBe(3); // root + 2 preloaded children
    expect(api.expandedTreeRowKeys.has('1')).toBe(true);

    // Collapse -> children disappear (local Set toggle only, no state beyond the Set).
    act(() => api.handleToggleTreeExpand('1'));
    rerender(<TreeProbe rows={rowsWithChildren} onReady={(v) => (api = v)} />);
    expect(api.treeRows.length).toBe(1);
    expect(api.expandedTreeRowKeys.has('1')).toBe(false);

    // Expand a node with NO preloaded children -> still 1 row (no lazy fetch adds rows).
    // This is the lock for Decision B: there is no on-expand fetch contract.
    rerender(<TreeProbe rows={rowsWithoutChildren} onReady={(v) => (api = v)} />);
    expect(api.treeRows.length).toBe(1);
    act(() => api.handleToggleTreeExpand('empty'));
    rerender(<TreeProbe rows={rowsWithoutChildren} onReady={(v) => (api = v)} />);
    expect(api.treeRows.length).toBe(1);
  });

  it('handleToggleTreeExpand is synchronous and exposes no async load/fetch callback', () => {
    const rows: TableRowEntry[] = [
      makeRowEntry({ id: '1', children: [{ id: '1-1' }] }, 0, '1'),
    ];
    let api: any;
    render(<TreeProbe rows={rows} onReady={(v) => (api = v)} />);

    // The hook api exposes only treeMode / treeRows / expandedTreeRowKeys /
    // handleToggleTreeExpand — there is no loadChildren / fetchChildren / defer method,
    // i.e. no lazy-load contract surface.
    expect(Object.keys(api).sort()).toEqual(
      ['expandedTreeRowKeys', 'handleToggleTreeExpand', 'treeMode', 'treeRows'].sort(),
    );

    // handleToggleTreeExpand returns void (synchronous local Set mutation), not a Promise.
    const result = api.handleToggleTreeExpand('1');
    expect(result).toBeUndefined();
  });
});

describe('renderDataRow tree mode', () => {
  const columns: TableColumnSchema[] = [{ type: 'column', name: 'name' }] as TableColumnSchema[];

  it('renders tree expand toggle for rows with children', () => {
    const parentProps = makeParentProps();
    const row = buildTreeFlattenedRow({ id: '1', name: 'root', children: [{ id: '1-1' }] }, 0, '1', 0, true);

    render(
      <table>
        <tbody>
          {renderDataRow(
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
            undefined,
            undefined,
            undefined,
            0,
            true,
            new Set(),
            () => {},
          )}
        </tbody>
      </table>,
    );

    const treeToggle = document.querySelector('[data-slot="table-tree-toggle"]');
    expect(treeToggle).toBeTruthy();

    const tableRow = document.querySelector('[data-slot="table-row"]') as HTMLElement;
    expect(tableRow.getAttribute('data-tree-row')).toBe('true');
    expect(tableRow.getAttribute('data-level')).toBe('0');
  });

  it('does not render tree toggle for rows without children', () => {
    const parentProps = makeParentProps();
    const row = buildTreeFlattenedRow({ id: '1', name: 'root' }, 0, '1', 0, false);

    render(
      <table>
        <tbody>
          {renderDataRow(
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
            undefined,
            undefined,
            undefined,
            0,
            true,
            new Set(),
            () => {},
          )}
        </tbody>
      </table>,
    );

    expect(document.querySelector('[data-slot="table-tree-toggle"]')).toBeNull();
  });

  it('applies paddingLeft indent based on tree level', () => {
    const parentProps = makeParentProps();
    const row = buildTreeFlattenedRow({ id: '1-1', name: 'child' }, 0, '1-1', 2, false);

    const { container } = render(
      <table>
        <tbody>
          {renderDataRow(
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
            undefined,
            undefined,
            undefined,
            0,
            true,
            new Set(),
            () => {},
          )}
        </tbody>
      </table>,
    );

    const cell = container.querySelector('[data-slot="table-row"] td') as HTMLElement;
    expect(cell.style.paddingLeft).toBe('2.5rem');
  });

  it('calls onToggleTreeExpand when tree toggle clicked', () => {
    const onToggleTreeExpand = vi.fn();
    const parentProps = makeParentProps();
    const row = buildTreeFlattenedRow({ id: '1', name: 'root', children: [{ id: '1-1' }] }, 0, '1', 0, true);

    render(
      <table>
        <tbody>
          {renderDataRow(
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
            undefined,
            undefined,
            undefined,
            0,
            true,
            new Set(),
            onToggleTreeExpand,
          )}
        </tbody>
      </table>,
    );

    const treeToggle = document.querySelector('[data-slot="table-tree-toggle"]') as HTMLElement;
    act(() => {
      fireEvent.click(treeToggle);
    });
    expect(onToggleTreeExpand).toHaveBeenCalledWith('1');
  });

  it('non-tree mode baseline: no tree markers', () => {
    const parentProps = makeParentProps();
    const entry = makeRowEntry({ id: '1', name: 'flat' }, 0, '1');
    const row: FlattenedRow = {
      kind: 'data',
      entry,
      rowScope: makeRowScope(entry.record, 0),
      rowKey: '1',
      rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: '1' }],
      isExpanded: false,
      isSelected: false,
      isEven: true,
    };

    render(
      <table>
        <tbody>
          {renderDataRow(
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
          )}
        </tbody>
      </table>,
    );

    expect(document.querySelector('[data-slot="table-tree-toggle"]')).toBeNull();
    expect(document.querySelector('[data-slot="table-tree-spacer"]')).toBeNull();
    const tableRow = document.querySelector('[data-slot="table-row"]') as HTMLElement;
    expect(tableRow.getAttribute('data-tree-row')).toBeNull();
  });
});

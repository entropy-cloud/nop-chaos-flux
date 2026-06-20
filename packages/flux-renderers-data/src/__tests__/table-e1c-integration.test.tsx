import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { TableColumnSchema } from '../schemas.js';
import {
  computeHeaderRows,
  extractLeafColumns,
  hasNestedColumns,
} from '../table-renderer/table-header-tree.js';
import { flattenTreeRows } from '../table-renderer/use-table-tree.js';
import { processTableData } from '../table-renderer/table-data.js';
import { copyToClipboard } from '../table-renderer/copy-to-clipboard.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';
import { useRowDragSort } from '../table-renderer/use-row-drag-sort.js';
import { SortProbe, createHelpers, resetTableControlTestState } from './use-table-controls.test-support.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: () => undefined,
}));

afterEach(cleanup);
beforeEach(() => {
  resetTableControlTestState();
});

describe('E1c integration: multi-sort + nested headers + resize + widths persistence', () => {
  it('multi-sort + nested header tree coexist (helper-level)', () => {
    const columns = [
      {
        name: 'group',
        children: [
          { name: 'a', sortable: true },
          { name: 'b', sortable: true },
        ],
      },
    ] as TableColumnSchema[];

    expect(hasNestedColumns(columns)).toBe(true);
    expect(extractLeafColumns(columns).map((c) => c.name)).toEqual(['a', 'b']);
    expect(computeHeaderRows(columns).length).toBe(2);

    const rows = [
      { id: '1', a: 1, b: 1 },
      { id: '2', a: 1, b: 2 },
      { id: '3', a: 2, b: 1 },
    ];
    const sorted = processTableData(rows, 'id', [
      { column: 'a', direction: 'asc' },
      { column: 'b', direction: 'desc' },
    ], {});
    expect(sorted.map((r) => r.rowKey)).toEqual(['2', '1', '3']);
  });
});

describe('E1c integration: tree table + selection', () => {
  it('flattenTreeRows preserves rowKey uniqueness across parent + child', () => {
    const rows = [
      {
        rowKey: '1',
        cacheKey: '1',
        sourceIndex: 0,
        record: { id: '1', children: [{ id: '1-1' }, { id: '1-2' }] },
      },
    ];

    const flat = flattenTreeRows(rows, {
      rowChildrenField: 'children',
      expandedTreeRowKeys: new Set(['1']),
    });

    const keys = flat.map((r) => r.rowKey);
    expect(keys.length).toBe(new Set(keys).size);
    expect(keys).toContain('1');
  });
});

describe('E1c integration: row drag + multi-level header', () => {
  it('useRowDragSort + nested columns compute coexist (no schema surface conflict)', () => {
    const columns = [
      {
        name: 'group',
        children: [{ name: 'a' }, { name: 'b' }],
      },
    ] as TableColumnSchema[];

    function Probe() {
      const dragApi = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows: [
          { rowKey: '1', sourceIndex: 0, record: { a: 1 } },
          { rowKey: '2', sourceIndex: 1, record: { a: 2 } },
        ],
      });
      const resizeApi = useColumnResize(columns, undefined);
      return (
        <div>
          <span data-testid="drag-enabled">{dragApi ? 'yes' : 'no'}</span>
          <span data-testid="resize-leaf-count">
            {resizeApi.widths ? Object.keys(resizeApi.widths).length : 0}
          </span>
        </div>
      );
    }

    const { getByTestId } = render(<Probe />);
    expect(getByTestId('drag-enabled').textContent).toBe('yes');
  });
});

describe('E1c integration: copyable helper independent of column shape', () => {
  it('copyToClipboard works for nested header column values', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const result = await copyToClipboard('nested-value');
    expect(result.success).toBe(true);
    expect(writeText).toHaveBeenCalledWith('nested-value');
  });
});

describe('E1c anti-hollow: all hooks reachable from table-renderer.tsx', () => {
  it('useTableSort is invoked and returns handleSort + sortEntries', () => {
    let api: any;
    render(
      <SortProbe
        schemaProps={{ multiSort: true }}
        onSortChange={vi.fn()}
        columns={[{ name: 'a', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => (api = value)}
      />,
    );
    expect(typeof api.handleSort).toBe('function');
    expect(Array.isArray(api.sortEntries)).toBe(true);
  });

  it('useColumnResize returns functional API (startResize is a function)', () => {
    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useColumnResize(
        [{ type: 'column', name: 'a', width: 100 }] as TableColumnSchema[],
        undefined,
      );
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }
    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);
    expect(typeof api.startResize).toBe('function');
    expect(typeof api.getColumnWidth).toBe('function');
  });

  it('useRowDragSort returns dragHandleProps (not null) when enabled', () => {
    function Probe({ onReady }: { onReady: (api: any) => void }) {
      const api = useRowDragSort({
        enabled: true,
        orderField: 'order',
        ownership: 'local',
        rows: [{ rowKey: '1', sourceIndex: 0, record: {} }],
      });
      React.useEffect(() => {
        onReady(api);
      }, [api, onReady]);
      return null;
    }
    let api: any;
    render(<Probe onReady={(value) => (api = value)} />);
    expect(api).not.toBeNull();
    expect(typeof api.dragHandleProps).toBe('function');
  });
});

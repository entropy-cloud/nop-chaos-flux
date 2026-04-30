import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableBodyRows } from '../table-renderer/table-body-rows';

const useVirtualizerMock = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (...args: unknown[]) => useVirtualizerMock(...args),
}));

function makeTableProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: { expandedRowRegionKey: 'expanded' }, rowSelection: undefined },
    helpers: {
      render: vi.fn((_node, options) =>
        React.createElement(
          'span',
          { 'data-testid': 'expanded-region' },
          JSON.stringify(options?.instancePath ?? []),
        ),
      ),
    },
    regions: {
      expanded: { templateNode: { type: 'text' } },
    },
    events: {},
    node: { instancePath: [{ repeatedTemplateId: 'page-body', instanceKey: 'root' }] },
    meta: {},
    ...overrides,
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
    merge() {},
  } as any;
}

describe('TableBodyRows virtual body', () => {
  afterEach(() => {
    useVirtualizerMock.mockReset();
  });

  it('renders virtual rows with top and bottom padding plus expanded content', () => {
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 260,
      getVirtualItems: () => [
        { index: 0, key: 'row-0', start: 20, end: 64 },
        { index: 1, key: 'expanded-0', start: 64, end: 184 },
      ],
    });

    const rowScopeCache = new Map<string, any>([
      ['1', makeRowScope({ name: 'Alice', email: 'alice@example.com' }, 0)],
    ]);

    render(
      <table>
        <TableBodyRows
          props={makeTableProps()}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[{ label: 'Email', name: 'email' } as any]}
          processedData={
            [
              {
                rowKey: '1',
                sourceIndex: 0,
                record: { name: 'Alice', email: 'alice@example.com' },
              },
            ] as any
          }
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="table-row:test"
          expandedRowKeys={new Set(['1'])}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={<span>Unused</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={true}
          scrollRef={{ current: document.createElement('div') }}
        />
      </table>,
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByTestId('expanded-region')).toBeTruthy();
    expect(document.querySelectorAll('tr[aria-hidden]')).toHaveLength(2);
  });

  it('passes estimateSize/getItemKey inputs through the virtualizer config', () => {
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 0,
      getVirtualItems: () => [],
    });

    const rowScopeCache = new Map<string, any>([['1', makeRowScope({ name: 'Alice' }, 0)]]);

    render(
      <table>
        <TableBodyRows
          props={makeTableProps()}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={[{ rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } }] as any}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="table-row:test"
          expandedRowKeys={new Set(['1'])}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={<span>Unused</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={true}
          scrollRef={{ current: document.createElement('div') }}
        />
      </table>,
    );

    const config = useVirtualizerMock.mock.calls[0]?.[0];
    expect(config.count).toBe(2);
    expect(config.getScrollElement()).toBeTruthy();
    expect(config.estimateSize(0)).toBe(44);
    expect(config.estimateSize(1)).toBe(120);
    expect(config.estimateSize(99)).toBe(44);
    expect(config.getItemKey(0)).toBe('data-1');
    expect(config.getItemKey(1)).toBe('expanded-1');
    expect(config.getItemKey(99)).toBe('item-99');
  });

  it('renders the virtual empty placeholder when no flattened items exist', () => {
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 0,
      getVirtualItems: () => [],
    });

    render(
      <table>
        <TableBodyRows
          props={makeTableProps({ props: { expandable: {}, rowSelection: undefined } })}
          columns={[]}
          responsiveHiddenColumns={[]}
          processedData={[]}
          rowScopeCache={new Map()}
          rowRepeatedTemplateId="table-row:test"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set()}
          columnCount={2}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as any
          }
          emptyContent={<span>Ignored</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={true}
          scrollRef={{ current: document.createElement('div') }}
        />
      </table>,
    );

    expect(document.querySelector('[data-slot="table-empty-row"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="table-empty-cell"]')).toBeTruthy();
  });
});

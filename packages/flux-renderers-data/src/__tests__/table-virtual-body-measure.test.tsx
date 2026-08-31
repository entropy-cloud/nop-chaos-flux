import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableBodyRows } from '../table-renderer/table-body-rows.js';
import type { TableRowEntry } from '../table-renderer/types.js';

let capturedVirtualizer: {
  elementsCache: Map<string, HTMLElement>;
  measureElement: (node: HTMLElement) => void;
  getMeasurements: () => { key: string; size: number; index: number }[];
  getTotalSize: () => number;
} | null = null;

vi.mock('@tanstack/react-virtual', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-virtual')>();
  return {
    ...actual,
    useVirtualizer: (...args: unknown[]) => {
      const instance = actual.useVirtualizer(
        args[0] as Parameters<typeof actual.useVirtualizer>[0],
      );
      capturedVirtualizer = instance as never;
      return instance;
    },
  };
});

afterEach(() => {
  capturedVirtualizer = null;
  cleanup();
});

// TanStack's observeElementRect reads the scroll element's offsetHeight /
// offsetWidth (getRect); happy-dom reports 0, which empties the visible range,
// so the virtual rows never mount. Stub a realistic scroll viewport size.
function makeScrollRef() {
  const scrollDiv = document.createElement('div');
  Object.defineProperty(scrollDiv, 'offsetHeight', { value: 800, configurable: true });
  Object.defineProperty(scrollDiv, 'offsetWidth', { value: 1200, configurable: true });
  return { current: scrollDiv };
}

function makeRowScope(record: Record<string, unknown>, index: number) {
  const $slot = { record, index };
  return {
    id: `scope-${index}`,
    path: `$rows.${index}`,
    value: { ...record, $slot },
    get(path: string) {
      if (path === '$slot') return $slot;
      if (path === '$slot.record') return record;
      if (path === '$slot.index') return index;
      if (path in record) return (record as Record<string, unknown>)[path];
      return undefined;
    },
    has: () => false,
    readOwn: () => ({ ...record, $slot }),
    readVisible: () => ({ ...record, $slot }),
    materializeVisible: () => ({ ...record, $slot }),
    update() {},
    merge() {},
  } as never;
}

describe('virtual body row measurement (15-03)', () => {
  it('binds data/expanded row refs to the virtualizer measureElement with data-index', () => {
    const rowScopeCache = new Map<string, never>([['1', makeRowScope({ name: 'Alice' }, 0)]]);

    render(
      <table>
        <TableBodyRows
          props={
            {
              props: { expandable: { expandedRowRegionKey: 'expanded' }, rowSelection: undefined },
              helpers: { render: vi.fn() },
              regions: {
                expanded: {
                  templateNode: { type: 'text' },
                  render: vi.fn(() => React.createElement('span', null, 'expanded content')),
                },
              },
              events: {},
              node: { instancePath: [{ repeatedTemplateId: 'page-body', instanceKey: 'root' }] },
              meta: {},
            } as never
          }
          columns={[{ label: 'Name', name: 'name' } as never]}
          responsiveHiddenColumns={[]}
          processedData={
            [{ rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } }] as TableRowEntry[]
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
            } as never
          }
          emptyContent={<span>Unused</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={true}
          scrollRef={makeScrollRef()}
        />
      </table>,
    );

    const instance = capturedVirtualizer;
    expect(instance).toBeTruthy();

    const dataRow = instance!.elementsCache.get('data-1');
    expect(dataRow).toBeTruthy();
    expect(dataRow!.getAttribute('data-slot')).toBe('table-row');
    expect(dataRow!.getAttribute('data-index')).toBe('0');

    const expandedRow = instance!.elementsCache.get('expanded-1');
    expect(expandedRow).toBeTruthy();
    expect(expandedRow!.getAttribute('data-slot')).toBe('table-expanded-row');
    expect(expandedRow!.getAttribute('data-index')).toBe('1');
  });

  it('adopts the measured row size in place of the estimate', () => {
    const rowScopeCache = new Map<string, never>([['1', makeRowScope({ name: 'Alice' }, 0)]]);

    render(
      <table>
        <TableBodyRows
          props={
            {
              props: { expandable: {}, rowSelection: undefined },
              helpers: { render: vi.fn() },
              regions: {},
              events: {},
              node: { instancePath: [{ repeatedTemplateId: 'page-body', instanceKey: 'root' }] },
              meta: {},
            } as never
          }
          columns={[{ label: 'Name', name: 'name' } as never]}
          responsiveHiddenColumns={[]}
          processedData={
            [{ rowKey: '1', sourceIndex: 0, record: { name: 'Alice' } }] as TableRowEntry[]
          }
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="table-row:test"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set()}
          columnCount={1}
          isStriped={false}
          fixedColumnLayout={
            {
              getExpandCellProps: () => ({ className: '', style: {} }),
              getSelectionCellProps: () => ({ className: '', style: {} }),
              getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
            } as never
          }
          emptyContent={<span>Unused</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={true}
          scrollRef={makeScrollRef()}
        />
      </table>,
    );

    const instance = capturedVirtualizer!;
    const dataRow = instance.elementsCache.get('data-1');
    expect(dataRow).toBeTruthy();

    // happy-dom reports offsetHeight 0 (the mount-time measure adopts that),
    // so inject a realistic wrapping-content height and re-measure through the
    // same wired path a ResizeObserver callback would take.
    Object.defineProperty(dataRow, 'offsetHeight', {
      value: 200,
      configurable: true,
    });
    act(() => {
      instance.measureElement(dataRow!);
    });

    const measurement = instance.getMeasurements().find((m) => m.key === 'data-1');
    expect(measurement?.size).toBe(200);
    expect(measurement?.size).not.toBe(44);
    expect(instance.getTotalSize()).toBeGreaterThanOrEqual(200);
  });
});

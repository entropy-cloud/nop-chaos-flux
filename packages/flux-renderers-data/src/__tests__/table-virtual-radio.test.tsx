import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableBodyRows } from '../table-renderer/table-body-rows.js';
import type { TableRowEntry } from '../table-renderer/types.js';

const useVirtualizerMock = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (...args: unknown[]) => useVirtualizerMock(...args),
}));

// Base UI Radio.Root re-dispatches a PointerEvent click onto its hidden input;
// jsdom has no PointerEvent constructor (same polyfill shape as
// flux-renderers-form-advanced test-support).
if (typeof globalThis.PointerEvent === 'undefined') {
  class TestPointerEvent extends MouseEvent {
    constructor(
      type: string,
      props: MouseEventInit & { pointerId?: number; pressure?: number } = {},
    ) {
      super(type, props);
    }
  }
  globalThis.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent;
}

function makeTableProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { rowSelection: { type: 'radio' } },
    helpers: { render: vi.fn() },
    regions: {},
    events: {},
    node: { instancePath: [{ repeatedTemplateId: 'page-body', instanceKey: 'root' }] },
    meta: {},
    ...overrides,
  } as any;
}

function makeRowScope(record: Record<string, unknown>, index: number) {
  const $slot = { record, index };
  return {
    id: `scope-${index}`,
    path: `$rows.${index}`,
    value: { ...record, $slot },
    get(path: string) {
      if (path === '$slot') return $slot;
      if (path in record) return (record as any)[path];
      return undefined;
    },
    has: () => false,
    readOwn: () => ({ ...record, $slot }),
    readVisible: () => ({ ...record, $slot }),
    materializeVisible: () => ({ ...record, $slot }),
    update() {},
    merge() {},
  } as any;
}

const fixedColumnLayout = {
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as any;

// [G3-R3-视角4-01] (R2 consistency audit, P0): the virtual body used to render
// bare <TableBody>, detaching RadioGroupItem cells from their RadioGroup —
// single-select was completely dead under virtualization
// (virtual-scroll-interaction).
describe('[G3-R3-视角4-01] virtual body keeps radio selection inside a RadioGroup', () => {
  afterEach(() => {
    useVirtualizerMock.mockReset();
    cleanup();
  });

  function renderVirtualRadioTable() {
    const onSelectRow = vi.fn();
    const rowScopeCache = new Map<string, any>([
      ['r1', makeRowScope({ name: 'Alice' }, 0)],
      ['r2', makeRowScope({ name: 'Bob' }, 1)],
    ]);

    render(
      <table>
        <TableBodyRows
          props={makeTableProps()}
          columns={[{ label: 'Name', name: 'name' } as any]}
          responsiveHiddenColumns={[]}
          processedData={[
            { rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } },
            { rowKey: 'r2', sourceIndex: 1, record: { name: 'Bob' } },
          ] as TableRowEntry[]}
          rowScopeCache={rowScopeCache}
          rowRepeatedTemplateId="table-row:test"
          expandedRowKeys={new Set()}
          selectedRowKeys={new Set(['r2'])}
          columnCount={2}
          isStriped={false}
          fixedColumnLayout={fixedColumnLayout}
          emptyContent={<span>Unused</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={onSelectRow}
          virtualEnabled={true}
          scrollRef={{ current: document.createElement('div') }}
        />
      </table>,
    );

    return { onSelectRow };
  }

  it('wraps virtualized rows in a controlled RadioGroup', () => {
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 88,
      getVirtualItems: () => [
        { index: 0, key: 'row-r1', start: 0, end: 44 },
        { index: 1, key: 'row-r2', start: 44, end: 88 },
      ],
    });

    renderVirtualRadioTable();

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(document.querySelector('[data-slot="radio-group"]')).toBeTruthy();

    const radios = document.querySelectorAll('[data-slot="radio-group-item"]');
    expect(radios.length).toBe(2);
  });

  it('radio clicks propagate through the group to onSelectRow', () => {
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 88,
      getVirtualItems: () => [
        { index: 0, key: 'row-r1', start: 0, end: 44 },
        { index: 1, key: 'row-r2', start: 44, end: 88 },
      ],
    });

    const { onSelectRow } = renderVirtualRadioTable();

    const firstRadio = document.querySelectorAll('[data-slot="radio-group-item"]')[0] as HTMLElement;
    fireEvent.click(firstRadio);

    expect(onSelectRow).toHaveBeenCalledWith('r1', true);
  });
});

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { TableColumnSchema } from '../schemas.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';
import { TableHeaderRow } from '../table-renderer/table-header-row.js';
import type { FixedColumnLayout } from '../table-renderer/fixed-columns.js';

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

const noopFixedLayout: FixedColumnLayout = {
  hasStickyColumns: false,
  getExpandCellProps: () => ({ className: '', style: {} }),
  getSelectionCellProps: () => ({ className: '', style: {} }),
  getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }),
} as unknown as FixedColumnLayout;

const KEYBOARD_STEP = 10;

function Harness({
  columns,
  columnResize,
  onApi,
}: {
  columns: TableColumnSchema[];
  columnResize?: boolean;
  onApi?: (api: any) => void;
}) {
  const props = makeParentProps();
  const resizeApi = useColumnResize(columns, columnResize);
  React.useEffect(() => {
    onApi?.(resizeApi);
  });
  return (
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
          fixedColumnLayout={noopFixedLayout}
          showExpandColumn={false}
          onSort={() => {}}
          onFilter={() => {}}
          onSearch={() => {}}
          onClearFilters={() => {}}
          onSelectAll={() => {}}
          columnResize={columnResize}
          resizeApi={resizeApi}
        />
      </thead>
    </table>
  );
}

describe('20-01 table column resize keyboard a11y (WCAG 2.1.1)', () => {
  it('renders the resize handle with a tab stop (tabIndex=0)', () => {
    render(<Harness columns={[{ name: 'a', label: 'A', width: 120 }] as TableColumnSchema[]} />);

    const handle = document.querySelector('[data-slot="table-column-resize-handle"]');
    expect(handle).toBeTruthy();
    expect(handle?.getAttribute('tabindex')).toBe('0');
  });

  it('ArrowRight increases the column width by the keyboard step', () => {
    render(<Harness columns={[{ name: 'a', label: 'A', width: 120 }] as TableColumnSchema[]} />);

    const handle = document.querySelector('[data-slot="table-column-resize-handle"]') as HTMLElement;
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    });

    const head = document.querySelector('[data-slot="table-head"]') as HTMLElement;
    expect(head.style.width).toBe(`${120 + KEYBOARD_STEP}px`);
  });

  it('ArrowLeft decreases the column width by the keyboard step', () => {
    render(<Harness columns={[{ name: 'a', label: 'A', width: 120 }] as TableColumnSchema[]} />);

    const handle = document.querySelector('[data-slot="table-column-resize-handle"]') as HTMLElement;
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });

    const head = document.querySelector('[data-slot="table-head"]') as HTMLElement;
    expect(head.style.width).toBe(`${120 - KEYBOARD_STEP}px`);
  });

  it('clamps the width at the column minWidth and maxWidth bounds', () => {
    render(
      <Harness
        columns={[{ name: 'a', label: 'A', width: 120, minWidth: 100, maxWidth: 140 }] as TableColumnSchema[]}
      />,
    );

    const handle = document.querySelector('[data-slot="table-column-resize-handle"]') as HTMLElement;
    const head = document.querySelector('[data-slot="table-head"]') as HTMLElement;

    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    });
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    });
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
    });
    expect(head.style.width).toBe('140px');

    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });
    act(() => {
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    });
    expect(head.style.width).toBe('100px');
  });
});

describe('useColumnResize stepResize API', () => {
  it('exposes a stepResize function on the API', () => {
    let api: any;
    render(
      <Harness
        columns={[{ name: 'a', label: 'A', width: 120 }] as TableColumnSchema[]}
        onApi={(value) => (api = value)}
      />,
    );
    expect(typeof api.stepResize).toBe('function');
  });
});

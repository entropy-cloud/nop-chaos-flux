import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeContext } from '@nop-chaos/flux-react';
import { TableBodyRows } from '../table-renderer/table-body-rows.js';
import type { TableRowEntry } from '../table-renderer/types.js';
import type { TableColumnSchema } from '../schemas.js';

afterEach(() => {
  cleanup();
});

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

function makeTableProps() {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: { render: vi.fn() },
    regions: {},
    events: {},
    node: { instancePath: [{ repeatedTemplateId: 'page-body', instanceKey: 'root' }] },
    meta: {},
  } as never;
}

// Identity-stable inputs: the ONLY thing that changes across rerenders is the
// columns array (a schema-update-equivalent input), so a comparator blind to
// `editable` bails the memoized row out and the chrome goes stale.
const stableRowScopeCache = new Map<string, never>([
  ['1', makeRowScope({ name: 'Alice', ok: true }, 0)],
]);
const stableProcessedData = [
  { rowKey: '1', sourceIndex: 0, record: { name: 'Alice', ok: true } },
] as TableRowEntry[];

function renderUi(columns: TableColumnSchema[]) {
  return (
    <RuntimeContext.Provider value={{ env: { notify: vi.fn() } } as never}>
      <table>
        <TableBodyRows
          props={makeTableProps()}
          columns={columns}
          responsiveHiddenColumns={[]}
          processedData={stableProcessedData}
          rowScopeCache={stableRowScopeCache}
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
            } as never
          }
          emptyContent={<span>Unused</span>}
          showExpandColumn={false}
          expandRowByClick={false}
          onToggleExpand={() => {}}
          onSelectRow={() => {}}
          virtualEnabled={false}
        />
      </table>
    </RuntimeContext.Provider>
  );
}

describe('table row comparator reacts to editable-only column changes (13-02)', () => {
  const columnsReadonly = [{ name: 'ok', label: 'OK' }] as TableColumnSchema[];
  const columnsEditable = [{ name: 'ok', label: 'OK', editable: true }] as TableColumnSchema[];

  it('re-renders the row when a schema update only toggles editable on (edit chrome appears)', () => {
    const { container, rerender } = render(renderUi(columnsReadonly));
    expect(container.querySelector('[data-slot="table-editable-cell"]')).toBeNull();

    rerender(renderUi(columnsEditable));
    expect(container.querySelector('[data-slot="table-editable-cell"]')).toBeTruthy();
  });

  it('re-renders the row when a schema update only toggles editable off (edit chrome disappears)', () => {
    const { container, rerender } = render(renderUi(columnsEditable));
    expect(container.querySelector('[data-slot="table-editable-cell"]')).toBeTruthy();

    rerender(renderUi(columnsReadonly));
    expect(container.querySelector('[data-slot="table-editable-cell"]')).toBeNull();
  });
});

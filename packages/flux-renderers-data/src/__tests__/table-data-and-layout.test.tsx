import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TableCell, TableRow } from '@nop-chaos/ui';
import { createFixedColumnLayout } from '../table-renderer/fixed-columns';
import {
  buildTableRowEntries,
  createRowScopeId,
  createRowScopePath,
  createTableRowRepeatedTemplateId,
  normalizeRowKey,
  processTableData,
  serializeInstancePath,
  toSelectionPayload,
  warnOnDuplicateRowKeys,
} from '../table-renderer/table-data';
import {
  buildFlattenedItems,
  renderDataRow,
  renderExpandedRow,
} from '../table-renderer/table-body-row-rendering';

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
    update: vi.fn(),
    merge() {},
  } as any;
}

function makeParentProps(overrides: Record<string, unknown> = {}) {
  return {
    props: { expandable: {}, rowSelection: undefined },
    helpers: {
      render: vi.fn((node, options) => (
        <span data-testid="helper-render">{JSON.stringify({ node, options })}</span>
      )),
    },
    regions: {},
    events: {},
    node: { instancePath: [{ repeatedTemplateId: 'page', instanceKey: 'root' }] },
    meta: {},
    ...overrides,
  } as any;
}

describe('table-data helpers', () => {
  it('normalizes row keys and falls back to legacy index keys', () => {
    expect(normalizeRowKey({ id: 1 }, 0)).toBe('1');
    expect(normalizeRowKey({ __rowKey: 'custom' }, 1)).toBe('custom');
    expect(normalizeRowKey({ nested: { id: 'n1' } }, 2, 'nested.id')).toBe('n1');
    expect(normalizeRowKey({ id: '' }, 3)).toBe('legacy-index:3');
  });

  it('builds row entries, selection payloads, and scope ids', () => {
    expect(buildTableRowEntries([{ id: 1 }, { __rowKey: 'two' }])).toEqual([
      { rowKey: '1', sourceIndex: 0, record: { id: 1 } },
      { rowKey: 'two', sourceIndex: 1, record: { __rowKey: 'two' } },
    ]);

    expect(Array.from(toSelectionPayload(['1', 2 as any]))).toEqual(['1', '2']);
    expect(Array.from(toSelectionPayload({ selectedRowKeys: ['a', 'b'] }))).toEqual(['a', 'b']);
    expect(createTableRowRepeatedTemplateId(5)).toBe('table-row:5');
    expect(createTableRowRepeatedTemplateId(undefined)).toBe('table-row:unknown');
    expect(createRowScopeId('orders', 'r1')).toBe('table:orders:row:r1');
    expect(createRowScopePath('$page.table', 'r1')).toBe('$page.table.rowsByKey.r1');
    expect(serializeInstancePath([{ repeatedTemplateId: 'table-row:1', instanceKey: 'x' }])).toBe('[{"repeatedTemplateId":"table-row:1","instanceKey":"x"}]');
    expect(serializeInstancePath(undefined)).toBe('root');
  });

  it('warns on duplicate row keys when rows collide', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnOnDuplicateRowKeys([
      { rowKey: '1', sourceIndex: 0, record: {} },
      { rowKey: '1', sourceIndex: 1, record: {} },
      { rowKey: '2', sourceIndex: 2, record: {} },
      { rowKey: '2', sourceIndex: 3, record: {} },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('1, 2');
    warnSpy.mockRestore();
  });

  it('processes sorting, filtering, keyword search, null ordering, and pagination', () => {
    const result = processTableData(
      [
      { id: 1, name: 'Bob', role: 'user' },
      { id: 2, name: null, role: 'admin' },
      { id: 3, name: 'Alice', role: 'admin' },
      { id: 4, name: 'Carol', role: 'guest' },
    ],
    undefined,
    { column: 'name', direction: 'asc' },
    {
      role: { values: new Set(['admin']) },
      name: { values: new Set(), keyword: 'ali' },
    },
    true,
    1,
    2,
  );

  expect(result).toEqual([
    { rowKey: '3', sourceIndex: 2, viewIndex: 0, record: { id: 3, name: 'Alice', role: 'admin' } },
  ]);

    const desc = processTableData(
      [{ id: 1, score: 1 }, { id: 2, score: 3 }, { id: 3, score: 2 }],
      undefined,
      { column: 'score', direction: 'desc' },
      {},
      false,
      1,
      10,
    );

    expect(desc.map((entry) => entry.rowKey)).toEqual(['2', '3', '1']);
  });
});

describe('fixed column layout', () => {
  it('computes sticky props for control, left, and right fixed columns', () => {
    const layout = createFixedColumnLayout(
      { expandable: {}, rowSelection: { type: 'checkbox' } } as any,
      [
        { name: 'name', fixed: 'left', width: 120 },
        { name: 'email', fixed: 'right', width: '180px' },
        { name: 'role', width: 'bad' },
      ] as any,
      true,
    );

    expect(layout.hasStickyColumns).toBe(true);
    expect(layout.getExpandCellProps()).toMatchObject({ fixed: 'left' });
    expect(layout.getSelectionCellProps()).toMatchObject({ fixed: 'left' });
    expect(layout.getColumnCellProps({ name: 'name', fixed: 'left', width: 120 } as any, 0)).toMatchObject({
      fixed: 'left',
      style: expect.objectContaining({ left: '80px', width: 120 }),
    });
    expect(layout.getColumnCellProps({ name: 'email', fixed: 'right', width: '180px' } as any, 1)).toMatchObject({
      fixed: 'right',
      style: expect.objectContaining({ right: '0px', width: '180px' }),
    });
    expect(layout.getColumnCellProps({ name: 'role', width: 'bad' } as any, 2)).toEqual({});
  });

  it('returns non-sticky layout when no fixed columns exist', () => {
    const layout = createFixedColumnLayout({} as any, [{ name: 'name' }] as any, false);
    expect(layout.hasStickyColumns).toBe(false);
    expect(layout.getExpandCellProps()).toEqual({});
    expect(layout.getSelectionCellProps()).toEqual({});
  });
});

describe('table row rendering helpers', () => {
  it('builds flattened items with repeated instance paths and expanded rows', () => {
    const parentProps = makeParentProps();
    const rowScope = makeRowScope({ name: 'Alice' }, 0);
    const flattened = buildFlattenedItems(
      [{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }],
      new Map([['r1', rowScope]]),
      new Set(['r1']),
      new Set(['r1']),
      3,
      parentProps,
      'table-row:unit',
    );

    expect(flattened).toHaveLength(2);
    expect(flattened[0]).toMatchObject({ kind: 'data', rowKey: 'r1', isExpanded: true, isSelected: true, isEven: true });
    expect((flattened[0] as any).rowInstancePath).toEqual([
      { repeatedTemplateId: 'page', instanceKey: 'root' },
      { repeatedTemplateId: 'table-row:unit', instanceKey: 'r1' },
    ]);
    expect(flattened[1]).toEqual({ kind: 'expanded', rowKey: 'r1', columnCount: 3 });
  });

  it('renders clickable rows with expand, selection, operation buttons, and value cells', () => {
    const parentProps = makeParentProps({
      props: { expandable: {}, rowSelection: { type: 'checkbox' } },
      events: { onRowClick: vi.fn() },
      helpers: {
        render: vi.fn((node, options) => <span data-testid={`render-${options?.pathSuffix}`}>{String(node.type ?? 'node')}</span>),
      },
      regions: {
        actions: { render: vi.fn(() => <span data-testid="button-region">Actions</span>) },
      },
    });
    const rowScope = makeRowScope({ name: 'Alice' }, 0);
    const onToggleExpand = vi.fn();
    const onSelectRow = vi.fn();

    render(
      <table>
        <tbody>
          {renderDataRow(
            {
              kind: 'data',
              entry: { rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } },
              rowScope,
              rowKey: 'r1',
              rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: 'r1' }],
              isExpanded: false,
              isSelected: true,
              isEven: true,
            },
            { rowSelection: { type: 'checkbox' } } as any,
            [
              { label: 'Actions', type: 'operation', buttonsRegionKey: 'actions' },
              { label: 'Name', name: 'name' },
            ] as any,
            parentProps.helpers,
            parentProps,
            { getExpandCellProps: () => ({ className: 'expand-cell', style: {} }), getSelectionCellProps: () => ({ className: 'select-cell', style: {} }), getColumnCellProps: () => ({ className: 'data-cell', style: {}, fixed: undefined }) } as any,
            true,
            false,
            onToggleExpand,
            onSelectRow,
            true,
          )}
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByLabelText('Expand'));
    fireEvent.click(document.querySelector('[data-slot="checkbox"]')!);
    fireEvent.click(screen.getByText('Alice'));

    expect(onToggleExpand).toHaveBeenCalledWith('r1');
    expect(onSelectRow).toHaveBeenCalledWith('r1', false);
    expect(parentProps.events.onRowClick).toHaveBeenCalled();
    expect(screen.getByTestId('button-region')).toBeTruthy();
  });

  it('renders helper cells, radio selection, row click expansion, and expanded row fallbacks', () => {
    const helperRender = vi.fn((_node, options) => <span data-testid={`helper-${options?.pathSuffix}`}>Helper</span>);
    const parentProps = makeParentProps({
      props: { expandable: { expandedRowRegionKey: 'expanded' }, rowSelection: { type: 'radio' } },
      helpers: { render: helperRender },
      regions: {
        cell: { render: vi.fn(() => <span data-testid="cell-region">Cell region</span>) },
        expanded: { templateNode: { type: 'text' } },
      },
    });
    const rowScope = makeRowScope({ name: 'Alice', email: 'alice@example.com' }, 0);
    const rowScopeCache = new Map([['r1', rowScope]]);
    const onToggleExpand = vi.fn();

    render(
      <table>
        <tbody>
          {renderDataRow(
            {
              kind: 'data',
              entry: { rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice', email: 'alice@example.com' } },
              rowScope,
              rowKey: 'r1',
              rowInstancePath: [{ repeatedTemplateId: 'table-row:unit', instanceKey: 'r1' }],
              isExpanded: true,
              isSelected: false,
              isEven: false,
            },
            { rowSelection: { type: 'radio' } } as any,
            [{ label: 'Name', name: 'name', cellRegionKey: 'cell' }] as any,
            parentProps.helpers,
            parentProps,
            { getExpandCellProps: () => ({ className: '', style: {} }), getSelectionCellProps: () => ({ className: '', style: {} }), getColumnCellProps: () => ({ className: '', style: {}, fixed: undefined }) } as any,
            false,
            true,
            onToggleExpand,
            vi.fn(),
            false,
          )}
          {renderExpandedRow(
            { kind: 'expanded', rowKey: 'r1', columnCount: 2 },
            { expandable: { expandedRowRegionKey: 'expanded' } } as any,
            parentProps.helpers,
            parentProps,
            rowScopeCache,
            'table-row:unit',
            [{ label: 'Email', name: 'email' }] as any,
          )}
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByText('Cell region'));
    expect(onToggleExpand).toHaveBeenCalledWith('r1');
    expect(document.querySelector('[data-slot="radio-group-item"]')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByTestId('helper-expanded.r1')).toBeTruthy();

    expect(renderExpandedRow(
      { kind: 'expanded', rowKey: 'missing', columnCount: 1 },
      {} as any,
      parentProps.helpers,
      parentProps,
      rowScopeCache,
      'table-row:unit',
      [] as any,
    )).toBeNull();
  });
});

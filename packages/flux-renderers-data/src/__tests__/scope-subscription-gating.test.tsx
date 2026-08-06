import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTablePagination } from '../table-renderer/use-table-pagination.js';
import { useTableSelection } from '../table-renderer/use-table-selection.js';
import { useTableSort } from '../table-renderer/use-table-sort.js';
import { useTableFilter } from '../table-renderer/use-table-filter.js';
import { useTableVisibleColumns } from '../table-renderer/use-table-visible-columns.js';
import { useColumnResize } from '../table-renderer/use-column-resize.js';
import { useListPagination } from '../list-pagination.js';
import { useCrudVisibleColumnNames } from '../crud-renderer-ownership.js';
import type { TableSchema, TableColumnSchema } from '../schemas.js';

const { scopeSelectorSpy } = vi.hoisted(() => ({
  scopeSelectorSpy: vi.fn(
    (
      selector: (scopeData: Record<string, unknown>) => unknown,
      _eq?: unknown,
      options?: { enabled?: boolean; fallback?: unknown; paths?: readonly string[] },
    ) => {
      if (options?.enabled === false) {
        return options?.fallback;
      }
      return selector({});
    },
  ),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: scopeSelectorSpy,
}));

beforeEach(() => {
  scopeSelectorSpy.mockClear();
});

function getCallOptions(call: unknown[]) {
  return call[2] as { enabled?: boolean; paths?: readonly string[] } | undefined;
}

function expectAllDisabled() {
  expect(scopeSelectorSpy).toHaveBeenCalled();
  for (const call of scopeSelectorSpy.mock.calls) {
    expect(getCallOptions(call)?.enabled).toBe(false);
  }
}

function expectGated(options: Array<{ enabled: boolean; paths?: readonly string[] }>) {
  expect(scopeSelectorSpy).toHaveBeenCalledTimes(options.length);
  options.forEach((expected, index) => {
    const opts = getCallOptions(scopeSelectorSpy.mock.calls[index]!);
    expect(opts?.enabled, `selector #${index} enabled`).not.toBe(false);
    if (expected.paths) {
      expect(opts?.paths, `selector #${index} paths`).toEqual(expected.paths);
    }
  });
}

const noop = (() => undefined) as any;

const helpers = {
  createScope: () => ({ id: 's', value: {} }),
  evaluate: () => undefined,
  disposeScope: () => undefined,
} as any;

const mockScope = { update: vi.fn(), readVisible: () => ({}) } as any;

describe('data control hooks useScopeSelector ownership gating (05-03)', () => {
  it('useTablePagination: local ownership subscribes nothing; scope subscribes its path', () => {
    renderHook(() => useTablePagination({ pagination: {} } as TableSchema, noop));
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTablePagination(
        { pagination: {}, paginationOwnership: 'scope', paginationStatePath: 'state.page' } as TableSchema,
        noop,
      ),
    );
    expectGated([{ enabled: true, paths: ['state.page'] }]);

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTablePagination({ pagination: {}, paginationOwnership: 'scope' } as TableSchema, noop),
    );
    expectAllDisabled();
  });

  it('useTableSelection: local ownership subscribes nothing; scope subscribes its path', () => {
    renderHook(() =>
      useTableSelection({ rowSelection: {} } as TableSchema, [], noop, helpers),
    );
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTableSelection(
        { rowSelection: {}, selectionOwnership: 'scope', selectionStatePath: 'state.sel' } as TableSchema,
        [],
        noop,
        helpers,
      ),
    );
    expectGated([{ enabled: true, paths: ['state.sel'] }]);
  });

  it('useTableSort: local subscribes nothing; scope subscribes its path in both modes', () => {
    renderHook(() => useTableSort({} as TableSchema, noop, []));
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTableSort(
        { sortOwnership: 'scope', sortStatePath: 'state.sort' } as TableSchema,
        noop,
        [],
      ),
    );
    const [singleCall, multiCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(singleCall)?.enabled).not.toBe(false);
    expect(getCallOptions(singleCall)?.paths).toEqual(['state.sort']);
    expect(getCallOptions(multiCall)?.enabled).toBe(false);

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTableSort(
        { sortOwnership: 'scope', sortStatePath: 'state.sort', multiSort: true } as TableSchema,
        noop,
        [],
      ),
    );
    const [singleCall2, multiCall2] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(singleCall2)?.enabled).toBe(false);
    expect(getCallOptions(multiCall2)?.enabled).not.toBe(false);
    expect(getCallOptions(multiCall2)?.paths).toEqual(['state.sort']);
  });

  it('useTableFilter: local subscribes nothing; scope subscribes its path', () => {
    renderHook(() => useTableFilter({} as TableSchema, noop));
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTableFilter(
        { filterOwnership: 'scope', filterStatePath: 'state.filter' } as TableSchema,
        noop,
      ),
    );
    expectGated([{ enabled: true, paths: ['state.filter'] }]);
  });

  it('useTableVisibleColumns: subscribes only when the respective state path exists', () => {
    const columns = [{ name: 'a', label: 'A' }] as TableColumnSchema[];
    renderHook(() => useTableVisibleColumns({ columns } as TableSchema, columns));
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTableVisibleColumns(
        {
          columns,
          columnSettings: {
            enabled: true,
            toggledColumnsStatePath: 'state.toggled',
            orderedColumnsStatePath: 'state.ordered',
          },
        } as TableSchema,
        columns,
      ),
    );
    expectGated([
      { enabled: true, paths: ['state.toggled'] },
      { enabled: true, paths: ['state.ordered'] },
    ]);

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useTableVisibleColumns(
        { columns, columnSettings: { enabled: true, toggledColumnsStatePath: 'state.toggled' } } as TableSchema,
        columns,
      ),
    );
    const [toggledCall, orderedCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(toggledCall)?.enabled).not.toBe(false);
    expect(getCallOptions(orderedCall)?.enabled).toBe(false);
  });

  it('useColumnResize: local subscribes nothing; scope subscribes its path', () => {
    const columns = [{ name: 'a', width: 100 }] as TableColumnSchema[];
    renderHook(() => useColumnResize(columns, true, { columnWidthsOwnership: 'local' }));
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useColumnResize(columns, true, {
        columnWidthsOwnership: 'scope',
        columnWidthsStatePath: 'state.widths',
      }),
    );
    expectGated([{ enabled: true, paths: ['state.widths'] }]);
  });

  it('useListPagination: local subscribes nothing; scope subscribes its paths', () => {
    renderHook(() =>
      useListPagination({
        config: { enabled: true },
        ownership: 'local',
        paginationStatePath: 'state.page',
        pageSizeStatePath: 'state.size',
        scope: mockScope,
        itemCount: 100,
      }),
    );
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useListPagination({
        config: { enabled: true },
        ownership: 'scope',
        paginationStatePath: 'state.page',
        pageSizeStatePath: 'state.size',
        scope: mockScope,
        itemCount: 100,
      }),
    );
    expectGated([{ enabled: true, paths: ['state.page', 'state.size'] }]);
  });

  it('useCrudVisibleColumnNames: subscribes only when a column-settings path exists', () => {
    renderHook(() =>
      useCrudVisibleColumnNames({ schema: {} as any, defaultColumnNames: ['a'] }),
    );
    expectAllDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useCrudVisibleColumnNames({
        schema: { columnSettings: { enabled: true } } as any,
        defaultColumnNames: ['a'],
        toggledColumnsStatePath: 'state.toggled',
        orderedColumnsStatePath: 'state.ordered',
      }),
    );
    expectGated([
      { enabled: true, paths: ['state.toggled', 'state.ordered'] },
    ]);
  });
});

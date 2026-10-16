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

// 05-03 subscription-gating contract, re-anchored by RM-11 (plan 613): the
// migrated ownership hooks delegate to the shared flux-react primitive
// (`useOwnershipScopeValue`) and are pinned at that boundary; direct
// useScopeSelector consumers (visible columns/crud) stay pinned at the
// useScopeSelector boundary.
const { scopeSelectorSpy, ownershipScopeValueSpy } = vi.hoisted(() => ({
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
  ownershipScopeValueSpy: vi.fn(
    (
      ownership: string,
      _statePath?: string,
      read?: { select?: (scopeData: unknown) => unknown; paths?: readonly string[] },
    ) => (ownership === 'scope' && read?.select ? read.select({}) : undefined),
  ),
}));

vi.mock('@nop-chaos/flux-react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRenderScope: () => ({ update: vi.fn() }),
  useScopeSelector: scopeSelectorSpy,
  useOwnershipScopeValue: ownershipScopeValueSpy,
}));

beforeEach(() => {
  scopeSelectorSpy.mockClear();
  ownershipScopeValueSpy.mockClear();
});

function getCallOptions(call: unknown[]) {
  return call[2] as { enabled?: boolean; paths?: readonly string[] } | undefined;
}

function expectAllDirectCallsDisabled() {
  expect(scopeSelectorSpy).toHaveBeenCalled();
  for (const call of scopeSelectorSpy.mock.calls) {
    expect(getCallOptions(call)?.enabled).toBe(false);
  }
}

function expectNoScopeSubscriptions() {
  expect(ownershipScopeValueSpy).toHaveBeenCalled();
  for (const call of ownershipScopeValueSpy.mock.calls) {
    expect(call[0], 'ownership').not.toBe('scope');
  }
}

function expectScopeSubscriptions(expected: Array<{ paths: readonly string[] }>) {
  const scopeCalls = ownershipScopeValueSpy.mock.calls.filter((call) => call[0] === 'scope');
  expect(scopeCalls.length, 'scope-mode call count').toBe(expected.length);
  expected.forEach((want, index) => {
    const call = scopeCalls[index]!;
    const read = call[2] as { paths?: readonly string[] } | undefined;
    expect(read?.paths ?? [call[1]], `subscription #${index} paths`).toEqual(want.paths);
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
    expectNoScopeSubscriptions();

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useTablePagination(
        { pagination: {}, paginationOwnership: 'scope', paginationStatePath: 'state.page' } as TableSchema,
        noop,
      ),
    );
    expectScopeSubscriptions([{ paths: ['state.page'] }]);

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useTablePagination({ pagination: {}, paginationOwnership: 'scope' } as TableSchema, noop),
    );
    expectNoScopeSubscriptions();
  });

  it('useTableSelection: local ownership subscribes nothing; scope subscribes its path', () => {
    renderHook(() =>
      useTableSelection({ rowSelection: {} } as TableSchema, [], noop, helpers),
    );
    expectNoScopeSubscriptions();

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useTableSelection(
        { rowSelection: {}, selectionOwnership: 'scope', selectionStatePath: 'state.sel' } as TableSchema,
        [],
        noop,
        helpers,
      ),
    );
    expectScopeSubscriptions([{ paths: ['state.sel'] }]);
  });

  it('useTableSort: local subscribes nothing; scope subscribes its path in both modes', () => {
    renderHook(() => useTableSort({} as TableSchema, noop, []));
    expectNoScopeSubscriptions();

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useTableSort(
        { sortOwnership: 'scope', sortStatePath: 'state.sort' } as TableSchema,
        noop,
        [],
      ),
    );
    {
      const [singleCall, multiCall] = ownershipScopeValueSpy.mock.calls;
      expect(singleCall![0]).toBe('scope');
      expect(singleCall![1]).toBe('state.sort');
      expect(multiCall![0]).not.toBe('scope');
    }

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useTableSort(
        { sortOwnership: 'scope', sortStatePath: 'state.sort', multiSort: true } as TableSchema,
        noop,
        [],
      ),
    );
    {
      const [singleCall, multiCall] = ownershipScopeValueSpy.mock.calls;
      expect(singleCall![0]).not.toBe('scope');
      expect(multiCall![0]).toBe('scope');
      expect(multiCall![1]).toBe('state.sort');
    }
  });

  it('useTableFilter: local subscribes nothing; scope subscribes its path', () => {
    renderHook(() => useTableFilter({} as TableSchema, noop));
    expectNoScopeSubscriptions();

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useTableFilter(
        { filterOwnership: 'scope', filterStatePath: 'state.filter' } as TableSchema,
        noop,
      ),
    );
    expectScopeSubscriptions([{ paths: ['state.filter'] }]);
  });

  it('useTableVisibleColumns: subscribes only when the respective state path exists', () => {
    const columns = [{ name: 'a', label: 'A' }] as TableColumnSchema[];
    renderHook(() => useTableVisibleColumns({ columns } as TableSchema, columns));
    expectAllDirectCallsDisabled();

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
    const gated = [
      { enabled: true, paths: ['state.toggled'] },
      { enabled: true, paths: ['state.ordered'] },
    ];
    expect(scopeSelectorSpy.mock.calls.length).toBe(gated.length);
    gated.forEach((want, index) => {
      const opts = getCallOptions(scopeSelectorSpy.mock.calls[index]!);
      expect(opts?.enabled, `selector #${index} enabled`).not.toBe(false);
      expect(opts?.paths, `selector #${index} paths`).toEqual(want.paths);
    });

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
    expectNoScopeSubscriptions();

    ownershipScopeValueSpy.mockClear();
    renderHook(() =>
      useColumnResize(columns, true, {
        columnWidthsOwnership: 'scope',
        columnWidthsStatePath: 'state.widths',
      }),
    );
    expectScopeSubscriptions([{ paths: ['state.widths'] }]);
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
    expectNoScopeSubscriptions();

    ownershipScopeValueSpy.mockClear();
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
    expectScopeSubscriptions([{ paths: ['state.page', 'state.size'] }]);
  });

  it('useCrudVisibleColumnNames: subscribes only when a column-settings path exists', () => {
    renderHook(() =>
      useCrudVisibleColumnNames({ schema: {} as any, defaultColumnNames: ['a'] }),
    );
    expectAllDirectCallsDisabled();

    scopeSelectorSpy.mockClear();
    renderHook(() =>
      useCrudVisibleColumnNames({
        schema: { columnSettings: { enabled: true } } as any,
        defaultColumnNames: ['a'],
        toggledColumnsStatePath: 'state.toggled',
        orderedColumnsStatePath: 'state.ordered',
      }),
    );
    const gated = [{ enabled: true, paths: ['state.toggled', 'state.ordered'] }];
    expect(scopeSelectorSpy.mock.calls.length).toBe(gated.length);
    gated.forEach((want, index) => {
      const opts = getCallOptions(scopeSelectorSpy.mock.calls[index]!);
      expect(opts?.enabled, `selector #${index} enabled`).not.toBe(false);
      expect(opts?.paths, `selector #${index} paths`).toEqual(want.paths);
    });
  });
});

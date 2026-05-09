import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHelpers,
  ExpandProbe,
  FilterProbe,
  SortProbe,
  renderScopeUpdate,
  resetTableControlTestState,
  mockScopeState,
} from './use-table-controls.test-support.js';

describe('useTableSort', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('toggles local sort state and ignores unsortable columns', () => {
    const helpers = createHelpers();
    const onSortChange = vi.fn();
    let api: any;

    render(
      <SortProbe
        schemaProps={{}}
        onSortChange={onSortChange}
        columns={[
          { name: 'name', sortable: true },
          { name: 'age', sortable: false },
        ]}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleSort('age');
    });
    expect(api.sortState).toEqual({ column: '', direction: null });

    act(() => {
      api.handleSort('name');
    });
    expect(api.sortState).toEqual({ column: 'name', direction: 'asc' });

    act(() => {
      api.handleSort('name');
    });
    expect(api.sortState).toEqual({ column: 'name', direction: 'desc' });

    act(() => {
      api.handleSort('name');
    });
    expect(api.sortState).toEqual({ column: 'name', direction: null });
    expect(onSortChange).toHaveBeenCalled();
  });

  it('reads and updates scope-backed sort state', () => {
    mockScopeState.data = { tableState: { sort: { column: 'email', direction: 'desc' } } };
    let api: any;

    render(
      <SortProbe
        schemaProps={{ sortOwnership: 'scope', sortStatePath: 'tableState.sort' }}
        onSortChange={vi.fn()}
        columns={[{ name: 'email', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.sortState).toEqual({ column: 'email', direction: 'desc' });

    act(() => {
      api.handleSort('email');
    });
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.sort', {
      column: 'email',
      direction: null,
    });
  });

  it('treats controlled sort ownership as read-only input', () => {
    let api: any;

    render(
      <SortProbe
        schemaProps={{
          sortOwnership: 'controlled',
          sort: { column: 'email', direction: 'desc' },
        }}
        onSortChange={vi.fn()}
        columns={[{ name: 'email', sortable: true }]}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.sortState).toEqual({ column: 'email', direction: 'desc' });

    act(() => {
      api.handleSort('email');
    });

    expect(api.sortState).toEqual({ column: 'email', direction: 'desc' });
    expect(renderScopeUpdate).not.toHaveBeenCalled();
  });
});

describe('useTableFilter', () => {
  beforeEach(() => {
    resetTableControlTestState();
  });

  it('manages local filter values, search keywords, and clear behavior', () => {
    const helpers = createHelpers();
    const onFilterChange = vi.fn();
    let api: any;

    render(
      <FilterProbe
        schemaProps={{}}
        onFilterChange={onFilterChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    act(() => {
      api.handleFilter('name', 'Alice', true);
    });
    expect(Array.from(api.filterState.name.values)).toEqual(['Alice']);

    act(() => {
      api.handleSearch('name', 'Ali');
    });
    expect(api.filterState.name.keyword).toBe('Ali');

    act(() => {
      api.handleFilter('name', 'Alice', false);
    });
    expect(api.filterState.name.keyword).toBe('Ali');

    act(() => {
      api.clearFilters('missing');
    });

    act(() => {
      api.clearFilters('name');
    });
    expect(api.filterState).toEqual({});
    expect(onFilterChange).toHaveBeenCalled();
  });

  it('reads and updates scope-backed filter state', () => {
    mockScopeState.data = {
      tableState: {
        filters: {
          role: { filters: ['admin'], keyword: 'adm' },
        },
      },
    };
    let api: any;

    render(
      <FilterProbe
        schemaProps={{ filterOwnership: 'scope', filterStatePath: 'tableState.filters' }}
        onFilterChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.filterState.role.values)).toEqual(['admin']);
    expect(api.filterState.role.keyword).toBe('adm');

    act(() => {
      api.handleSearch('role', '');
    });
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.filters', {
      role: { filters: ['admin'], keyword: undefined },
    });
  });

  it('treats controlled filter ownership as read-only input', () => {
    let api: any;

    render(
      <FilterProbe
        schemaProps={{
          filterOwnership: 'controlled',
          filters: {
            role: { filters: ['admin'], keyword: 'adm' },
          },
        }}
        onFilterChange={vi.fn()}
        helpers={createHelpers()}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.filterState.role.values)).toEqual(['admin']);
    expect(api.filterState.role.keyword).toBe('adm');

    act(() => {
      api.clearFilters('role');
    });

    expect(Array.from(api.filterState.role.values)).toEqual(['admin']);
    expect(api.filterState.role.keyword).toBe('adm');
    expect(renderScopeUpdate).not.toHaveBeenCalled();
  });
});

describe('useTableExpand', () => {
  it('toggles expanded keys from initial state', () => {
    let api: any;

    render(
      <ExpandProbe
        schemaProps={{ expandable: { expandedRowKeys: ['r1'] } }}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.expandedRowKeys)).toEqual(['r1']);

    act(() => {
      api.handleToggleExpand('r2');
    });
    expect(Array.from(api.expandedRowKeys)).toEqual(['r1', 'r2']);

    act(() => {
      api.handleToggleExpand('r1');
    });
    expect(Array.from(api.expandedRowKeys)).toEqual(['r2']);
  });
});

import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useTableExpand,
  useTableFilter,
  useTablePagination,
  useTableSelection,
  useTableSort,
} from '../table-renderer/use-table-controls';

const mockScopeState: { data: Record<string, unknown> } = {
  data: {},
};
const renderScopeUpdate = vi.fn();

vi.mock('@nop-chaos/flux-react', () => ({
  useRenderScope: () => ({ update: renderScopeUpdate }),
  useScopeSelector: (selector: (value: Record<string, unknown>) => unknown) =>
    selector(mockScopeState.data),
}));

function createHelpers() {
  return {
    createScope: vi.fn((value: unknown, options?: unknown) => ({ value, options })),
  } as any;
}

function PaginationProbe(props: {
  schemaProps: any;
  onPageChange?: any;
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTablePagination(
    props.schemaProps,
    props.onPageChange,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

function SelectionProbe(props: {
  schemaProps: any;
  source: Array<Record<string, any>>;
  onSelectionChange?: any;
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTableSelection(
    props.schemaProps,
    props.source,
    props.onSelectionChange,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

function SortProbe(props: {
  schemaProps: any;
  onSortChange?: any;
  columns: any[];
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTableSort(
    props.schemaProps,
    props.onSortChange,
    props.columns,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

function FilterProbe(props: {
  schemaProps: any;
  onFilterChange?: any;
  helpers?: any;
  onReady: (value: any) => void;
}) {
  const api = useTableFilter(
    props.schemaProps,
    props.onFilterChange,
    props.helpers ?? createHelpers(),
  );
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

function ExpandProbe(props: { schemaProps: any; onReady: (value: any) => void }) {
  const api = useTableExpand(props.schemaProps);
  React.useEffect(() => {
    props.onReady(api);
  });
  return null;
}

describe('useTablePagination', () => {
  beforeEach(() => {
    mockScopeState.data = {};
    renderScopeUpdate.mockReset();
  });

  it('uses local pagination state and emits page scopes', () => {
    const helpers = createHelpers();
    const onPageChange = vi.fn();
    let api: any;

    render(
      <PaginationProbe
        schemaProps={{ pagination: { enabled: true, pageSize: 5 } }}
        onPageChange={onPageChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.paginationEnabled).toBe(true);
    expect(api.currentPage).toBe(1);
    expect(api.pageSize).toBe(5);

    act(() => {
      api.handlePageChange(3);
    });
    expect(api.currentPage).toBe(3);

    act(() => {
      api.handlePageSizeChange(20);
    });
    expect(api.currentPage).toBe(1);
    expect(api.pageSize).toBe(20);
    expect(renderScopeUpdate).not.toHaveBeenCalled();
    expect(onPageChange).toHaveBeenLastCalledWith(null, {
      scope: {
        value: { page: 1, pageSize: 20 },
        options: { scopeKey: 'pagination', pathSuffix: 'pagination' },
      },
    });
  });

  it('reads controlled and scope-backed pagination state', () => {
    let api: any;
    const onPageChange = vi.fn();
    const helpers = createHelpers();

    const { rerender } = render(
      <PaginationProbe
        schemaProps={{
          paginationOwnership: 'controlled',
          pagination: { currentPage: 4, pageSize: 25, enabled: false },
        }}
        onPageChange={onPageChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.paginationEnabled).toBe(false);
    expect(api.currentPage).toBe(4);
    expect(api.pageSize).toBe(25);

    act(() => {
      api.handlePageChange(2);
    });
    expect(renderScopeUpdate).not.toHaveBeenCalled();

    mockScopeState.data = { tableState: { pagination: { currentPage: 7, pageSize: 15 } } };
    rerender(
      <PaginationProbe
        schemaProps={{
          paginationOwnership: 'scope',
          paginationStatePath: 'tableState.pagination',
          pagination: { currentPage: 1, pageSize: 10 },
        }}
        onPageChange={onPageChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(api.currentPage).toBe(7);
    expect(api.pageSize).toBe(15);

    act(() => {
      api.handlePageSizeChange(30);
    });
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.pagination', {
      currentPage: 1,
      pageSize: 30,
    });
  });
});

describe('useTableSelection', () => {
  beforeEach(() => {
    mockScopeState.data = {};
    renderScopeUpdate.mockReset();
  });

  it('manages local selection, select-all, and external selection updates', () => {
    const helpers = createHelpers();
    const onSelectionChange = vi.fn();
    const source = [{ id: 1 }, { id: 2 }];
    let api: any;

    render(
      <SelectionProbe
        schemaProps={{ rowSelection: { selectedRowKeys: [] } }}
        source={source}
        onSelectionChange={onSelectionChange}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual([]);
    expect(api.allSelected).toBe(false);

    act(() => {
      api.handleSelectRow('1', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['1']);

    act(() => {
      api.handleSelectAll(true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['1', '2']);
    expect(api.allSelected).toBe(true);

    act(() => {
      api.setSelectionExternal(new Set(['2']));
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['2']);
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('uses controlled and scope-backed selection ownership', () => {
    const helpers = createHelpers();
    let api: any;

    const controlled = render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'controlled',
          rowSelection: { selectedRowKeys: ['r2'] },
        }}
        source={[{ id: 'r1' }, { id: 'r2' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual(['r2']);

    act(() => {
      api.handleSelectRow('r1', true);
    });
    expect(Array.from(api.selectedRowKeys)).toEqual(['r2']);

    controlled.unmount();

    mockScopeState.data = { tableState: { selected: ['r3'] } };
    render(
      <SelectionProbe
        schemaProps={{
          selectionOwnership: 'scope',
          selectionStatePath: 'tableState.selected',
          rowSelection: { selectedRowKeys: [] },
        }}
        source={[{ id: 'r3' }]}
        onSelectionChange={vi.fn()}
        helpers={helpers}
        onReady={(value) => {
          api = value;
        }}
      />,
    );

    expect(Array.from(api.selectedRowKeys)).toEqual(['r3']);

    act(() => {
      api.handleSelectRow('r3', false);
    });
    expect(renderScopeUpdate).toHaveBeenCalledWith('tableState.selected', []);
  });
});

describe('useTableSort', () => {
  beforeEach(() => {
    mockScopeState.data = {};
    renderScopeUpdate.mockReset();
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
});

describe('useTableFilter', () => {
  beforeEach(() => {
    mockScopeState.data = {};
    renderScopeUpdate.mockReset();
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

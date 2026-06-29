import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyQueryToRows,
  createCrudNormalizedSourceContext,
  createCrudEvaluationBindings,
  normalizeCrudSourceValue,
  normalizePagination,
  normalizeSort,
  useCrudHandle,
  useCrudRuntimeState,
  useCrudStatusPublisher,
} from '../crud-renderer-state.js';

const mockState: {
  currentRegistry: { register: ReturnType<typeof vi.fn> } | undefined;
  scopeData: Record<string, unknown>;
} = {
  currentRegistry: undefined,
  scopeData: {},
};

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentComponentRegistry: () => mockState.currentRegistry,
    useScopeSelector: (selector: (value: Record<string, unknown>) => unknown) =>
      selector(mockState.scopeData),
  };
});

function StatusProbe(props: { scope?: any; statusPath?: string; summary: any }) {
  useCrudStatusPublisher(props.scope, props.statusPath, props.summary);
  return null;
}

function HandleProbe(props: { inputProps: any; selectedRowKeys: unknown[]; clearSelection: () => void; handleRefresh: () => void }) {
  useCrudHandle(props.inputProps, props.selectedRowKeys, props.clearSelection, props.handleRefresh);
  return null;
}

function RuntimeStateProbe(props: { args: any; onReady: (value: any) => void }) {
  const state = useCrudRuntimeState(props.args);
  React.useEffect(() => {
    props.onReady(state);
  });
  return null;
}

describe('crud-renderer-state helpers', () => {
  it('normalizes pagination and sort values with fallbacks', () => {
    expect(normalizePagination({ currentPage: 3, pageSize: '25' }, 10)).toEqual({
      currentPage: 3,
      pageSize: 25,
    });
    expect(normalizePagination(undefined, 20)).toEqual({ currentPage: 1, pageSize: 20 });
    expect(normalizeSort({ field: 'name', order: 'asc' })).toEqual({
      column: 'name',
      direction: 'asc',
    });
    expect(normalizeSort({ field: 3, order: 'bad' })).toEqual({
      column: undefined,
      direction: undefined,
    });
  });

  it('applies query filtering for scalars, arrays, keywords, and non-record rows', () => {
    const rows = [
      { id: 1, role: 'admin', name: 'Alice', city: 'Paris' },
      { id: 2, role: 'user', name: 'Bob', city: 'London' },
      { id: 3, role: 'admin', name: 'Carol', city: 'Berlin' },
      'bad-row',
    ];

    expect(
      applyQueryToRows(rows as any, {
        role: ['admin'],
        name: 'ali',
      }),
    ).toEqual([{ id: 1, role: 'admin', name: 'Alice', city: 'Paris' }]);

    expect(
      applyQueryToRows(rows as any, {
        keyword: 'ber',
        id: 3,
      }),
    ).toEqual([{ id: 3, role: 'admin', name: 'Carol', city: 'Berlin' }]);

    expect(applyQueryToRows(rows as any, { name: '   ' })).toBe(rows);
  });

  it('normalizes array and record-based CRUD source values', () => {
    expect(normalizeCrudSourceValue([{ id: 1 }])).toEqual({ rows: [{ id: 1 }], total: 1 });
    expect(normalizeCrudSourceValue({ items: [{ id: 2 }], total: 9 })).toEqual({
      rows: [{ id: 2 }],
      total: 9,
    });
    expect(normalizeCrudSourceValue({ rows: [{ id: 3 }], count: 4 })).toEqual({
      rows: [{ id: 3 }],
      total: 4,
    });
    expect(normalizeCrudSourceValue({ records: [{ id: 4 }] })).toEqual({
      rows: [{ id: 4 }],
      total: 1,
    });
    expect(normalizeCrudSourceValue({ list: [{ id: 5 }] })).toEqual({
      rows: [{ id: 5 }],
      total: 1,
    });
    expect(normalizeCrudSourceValue(undefined)).toEqual({ rows: [], total: 0 });
  });

  it('creates a normalized source context with a single stable PageBean-like shape', () => {
    expect(createCrudNormalizedSourceContext([{ id: 1 }])).toEqual({
      rows: [{ id: 1 }],
      total: 1,
      page: undefined,
      pageSize: undefined,
    });
    expect(createCrudNormalizedSourceContext({ items: [{ id: 2 }], total: 9, page: 3, pageSize: 20 })).toEqual({
      rows: [{ id: 2 }],
      total: 9,
      page: 3,
      pageSize: 20,
    });
  });
});

describe('createCrudEvaluationBindings', () => {
  it('assembles flat query.* fields into evaluationBindings without values wrapper or refreshCount', () => {
    const bindings = createCrudEvaluationBindings({
      pagination: { currentPage: 2, pageSize: 20 },
      query: { keyword: 'Ali', status: 'active' },
      sort: { column: 'name', direction: 'asc' },
      filters: { status: { filters: ['active'] } },
      selection: ['r1', 'r2'],
    });

    expect(bindings).toEqual({
      pagination: { currentPage: 2, pageSize: 20 },
      query: { keyword: 'Ali', status: 'active' },
      sort: { column: 'name', direction: 'asc' },
      filters: { status: { filters: ['active'] } },
      selection: ['r1', 'r2'],
    });
  });

  it('exposes query fields directly (query.keyword) with no values wrapper', () => {
    const bindings = createCrudEvaluationBindings({
      pagination: { currentPage: 1, pageSize: 10 },
      query: { keyword: 'test' },
      sort: {},
      filters: {},
      selection: [],
    });

    expect((bindings.query as Record<string, unknown>).keyword).toBe('test');
    expect((bindings.query as Record<string, unknown>).values).toBeUndefined();
    expect(bindings.refreshCount).toBeUndefined();
  });
});

describe('useCrudStatusPublisher', () => {
  it('publishes only when scope/path exist and summary changes', () => {
    const update = vi.fn();
    const scope = { update };
    const summary = { kind: 'crud', total: 1 };

    const { rerender } = render(
      <StatusProbe scope={scope} statusPath="status.path" summary={summary} />,
    );
    expect(update).toHaveBeenCalledWith('status.path', summary);

    rerender(
      <StatusProbe scope={scope} statusPath="status.path" summary={{ kind: 'crud', total: 1 }} />,
    );
    expect(update).toHaveBeenCalledTimes(1);

    rerender(
      <StatusProbe scope={scope} statusPath="status.path" summary={{ kind: 'crud', total: 2 }} />,
    );
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]).toEqual(['status.path', { kind: 'crud', total: 2 }]);

    rerender(
      <StatusProbe
        scope={undefined}
        statusPath="status.path"
        summary={{ kind: 'crud', total: 3 }}
      />,
    );
    rerender(
      <StatusProbe scope={scope} statusPath={undefined} summary={{ kind: 'crud', total: 4 }} />,
    );
    expect(update).toHaveBeenCalledTimes(3);
    expect(update.mock.calls[2]).toEqual(['status.path', undefined]);
  });

  it('clears previously published status on unmount', () => {
    const update = vi.fn();
    const scope = { update };

    const view = render(
      <StatusProbe scope={scope} statusPath="status.path" summary={{ kind: 'crud', total: 1 }} />,
    );

    view.unmount();

    expect(update).toHaveBeenLastCalledWith('status.path', undefined);
  });
});

describe('useCrudHandle', () => {
  beforeEach(() => {
    mockState.currentRegistry = undefined;
  });

  afterEach(() => {
    mockState.currentRegistry = undefined;
  });

  it('registers the CRUD handle and exposes refresh/selection methods', async () => {
    const dispose = vi.fn();
    const register = vi.fn(() => dispose);
    mockState.currentRegistry = { register };

    const handleRefresh = vi.fn();
    const clearSelection = vi.fn();
    const selectedRowKeys = ['r1'];

    const { unmount } = render(
      <HandleProbe
        inputProps={{ meta: { cid: 3 }, id: 'crud-1', props: { name: 'users' } }}
        selectedRowKeys={selectedRowKeys}
        clearSelection={clearSelection}
        handleRefresh={handleRefresh}
      />,
    );

    const handle = (register.mock.lastCall as unknown[] | undefined)?.[0] as any;
    expect(handle).toBeTruthy();
    expect(register).toHaveBeenCalledWith(expect.any(Object), { cid: 3 });
    expect(handle.name).toBe('users');
    expect(handle.capabilities.hasMethod('refresh')).toBe(true);
    expect(handle.capabilities.listMethods()).toEqual([
      'refresh',
      'getSelection',
      'clearSelection',
    ]);
    await expect(handle.capabilities.invoke('refresh')).resolves.toEqual({ ok: true });
    expect(handleRefresh).toHaveBeenCalled();
    await expect(handle.capabilities.invoke('getSelection')).resolves.toEqual({
      ok: true,
      data: ['r1'],
    });
    await expect(handle.capabilities.invoke('clearSelection')).resolves.toEqual({ ok: true });
    expect(clearSelection).toHaveBeenCalled();
    await expect(handle.capabilities.invoke('unknown')).resolves.toMatchObject({ ok: false });

    unmount();
    expect(dispose).toHaveBeenCalled();
  });

  it('skips registration when registry or cid is missing', () => {
    const register = vi.fn();
    mockState.currentRegistry = { register };

    const { rerender } = render(
      <HandleProbe
        inputProps={{ meta: {}, id: 'crud-1', props: {} }}
        selectedRowKeys={[]}
        clearSelection={() => {}}
        handleRefresh={() => {}}
      />,
    );

    expect(register).not.toHaveBeenCalled();

    mockState.currentRegistry = undefined;
    rerender(
      <HandleProbe
        inputProps={{ meta: { cid: 1 }, id: 'crud-1', props: {} }}
        selectedRowKeys={[]}
        clearSelection={() => {}}
        handleRefresh={() => {}}
      />,
    );
    expect(register).not.toHaveBeenCalled();
  });
});

describe('useCrudRuntimeState', () => {
  beforeEach(() => {
    mockState.scopeData = {};
  });

  it('reads owner/scope state and initializes missing scope branches', () => {
    mockState.scopeData = {
      owner: {
        query: { role: 'admin' },
        pagination: { currentPage: 4, pageSize: 25 },
        sort: { field: 'name', order: 'desc' },
        filters: { status: 'active' },
        selection: ['r2'],
      },
    };
    const update = vi.fn();
    const scope = {
      update,
      readVisible: () => ({
        owner: {
          query: { role: 'admin' },
          pagination: { currentPage: 4, pageSize: 25 },
          sort: { field: 'name', order: 'desc' },
          filters: { status: 'active' },
          selection: ['r2'],
        },
      }),
    };
    let runtimeState: any;

    render(
      <RuntimeStateProbe
        args={{
          scope,
          queryStatePath: 'query',
          paginationStatePath: 'pagination',
          sortStatePath: 'sort',
          filterStatePath: 'filters',
          selectionStatePath: 'selection',
          defaultQuery: { role: 'user' },
          fallbackPageSize: 10,
        }}
        onReady={(value) => {
          runtimeState = value;
        }}
      />,
    );

    expect(runtimeState.queryState).toEqual({ role: 'user' });
    expect(runtimeState.paginationState).toEqual({ currentPage: 1, pageSize: 10 });
    expect(runtimeState.sortState).toEqual({ column: undefined, direction: undefined });
    expect(runtimeState.filterState).toEqual({});
    expect(runtimeState.selectedRowKeys).toEqual([]);
    expect(update).toHaveBeenCalledWith('query', { role: 'user' });
    expect(update).toHaveBeenCalledWith('pagination', { currentPage: 1, pageSize: 10 });
    expect(update).toHaveBeenCalledWith('sort', {});
    expect(update).toHaveBeenCalledWith('filters', {});
    expect(update).toHaveBeenCalledWith('selection', []);
  });

  it('prefers explicit scope state over owner fallbacks and avoids initialization when already present', () => {
    mockState.scopeData = {
      owner: {
        query: { role: 'owner' },
        pagination: { currentPage: 9, pageSize: 50 },
        sort: { field: 'ownerField', order: 'asc' },
        filters: { status: 'owner' },
        selection: ['owner-key'],
      },
      query: { role: 'scope' },
      pagination: { currentPage: 2, pageSize: 15 },
      sort: { field: 'scopeField', order: 'desc' },
      filters: { status: 'scope' },
      selection: ['scope-key'],
    };

    const update = vi.fn();
    const scope = {
      update,
      readVisible: () => mockState.scopeData,
    };
    let runtimeState: any;

    render(
      <RuntimeStateProbe
        args={{
          scope,
          queryStatePath: 'query',
          paginationStatePath: 'pagination',
          sortStatePath: 'sort',
          filterStatePath: 'filters',
          selectionStatePath: 'selection',
          defaultQuery: {},
          fallbackPageSize: 10,
        }}
        onReady={(value) => {
          runtimeState = value;
        }}
      />,
    );

    expect(runtimeState.queryState).toEqual({ role: 'scope' });
    expect(runtimeState.paginationState).toEqual({ currentPage: 2, pageSize: 15 });
    expect(runtimeState.sortState).toEqual({ column: 'scopeField', direction: 'desc' });
    expect(runtimeState.filterState).toEqual({ status: { filters: ['scope'] } });
    expect(runtimeState.selectedRowKeys).toEqual(['scope-key']);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not subscribe through ownerStatePath fallbacks once slice paths exist', () => {
    mockState.scopeData = {
      owner: {
        query: { role: 'owner' },
        pagination: { currentPage: 9, pageSize: 99 },
        sort: { field: 'ownerField', order: 'asc' },
        filters: { status: 'owner' },
        selection: ['owner-key'],
      },
      query: { role: 'scope' },
      pagination: { currentPage: 3, pageSize: 20 },
      sort: { field: 'scopeField', order: 'desc' },
      filters: { status: 'scope' },
      selection: ['scope-key'],
    };

    const update = vi.fn();
    const scope = {
      update,
      readVisible: () => mockState.scopeData,
    };
    let runtimeState: any;

    const view = render(
      <RuntimeStateProbe
        args={{
          scope,
          queryStatePath: 'query',
          paginationStatePath: 'pagination',
          sortStatePath: 'sort',
          filterStatePath: 'filters',
          selectionStatePath: 'selection',
          defaultQuery: {},
          fallbackPageSize: 10,
        }}
        onReady={(value) => {
          runtimeState = value;
        }}
      />,
    );

    expect(runtimeState.queryState).toEqual({ role: 'scope' });

    mockState.scopeData = {
      ...mockState.scopeData,
      owner: {
        query: { role: 'owner-updated' },
        pagination: { currentPage: 5, pageSize: 15 },
        sort: { field: 'ownerOnly', order: 'asc' },
        filters: { status: 'owner-updated' },
        selection: ['owner-updated'],
      },
      query: { role: 'scope' },
      pagination: { currentPage: 3, pageSize: 20 },
      sort: { field: 'scopeField', order: 'desc' },
      filters: { status: 'scope' },
      selection: ['scope-key'],
    };

    view.rerender(
      <RuntimeStateProbe
        args={{
          scope,
          queryStatePath: 'query',
          paginationStatePath: 'pagination',
          sortStatePath: 'sort',
          filterStatePath: 'filters',
          selectionStatePath: 'selection',
          defaultQuery: {},
          fallbackPageSize: 10,
        }}
        onReady={(value) => {
          runtimeState = value;
        }}
      />,
    );

    expect(runtimeState.queryState).toEqual({ role: 'scope' });
    expect(runtimeState.paginationState).toEqual({ currentPage: 3, pageSize: 20 });
    expect(runtimeState.sortState).toEqual({ column: 'scopeField', direction: 'desc' });
    expect(runtimeState.filterState).toEqual({ status: { filters: ['scope'] } });
    expect(runtimeState.selectedRowKeys).toEqual(['scope-key']);
    expect(update).not.toHaveBeenCalled();
  });
});

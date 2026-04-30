import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyQueryToRows,
  normalizeCrudSourceValue,
  normalizePagination,
  normalizeSort,
  useCrudHandle,
  useCrudRuntimeState,
  useCrudStatusPublisher,
} from '../crud-renderer-state';

let currentRegistry: { register: ReturnType<typeof vi.fn> } | undefined;
let scopeData: Record<string, unknown> = {};

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => currentRegistry,
  useScopeSelector: (selector: (value: Record<string, unknown>) => unknown) => selector(scopeData),
}));

function StatusProbe(props: { scope?: any; statusPath?: string; summary: any }) {
  useCrudStatusPublisher(props.scope, props.statusPath, props.summary);
  return null;
}

function HandleProbe(props: { inputProps: any; internalTableRef: any; handleRefresh: () => void }) {
  useCrudHandle(props.inputProps, props.internalTableRef, props.handleRefresh);
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
    expect(normalizeSort({ field: 'name', order: 'asc' })).toEqual({ field: 'name', order: 'asc' });
    expect(normalizeSort({ field: 3, order: 'bad' })).toEqual({
      field: undefined,
      order: undefined,
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
    expect(update).toHaveBeenCalledTimes(2);
  });
});

describe('useCrudHandle', () => {
  beforeEach(() => {
    currentRegistry = undefined;
  });

  afterEach(() => {
    currentRegistry = undefined;
  });

  it('registers the CRUD handle and exposes refresh/selection methods', async () => {
    const dispose = vi.fn();
    const register = vi.fn(() => dispose);
    currentRegistry = { register };

    const handleRefresh = vi.fn();
    const getSelection = vi.fn(() => ['r1']);
    const clearSelection = vi.fn();
    const internalTableRef = { current: { getSelection, clearSelection } };

    const { unmount } = render(
      <HandleProbe
        inputProps={{ meta: { cid: 3 }, id: 'crud-1', props: { name: 'users' } }}
        internalTableRef={internalTableRef}
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
    currentRegistry = { register };

    const { rerender } = render(
      <HandleProbe
        inputProps={{ meta: {}, id: 'crud-1', props: {} }}
        internalTableRef={{ current: {} }}
        handleRefresh={() => {}}
      />,
    );

    expect(register).not.toHaveBeenCalled();

    currentRegistry = undefined;
    rerender(
      <HandleProbe
        inputProps={{ meta: { cid: 1 }, id: 'crud-1', props: {} }}
        internalTableRef={{ current: {} }}
        handleRefresh={() => {}}
      />,
    );
    expect(register).not.toHaveBeenCalled();
  });
});

describe('useCrudRuntimeState', () => {
  beforeEach(() => {
    scopeData = {};
  });

  it('reads owner/scope state and initializes missing scope branches', () => {
    scopeData = {
      owner: {
        query: { values: { role: 'admin' }, refreshCount: 2 },
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
          query: { values: { role: 'admin' }, refreshCount: 2 },
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
          ownerStatePath: 'owner',
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

    expect(runtimeState.queryState).toEqual({ values: { role: 'admin' }, refreshCount: 0 });
    expect(runtimeState.paginationState).toEqual({ currentPage: 4, pageSize: 25 });
    expect(runtimeState.sortState).toEqual({ field: 'name', order: 'desc' });
    expect(runtimeState.filterState).toEqual({ status: 'active' });
    expect(runtimeState.selectedRowKeys).toEqual(['r2']);
    expect(update).toHaveBeenCalledWith('query', { values: { role: 'user' }, refreshCount: 0 });
    expect(update).toHaveBeenCalledWith('pagination', { currentPage: 1, pageSize: 10 });
    expect(update).toHaveBeenCalledWith('sort', {});
    expect(update).toHaveBeenCalledWith('filters', {});
    expect(update).toHaveBeenCalledWith('selection', []);
  });

  it('prefers explicit scope state over owner fallbacks and avoids initialization when already present', () => {
    scopeData = {
      owner: {
        query: { values: { role: 'owner' }, refreshCount: 1 },
        pagination: { currentPage: 9, pageSize: 50 },
        sort: { field: 'ownerField', order: 'asc' },
        filters: { status: 'owner' },
        selection: ['owner-key'],
      },
      query: { values: { role: 'scope' }, refreshCount: 7 },
      pagination: { currentPage: 2, pageSize: 15 },
      sort: { field: 'scopeField', order: 'desc' },
      filters: { status: 'scope' },
      selection: ['scope-key'],
    };

    const update = vi.fn();
    const scope = {
      update,
      readVisible: () => scopeData,
    };
    let runtimeState: any;

    render(
      <RuntimeStateProbe
        args={{
          scope,
          ownerStatePath: 'owner',
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

    expect(runtimeState.queryState).toEqual({ values: { role: 'scope' }, refreshCount: 7 });
    expect(runtimeState.paginationState).toEqual({ currentPage: 2, pageSize: 15 });
    expect(runtimeState.sortState).toEqual({ field: 'scopeField', order: 'desc' });
    expect(runtimeState.filterState).toEqual({ status: 'scope' });
    expect(runtimeState.selectedRowKeys).toEqual(['scope-key']);
    expect(update).not.toHaveBeenCalled();
  });
});

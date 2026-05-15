import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import {
  __getTableRowScopeCacheSizeForTests,
  __hasTableRowScopeCacheForTests,
  __resetTableRowScopeCachesForTests,
  useTableRowScopeCache,
} from '../table-renderer/use-table-row-scope-cache.js';

type TestScope = ScopeRef & {
  merge: ReturnType<typeof vi.fn>;
  store: {
    getLastChange: () => { paths: readonly string[] } | undefined;
  };
};

function createTestScope(initial: { record: Record<string, unknown>; index: number }, id: string): TestScope {
  let own = initial;
  let lastChange: { paths: readonly string[] } | undefined;
  const merge = vi.fn((patch: Record<string, unknown>) => {
    own = { ...own, ...patch } as typeof own;
    lastChange = { paths: Object.keys(patch).sort() };
  });

  return {
    id,
    path: `$rows.${id}`,
    value: own,
    get(path: string) {
      if (path === 'record') return own.record;
      if (path === 'index') return own.index;
      return undefined;
    },
    has(path: string) {
      return path === 'record' || path === 'index';
    },
    readOwn() {
      return own;
    },
    readVisible() {
      return own;
    },
    materializeVisible() {
      return own;
    },
    update() {},
    merge,
    replace(data) {
      own = data as typeof own;
      lastChange = { paths: Object.keys(data).sort() };
    },
    store: {
      getSnapshot: () => own,
      getLastChange: () => lastChange,
      setSnapshot(next, change) {
        own = next as typeof own;
        lastChange = change ? { paths: change.paths } : undefined;
      },
      subscribe() {
        return () => {};
      },
    },
  };
}

function HookHarness(props: {
  processedData: Array<{
    rowKey: string;
    cacheKey?: string;
    sourceIndex: number;
    record: Record<string, unknown>;
  }>;
  ownerKey: string;
  path: string;
  onCache?: (cache: Map<string, ScopeRef>) => void;
  createScope?: (patch: Record<string, unknown>, options?: Record<string, unknown>) => ScopeRef;
  disposeScope?: (scopeId: string) => void;
}) {
  const cache = useTableRowScopeCache(
    props.processedData,
    props.ownerKey,
    {
      createScope:
        props.createScope ??
        ((patch, options) =>
          createTestScope(
            { record: patch.record as Record<string, unknown>, index: patch.index as number },
            String(options?.scopeKey ?? 'scope'),
          )),
      disposeScope: props.disposeScope ?? (() => undefined),
    } as any,
    props.path,
  );

  React.useEffect(() => {
    props.onCache?.(cache);
  }, [cache, props]);

  return null;
}

afterEach(() => {
  cleanup();
  __resetTableRowScopeCachesForTests();
});

describe('useTableRowScopeCache', () => {
  it('starts with no registered module cache state', () => {
    expect(__getTableRowScopeCacheSizeForTests()).toBe(0);
  });

  it('publishes record and index together as one minimal root patch', async () => {
    let cache: Map<string, ScopeRef> | undefined;
    const { rerender } = render(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    await waitFor(() => expect(cache?.get('r1')).toBeTruthy());
    const scope = cache?.get('r1') as TestScope;
    scope.merge.mockClear();

    rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 1, record: { name: 'Alice updated' } }]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    await waitFor(() => expect(scope.merge).toHaveBeenCalledTimes(1));
    expect(scope.merge).toHaveBeenCalledWith({ index: 1, record: { name: 'Alice updated' } });
    expect(scope.store.getLastChange()).toEqual({ paths: ['index', 'record'] });
  });

  it('does not republish unchanged rows', async () => {
    const record = { name: 'Alice' };
    let cache: Map<string, ScopeRef> | undefined;
    const { rerender } = render(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record }]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    await waitFor(() => expect(cache?.get('r1')).toBeTruthy());
    const scope = cache?.get('r1') as TestScope;
    scope.merge.mockClear();

    rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record }]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    expect(scope.merge).not.toHaveBeenCalled();
  });

  it('cleans up cache entries when owner key changes and on unmount', async () => {
    const firstCacheKey = 'table-a::$page.table';
    const secondCacheKey = 'table-b::$page.table';
    const createdScopes: TestScope[] = [];
    const createScope = vi.fn((patch: Record<string, unknown>, options?: Record<string, unknown>) => {
      const scope = createTestScope(
        { record: patch.record as Record<string, unknown>, index: patch.index as number },
        String(options?.scopeKey ?? `scope-${createdScopes.length}`),
      );
      createdScopes.push(scope);
      return scope;
    });
    let cache: Map<string, ScopeRef> | undefined;
    const rendered = render(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-a"
        path="$page.table"
        createScope={createScope}
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    await waitFor(() => expect(cache?.size).toBe(1));
    expect(__getTableRowScopeCacheSizeForTests()).toBe(1);
    expect(__hasTableRowScopeCacheForTests(firstCacheKey)).toBe(true);
    const firstScope = createdScopes[0];

    rendered.rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-b"
        path="$page.table"
        createScope={createScope}
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    await waitFor(() => expect(cache?.get('r1')).toBeTruthy());
    expect(cache?.get('r1')).not.toBe(firstScope);
    expect(cache?.size).toBe(1);
    expect(__getTableRowScopeCacheSizeForTests()).toBe(1);
    expect(__hasTableRowScopeCacheForTests(firstCacheKey)).toBe(false);
    expect(__hasTableRowScopeCacheForTests(secondCacheKey)).toBe(true);

    rendered.unmount();
    expect(__getTableRowScopeCacheSizeForTests()).toBe(0);
    expect(__hasTableRowScopeCacheForTests(secondCacheKey)).toBe(false);
  });

  it('keeps the cache map reference stable when only row payloads change', async () => {
    const cacheRefs: Array<Map<string, ScopeRef>> = [];
    const { rerender } = render(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cacheRefs.push(value);
        }}
      />,
    );

    await waitFor(() => expect(cacheRefs[0]?.get('r1')).toBeTruthy());

    rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 1, record: { name: 'Alice updated' } }]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cacheRefs.push(value);
        }}
      />,
    );

    await waitFor(() => expect(cacheRefs).toHaveLength(2));
    expect(cacheRefs[1]).toBe(cacheRefs[0]);
  });

  it('deduplicates colliding row keys into distinct cache entries', async () => {
    let cache: Map<string, ScopeRef> | undefined;

    render(
      <HookHarness
        processedData={[
          { rowKey: 'dup', cacheKey: 'dup', sourceIndex: 0, record: { name: 'Alice' } },
          {
            rowKey: 'dup',
            cacheKey: 'dup::dup:1',
            sourceIndex: 1,
            record: { name: 'Bob' },
          },
        ]}
        ownerKey="table-a"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );

    await waitFor(() => expect(cache?.size).toBe(2));
    expect(cache?.get('dup')).toBeTruthy();
    expect(cache?.get('dup::dup:1')).toBeTruthy();
    expect(cache?.get('dup')).not.toBe(cache?.get('dup::dup:1'));
  });

  it('disposes row scopes on eviction and unmount', async () => {
    const disposeScope = vi.fn();
    const { rerender, unmount } = render(
      <HookHarness
        processedData={[
          { rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } },
          { rowKey: 'r2', sourceIndex: 1, record: { name: 'Bob' } },
        ]}
        ownerKey="table-a"
        path="$page.table"
        disposeScope={disposeScope}
      />,
    );

    await waitFor(() => expect(disposeScope).toHaveBeenCalledTimes(0));

    rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-a"
        path="$page.table"
        disposeScope={disposeScope}
      />,
    );

    await waitFor(() => expect(disposeScope).toHaveBeenCalledTimes(1));
    expect(disposeScope.mock.calls[0]?.[0]).toContain('r2');

    unmount();
    expect(disposeScope).toHaveBeenCalledTimes(2);
    expect(disposeScope.mock.calls[1]?.[0]).toContain('r1');
  });
});

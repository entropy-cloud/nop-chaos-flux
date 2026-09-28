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

function createTestScope(initial: Record<string, unknown>, id: string): TestScope {
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
      if (path === '$slot.record') return (own.$slot as { record: unknown })?.record;
      if (path === '$slot.index') return (own.$slot as { index: unknown })?.index;
      if (path in own) return own[path];
      return undefined;
    },
    has(path: string) {
      if (path === '$slot.record') return !!own.$slot;
      if (path === '$slot.index') return !!own.$slot;
      return path in own;
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
          createTestScope(patch, String(options?.scopeKey ?? 'scope'))),
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
    expect(scope.merge).toHaveBeenCalledWith({
      $slot: { index: 1, record: { name: 'Alice updated' } },
      name: 'Alice updated',
    });
    expect(scope.store.getLastChange()).toEqual({ paths: ['$slot', 'name'] });
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
      const scope = createTestScope(patch, String(options?.scopeKey ?? `scope-${createdScopes.length}`));
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

  it('does not dispose row scopes during StrictMode effect replay', async () => {
    const disposeScope = vi.fn();
    let cache: Map<string, ScopeRef> | undefined;

    render(
      <React.StrictMode>
        <HookHarness
          processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
          ownerKey="table-a"
          path="$page.table"
          disposeScope={disposeScope}
          onCache={(value) => {
            cache = value;
          }}
        />
      </React.StrictMode>,
    );

    await waitFor(() => expect(cache?.get('r1')).toBeTruthy());
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(disposeScope).not.toHaveBeenCalled();
    expect(cache?.get('r1')?.get('$slot.record')).toEqual({ name: 'Alice' });
  });

  it('keeps existing row scopes stable when only row payloads change', async () => {
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

    await waitFor(() => expect(cacheRefs.at(-1)?.get('r1')).toBeTruthy());
    const populatedCacheRef = cacheRefs.at(-1);
    const populatedScope = populatedCacheRef?.get('r1');

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

    await waitFor(() => expect(cacheRefs.length).toBeGreaterThan(1));
    // Payload-only change (no membership change): the snapshot Map identity is
    // now version-gated (perf P3) so consumer memos survive; the row scope
    // instance itself must stay stable either way.
    expect(cacheRefs.at(-1)).toBe(populatedCacheRef);
    expect(cacheRefs.at(-1)?.get('r1')).toBe(populatedScope);
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
    await waitFor(() => expect(disposeScope).toHaveBeenCalledTimes(2));
    expect(disposeScope.mock.calls[1]?.[0]).toContain('r1');
  });
});

describe('useTableRowScopeCache snapshot identity (perf P3)', () => {
  it('keeps the snapshot identity stable across unrelated re-renders', async () => {
    const identities = new Set<Map<string, ScopeRef>>();
    let cache: Map<string, ScopeRef> | undefined;
    const { rerender } = render(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-snap"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );
    await waitFor(() => expect(cache?.size).toBe(1));
    identities.add(cache!);

    // Unrelated re-render with identical data: the returned Map identity must
    // not churn, or every consumer memo keyed on it rebuilds per render.
    rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-snap"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );
    rerender(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-snap"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );
    expect(identities.size).toBe(1);
  });

  it('reissues the snapshot with correct membership when the row set changes', async () => {
    let cache: Map<string, ScopeRef> | undefined;
    const { rerender } = render(
      <HookHarness
        processedData={[{ rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice' } }]}
        ownerKey="table-snap2"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );
    await waitFor(() => expect(cache?.size).toBe(1));
    const firstSnapshot = cache;

    rerender(
      <HookHarness
        processedData={[
          { rowKey: 'r1', sourceIndex: 0, record: { name: 'Alice updated' } },
          { rowKey: 'r2', sourceIndex: 1, record: { name: 'Bob' } },
        ]}
        ownerKey="table-snap2"
        path="$page.table"
        onCache={(value) => {
          cache = value;
        }}
      />,
    );
    await waitFor(() => expect(cache?.get('r2')).toBeTruthy());
    // Structural change must produce a NEW snapshot containing both rows.
    expect(cache).not.toBe(firstSnapshot);
    expect(cache!.get('r1')).toBe(firstSnapshot!.get('r1'));
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ActionSchema, ActionResult, RendererHelpers } from '@nop-chaos/flux-core';
// Side-effect import initializes the flux i18n test locale (en-US).
import '../test-support.js';
import { useOrgChildren, useOrgEcho, useOrgSearch } from '../renderers/org/use-org-source.js';

afterEach(() => {
  cleanup();
});

const childrenSource: ActionSchema = { action: 'ajax', args: { url: '/api/org/children' } };
const searchSource: ActionSchema = { action: 'ajax', args: { url: '/api/org/search' } };
const resolveSource: ActionSchema = { action: 'ajax', args: { url: '/api/org/resolve' } };

interface MockScope {
  id: string;
  patch?: Record<string, unknown>;
}

function createMockHelpers(dispatch: (action: ActionSchema) => Promise<ActionResult>) {
  const scopes: MockScope[] = [];
  const helpers = {
    dispatch,
    createScope: (patch?: object) => {
      const scope: MockScope = { id: `scope-${scopes.length + 1}`, patch: patch as Record<string, unknown> | undefined };
      scopes.push(scope);
      return scope;
    },
    disposeScope: vi.fn(),
    evaluate: (target: unknown) => `eval:${String(target)}`,
  } as unknown as RendererHelpers;
  return { helpers, scopes };
}

function ok(data: unknown): Promise<ActionResult> {
  return Promise.resolve({ ok: true, data });
}

describe('useOrgChildren', () => {
  it('does not dispatch while disabled (lazy root load gate)', () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers } = createMockHelpers(dispatch);
    renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: false, hasStaticRoot: false }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('skips the root fetch when static options provide the root (§7)', () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers } = createMockHelpers(dispatch);
    renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: true }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('loads the root with orgNodeId="" and orgDepth=0 protocol variables', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [{ id: 'd1', name: 'D1' }] }));
    const { helpers, scopes } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    expect(result.current.rootState.nodes).toEqual([{ id: 'd1', name: 'D1' }]);
    expect(scopes[0]?.patch).toMatchObject({ orgNodeId: '', orgDepth: 0, orgPage: 1 });
  });

  it('surfaces ok:false as an orgChildrenFailed error state without throwing', async () => {
    const dispatch = vi.fn(() => Promise.resolve({ ok: false, error: 'boom' }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('error'));
    expect(result.current.rootState.error).toContain('Failed to load child departments');
    expect(result.current.rootState.error).toContain('boom');
  });

  it('leaf short-circuit: a leaf node never triggers children dispatch (§5)', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    const before = dispatch.mock.calls.length;
    act(() => result.current.loadNode({ id: 'leaf1', name: 'L', leaf: true }, 1));
    act(() => result.current.loadNode({ id: 'rich', name: 'R', children: [{ id: 'c', name: 'C' }] }, 1));
    expect(dispatch.mock.calls.length).toBe(before);
  });

  it('loads childless non-leaf nodes and caches the empty page (no re-dispatch)', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    const node = { id: 'd9', name: 'D9' };
    act(() => result.current.loadNode(node, 1));
    await waitFor(() => expect(result.current.nodeStates.d9?.status).toBe('ready'));
    expect(result.current.nodeStates.d9?.nodes).toEqual([]);
    const after = dispatch.mock.calls.length;
    act(() => result.current.loadNode(node, 1));
    expect(dispatch.mock.calls.length).toBe(after);
  });

  it('retryNode forces a re-dispatch on an errored node', async () => {
    let call = 0;
    const dispatch = vi.fn(() => {
      call += 1;
      if (call === 1) return ok({ nodes: [] });
      if (call === 2) return Promise.resolve({ ok: false, error: 'x' });
      return ok({ nodes: [{ id: 'c1', name: 'C1' }] });
    });
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    const node = { id: 'dx', name: 'DX' };
    act(() => result.current.loadNode(node, 1));
    await waitFor(() => expect(result.current.nodeStates.dx?.status).toBe('error'));
    act(() => result.current.retryNode(node, 1));
    await waitFor(() => expect(result.current.nodeStates.dx?.status).toBe('ready'));
    expect(result.current.nodeStates.dx?.nodes).toEqual([{ id: 'c1', name: 'C1' }]);
  });

  it('loadMore fetches the next root page and merges with id dedupe (§5)', async () => {
    let call = 0;
    const dispatch = vi.fn(() => {
      call += 1;
      return call === 1
        ? ok({ nodes: [{ id: 'r1', name: 'R1' }, { id: 'r2', name: 'R2' }], hasMore: true })
        : ok({ nodes: [{ id: 'r2', name: 'R2x' }, { id: 'r3', name: 'R3' }] });
    });
    const { helpers, scopes } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    act(() => result.current.loadMore(null, 0));
    await waitFor(() => expect(result.current.rootState.nodes).toHaveLength(3));
    expect(result.current.rootState.nodes.map((node) => `${node.id}:${node.name}`)).toEqual([
      'r1:R1',
      'r2:R2x',
      'r3:R3',
    ]);
    expect(result.current.rootState.hasMore).toBe(true);
    expect(scopes[1]?.patch).toMatchObject({ orgPage: 2, orgNodeId: '' });
  });

  it('continuation stops on a zero-new-id page (§5 termination guard)', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [{ id: 'r1', name: 'R1' }], hasMore: true }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    act(() => result.current.loadMore(null, 0));
    await waitFor(() => expect(result.current.rootState.hasMore).toBe(false));
    const after = dispatch.mock.calls.length;
    act(() => result.current.loadMore(null, 0));
    expect(dispatch.mock.calls.length).toBe(after);
  });

  it('hasMore:false page closes paging without further dispatches', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [{ id: 'r1', name: 'R1' }], hasMore: false }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    expect(result.current.rootState.hasMore).toBe(false);
    const after = dispatch.mock.calls.length;
    act(() => result.current.loadMore(null, 0));
    expect(dispatch.mock.calls.length).toBe(after);
  });

  it('node-level continuation merges child pages (§5, single shared implementation)', async () => {
    let call = 0;
    const dispatch = vi.fn(() => {
      call += 1;
      if (call === 1) return ok({ nodes: [{ id: 'd1', name: 'D1' }] });
      if (call === 2) return ok({ nodes: [{ id: 'c1', name: 'C1' }], hasMore: true });
      return ok({ nodes: [{ id: 'c2', name: 'C2' }], hasMore: false });
    });
    const { helpers, scopes } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgChildren({ helpers, sourceChildren: childrenSource, enabled: true, hasStaticRoot: false }),
    );
    await waitFor(() => expect(result.current.rootState.status).toBe('ready'));
    const node = { id: 'd1', name: 'D1' };
    act(() => result.current.loadNode(node, 1));
    await waitFor(() => expect(result.current.nodeStates.d1?.status).toBe('ready'));
    act(() => result.current.loadMore(node, 1));
    await waitFor(() => expect(result.current.nodeStates.d1?.nodes).toHaveLength(2));
    expect(result.current.nodeStates.d1?.hasMore).toBe(false);
    expect(scopes[2]?.patch).toMatchObject({ orgNodeId: 'd1', orgPage: 2 });
  });

  it('extraParams are evaluated and override protocol variables (§6)', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers, scopes } = createMockHelpers(dispatch);
    renderHook(() =>
      useOrgChildren({
        helpers,
        sourceChildren: childrenSource,
        enabled: true,
        hasStaticRoot: false,
        extraParams: { orgNodeId: 'override', tenant: '${tenantId}' },
      }),
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    // String extraParams values are expressions (§6) — the mock evaluate prefixes them.
    expect(scopes[0]?.patch).toMatchObject({ orgNodeId: 'eval:override', tenant: 'eval:${tenantId}', orgDepth: 0 });
  });
});

describe('useOrgSearch', () => {
  it('debounces 300ms then dispatches with the searchQuery protocol variable (§4.1)', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers, scopes } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgSearch({ helpers, sourceSearch: searchSource, enabled: true }),
    );
    act(() => result.current.setQuery('  eng  '));
    expect(dispatch).not.toHaveBeenCalled();
    await waitFor(() => expect(dispatch).toHaveBeenCalled(), { timeout: 3000 });
    expect(scopes[0]?.patch).toMatchObject({ searchQuery: 'eng', orgPage: 1 });
  });

  it('blank query resets to idle without dispatching', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgSearch({ helpers, sourceSearch: searchSource, enabled: true }),
    );
    act(() => result.current.setQuery('a'));
    await waitFor(() => expect(dispatch).toHaveBeenCalled(), { timeout: 3000 });
    act(() => result.current.setQuery('   '));
    await waitFor(() => expect(result.current.remoteNodes).toBeNull(), { timeout: 3000 });
    expect(result.current.status).toBe('idle');
  });

  it('search failure clears results and surfaces orgSearchFailed (§7)', async () => {
    const dispatch = vi.fn(() => Promise.resolve({ ok: false, error: 'timeout' }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgSearch({ helpers, sourceSearch: searchSource, enabled: true }),
    );
    act(() => result.current.setQuery('x'));
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 });
    expect(result.current.remoteNodes).toEqual([]);
    expect(result.current.error).toContain('Search failed');
    expect(result.current.error).toContain('timeout');
  });

  it('loadMore requests the next page and merges with id dedupe (§5)', async () => {
    let call = 0;
    const dispatch = vi.fn(() => {
      call += 1;
      return call === 1
        ? ok({ nodes: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], hasMore: true })
        : ok({ nodes: [{ id: 'b', name: 'B2' }, { id: 'c', name: 'C' }] });
    });
    const { helpers, scopes } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgSearch({ helpers, sourceSearch: searchSource, enabled: true }),
    );
    act(() => result.current.setQuery('q'));
    await waitFor(() => expect(result.current.remoteNodes).toHaveLength(2), { timeout: 3000 });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.remoteNodes).toHaveLength(3), { timeout: 3000 });
    expect(result.current.remoteNodes?.map((node) => `${node.id}:${node.name}`)).toEqual(['a:A', 'b:B2', 'c:C']);
    expect(result.current.hasMore).toBe(true);
    expect(scopes[1]?.patch).toMatchObject({ orgPage: 2 });
  });

  it('zero-new-id pages stop paging via the §5 guard', async () => {
    let call = 0;
    const dispatch = vi.fn(() => {
      call += 1;
      return ok({ nodes: [{ id: 'a', name: 'A' }], hasMore: true });
    });
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgSearch({ helpers, sourceSearch: searchSource, enabled: true }),
    );
    act(() => result.current.setQuery('q'));
    await waitFor(() => expect(result.current.remoteNodes).toHaveLength(1), { timeout: 3000 });
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.hasMore).toBe(false), { timeout: 3000 });
    void call;
  });
});

describe('useOrgEcho', () => {
  it('dispatches only for values missing from the pool, with orgValues (§4.1)', async () => {
    const dispatch = vi.fn(() => ok({ nodes: [{ id: 'u9', name: 'Remote User' }] }));
    const { helpers, scopes } = createMockHelpers(dispatch);
    const pool = [{ id: 'u1', name: 'Local User' }];
    const { result } = renderHook(() =>
      useOrgEcho({
        helpers,
        sourceResolve: resolveSource,
        values: ['u1', 'u9'],
        echoPool: pool,
        enabled: true,
      }),
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(scopes[0]?.patch).toMatchObject({ orgValues: ['u9'] });
    await waitFor(() => expect(result.current).toEqual([{ id: 'u9', name: 'Remote User' }]));
  });

  it('does not dispatch when every value is already in the pool (§7 short-circuit)', () => {
    const dispatch = vi.fn(() => ok({ nodes: [] }));
    const { helpers } = createMockHelpers(dispatch);
    renderHook(() =>
      useOrgEcho({
        helpers,
        sourceResolve: resolveSource,
        values: ['u1'],
        echoPool: [{ id: 'u1', name: 'Local User' }],
        enabled: true,
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('survives a resolve failure: no throw, no resolved nodes (raw-value echo)', async () => {
    const dispatch = vi.fn(() => Promise.resolve({ ok: false, error: 'nope' }));
    const { helpers } = createMockHelpers(dispatch);
    const { result } = renderHook(() =>
      useOrgEcho({
        helpers,
        sourceResolve: resolveSource,
        values: ['ghost'],
        echoPool: [],
        enabled: true,
      }),
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { executeTreeSource } from '../tree-control-controllers.js';

function createSpyScopeFactory() {
  const created: string[] = [];
  const disposed: string[] = [];
  const createScope = vi.fn((patch: Record<string, unknown>) => {
    const id = `tree-scope-${created.length}`;
    created.push(id);
    return {
      id,
      get(key: string) {
        return patch[key];
      },
      has(key: string) {
        return key in patch;
      },
    };
  });
  const disposeScope = vi.fn((id: string) => {
    disposed.push(id);
  });
  return { created, disposed, createScope, disposeScope };
}

describe('executeTreeSource — one-shot scope handling (09-02)', () => {
  it('formula path: evaluates against a scope then disposes it', async () => {
    const { created, disposed, createScope, disposeScope } = createSpyScopeFactory();
    const evaluate = vi.fn(
      (_formula: string, scope: { get: (key: string) => unknown }) =>
        scope.get('searchQuery') === 'ap' ? { rows: ['a'] } : undefined,
    );
    const helpers = { createScope, disposeScope, evaluate, dispatch: vi.fn() } as never;

    const result = await executeTreeSource(
      { formula: '${searchQuery}' } as never,
      helpers,
      { searchQuery: 'ap' },
    );

    expect(result).toEqual({ ok: true, data: { rows: ['a'] } });
    expect(created.length).toBe(1);
    expect(disposed).toEqual(created);
  });

  it('formula path: disposes the scope even when evaluation throws', async () => {
    const { created, disposed, createScope, disposeScope } = createSpyScopeFactory();
    const helpers = {
      createScope,
      disposeScope,
      evaluate: vi.fn(() => {
        throw new Error('boom');
      }),
      dispatch: vi.fn(),
    } as never;

    const result = await executeTreeSource({ formula: '${broken' } as never, helpers, {});

    expect(result.ok).toBe(false);
    expect(created.length).toBe(1);
    expect(disposed).toEqual(created);
  });

  it('action path: dispatches with a patched scope and disposes it once the action settles', async () => {
    const { created, disposed, createScope, disposeScope } = createSpyScopeFactory();
    let resolveDispatch: (value: unknown) => void;
    const dispatch = vi.fn(
      async () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        }),
    );
    const helpers = { createScope, disposeScope, evaluate: vi.fn(), dispatch } as never;

    const pending = executeTreeSource(
      { action: 'ajax', args: { url: '/api/tree-children' } } as never,
      helpers,
      { expandedNodeValue: 'n1' },
    );

    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalled();
    });

    expect(created.length).toBe(1);
    expect(disposed.length).toBe(0);
    expect(dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scope: expect.objectContaining({ get: expect.any(Function) }),
      }),
    );

    resolveDispatch!({ ok: true, data: [{ id: 'c1' }] });
    const result = await pending;

    expect(result.ok).toBe(true);
    expect(disposed).toEqual(created);
  });

  it('action path: disposes the scope when the dispatch rejects', async () => {
    const { created, disposed, createScope, disposeScope } = createSpyScopeFactory();
    const dispatch = vi.fn(async () => {
      throw new Error('boom');
    });
    const helpers = { createScope, disposeScope, evaluate: vi.fn(), dispatch } as never;

    const result = await executeTreeSource(
      { action: 'ajax', args: { url: '/api/tree-children' } } as never,
      helpers,
      { expandedNodeValue: 'n1' },
    );

    expect(result.ok).toBe(false);
    expect(disposed).toEqual(created);
  });
});

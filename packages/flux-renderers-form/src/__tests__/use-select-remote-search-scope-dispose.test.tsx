import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSelectRemoteSearch } from '../renderers/use-select-remote-search.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSelectRemoteSearch — dispatch-time scope pairing (09-02)', () => {
  it('dispatches with a searchQuery scope and disposes it once the action settles', async () => {
    let resolveDispatch: (value: unknown) => void;
    const createScope = vi.fn((patch: Record<string, unknown>) => ({
      id: 'search-scope-0',
      ...patch,
    }));
    const disposeScope = vi.fn();
    const dispatch = vi.fn(
      async () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        }),
    );
    const helpers = { createScope, disposeScope, dispatch };

    const { result } = renderHook(
      ({ query, searchSource }: { query: string; searchSource: any }) =>
        useSelectRemoteSearch({
          query,
          searchSource,
          searchable: true,
          helpers: helpers as any,
          disabled: false,
        }),
      {
        initialProps: { query: 'ap', searchSource: { action: 'ajax', args: { url: '/x' } } },
      },
    );

    await waitFor(
      () => {
        expect(dispatch).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    expect(createScope).toHaveBeenCalledWith({ searchQuery: 'ap' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scope: expect.objectContaining({ id: 'search-scope-0' }) }),
    );
    expect(disposeScope).not.toHaveBeenCalled();

    await act(async () => {
      resolveDispatch!({ ok: true, data: [{ label: 'Apple', value: 'apple' }] });
    });

    expect(disposeScope).toHaveBeenCalledWith('search-scope-0');
    expect(result.current.remoteOptions).toEqual([{ label: 'Apple', value: 'apple' }]);
  });

  it('does not create a scope when searchSource is absent', () => {
    const createScope = vi.fn();
    const helpers = { createScope, disposeScope: vi.fn(), dispatch: vi.fn() };
    renderHook(() =>
      useSelectRemoteSearch({
        query: 'ap',
        searchSource: undefined,
        searchable: true,
        helpers: helpers as any,
        disabled: false,
      }),
    );

    expect(createScope).not.toHaveBeenCalled();
  });
});

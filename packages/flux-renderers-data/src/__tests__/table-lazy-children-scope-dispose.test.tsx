import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTableLazyChildren } from '../table-renderer/use-table-lazy-children.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTableLazyChildren — dispatch-time scope pairing (09-02)', () => {
  it('dispatches with a record/rowKey scope and disposes it once the action settles', async () => {
    let resolveDispatch: (value: unknown) => void;
    const createScope = vi.fn((patch: Record<string, unknown>) => ({
      id: 'lazy-scope-0',
      ...patch,
    }));
    const disposeScope = vi.fn();
    const dispatch = vi.fn(
      async () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useTableLazyChildren({
        childrenSource: { action: 'ajax', args: { url: '/api/children' } } as any,
        helpers: { createScope, disposeScope, dispatch } as any,
      }),
    );

    act(() => {
      result.current.loadChildren('r1', { id: '1' });
    });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalled();
    });

    expect(createScope).toHaveBeenCalledWith({ record: { id: '1' }, rowKey: 'r1' });
    expect(dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scope: expect.objectContaining({ id: 'lazy-scope-0' }) }),
    );
    expect(disposeScope).not.toHaveBeenCalled();

    await act(async () => {
      resolveDispatch!({ ok: true, data: [{ id: 'c1' }] });
    });

    expect(disposeScope).toHaveBeenCalledWith('lazy-scope-0');
    await waitFor(() => {
      expect(result.current.lazyChildrenMap.get('r1')?.children).toEqual([{ id: 'c1' }]);
    });
  });

  it('disposes the scope when the dispatch rejects', async () => {
    const createScope = vi.fn(() => ({ id: 'lazy-scope-r' }));
    const disposeScope = vi.fn();
    const dispatch = vi.fn(async () => {
      throw new Error('network down');
    });

    const { result } = renderHook(() =>
      useTableLazyChildren({
        childrenSource: { action: 'ajax', args: { url: '/api/children' } } as any,
        helpers: { createScope, disposeScope, dispatch } as any,
      }),
    );

    act(() => {
      result.current.loadChildren('r1', { id: '1' });
    });

    await waitFor(() => {
      expect(disposeScope).toHaveBeenCalledWith('lazy-scope-r');
    });
    expect(result.current.lazyChildrenMap.get('r1')?.error).toBe('network down');
  });

  it('does not create a scope when childrenSource is absent', () => {
    const createScope = vi.fn();
    const { result } = renderHook(() =>
      useTableLazyChildren({
        helpers: { createScope, disposeScope: vi.fn(), dispatch: vi.fn() } as any,
      }),
    );

    act(() => {
      result.current.loadChildren('r1', { id: '1' });
    });

    expect(createScope).not.toHaveBeenCalled();
  });
});

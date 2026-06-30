import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePagedList } from './use-paged-list';
import type { PageBean } from '../api/rpc';

function page<T>(items: T[], total: number): PageBean<T> {
  return { items, total };
}

describe('usePagedList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads first page and computes hasMore from total', async () => {
    const fetcher = vi.fn(async () => page(['a', 'b'], 5));
    const { result } = renderHook(() => usePagedList(fetcher, undefined, { pageSize: 2 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(1, 2);
  });

  it('loadMore appends the next page', async () => {
    const fetcher = vi.fn(async (_p: number, _ps: number) => page([_p === 1 ? 'a' : 'c', _p === 1 ? 'b' : 'd'], 5));
    const { result } = renderHook(() => usePagedList(fetcher, undefined, { pageSize: 2 }));

    await waitFor(() => expect(result.current.items).toEqual(['a', 'b']));

    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.items).toEqual(['a', 'b', 'c', 'd']);
    expect(fetcher).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('marks hasMore=false when all items loaded', async () => {
    const fetcher = vi.fn(async () => page(['a', 'b'], 2));
    const { result } = renderHook(() => usePagedList(fetcher, undefined, { pageSize: 2 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  it('refresh reloads page 1 and replaces items', async () => {
    let n = 0;
    const fetcher = vi.fn(async () => {
      n += 1;
      return page([`x${n}`], 1);
    });
    const { result } = renderHook(() => usePagedList(fetcher, undefined, { pageSize: 2 }));

    await waitFor(() => expect(result.current.items).toEqual(['x1']));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.items).toEqual(['x2']);
    expect(result.current.hasMore).toBe(false);
  });

  it('deps change resets the list to page 1', async () => {
    const fetcher = vi.fn(async (p: number) => page([`k-${p}`], 1));
    const { result, rerender } = renderHook(({ dep }) => usePagedList(fetcher, dep), {
      initialProps: { dep: 'A' },
    });

    await waitFor(() => expect(result.current.items).toEqual(['k-1']));
    await act(async () => {
      rerender({ dep: 'B' });
    });
    await waitFor(() => expect(result.current.items).toEqual(['k-1']));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('captures errors and allows retry via refresh', async () => {
    let shouldFail = true;
    const fetcher = vi.fn(async () => {
      if (shouldFail) throw new Error('network');
      return page(['a'], 1);
    });
    const { result } = renderHook(() => usePagedList(fetcher, undefined, { pageSize: 2 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network');
    expect(result.current.items).toEqual([]);

    shouldFail = false;
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.items).toEqual(['a']);
  });
});

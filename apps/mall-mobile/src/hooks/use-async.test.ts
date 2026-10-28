import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync } from './use-async';

describe('useAsync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts loading, resolves data, and stops loading', async () => {
    let resolveFn!: (v: number) => void;
    const fn = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          resolveFn = resolve;
        }),
    );

    const { result } = renderHook(() => useAsync(fn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await act(async () => {
      resolveFn(42);
    });

    expect(result.current.data).toBe(42);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('captures errors into state', async () => {
    const fn = vi.fn(async () => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useAsync(fn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('refetch re-runs and updates data', async () => {
    let counter = 0;
    const fn = vi.fn(async () => ++counter);
    const { result } = renderHook(() => useAsync(fn));

    await waitFor(() => expect(result.current.data).toBe(1));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('ignores stale results from a superseded refetch', async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const fn = vi.fn(() => {
      if (fn.mock.calls.length === 1) {
        return new Promise<string>((r) => {
          resolveFirst = () => r('stale');
        });
      }
      return new Promise<string>((r) => {
        resolveSecond = () => r('fresh');
      });
    });

    const { result } = renderHook(() => useAsync(fn));

    await act(async () => {
      const p = result.current.refetch();
      resolveSecond();
      await p;
    });
    await act(async () => {
      resolveFirst();
    });

    expect(result.current.data).toBe('fresh');
  });
});

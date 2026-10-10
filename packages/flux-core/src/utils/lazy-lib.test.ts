import { describe, expect, it, vi } from 'vitest';
import { createLazyLibLoader } from './lazy-lib.js';

describe('createLazyLibLoader', () => {
  it('loads once and shares a single in-flight promise across concurrent calls', async () => {
    let resolveLoad: (value: { marker: number }) => void = () => {};
    const load = vi.fn(
      () =>
        new Promise<{ marker: number }>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const loader = createLazyLibLoader(load);

    const first = loader();
    const second = loader();
    expect(first).toBe(second);
    expect(load).toHaveBeenCalledTimes(1);

    resolveLoad({ marker: 42 });
    await expect(first).resolves.toEqual({ marker: 42 });

    const third = loader();
    expect(third).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
    await expect(third).resolves.toEqual({ marker: 42 });
  });

  it('propagates the load error to the caller', async () => {
    const failure = new Error('module fetch failed');
    const loader = createLazyLibLoader(() => Promise.reject(failure));

    await expect(loader()).rejects.toBe(failure);
  });

  it('clears the cache on failure so the next call retries', async () => {
    let attempts = 0;
    const load = vi.fn(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error('network blip'));
      }
      return Promise.resolve({ attempt: attempts });
    });
    const loader = createLazyLibLoader(load);

    await expect(loader()).rejects.toThrow('network blip');
    await expect(loader()).resolves.toEqual({ attempt: 2 });
    expect(load).toHaveBeenCalledTimes(2);

    await expect(loader()).resolves.toEqual({ attempt: 2 });
    expect(load).toHaveBeenCalledTimes(2);
  });
});

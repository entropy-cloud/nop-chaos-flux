import { describe, expect, it, vi, afterEach } from 'vitest';
import { cancelPendingDebounce, scheduleDebounce } from './debounce.js';

describe('scheduleDebounce', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves after the given timeout', async () => {
    const map = new Map<string, any>();
    const promise = scheduleDebounce(map, 'key', 10, () => 'result');

    expect(map.has('key')).toBe(true);

    const value = await promise;
    expect(value).toBe('result');
    expect(map.has('key')).toBe(false);
  });

  it('cancels previous pending for the same key', async () => {
    const map = new Map<string, any>();
    const firstResolve = vi.fn();

    const firstPromise = scheduleDebounce(map, 'key', 100, () => 'first');
    firstPromise.then(firstResolve);

    const secondPromise = scheduleDebounce(map, 'key', 10, () => 'second');

    await secondPromise;
    expect(secondPromise).resolves.toBe('second');

    await vi.waitFor(() => {
      expect(firstResolve).toHaveBeenCalledWith(undefined);
    });
  });

  it('supports multiple independent keys', async () => {
    const map = new Map<string, any>();

    const [r1, r2] = await Promise.all([
      scheduleDebounce(map, 'a', 10, () => 'A'),
      scheduleDebounce(map, 'b', 10, () => 'B'),
    ]);

    expect(r1).toBe('A');
    expect(r2).toBe('B');
  });

  it('propagates factory rejection', async () => {
    const map = new Map<string, any>();
    const error = new Error('factory failed');

    await expect(
      scheduleDebounce(map, 'key', 10, () => Promise.reject(error)),
    ).rejects.toThrow('factory failed');

    expect(map.has('key')).toBe(false);
  });

  it('propagates sync factory throw', async () => {
    const map = new Map<string, any>();

    await expect(
      scheduleDebounce(map, 'key', 10, () => {
        throw new Error('sync fail');
      }),
    ).rejects.toThrow('sync fail');

    expect(map.has('key')).toBe(false);
  });

  it('works with async factory', async () => {
    const map = new Map<string, any>();
    const value = await scheduleDebounce(map, 'key', 10, async () => {
      return 'async-result';
    });

    expect(value).toBe('async-result');
  });
});

describe('cancelPendingDebounce', () => {
  it('cancels pending entry and resolves with given value', async () => {
    const map = new Map<string, any>();
    const resolveSpy = vi.fn();

    const promise = scheduleDebounce(map, 'key', 100, () => 'never');
    promise.then(resolveSpy);

    expect(map.has('key')).toBe(true);

    const cancelled = cancelPendingDebounce(map, 'key', 'cancelled');
    expect(cancelled).toBe(true);
    expect(map.has('key')).toBe(false);

    await vi.waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith('cancelled');
    });
  });

  it('returns false for non-existent key', () => {
    const map = new Map<string, any>();
    const result = cancelPendingDebounce(map, 'nonexistent');
    expect(result).toBe(false);
  });

  it('resolves with undefined when no resolveWith given', async () => {
    const map = new Map<string, any>();
    const resolveSpy = vi.fn();

    const promise = scheduleDebounce(map, 'key', 100, () => 'never');
    promise.then(resolveSpy);

    cancelPendingDebounce(map, 'key');

    await vi.waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith(undefined);
    });
  });

  it('does not affect other keys', async () => {
    const map = new Map<string, any>();
    const resolveSpy = vi.fn();

    const promise = scheduleDebounce(map, 'keep', 10, () => 'kept');
    promise.then(resolveSpy);
    scheduleDebounce(map, 'cancel', 100, () => 'lost');

    cancelPendingDebounce(map, 'cancel');

    await promise;
    expect(resolveSpy).toHaveBeenCalledWith('kept');
  });
});

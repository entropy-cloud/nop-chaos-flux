import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleDebounce, cancelPendingDebounce } from '@nop-chaos/flux-core';

describe('scheduleDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with factory result after timeout', async () => {
    const pending = new Map();
    const promise = scheduleDebounce(pending, 'a', 100, () => 42);

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe(42);
    expect(pending.has('a')).toBe(false);
  });

  it('resolves with async factory result', async () => {
    const pending = new Map();
    const promise = scheduleDebounce(pending, 'a', 50, async () => 'async-result');

    await vi.advanceTimersByTimeAsync(50);

    await expect(promise).resolves.toBe('async-result');
  });

  it('debounces multiple calls for the same key', async () => {
    const pending = new Map();
    let callCount = 0;

    scheduleDebounce(pending, 'a', 100, () => {
      callCount++;
      return 'first';
    });
    const promise = scheduleDebounce(pending, 'a', 100, () => {
      callCount++;
      return 'second';
    });

    await vi.advanceTimersByTimeAsync(100);

    await expect(promise).resolves.toBe('second');
    expect(callCount).toBe(1);
  });

  it('cancels previous call and resolves it with undefined when replaced', async () => {
    const pending = new Map();

    const first = scheduleDebounce(pending, 'a', 100, () => 'first');
    const second = scheduleDebounce(pending, 'a', 100, () => 'second');

    await vi.advanceTimersByTimeAsync(100);

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBe('second');
  });

  it('tracks separate keys independently', async () => {
    const pending = new Map();

    const p1 = scheduleDebounce(pending, 'a', 50, () => 'A');
    const p2 = scheduleDebounce(pending, 'b', 100, () => 'B');

    await vi.advanceTimersByTimeAsync(50);
    await expect(p1).resolves.toBe('A');
    expect(pending.has('b')).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    await expect(p2).resolves.toBe('B');
  });

  it('rejects when factory throws', async () => {
    const pending = new Map();
    const promise = scheduleDebounce(pending, 'a', 50, () => {
      throw new Error('boom');
    });

    const assertionPromise = expect(promise).rejects.toThrow('boom');
    await vi.advanceTimersByTimeAsync(50);

    await assertionPromise;
    expect(pending.has('a')).toBe(false);
  });

  it('rejects when async factory rejects', async () => {
    const pending = new Map();
    const promise = scheduleDebounce(pending, 'a', 50, async () => {
      throw new Error('async-boom');
    });

    const assertionPromise = expect(promise).rejects.toThrow('async-boom');
    await vi.advanceTimersByTimeAsync(50);

    await assertionPromise;
    expect(pending.has('a')).toBe(false);
  });

  it('removes entry from map after resolution', async () => {
    const pending = new Map();
    scheduleDebounce(pending, 'a', 50, () => 1);

    expect(pending.has('a')).toBe(true);
    await vi.advanceTimersByTimeAsync(50);

    expect(pending.has('a')).toBe(false);
  });

  it('removes entry from map after rejection', async () => {
    const pending = new Map();
    const promise = scheduleDebounce(pending, 'a', 50, () => {
      throw new Error('x');
    });

    expect(pending.has('a')).toBe(true);
    const assertionPromise = expect(promise).rejects.toThrow('x');
    await vi.advanceTimersByTimeAsync(50);

    await assertionPromise;
    expect(pending.has('a')).toBe(false);
  });
});

describe('cancelPendingDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when no pending entry exists', () => {
    const pending = new Map();
    expect(cancelPendingDebounce(pending, 'missing')).toBe(false);
  });

  it('cancels pending timer and returns true', () => {
    const pending = new Map();
    let factoryCalled = false;

    scheduleDebounce(pending, 'a', 100, () => {
      factoryCalled = true;
      return 1;
    });
    const result = cancelPendingDebounce(pending, 'a');

    expect(result).toBe(true);
    expect(pending.has('a')).toBe(false);

    vi.advanceTimersByTime(200);
    expect(factoryCalled).toBe(false);
  });

  it('resolves cancelled promise with resolveWith value', async () => {
    const pending = new Map();

    const promise = scheduleDebounce(pending, 'a', 100, () => 'original');
    cancelPendingDebounce(pending, 'a', 'fallback');

    await expect(promise).resolves.toBe('fallback');
  });

  it('resolves cancelled promise with undefined when no resolveWith', async () => {
    const pending = new Map();

    const promise = scheduleDebounce(pending, 'a', 100, () => 'original');
    cancelPendingDebounce(pending, 'a');

    await expect(promise).resolves.toBeUndefined();
  });

  it('only cancels the specified key', async () => {
    const pending = new Map();

    const p1 = scheduleDebounce(pending, 'a', 100, () => 'A');
    const p2 = scheduleDebounce(pending, 'b', 100, () => 'B');

    cancelPendingDebounce(pending, 'a');

    await vi.advanceTimersByTimeAsync(100);

    await expect(p1).resolves.toBeUndefined();
    await expect(p2).resolves.toBe('B');
  });
});

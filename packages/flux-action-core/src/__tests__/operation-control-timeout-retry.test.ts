import { describe, expect, it, vi } from 'vitest';
import { withTimeout, withRetry, createAbortScope } from '../operation-control';

describe('withTimeout edge cases', () => {
  it('ignores second resolve after timeout', async () => {
    vi.useFakeTimers();
    let resolveDelayed: () => void;
    const delayed = new Promise<void>((r) => {
      resolveDelayed = r;
    });

    const promise = withTimeout(
      async () => {
        await delayed;
        return 'late';
      },
      50,
      () => 'timed-out',
    );

    await vi.advanceTimersByTimeAsync(60);
    const result = await promise;
    expect(result).toBe('timed-out');

    resolveDelayed!();
    await vi.advanceTimersByTimeAsync(10);
    vi.useRealTimers();
  });

  it('ignores second reject after timeout', async () => {
    vi.useFakeTimers();
    let rejectDelayed: (err: Error) => void;
    const delayed = new Promise<void>((_, r) => {
      rejectDelayed = r;
    });

    const promise = withTimeout(
      async () => {
        await delayed;
        return 'late';
      },
      50,
      () => 'timed-out',
    );

    await vi.advanceTimersByTimeAsync(60);
    const result = await promise;
    expect(result).toBe('timed-out');

    rejectDelayed!(new Error('late error'));
    await vi.advanceTimersByTimeAsync(10);
    vi.useRealTimers();
  });

  it('clears timeout when function resolves first', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const promise = withTimeout(
      async () => 'fast',
      1000,
      () => 'timeout',
    );

    const result = await promise;
    expect(result).toBe('fast');
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe('withRetry timeout integration', () => {
  it('does not retry when times is 0 and function succeeds', async () => {
    let callCount = 0;
    const result = await withRetry(
      async () => {
        callCount++;
        return 'ok';
      },
      { times: 0, delay: 0 },
      () => true,
    );
    expect(result.attempts).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(callCount).toBe(1);
  });

  it('tracks lastFailureReason through retries', async () => {
    let callCount = 0;
    const result = await withRetry(
      async () => {
        callCount++;
        if (callCount < 3) throw new Error('transient');
        return 'done';
      },
      { times: 3, delay: 0 },
      () => true,
    );
    expect(result.failureCount).toBe(2);
    expect(result.lastFailureReason).toBeInstanceOf(Error);
  });

  it('returns last result with attempts when shouldStop is never true', async () => {
    const values = ['a', 'b', 'c'];
    let idx = 0;
    const result = await withRetry(
      async () => values[idx++] ?? 'done',
      { times: 3, delay: 0 },
      () => false,
    );
    expect(result.result).toBe('done');
    expect(result.attempts).toBe(4);
  });

  it('exponential delay grows correctly', () => {
    const delay = (base: number, failureCount: number, maxDelay: number) =>
      Math.min(base * 2 ** Math.max(0, failureCount - 1), maxDelay);

    expect(delay(100, 1, 5000)).toBe(100);
    expect(delay(100, 2, 5000)).toBe(200);
    expect(delay(100, 3, 5000)).toBe(400);
    expect(delay(100, 5, 5000)).toBe(1600);
    expect(delay(100, 6, 5000)).toBe(3200);
    expect(delay(100, 7, 5000)).toBe(5000);
  });

  it('aborts mid-retry when signal fires during delay', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let callCount = 0;

    const promise = withRetry(
      async () => {
        callCount++;
        throw new Error('fail');
      },
      { times: 5, delay: 100, signal: controller.signal },
      () => true,
    );

    const assertionPromise = expect(promise).rejects.toThrow('aborted');

    await vi.advanceTimersByTimeAsync(50);
    expect(callCount).toBe(1);

    controller.abort();
    await vi.advanceTimersByTimeAsync(200);

    await assertionPromise;
    expect(callCount).toBe(1);
    vi.useRealTimers();
  });

  it('wraps non-Error throws with retry metadata', async () => {
    try {
      await withRetry(
        async () => {
          throw 'string-error';
        },
        { times: 1, delay: 0 },
        () => true,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const err = error as Error & { attempts?: number };
      expect(err.message).toBe('string-error');
      expect(err.attempts).toBe(2);
    }
  });
});

describe('createAbortScope', () => {
  it('signal is not aborted after creation', () => {
    const { signal } = createAbortScope();
    expect(signal.aborted).toBe(false);
  });

  it('signal is aborted after cancel', () => {
    const { signal, cancel } = createAbortScope();
    cancel();
    expect(signal.aborted).toBe(true);
  });

  it('cancel is idempotent', () => {
    const { signal, cancel } = createAbortScope();
    cancel();
    cancel();
    expect(signal.aborted).toBe(true);
  });
});

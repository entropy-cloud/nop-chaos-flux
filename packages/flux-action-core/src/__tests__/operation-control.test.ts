import { describe, expect, it, vi } from 'vitest';
import { createAbortScope, withTimeout, withRetry } from '../operation-control';

describe('createAbortScope', () => {
  it('returns a signal that is not aborted initially', () => {
    const { signal, cancel } = createAbortScope();
    expect(signal.aborted).toBe(false);
    cancel();
    expect(signal.aborted).toBe(true);
  });
});

describe('withTimeout', () => {
  it('resolves with function result when it finishes before timeout', async () => {
    const result = await withTimeout(
      async () => 42,
      1000,
      () => -1,
    );
    expect(result).toBe(42);
  });

  it('resolves with onTimeout result when function takes too long', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(
      async (_signal) => {
        await new Promise(() => {});
        return 'never';
      },
      50,
      () => 'timed-out',
    );

    await vi.advanceTimersByTimeAsync(60);

    const result = await promise;
    expect(result).toBe('timed-out');
    vi.useRealTimers();
  });

  it('rejects when function rejects before timeout', async () => {
    await expect(
      withTimeout(
        async () => {
          throw new Error('boom');
        },
        1000,
        () => 'fallback',
      ),
    ).rejects.toThrow('boom');
  });

  it('aborts signal on timeout', async () => {
    vi.useFakeTimers();
    let signalRef: AbortSignal | undefined;
    const promise = withTimeout(
      async (signal) => {
        signalRef = signal;
        await new Promise(() => {});
        return 'never';
      },
      50,
      () => 'timed-out',
    );

    await vi.advanceTimersByTimeAsync(60);
    await promise;

    expect(signalRef?.aborted).toBe(true);
    vi.useRealTimers();
  });

  it('does not call onTimeout when function resolves in time', async () => {
    const onTimeout = vi.fn(() => 'fallback');
    const result = await withTimeout(async () => 'ok', 1000, onTimeout);
    expect(result).toBe('ok');
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('rejects when parent signal aborts before timeout', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let signalRef: AbortSignal | undefined;

    const promise = withTimeout(
      async (signal) => {
        signalRef = signal;
        await new Promise(() => {});
        return 'never';
      },
      1000,
      () => 'timed-out',
      controller.signal,
    );
    const assertionPromise = expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort('parent-abort');
    await vi.runAllTimersAsync();

    await assertionPromise;
    expect(signalRef?.aborted).toBe(true);
    vi.useRealTimers();
  });
});

describe('withRetry', () => {
  it('returns result on first success when shouldStop is true', async () => {
    const result = await withRetry(
      async () => 'done',
      { times: 3 },
      (r) => r === 'done',
    );
    expect(result).toEqual({ result: 'done', attempts: 1, failureCount: 0 });
  });

  it('retries on error and succeeds', async () => {
    let callCount = 0;
    const result = await withRetry(
      async () => {
        callCount++;
        if (callCount < 3) throw new Error('fail');
        return 'ok';
      },
      { times: 3, delay: 0 },
      () => true,
    );
    expect(result.result).toBe('ok');
    expect(result.attempts).toBe(3);
    expect(result.failureCount).toBe(2);
  });

  it('throws after exhausting retries', async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error('always');
        },
        { times: 2, delay: 0 },
        () => true,
      ),
    ).rejects.toThrow('always');
  });

  it('retries when shouldStop returns false', async () => {
    let callCount = 0;
    const result = await withRetry(
      async () => {
        callCount++;
        return callCount;
      },
      { times: 3, delay: 0 },
      (r) => r === 3,
    );
    expect(result.result).toBe(3);
    expect(result.attempts).toBe(3);
    expect(result.failureCount).toBe(0);
  });

  it('returns last result when shouldStop never returns true and retries exhausted', async () => {
    const result = await withRetry(
      async () => 'partial',
      { times: 2, delay: 0 },
      () => false,
    );
    expect(result.result).toBe('partial');
    expect(result.attempts).toBe(3);
  });

  it('calls onFailedAttempt on each error', async () => {
    const failures: number[] = [];
    let callCount = 0;
    await withRetry(
      async () => {
        callCount++;
        if (callCount <= 2) throw new Error('fail');
        return 'ok';
      },
      { times: 3, delay: 0, onFailedAttempt: (count) => failures.push(count) },
      () => true,
    );
    expect(failures).toEqual([1, 2]);
  });

  it('aborts when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      withRetry(
        async () => 'never',
        { times: 2, delay: 0, signal: controller.signal },
        () => true,
      ),
    ).rejects.toThrow('aborted');
  });

  it('aborts during retry delay', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let callCount = 0;

    const promise = withRetry(
      async () => {
        callCount++;
        if (callCount === 1) throw new Error('fail');
        return 'ok';
      },
      { times: 3, delay: 100, signal: controller.signal },
      () => true,
    );

    const assertionPromise = expect(promise).rejects.toThrow('aborted');

    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await vi.advanceTimersByTimeAsync(200);

    await assertionPromise;
    vi.useRealTimers();
  });

  it('uses fixed delay strategy by default', async () => {
    vi.useFakeTimers();
    let callCount = 0;

    const promise = withRetry(
      async () => {
        callCount++;
        if (callCount <= 2) throw new Error('fail');
        return 'ok';
      },
      { times: 3, delay: 50, strategy: 'fixed' },
      () => true,
    );

    while (callCount < 3) {
      await vi.advanceTimersByTimeAsync(60);
    }

    const result = await promise;
    expect(result.result).toBe('ok');
    expect(result.failureCount).toBe(2);
    vi.useRealTimers();
  });

  it('uses exponential delay strategy', async () => {
    vi.useFakeTimers();
    let callCount = 0;

    const promise = withRetry(
      async () => {
        callCount++;
        if (callCount <= 2) throw new Error('fail');
        return 'ok';
      },
      { times: 3, delay: 10, strategy: 'exponential', maxDelay: 1000 },
      () => true,
    );

    while (callCount < 3) {
      await vi.advanceTimersByTimeAsync(200);
    }

    const result = await promise;
    expect(result.result).toBe('ok');
    vi.useRealTimers();
  });

  it('respects maxDelay for exponential strategy', () => {
    const getDelay = (failureCount: number, delay: number, maxDelay: number) =>
      Math.min(delay * 2 ** Math.max(0, failureCount - 1), maxDelay);

    expect(getDelay(1, 100, 500)).toBe(100);
    expect(getDelay(2, 100, 500)).toBe(200);
    expect(getDelay(3, 100, 500)).toBe(400);
    expect(getDelay(4, 100, 500)).toBe(500);
    expect(getDelay(5, 100, 500)).toBe(500);
  });

  it('atttempts is 0 when times is 0', async () => {
    const result = await withRetry(
      async () => 'ok',
      { times: 0, delay: 0 },
      () => true,
    );
    expect(result.attempts).toBe(1);
    expect(result.result).toBe('ok');
  });

  it('includes metadata on thrown error', async () => {
    try {
      await withRetry(
        async () => {
          throw new Error('boom');
        },
        { times: 1, delay: 0 },
        () => true,
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const meta = error as Error & { attempts?: number; failureCount?: number };
      expect(meta.attempts).toBe(2);
      expect(meta.failureCount).toBe(2);
    }
  });
});

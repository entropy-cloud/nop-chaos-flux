export interface RetryOptions {
  times: number;
  delay?: number;
  strategy?: 'fixed' | 'exponential';
  maxDelay?: number;
  onFailedAttempt?: (failureCount: number, error: unknown) => void;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  failureCount: number;
  lastFailureReason?: unknown;
}

function withRetryMetadata(error: unknown, metadata: { attempts: number; failureCount: number; lastFailureReason?: unknown }): unknown {
  if (error && typeof error === 'object') {
    return Object.assign(error as Record<string, unknown>, metadata);
  }

  return Object.assign(new Error(String(error)), metadata);
}

export function createAbortScope(): { signal: AbortSignal; cancel(): void } {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    cancel: () => controller.abort()
  };
}

export function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  onTimeout: () => T
): Promise<T> {
  const controller = new AbortController();

  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      controller.abort();
      resolve(onTimeout());
    }, ms);

    void fn(controller.signal)
      .then((result) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  shouldStop: (result: T) => boolean
): Promise<RetryResult<T>> {
  const retryTimes = Math.max(0, options.times);
  const retryDelay = Math.max(0, options.delay ?? 0);
  const retryStrategy = options.strategy ?? 'fixed';
  const maxDelay = Math.max(retryDelay, options.maxDelay ?? 30000);
  let attempts = 0;
  let failureCount = 0;
  let lastResult: T | undefined;
  let lastFailureReason: unknown;

  function getDelay(nextFailureCount: number): number {
    if (retryDelay <= 0) {
      return 0;
    }

    if (retryStrategy !== 'exponential') {
      return retryDelay;
    }

    return Math.min(retryDelay * (2 ** Math.max(0, nextFailureCount - 1)), maxDelay);
  }

  while (attempts <= retryTimes) {
    attempts += 1;

    try {
      lastResult = await fn();
    } catch (error) {
      failureCount += 1;
      lastFailureReason = error;
      options.onFailedAttempt?.(failureCount, error);

      if (attempts > retryTimes) {
        throw withRetryMetadata(error, {
          attempts,
          failureCount,
          lastFailureReason: error
        });
      }

      const delay = getDelay(failureCount);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      continue;
    }

    if (shouldStop(lastResult)) {
      return { result: lastResult, attempts, failureCount, lastFailureReason };
    }

    if (attempts > retryTimes) {
      break;
    }

    const syntheticFailureCount = failureCount + 1;
    if (retryDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, getDelay(syntheticFailureCount)));
    }
  }

  return { result: lastResult!, attempts, failureCount, lastFailureReason };
}

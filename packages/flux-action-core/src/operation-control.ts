export interface RetryOptions {
  times: number;
  delay?: number;
  strategy?: 'fixed' | 'exponential';
  maxDelay?: number;
  onFailedAttempt?: (failureCount: number, error: unknown) => void;
  signal?: AbortSignal;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  failureCount: number;
  lastFailureReason?: unknown;
}

function withRetryMetadata(
  error: unknown,
  metadata: { attempts: number; failureCount: number; lastFailureReason?: unknown },
): unknown {
  if (error && typeof error === 'object') {
    return Object.assign(error as Record<string, unknown>, metadata);
  }

  return Object.assign(new Error(String(error)), metadata);
}

export function createAbortScope(): { signal: AbortSignal; cancel(): void } {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

function createAbortError(reason?: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof DOMException !== 'undefined') {
    return new DOMException(
      typeof reason === 'string' && reason.length > 0 ? reason : 'The operation was aborted',
      'AbortError',
    );
  }

  const error = new Error(
    typeof reason === 'string' && reason.length > 0 ? reason : 'The operation was aborted',
  );
  error.name = 'AbortError';
  return error;
}

export function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  onTimeout: () => T,
  parentSignal?: AbortSignal,
): Promise<T> {
  if (parentSignal?.aborted) {
    return Promise.reject(createAbortError(parentSignal.reason));
  }

  const controller = new AbortController();

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener('abort', abortFromParent);
    };

    const abortFromParent = () => {
      if (settled) {
        return;
      }

      settled = true;
      controller.abort(parentSignal?.reason);
      cleanup();
      reject(createAbortError(parentSignal?.reason));
    };

    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      controller.abort();
      cleanup();
      resolve(onTimeout());
    }, ms);

    parentSignal?.addEventListener('abort', abortFromParent, { once: true });

    void fn(controller.signal)
      .then((result) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(result);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      });
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  shouldStop: (result: T) => boolean,
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

    return Math.min(retryDelay * 2 ** Math.max(0, nextFailureCount - 1), maxDelay);
  }

  function abortError() {
    return withRetryMetadata(new DOMException('The operation was aborted', 'AbortError'), {
      attempts,
      failureCount,
      lastFailureReason,
    });
  }

  function throwIfAborted() {
    if (options.signal?.aborted) {
      throw abortError();
    }
  }

  function waitWithAbort(delay: number) {
    return new Promise<void>((resolve, reject) => {
      if (delay <= 0) {
        resolve();
        return;
      }
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve();
      }, delay);
      const abortHandler = () => {
        clearTimeout(timeoutId);
        cleanup();
        reject(abortError());
      };
      const cleanup = () => options.signal?.removeEventListener('abort', abortHandler);
      options.signal?.addEventListener('abort', abortHandler, { once: true });
    });
  }

  while (attempts <= retryTimes) {
    throwIfAborted();
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
          lastFailureReason: error,
        });
      }

      const delay = getDelay(failureCount);
      if (delay > 0) {
        await waitWithAbort(delay);
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
      await waitWithAbort(getDelay(syntheticFailureCount));
    }
  }

  return { result: lastResult!, attempts, failureCount, lastFailureReason };
}

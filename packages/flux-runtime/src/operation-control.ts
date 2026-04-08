export interface RetryOptions {
  times: number;
  delay?: number;
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
): Promise<{ result: T; attempts: number }> {
  const retryTimes = Math.max(0, options.times);
  const retryDelay = Math.max(0, options.delay ?? 0);
  let attempts = 0;
  let lastResult: T | undefined;

  while (attempts <= retryTimes) {
    attempts += 1;
    lastResult = await fn();

    if (shouldStop(lastResult)) {
      return { result: lastResult, attempts };
    }

    if (attempts > retryTimes) {
      break;
    }

    if (retryDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return { result: lastResult!, attempts };
}

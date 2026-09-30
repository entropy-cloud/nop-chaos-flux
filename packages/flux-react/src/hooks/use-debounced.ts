import { useEffect, useRef, useState } from 'react';

/**
 * Trailing value debounce: returns a copy of `value` that only updates after
 * `delayMs` of stability. Unmount cancels the pending update. (The flux-core
 * `scheduleDebounce` primitive is promise-based action coalescing and does not
 * fit value debouncing — cq-2 Phase 3 as-built.)
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}

/**
 * Trailing callback debounce: bursts of calls run only the last invocation
 * after `delayMs`. The callback is read through a ref at fire time (latest
 * closure wins); unmount cancels the pending invocation.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (...args: Args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callbackRef.current(...args);
    }, delayMs);
  };
}

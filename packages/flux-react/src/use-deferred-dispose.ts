import { useEffect, useRef } from 'react';

interface UseDeferredDisposeOptions<T> {
  value: T | undefined;
  isEnabled?: boolean;
  dispose: (disposed: T) => void;
}

/**
 * StrictMode-safe deferred disposal for an owned value (scope, registry,
 * runtime). The disposer never fires while the same value is still the live
 * one on a mounted owner — React StrictMode's mount/cleanup/mount simulation
 * and same-value effect re-runs therefore produce zero dispose calls. When the
 * value is swapped or the owner unmounts, the previous value is disposed once
 * from a microtask. `isEnabled` is the ownership gate: while false, nothing is
 * disposed. The disposer closure is intentionally not a dependency — it travels
 * with the render that produced `value` (deps discipline: swapping unrelated
 * inputs such as the runtime must not queue extra dispose work when `value` is
 * referentially unchanged).
 */
export function useDeferredDispose<T>(options: UseDeferredDisposeOptions<T>): void {
  const { value, isEnabled = true, dispose } = options;
  const mountedRef = useRef(false);
  const activeValueRef = useRef<T | undefined>(undefined);
  const disposeRef = useRef(dispose);

  useEffect(() => {
    disposeRef.current = dispose;
  });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeValueRef.current = value;
    const pairedDisposer = disposeRef.current;

    return () => {
      const disposed = value;

      queueMicrotask(() => {
        if (!disposed) {
          return;
        }

        if (mountedRef.current && activeValueRef.current === disposed) {
          return;
        }

        if (!isEnabled) {
          return;
        }

        pairedDisposer(disposed);
      });
    };
  }, [value, isEnabled]);
}

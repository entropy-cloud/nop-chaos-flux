import { useEffect, useRef, useState } from 'react';

interface MockableIntersectionObserver {
  __fireIntersection: (target: Element) => void;
}

let observerCtor: typeof IntersectionObserver | undefined =
  typeof IntersectionObserver !== 'undefined' ? IntersectionObserver : undefined;

export function setIntersectionObserverCtor(ctor: typeof IntersectionObserver | undefined) {
  observerCtor = ctor;
}

export function getIntersectionObserverCtor(): typeof IntersectionObserver | undefined {
  return observerCtor;
}

type InfiniteObserverTestHook = MockableIntersectionObserver;

declare global {
  interface Window {
    __crudInfiniteObserver?: InfiniteObserverTestHook;
  }
}

// Per-sentinel registry so concurrent infinite-scroll instances (multiple CRUDs/lists
// on one page) each keep their own test hook instead of clobbering a single shared slot.
const observerRegistry = new Map<Element, InfiniteObserverTestHook>();

function ensureInfiniteObserverTestHook(): void {
  if (typeof window === 'undefined' || window.__crudInfiniteObserver) {
    return;
  }
  window.__crudInfiniteObserver = {
    __fireIntersection: (target: Element) => {
      const hook = observerRegistry.get(target);
      hook?.__fireIntersection(target);
    },
  };
}

function isThenable(value: unknown): value is Promise<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

function isSentinelInViewport(sentinel: Element): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const viewportHeight = window.innerHeight;
  // No real viewport (e.g. jsdom/happy-dom without layout) → cannot decide, so do
  // not auto-continue. This keeps the sentinel-driven contract explicit in tests.
  if (!viewportHeight) {
    return false;
  }
  const rect = sentinel.getBoundingClientRect();
  return rect.top < viewportHeight && rect.bottom > 0;
}

export interface UseInfiniteScrollArgs {
  enabled: boolean;
  /**
   * Trigger the next page load. May return a promise representing the in-flight
   * fetch; when it does, the hook drives `loading`/`error` from it, guards
   * against concurrent triggers, and re-checks the sentinel after settlement so
   * a page shorter than the viewport keeps filling (G5).
   */
  onLoadMore(): Promise<unknown> | unknown | void;
  sentinelRef: React.RefObject<Element | null>;
}

export interface UseInfiniteScrollResult {
  loading: boolean;
  error: unknown;
  reset(): void;
  setLoading(next: boolean): void;
  setError(next: unknown): void;
}

export function useInfiniteScroll(args: UseInfiniteScrollArgs): UseInfiniteScrollResult {
  const { enabled, onLoadMore, sentinelRef } = args;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  // `loadingRef` mirrors `loading` so the IntersectionObserver callback (which is
  // created once per effect run) can read the current in-flight state without
  // re-subscribing, enabling the concurrent-fetch guard (G5).
  const loadingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const Ctor = observerCtor;
    if (!Ctor) {
      return;
    }

    const triggerLoad = () => {
      // Concurrent-fetch guard (G5): never start a second load while one is in-flight.
      if (loadingRef.current) {
        return;
      }
      const result = onLoadMoreRef.current();
      if (!isThenable(result)) {
        return;
      }
      loadingRef.current = true;
      setLoading(true);
      setError(undefined);
      result.then(
        (value) => {
          loadingRef.current = false;
          setLoading(false);
          // The action dispatcher normally converts failures into a resolved
          // `{ ok: false, error }` ActionResult rather than a rejected promise;
          // treat that as a load error so the error UI is reachable (G5).
          const ok =
            value && typeof value === 'object' ? (value as { ok?: boolean }).ok : undefined;
          if (ok === false) {
            setError((value as { error?: unknown }).error ?? new Error('Load failed'));
            return;
          }
          // Short-page continuation (G5): if the sentinel is still inside the
          // viewport after the load settled, the first page did not fill the view,
          // so keep loading until it does or the consumer disables the sentinel.
          if (!enabledRef.current || !isSentinelInViewport(sentinel)) {
            return;
          }
          // Defer to avoid synchronous recursion and let the consumer re-render
          // (it may flip `enabled` to false at the last page).
          setTimeout(triggerLoad, 0);
        },
        (loadError: unknown) => {
          loadingRef.current = false;
          setError(loadError);
          setLoading(false);
        },
      );
    };

    const callback: IntersectionObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) {
        return;
      }
      triggerLoad();
    };

    const observer = new Ctor(callback, { threshold: 0 });
    observer.observe(sentinel);
    const testHook: InfiniteObserverTestHook = {
      __fireIntersection: (target: Element) => {
        if (target === sentinel) {
          triggerLoad();
        }
      },
    };
    observerRegistry.set(sentinel, testHook);
    ensureInfiniteObserverTestHook();

    return () => {
      observerRegistry.delete(sentinel);
      observer.disconnect();
    };
  }, [enabled, sentinelRef]);

  function reset() {
    loadingRef.current = false;
    setLoading(false);
    setError(undefined);
  }

  return {
    loading,
    error,
    reset,
    setLoading(next: boolean) {
      loadingRef.current = next;
      setLoading(next);
    },
    setError(next: unknown) {
      setError(next);
    },
  };
}

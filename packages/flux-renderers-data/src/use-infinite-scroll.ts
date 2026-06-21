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

declare global {
  interface Window {
    __crudInfiniteObserver?: IntersectionObserver & MockableIntersectionObserver;
  }
}

export interface UseInfiniteScrollArgs {
  enabled: boolean;
  onLoadMore(): void;
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
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

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

    const callback: IntersectionObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) {
        return;
      }
      onLoadMoreRef.current();
    };

    const observer = new Ctor(callback, { threshold: 0 });
    observer.observe(sentinel);
    (observer as IntersectionObserver & MockableIntersectionObserver).__fireIntersection = (
      target: Element,
    ) => {
      if (target === sentinel) {
        onLoadMoreRef.current();
      }
    };
    if (typeof window !== 'undefined') {
      window.__crudInfiniteObserver = observer as IntersectionObserver & MockableIntersectionObserver;
    }

    return () => {
      observer.disconnect();
      if (typeof window !== 'undefined' && window.__crudInfiniteObserver === observer) {
        delete window.__crudInfiniteObserver;
      }
    };
  }, [enabled, sentinelRef]);

  function reset() {
    setLoading(false);
    setError(undefined);
  }

  return {
    loading,
    error,
    reset,
    setLoading,
    setError,
  };
}

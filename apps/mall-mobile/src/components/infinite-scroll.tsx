import { useEffect, useRef, type ReactNode } from 'react';
import { InlineLoading } from './state-views';

export interface InfiniteScrollProps {
  hasMore: boolean;
  loading: boolean;
  error?: string | null;
  onLoadMore: () => void;
  loadingText?: string;
  finishedText?: string;
  errorText?: string;
  distance?: number;
  children?: ReactNode;
}

export function InfiniteScroll({
  hasMore,
  loading,
  error,
  onLoadMore,
  loadingText,
  finishedText = '没有更多了',
  errorText = '加载失败，点击重试',
  distance = 200,
  children,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (loading) return;
        if (!hasMore) return;
        if (error) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onLoadMoreRef.current();
          }
        }
      },
      { rootMargin: `0px 0px ${distance}px 0px` },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, hasMore, error, distance]);

  const showFinished = !hasMore && !loading && !error;
  const showError = !!error && !loading;

  return (
    <div className="mall-infinite-scroll" data-slot="infinite-scroll">
      <div data-slot="infinite-scroll-body">{children}</div>
      <div ref={sentinelRef} data-slot="infinite-scroll-sentinel" aria-hidden="true" style={{ height: 1 }} />
      <div className="mall-infinite-scroll-status" role="status" aria-live="polite">
        {loading ? <InlineLoading message={loadingText} /> : null}
        {showFinished ? <span>{finishedText}</span> : null}
        {showError ? (
          <button type="button" className="mall-touch-target mall-infinite-scroll-retry" onClick={onLoadMore}>
            {typeof error === 'string' && error.length > 0 ? error : errorText}
          </button>
        ) : null}
      </div>
    </div>
  );
}

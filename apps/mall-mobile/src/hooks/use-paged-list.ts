import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageBean } from '../api/rpc';

export interface PagedListResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface PagedListOptions {
  pageSize?: number;
}

function toMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return typeof err === 'string' ? err : '加载失败，请稍后重试';
}

export function usePagedList<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PageBean<T>>,
  key?: unknown,
  options: PagedListOptions = {},
): PagedListResult<T> {
  const pageSize = options.pageSize ?? 10;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchRef = useRef(fetchPage);
  const pageRef = useRef(1);
  const seqRef = useRef(0);
  const inflightRef = useRef(false);

  useEffect(() => {
    fetchRef.current = fetchPage;
  }, [fetchPage]);

  const loadPage = useCallback(
    async (page: number, replace: boolean) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      const mySeq = ++seqRef.current;
      setLoading(true);
      setError(null);
      try {
        const bean = await fetchRef.current(page, pageSize);
        if (mySeq !== seqRef.current) return;
        const pageItems = bean.items ?? [];
        const total = typeof bean.total === 'number' ? bean.total : null;
        setItems((prev) => (replace ? pageItems : [...prev, ...pageItems]));
        pageRef.current = page;
        if (total !== null) {
          setHasMore(page * pageSize < total && pageItems.length > 0);
        } else {
          setHasMore(pageItems.length >= pageSize);
        }
        setLoading(false);
      } catch (err) {
        if (mySeq !== seqRef.current) return;
        setError(toMessage(err));
        setLoading(false);
      } finally {
        if (mySeq === seqRef.current) inflightRef.current = false;
      }
    },
    [pageSize],
  );

  const loadMore = useCallback(async () => {
    if (inflightRef.current) return;
    if (!hasMore) return;
    await loadPage(pageRef.current + 1, false);
  }, [hasMore, loadPage]);

  const refresh = useCallback(async () => {
    await loadPage(1, true);
  }, [loadPage]);

  useEffect(() => {
    seqRef.current++;
    pageRef.current = 1;
    inflightRef.current = false;
    setItems([]);
    setHasMore(true);
    setError(null);
    void loadPage(1, true);
  }, [loadPage, key]);

  return { items, loading, error, hasMore, loadMore, refresh };
}

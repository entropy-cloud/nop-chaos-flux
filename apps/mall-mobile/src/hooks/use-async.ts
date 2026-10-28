import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function toMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return typeof err === 'string' ? err : '加载失败，请稍后重试';
}

export function useAsync<T>(fn: () => Promise<T>, key?: unknown): AsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  const seqRef = useRef(0);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const run = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      const result = await fnRef.current();
      if (seq !== seqRef.current) return;
      setError(null);
      setData(result);
      setLoading(false);
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(toMessage(err));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const seq = ++seqRef.current;
    let active = true;
    fnRef.current().then(
      (result) => {
        if (!active || seq !== seqRef.current) return;
        setError(null);
        setData(result);
        setLoading(false);
      },
      (err) => {
        if (!active || seq !== seqRef.current) return;
        setError(toMessage(err));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [key]);

  return { data, loading, error, refetch: run };
}

import { useCallback, useRef, useState } from 'react';
import type { ActionSchema, RendererHelpers } from '@nop-chaos/flux-core';

export interface LazyChildrenState {
  loading: boolean;
  error: string | undefined;
  children: unknown[] | undefined;
}

export interface UseTableLazyChildrenApi {
  lazyChildrenMap: ReadonlyMap<string, LazyChildrenState>;
  loadChildren: (rowKey: string, record: Record<string, unknown>) => void;
  refreshNode: (rowKey: string) => void;
}

function sanitizeChildren(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as Record<string, unknown>).items)) {
    return (data as Record<string, unknown>).items as unknown[];
  }
  if (data && typeof data === 'object' && 'rows' in data && Array.isArray((data as Record<string, unknown>).rows)) {
    return (data as Record<string, unknown>).rows as unknown[];
  }
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as Record<string, unknown>).data)) {
    return (data as Record<string, unknown>).data as unknown[];
  }
  return [];
}

export function useTableLazyChildren(input: {
  childrenSource?: ActionSchema;
  helpers: RendererHelpers;
}): UseTableLazyChildrenApi {
  const { childrenSource, helpers } = input;
  const [lazyChildrenMap, setLazyChildrenMap] = useState<Map<string, LazyChildrenState>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const setNodeState = useCallback((rowKey: string, state: LazyChildrenState) => {
    setLazyChildrenMap((prev) => {
      const next = new Map(prev);
      if (state.loading === false && state.error === undefined && state.children === undefined) {
        next.delete(rowKey);
      } else {
        next.set(rowKey, state);
      }
      return next;
    });
  }, []);

  const loadChildren = useCallback(
    (rowKey: string, record: Record<string, unknown>) => {
      if (!childrenSource) return;
      if (inFlightRef.current.has(rowKey)) return;

      inFlightRef.current.add(rowKey);
      setNodeState(rowKey, { loading: true, error: undefined, children: undefined });

      const scope = helpers.createScope({ record, rowKey });
      const actionInput = childrenSource as ActionSchema;
      void helpers
        .dispatch(actionInput, { scope })
        .then((result) => {
          if (!mountedRef.current) return;
          if (result.ok) {
            const children = sanitizeChildren(result.data);
            setNodeState(rowKey, { loading: false, error: undefined, children });
          } else {
            const errorMsg =
              typeof result.error === 'string' && result.error
                ? result.error
                : result.error instanceof Error
                  ? result.error.message
                  : 'Failed to load children.';
            setNodeState(rowKey, { loading: false, error: errorMsg, children: undefined });
          }
        })
        .catch((err: unknown) => {
          if (!mountedRef.current) return;
          setNodeState(rowKey, {
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load children.',
            children: undefined,
          });
        })
        .finally(() => {
          inFlightRef.current.delete(rowKey);
        });
    },
    [childrenSource, helpers, setNodeState],
  );

  const refreshNode = useCallback(
    (rowKey: string) => {
      setNodeState(rowKey, { loading: false, error: undefined, children: undefined });
      inFlightRef.current.delete(rowKey);
    },
    [setNodeState],
  );

  return { lazyChildrenMap, loadChildren, refreshNode };
}

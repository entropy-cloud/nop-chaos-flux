import { useState, useEffect, useMemo } from 'react';
import type { ScopeRef, ApiSchema, ActionSchema, ActionResult } from '@nop-chaos/flux-core';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import {
  isVariableSourceRef,
  isFuncSourceRef,
  isSQLSchemaSourceRef,
} from './types';
import type {
  ExpressionEditorConfig,
  SQLEditorConfig,
  VariableItem,
  FuncGroup,
  TableSchema,
} from './types';

function getDataAtPath(data: unknown, dataPath: string | undefined): unknown {
  if (!dataPath) return data;
  const parts = dataPath.split('.');
  let current: unknown = data;
  for (const key of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

interface AsyncResolverState<T> {
  items: T[];
  error: Error | null;
  loading: boolean;
}

/**
 * Shared async resolver helper for API-backed source resolution.
 * Handles abort, error reporting, and data extraction in one place.
 * 
 * Note: Loading state is set via a microtask (queueMicrotask) to comply
 * with React 19's strict rule against synchronous setState in effects.
 */
function useAsyncApiResolver<T>(
  api: ApiSchema | undefined,
  dataPath: string | undefined,
  dispatch: RendererHelpers['dispatch'],
): { items: T[]; error: Error | null; loading: boolean } {
  const [state, setState] = useState<AsyncResolverState<T>>({
    items: [],
    error: null,
    loading: false,
  });

  // Memoize config to create stable dependency - includes all values needed in effect
  const config = useMemo(() => {
    if (!api) return null;
    return { api, dataPath };
  }, [api, dataPath]);

  useEffect(() => {
    if (!config) {
      // Reset state when config becomes null - use microtask to avoid synchronous setState
      queueMicrotask(() => {
        setState(prev => {
          if (prev.loading || prev.items.length > 0 || prev.error) {
            return { items: [], error: null, loading: false };
          }
          return prev;
        });
      });
      return;
    }

    const { api: currentApi, dataPath: currentDataPath } = config;
    const controller = new AbortController();
    const { signal } = controller;

    // Use microtask to set loading state - complies with React 19 effect rules
    queueMicrotask(() => {
      if (signal.aborted) return;
      setState(prev => ({ ...prev, loading: true, error: null }));
    });

    const action = { action: 'ajax', args: currentApi } as ActionSchema;
    dispatch(action, { signal })
      .then((result: ActionResult) => {
        if (signal.aborted) return;
        if (result.ok && result.data != null) {
          const extracted = getDataAtPath(result.data, currentDataPath);
          setState({
            items: Array.isArray(extracted) ? (extracted as T[]) : [],
            error: null,
            loading: false,
          });
        } else if (!result.ok) {
          const errorMessage = result.error instanceof Error
            ? result.error.message
            : typeof result.error === 'string'
              ? result.error
              : 'API request failed';
          setState({
            items: [],
            error: new Error(errorMessage),
            loading: false,
          });
        }
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        const errorMessage = err instanceof Error ? err.message : 'Unknown resolver error';
        console.warn('[source-resolvers] API request failed:', errorMessage);
        setState({
          items: [],
          error: new Error(errorMessage),
          loading: false,
        });
      });

    return () => {
      controller.abort();
    };
  }, [config, dispatch]);

  return state;
}

export function useResolvedVariables(
  config: ExpressionEditorConfig | undefined,
  scope: ScopeRef,
  dispatch: RendererHelpers['dispatch'],
): VariableItem[] {
  const raw = config?.variables;

  const syncResolved = useMemo<VariableItem[] | null>(() => {
    if (!raw) return [];
    if (!isVariableSourceRef(raw)) return raw;
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, raw.dataPath);
      return Array.isArray(items) ? (items as VariableItem[]) : [];
    }
    return null;
  }, [raw, scope]);

  const apiConfig = raw && isVariableSourceRef(raw) && raw.source === 'api' ? raw : null;
  const { items: apiResolved } = useAsyncApiResolver<VariableItem>(
    apiConfig?.api,
    apiConfig?.dataPath,
    dispatch,
  );

  return syncResolved !== null ? syncResolved : apiResolved;
}

export function useResolvedFunctions(
  config: ExpressionEditorConfig | undefined,
  dispatch: RendererHelpers['dispatch'],
): FuncGroup[] {
  const raw = config?.functions;

  const syncResolved = useMemo<FuncGroup[] | null>(() => {
    if (!raw) return [];
    if (!isFuncSourceRef(raw)) return raw;
    return null;
  }, [raw]);

  const apiConfig = raw && isFuncSourceRef(raw) && raw.source === 'api' ? raw : null;
  const { items: apiResolved } = useAsyncApiResolver<FuncGroup>(
    apiConfig?.api,
    apiConfig?.dataPath,
    dispatch,
  );

  return syncResolved !== null ? syncResolved : apiResolved;
}

export function useResolvedTables(
  config: SQLEditorConfig | undefined,
  scope: ScopeRef,
  dispatch: RendererHelpers['dispatch'],
): TableSchema[] {
  const raw = config?.tables;

  const syncResolved = useMemo<TableSchema[] | null>(() => {
    if (!raw) return [];
    if (!isSQLSchemaSourceRef(raw)) return raw;
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, raw.dataPath);
      return Array.isArray(items) ? (items as TableSchema[]) : [];
    }
    return null;
  }, [raw, scope]);

  const apiConfig = raw && isSQLSchemaSourceRef(raw) && raw.source === 'api' ? raw : null;
  const { items: apiResolved } = useAsyncApiResolver<TableSchema>(
    apiConfig?.api,
    apiConfig?.dataPath,
    dispatch,
  );

  return syncResolved !== null ? syncResolved : apiResolved;
}

export function useResolvedSQLVariables(
  config: SQLEditorConfig | undefined,
  scope: ScopeRef,
  dispatch: RendererHelpers['dispatch'],
): VariableItem[] {
  const raw = config?.variablePanel?.variables;

  const syncResolved = useMemo<VariableItem[] | null>(() => {
    if (!raw) return [];
    if (!isVariableSourceRef(raw)) return raw;
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, raw.dataPath);
      return Array.isArray(items) ? (items as VariableItem[]) : [];
    }
    return null;
  }, [raw, scope]);

  const apiConfig = raw && isVariableSourceRef(raw) && raw.source === 'api' ? raw : null;
  const { items: apiResolved } = useAsyncApiResolver<VariableItem>(
    apiConfig?.api,
    apiConfig?.dataPath,
    dispatch,
  );

  return syncResolved !== null ? syncResolved : apiResolved;
}

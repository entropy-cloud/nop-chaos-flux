import { useState, useEffect, useMemo } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
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
  return dataPath.split('.').reduce((obj: any, key: string) => obj?.[key], data);
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
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.read();
      const items = getDataAtPath(data, raw.dataPath);
      return Array.isArray(items) ? (items as VariableItem[]) : [];
    }
    return null;
  }, [raw, scope]);

  const [apiResolved, setApiResolved] = useState<VariableItem[]>([]);

  useEffect(() => {
    if (!raw || !isVariableSourceRef(raw) || raw.source !== 'api' || !raw.api) return;
    const controller = new AbortController();
    const { signal } = controller;
    dispatch({ action: 'ajax', api: raw.api } as any).then((result) => {
      if (signal.aborted) return;
      if (result.ok && result.data != null) {
        const items = getDataAtPath(result.data, raw.dataPath);
        setApiResolved(Array.isArray(items) ? (items as VariableItem[]) : []);
      }
    }).catch(() => {});
    return () => { controller.abort(); };
  }, [raw, dispatch]);

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

  const [apiResolved, setApiResolved] = useState<FuncGroup[]>([]);

  useEffect(() => {
    if (!raw || !isFuncSourceRef(raw) || raw.source !== 'api' || !raw.api) return;
    const controller = new AbortController();
    const { signal } = controller;
    dispatch({ action: 'ajax', api: raw.api } as any).then((result) => {
      if (signal.aborted) return;
      if (result.ok && result.data != null) {
        const groups = getDataAtPath(result.data, raw.dataPath);
        setApiResolved(Array.isArray(groups) ? (groups as FuncGroup[]) : []);
      }
    }).catch(() => {});
    return () => { controller.abort(); };
  }, [raw, dispatch]);

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
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.read();
      const items = getDataAtPath(data, raw.dataPath);
      return Array.isArray(items) ? (items as TableSchema[]) : [];
    }
    return null;
  }, [raw, scope]);

  const [apiResolved, setApiResolved] = useState<TableSchema[]>([]);

  useEffect(() => {
    if (!raw || !isSQLSchemaSourceRef(raw) || raw.source !== 'api' || !raw.api) return;
    const controller = new AbortController();
    const { signal } = controller;
    dispatch({ action: 'ajax', api: raw.api } as any).then((result) => {
      if (signal.aborted) return;
      if (result.ok && result.data != null) {
        const items = getDataAtPath(result.data, raw.dataPath);
        setApiResolved(Array.isArray(items) ? (items as TableSchema[]) : []);
      }
    }).catch(() => {});
    return () => { controller.abort(); };
  }, [raw, scope, dispatch]);

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
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.read();
      const items = getDataAtPath(data, raw.dataPath);
      return Array.isArray(items) ? (items as VariableItem[]) : [];
    }
    return null;
  }, [raw, scope]);

  const [apiResolved, setApiResolved] = useState<VariableItem[]>([]);

  useEffect(() => {
    if (!raw || !isVariableSourceRef(raw) || raw.source !== 'api' || !raw.api) return;
    const controller = new AbortController();
    const { signal } = controller;
    dispatch({ action: 'ajax', api: raw.api } as any).then((result) => {
      if (signal.aborted) return;
      if (result.ok && result.data != null) {
        const items = getDataAtPath(result.data, raw.dataPath);
        setApiResolved(Array.isArray(items) ? (items as VariableItem[]) : []);
      }
    }).catch(() => {});
    return () => { controller.abort(); };
  }, [raw, scope, dispatch]);

  return syncResolved !== null ? syncResolved : apiResolved;
}

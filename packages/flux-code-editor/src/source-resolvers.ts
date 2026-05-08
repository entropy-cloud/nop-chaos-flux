import { useMemo } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import {
  isVariableSourceRef,
  isFuncSourceRef,
  isSQLSchemaSourceRef,
  resolveSourceRefPath,
} from './types.js';
import type {
  ExpressionEditorConfig,
  SQLEditorConfig,
  VariableItem,
  FuncGroup,
  TableSchema,
} from './types.js';

function getDataAtPath(data: unknown, path: string | undefined): unknown {
  if (!path) return data;
  const parts = path.split('.');
  let current: unknown = data;
  for (const key of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}


export function useResolvedVariables(
  config: ExpressionEditorConfig | undefined,
  scope: ScopeRef,
): VariableItem[] {
  const raw = config?.variables;

  return useMemo<VariableItem[]>(() => {
    if (!raw) return [];
    if (!isVariableSourceRef(raw)) return raw;
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return Array.isArray(items) ? (items as VariableItem[]) : [];
    }
    return [];
  }, [raw, scope]);
}

export function useResolvedFunctions(
  config: ExpressionEditorConfig | undefined,
): FuncGroup[] {
  const raw = config?.functions;

  return useMemo<FuncGroup[]>(() => {
    if (!raw) return [];
    if (!isFuncSourceRef(raw)) return raw;
    return [];
  }, [raw]);
}

export function useResolvedTables(
  config: SQLEditorConfig | undefined,
  scope: ScopeRef,
): TableSchema[] {
  const raw = config?.tables;

  return useMemo<TableSchema[]>(() => {
    if (!raw) return [];
    if (!isSQLSchemaSourceRef(raw)) return raw;
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return Array.isArray(items) ? (items as TableSchema[]) : [];
    }
    return [];
  }, [raw, scope]);
}

export function useResolvedSQLVariables(
  config: SQLEditorConfig | undefined,
  scope: ScopeRef,
): VariableItem[] {
  const raw = config?.variablePanel?.variables;

  return useMemo<VariableItem[]>(() => {
    if (!raw) return [];
    if (!isVariableSourceRef(raw)) return raw;
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return Array.isArray(items) ? (items as VariableItem[]) : [];
    }
    return [];
  }, [raw, scope]);
}

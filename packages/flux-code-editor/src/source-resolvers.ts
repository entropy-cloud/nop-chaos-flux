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

function isVariableItem(value: unknown): value is VariableItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.label === 'string' && typeof candidate.value === 'string';
}

function sanitizeVariableItems(value: unknown): VariableItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isVariableItem(entry)) {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    return [{
      ...candidate,
      children: sanitizeVariableItems(candidate.children),
    } as VariableItem];
  });
}

function isFuncItem(value: unknown): boolean {
  return Boolean(value) && typeof value === 'object' && typeof (value as Record<string, unknown>).name === 'string';
}

function isFuncGroup(value: unknown): value is FuncGroup {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).groupName === 'string' &&
    Array.isArray((value as Record<string, unknown>).items)
  );
}

function sanitizeFuncGroups(value: unknown): FuncGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isFuncGroup(entry)) {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    const items = Array.isArray(candidate.items) ? candidate.items.filter(isFuncItem) : [];
    return items.length > 0
      ? [{ ...candidate, items } as FuncGroup]
      : [];
  });
}

function isColumnSchema(value: unknown): boolean {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

function isTableSchema(value: unknown): value is TableSchema {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    Array.isArray((value as Record<string, unknown>).columns)
  );
}

function sanitizeTables(value: unknown): TableSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isTableSchema(entry)) {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    const columns = Array.isArray(candidate.columns) ? candidate.columns.filter(isColumnSchema) : [];
    return columns.length > 0
      ? [{ ...candidate, columns } as TableSchema]
      : [];
  });
}


export function useResolvedVariables(
  config: ExpressionEditorConfig | undefined,
  scope: ScopeRef,
): VariableItem[] {
  const raw = config?.variables;

  return useMemo<VariableItem[]>(() => {
    if (!raw) return [];
    if (!isVariableSourceRef(raw)) return sanitizeVariableItems(raw);
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return sanitizeVariableItems(items);
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
    if (!isFuncSourceRef(raw)) return sanitizeFuncGroups(raw);
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
    if (!isSQLSchemaSourceRef(raw)) return sanitizeTables(raw);
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return sanitizeTables(items);
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
    if (!isVariableSourceRef(raw)) return sanitizeVariableItems(raw);
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible();
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return sanitizeVariableItems(items);
    }
    return [];
  }, [raw, scope]);
}

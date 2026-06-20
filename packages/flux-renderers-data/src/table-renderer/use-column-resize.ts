import { useCallback, useMemo, useRef, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableColumnSchema } from '../schemas.js';

const DEFAULT_MIN_WIDTH = 40;

function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

function toNumericWidth(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/px$/, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function resolveColumnWidth(column: TableColumnSchema, fallback = 120): number {
  return toNumericWidth(column.width, fallback);
}

export function resolveColumnMinWidth(column: TableColumnSchema): number {
  const min = typeof column.minWidth === 'number' && Number.isFinite(column.minWidth)
    ? column.minWidth
    : DEFAULT_MIN_WIDTH;
  return Math.max(min, DEFAULT_MIN_WIDTH);
}

export function resolveColumnMaxWidth(column: TableColumnSchema): number | undefined {
  if (typeof column.maxWidth === 'number' && Number.isFinite(column.maxWidth) && column.maxWidth > 0) {
    return column.maxWidth;
  }

  return undefined;
}

export function isColumnResizable(column: TableColumnSchema, columnResize: boolean | undefined): boolean {
  if (columnResize === false) {
    return false;
  }

  return column.resizable !== false;
}

export interface ColumnResizeApi {
  widths: Record<string, number>;
  getColumnWidth(column: TableColumnSchema, index: number): number;
  startResize(column: TableColumnSchema, index: number, startClientX: number): () => void;
}

interface ActiveResize {
  key: string;
  minWidth: number;
  maxWidth: number | undefined;
  startWidth: number;
  startClientX: number;
}

export interface UseColumnResizeOptions {
  columnWidthsOwnership?: 'local' | 'controlled' | 'scope';
  columnWidthsStatePath?: string;
}

function normalizeWidthsRecord(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(record)) {
    const numeric = typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? toNumericWidth(raw, NaN)
        : NaN;
    if (Number.isFinite(numeric) && numeric > 0) {
      result[key] = numeric;
    }
  }
  return result;
}

export function useColumnResize(
  columns: TableColumnSchema[],
  columnResize: boolean | undefined,
  options?: UseColumnResizeOptions,
): ColumnResizeApi {
  const ownership = options?.columnWidthsOwnership ?? 'local';
  const statePath = options?.columnWidthsStatePath;
  const renderScope = useRenderScope();

  if (ownership === 'scope' && !statePath && isDevRuntime()) {
    console.warn(
      '[TableRenderer] columnWidthsOwnership: "scope" requires columnWidthsStatePath; falling back to local persistence (widths will be lost on unmount).',
    );
  }

  const effectiveOwnership: 'local' | 'controlled' | 'scope' =
    ownership === 'scope' && !statePath ? 'local' : ownership;

  const initialWidths = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach((column, index) => {
      if (!isColumnResizable(column, columnResize)) {
        return;
      }
      const key = column.name ?? `column-${index}`;
      map[key] = resolveColumnWidth(column);
    });
    return map;
  }, [columns, columnResize]);

  const [localWidths, setLocalWidths] = useState<Record<string, number>>(initialWidths);
  const activeResizeRef = useRef<ActiveResize | null>(null);

  const scopeWidths = useScopeSelector(
    (scopeData) => {
      if (effectiveOwnership !== 'scope' || !statePath) {
        return undefined;
      }
      return normalizeWidthsRecord(getIn(scopeData, statePath));
    },
    (a, b) => {
      if (!a || !b) return a === b;
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => a[key] === b[key]);
    },
    { paths: statePath && effectiveOwnership === 'scope' ? [statePath] : undefined },
  );

  const controlledWidths = effectiveOwnership === 'controlled' ? initialWidths : undefined;

  const widths: Record<string, number> = useMemo(() => {
    if (effectiveOwnership === 'scope' && scopeWidths) {
      return { ...initialWidths, ...scopeWidths };
    }
    if (effectiveOwnership === 'controlled' && controlledWidths) {
      return controlledWidths;
    }
    return { ...initialWidths, ...localWidths };
  }, [controlledWidths, effectiveOwnership, initialWidths, localWidths, scopeWidths]);

  const columnKey = useCallback(
    (column: TableColumnSchema, index: number): string =>
      column.name ?? `column-${index}`,
    [],
  );

  const getColumnWidth = useCallback(
    (column: TableColumnSchema, index: number): number => {
      const key = columnKey(column, index);
      return widths[key] ?? resolveColumnWidth(column);
    },
    [columnKey, widths],
  );

  const persistWidth = useCallback(
    (next: Record<string, number>) => {
      if (effectiveOwnership === 'scope' && statePath) {
        renderScope.update(statePath, next);
      } else if (effectiveOwnership === 'local') {
        setLocalWidths(next);
      }
      // controlled: no local write; upstream owner decides
    },
    [effectiveOwnership, renderScope, statePath],
  );

  const startResize = useCallback(
    (column: TableColumnSchema, index: number, startClientX: number) => {
      const key = columnKey(column, index);
      const minWidth = resolveColumnMinWidth(column);
      const maxWidth = resolveColumnMaxWidth(column);
      const startWidth = widths[key] ?? resolveColumnWidth(column);
      activeResizeRef.current = { key, minWidth, maxWidth, startWidth, startClientX };

      const onPointerMove = (event: PointerEvent) => {
        const active = activeResizeRef.current;
        if (!active) return;
        const delta = event.clientX - active.startClientX;
        let next = active.startWidth + delta;
        if (next < active.minWidth) next = active.minWidth;
        if (active.maxWidth !== undefined && next > active.maxWidth) next = active.maxWidth;
        const patch: Record<string, number> = { [active.key]: next };
        if (effectiveOwnership === 'local') {
          setLocalWidths((prev) => ({ ...prev, ...patch }));
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        const active = activeResizeRef.current;
        activeResizeRef.current = null;
        if (active && effectiveOwnership === 'scope' && statePath) {
          const current = (() => {
            if (typeof scopeWidths === 'object' && scopeWidths) return scopeWidths;
            return { ...initialWidths };
          })();
          const currentWidth = localWidths[active.key] ?? active.startWidth;
          renderScope.update(statePath, { ...current, [active.key]: currentWidth });
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      return onPointerUp;
    },
    [columnKey, effectiveOwnership, initialWidths, localWidths, renderScope, scopeWidths, statePath, widths],
  );

  return {
    widths,
    getColumnWidth,
    startResize,
    persistWidth,
  } as ColumnResizeApi & { persistWidth: (next: Record<string, number>) => void };
}

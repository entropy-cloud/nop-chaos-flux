import { useCallback, useMemo, useRef, useState } from 'react';
import type { TableColumnSchema } from '../schemas.js';

const DEFAULT_MIN_WIDTH = 40;

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

export function useColumnResize(
  columns: TableColumnSchema[],
  columnResize: boolean | undefined,
): ColumnResizeApi {
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

  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const activeResizeRef = useRef<ActiveResize | null>(null);

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
        setWidths((prev) => ({ ...prev, [active.key]: next }));
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        activeResizeRef.current = null;
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      return onPointerUp;
    },
    [columnKey, widths],
  );

  return { widths, getColumnWidth, startResize };
}

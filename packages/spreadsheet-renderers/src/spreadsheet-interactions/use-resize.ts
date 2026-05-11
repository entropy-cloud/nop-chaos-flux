import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export interface ResizeState {
  isResizing: boolean;
  type: 'row' | 'column';
  index: number;
  startPos: number;
  startSize: number;
}

function isAbortLike(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    ((error as { name?: string } | null | undefined)?.name === 'AbortError')
  );
}

function formatFailureMessage(prefix: string, error: unknown): string {
  return error instanceof Error && error.message ? `${prefix}: ${error.message}` : prefix;
}

export function useResize(input: {
  bridge: SpreadsheetBridge;
  snapshot: SpreadsheetHostSnapshot;
  sheetId: string;
  onLog?: (msg: string) => void;
}) {
  const { bridge, snapshot, sheetId, onLog } = input;
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    type: 'column',
    index: -1,
    startPos: 0,
    startSize: 0,
  });
  const [columnWidthPreview, setColumnWidthPreview] = useState<Record<number, number>>({});
  const [rowHeightPreview, setRowHeightPreview] = useState<Record<number, number>>({});
  const lastSheetIdRef = useRef(snapshot.activeSheet?.id);
  if (snapshot.activeSheet?.id !== lastSheetIdRef.current) {
    lastSheetIdRef.current = snapshot.activeSheet?.id;
    setColumnWidthPreview({});
    setRowHeightPreview({});
  }

  const columnWidths = useMemo(() => {
    const widths: Record<number, number> = {};

    for (const [key, column] of Object.entries(snapshot.activeSheet?.columns ?? {})) {
      const index = Number(key);
      if (!Number.isNaN(index) && typeof column?.width === 'number') {
        widths[index] = column.width;
      }
    }

    return { ...widths, ...columnWidthPreview };
  }, [columnWidthPreview, snapshot.activeSheet?.columns]);

  const rowHeights = useMemo(() => {
    const heights: Record<number, number> = {};

    for (const [key, row] of Object.entries(snapshot.activeSheet?.rows ?? {})) {
      const index = Number(key);
      if (!Number.isNaN(index) && typeof row?.height === 'number') {
        heights[index] = row.height;
      }
    }

    return { ...heights, ...rowHeightPreview };
  }, [rowHeightPreview, snapshot.activeSheet?.rows]);

  const handleColumnResizeStart = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizeState({
        isResizing: true,
        type: 'column',
        index: col,
        startPos: e.clientX,
        startSize: columnWidths[col] ?? 80,
      });
    },
    [columnWidths],
  );

  const handleRowResizeStart = useCallback(
    (row: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizeState({
        isResizing: true,
        type: 'row',
        index: row,
        startPos: e.clientY,
        startSize: rowHeights[row] ?? 24,
      });
    },
    [rowHeights],
  );

  const endResize = useCallback(() => {
    const current = resizeState;
    setResizeState((prev) => ({ ...prev, isResizing: false }));

    if (current.index < 0) {
      return;
    }

    const nextSize =
      current.type === 'column'
        ? columnWidthPreview[current.index] ?? columnWidths[current.index] ?? current.startSize
        : rowHeightPreview[current.index] ?? rowHeights[current.index] ?? current.startSize;

    const command =
      current.type === 'column'
        ? { type: 'spreadsheet:resizeColumn' as const, sheetId, col: current.index, width: nextSize }
        : { type: 'spreadsheet:resizeRow' as const, sheetId, row: current.index, height: nextSize };

    if (current.type === 'column') {
      setColumnWidthPreview((prev) => {
        const next = { ...prev };
        delete next[current.index];
        return next;
      });
    } else {
      setRowHeightPreview((prev) => {
        const next = { ...prev };
        delete next[current.index];
        return next;
      });
    }

    void bridge.dispatch(command).catch((error) => {
      if (!isAbortLike(error)) {
        onLog?.(formatFailureMessage('Resize failed', error));
      }
    });
  }, [bridge, columnWidthPreview, columnWidths, onLog, resizeState, rowHeightPreview, rowHeights, sheetId]);

  useEffect(() => {
    if (!resizeState.isResizing) return;
    let rafId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const clientPos = resizeState.type === 'column' ? e.clientX : e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (resizeState.type === 'column') {
            const delta = clientPos - resizeState.startPos;
            const newWidth = Math.max(30, resizeState.startSize + delta);
            setColumnWidthPreview((prev) => ({ ...prev, [resizeState.index]: newWidth }));
          } else {
            const delta = clientPos - resizeState.startPos;
            const newHeight = Math.max(16, resizeState.startSize + delta);
            setRowHeightPreview((prev) => ({ ...prev, [resizeState.index]: newHeight }));
          }
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [resizeState]);

  return {
    resizeState,
    columnWidths,
    rowHeights,
    handleColumnResizeStart,
    handleRowResizeStart,
    endResize,
  };
}

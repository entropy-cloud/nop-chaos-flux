import { useCallback, useState, useRef } from 'react';

const RESIZE_STEP = 20;

export interface ColumnWidthMap {
  [columnId: string]: number;
}

export interface UseKanbanColumnResizeOptions {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  columnWidthsStatePath?: string;
  columnWidths?: ColumnWidthMap;
  onWidthsChange?: (widths: ColumnWidthMap) => void;
}

export function useKanbanColumnResize({
  minWidth = 200,
  maxWidth = 600,
  defaultWidth = 280,
  columnWidths: externalWidths,
  onWidthsChange,
}: UseKanbanColumnResizeOptions) {
  const [internalWidths, setInternalWidths] = useState<ColumnWidthMap>(externalWidths ?? {});
  const [resizing, setResizing] = useState<string | null>(null);

  const currentWidths = externalWidths ?? internalWidths;
  const resizeStartRef = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);

  const getWidth = useCallback((columnId: string) => {
    const w = currentWidths[columnId];
    if (w != null) return Math.max(minWidth, Math.min(maxWidth, w));
    return defaultWidth;
  }, [currentWidths, minWidth, maxWidth, defaultWidth]);

  const setWidth = useCallback((columnId: string, newWidth: number) => {
    const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));
    if (externalWidths) {
      onWidthsChange?.({ ...externalWidths, [columnId]: clamped });
    } else {
      setInternalWidths((prev) => ({ ...prev, [columnId]: clamped }));
    }
  }, [externalWidths, onWidthsChange, minWidth, maxWidth]);


  const handleResizeStart = useCallback((e: React.PointerEvent, columnId: string) => {
    e.preventDefault();
    const currentWidth = currentWidths[columnId] ?? defaultWidth;
    resizeStartRef.current = { columnId, startX: e.clientX, startWidth: currentWidth };
    setResizing(columnId);

    const handlePointerMove = (ev: PointerEvent) => {
      if (!resizeStartRef.current) return;
      const { startX, startWidth } = resizeStartRef.current;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      setWidth(columnId, newWidth);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      setResizing(null);
      if (resizeStartRef.current) {
        const { columnId: cId } = resizeStartRef.current;
        resizeStartRef.current = null;
        const finalWidth = getWidth(cId);
        setWidth(cId, finalWidth);
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [currentWidths, minWidth, maxWidth, defaultWidth, getWidth, setWidth]);

  const handleResizeKeyDown = useCallback((e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const current = currentWidths[columnId] ?? defaultWidth;
      setWidth(columnId, current - RESIZE_STEP);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const current = currentWidths[columnId] ?? defaultWidth;
      setWidth(columnId, current + RESIZE_STEP);
    }
  }, [currentWidths, defaultWidth, setWidth]);

  const isResizing = resizing != null;

  return {
    columnWidths: currentWidths,
    getWidth,
    setWidth,
    handleResizeStart,
    handleResizeKeyDown,
    isResizing,
    resizing,
    minWidth,
    maxWidth,
  };
}

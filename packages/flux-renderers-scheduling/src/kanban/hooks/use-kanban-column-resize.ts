import { useState, useRef } from 'react';

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

  const getWidth = (columnId: string) => {
    const w = currentWidths[columnId];
    if (w != null) return Math.max(minWidth, Math.min(maxWidth, w));
    return defaultWidth;
  };

  const handleResizeStart = (e: React.PointerEvent, columnId: string) => {
    e.preventDefault();
    const currentWidth = currentWidths[columnId] ?? defaultWidth;
    resizeStartRef.current = { columnId, startX: e.clientX, startWidth: currentWidth };
    setResizing(columnId);

    const handlePointerMove = (ev: PointerEvent) => {
      if (!resizeStartRef.current) return;
      const { startX, startWidth } = resizeStartRef.current;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      if (externalWidths) {
        onWidthsChange?.({ ...externalWidths, [columnId]: newWidth });
      } else {
        setInternalWidths((prev) => ({ ...prev, [columnId]: newWidth }));
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      setResizing(null);
      if (resizeStartRef.current) {
        const { columnId: cId } = resizeStartRef.current;
        resizeStartRef.current = null;
        const finalWidth = currentWidths[cId] ?? defaultWidth;
        if (externalWidths) {
          onWidthsChange?.({ ...externalWidths, [cId]: finalWidth });
        } else {
          setInternalWidths((prev) => {
            onWidthsChange?.({ ...prev, [cId]: finalWidth });
            return prev;
          });
        }
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const isResizing = resizing != null;

  return {
    columnWidths: currentWidths,
    getWidth,
    handleResizeStart,
    isResizing,
    resizing,
  };
}

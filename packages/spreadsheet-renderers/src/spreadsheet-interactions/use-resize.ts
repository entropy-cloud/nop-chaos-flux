import { useCallback, useEffect, useState } from 'react';

export interface ResizeState {
  isResizing: boolean;
  type: 'row' | 'column';
  index: number;
  startPos: number;
  startSize: number;
}

export function useResize() {
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    type: 'column',
    index: -1,
    startPos: 0,
    startSize: 0,
  });
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

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
    setResizeState((prev) => ({ ...prev, isResizing: false }));
  }, []);

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
            setColumnWidths((prev) => ({ ...prev, [resizeState.index]: newWidth }));
          } else {
            const delta = clientPos - resizeState.startPos;
            const newHeight = Math.max(16, resizeState.startSize + delta);
            setRowHeights((prev) => ({ ...prev, [resizeState.index]: newHeight }));
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

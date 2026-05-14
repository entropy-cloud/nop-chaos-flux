import { useCallback, useRef, useState } from 'react';

export function useFieldDrop(selectedCell: { row: number; col: number } | null) {
  const [dropTargetCell, setDropTargetCell] = useState<{ row: number; col: number } | null>(null);
  const dropTargetCellRef = useRef<{ row: number; col: number } | null>(null);

  const handleFieldDrop = useCallback(
    async (cb: (target: { row: number; col: number }) => void | Promise<void>) => {
      const targetCell = dropTargetCellRef.current || dropTargetCell || selectedCell;
      if (!targetCell) {
        return false;
      }
      await cb(targetCell);
      setDropTargetCell(null);
      dropTargetCellRef.current = null;
      return true;
    },
    [dropTargetCell, selectedCell],
  );

  const handleFieldDragOver = useCallback((row: number, col: number) => {
    const t = { row, col };
    setDropTargetCell(t);
    dropTargetCellRef.current = t;
  }, []);

  const handleFieldDragLeave = useCallback(() => {
    setDropTargetCell(null);
  }, []);

  return {
    dropTargetCell,
    setDropTargetCell,
    dropTargetCellRef,
    handleFieldDrop,
    handleFieldDragOver,
    handleFieldDragLeave,
  };
}

import { useCallback, useMemo, useRef, useState } from 'react';
import { cellAddress, type SpreadsheetRange, type SpreadsheetSelection } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export interface DragState {
  isDragging: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

function createRange(sheetId: string, startRow: number, startCol: number, endRow: number, endCol: number): SpreadsheetRange {
  return {
    sheetId,
    startRow: Math.min(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endRow: Math.max(startRow, endRow),
    endCol: Math.max(startCol, endCol),
  };
}

function isSameRange(left: SpreadsheetRange | null, right: SpreadsheetRange | null): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.sheetId === right.sheetId
    && left.startRow === right.startRow
    && left.startCol === right.startCol
    && left.endRow === right.endRow
    && left.endCol === right.endCol;
}

export function useSelection(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  addLog: (msg: string) => void,
  editingCellRef: React.RefObject<{ row: number; col: number } | null>,
  editValueRef: React.RefObject<string>,
  setEditingCell: (cell: { row: number; col: number } | null) => void,
  setCommentText: (text: string) => void,
  setCellValue: (value: string) => void
) {
  const totalRows = 100;
  const totalCols = 26;

  const selectedCell = useMemo(
    () =>
      snapshot.activeCell
        ? { row: snapshot.activeCell.row, col: snapshot.activeCell.col }
        : null,
    [snapshot.activeCell],
  );
  const [previewRange, setPreviewRange] = useState<SpreadsheetRange | null>(null);
  const dragStateRef = useRef<DragState>({ isDragging: false, startRow: -1, startCol: -1, endRow: -1, endCol: -1 });
  const hasDraggedRef = useRef(false);

  const syncSelectionToCore = useCallback(
    (selection: SpreadsheetSelection) => {
      void bridge.dispatch({ type: 'spreadsheet:setSelection', selection });
    },
    [bridge],
  );

  const setSelectedCell = useCallback(
    (cell: { row: number; col: number } | null) => {
      if (cell) {
        syncSelectionToCore({
          kind: 'cell',
          sheetId,
          anchor: { sheetId, address: cellAddress(cell.row, cell.col), row: cell.row, col: cell.col },
        });
      } else {
        syncSelectionToCore({ kind: 'none' });
      }
    },
    [sheetId, syncSelectionToCore],
  );

  const syncRangeSelectionToCore = useCallback(
    (range: SpreadsheetRange) => {
      syncSelectionToCore({
        kind: 'range',
        sheetId,
        range,
        anchor: { sheetId, address: cellAddress(range.startRow, range.startCol), row: range.startRow, col: range.startCol },
      });
    },
    [sheetId, syncSelectionToCore],
  );

  const getSelectedRange = useCallback((): SpreadsheetRange | null => {
    if (previewRange) {
      return previewRange;
    }
    if (snapshot.activeRange) {
      return snapshot.activeRange;
    }
    if (snapshot.selection.kind === 'row' && snapshot.selection.rows?.length) {
      const rows = [...snapshot.selection.rows].sort((a, b) => a - b);
      return createRange(sheetId, rows[0]!, 0, rows[rows.length - 1]!, totalCols - 1);
    }
    if (snapshot.selection.kind === 'column' && snapshot.selection.columns?.length) {
      const columns = [...snapshot.selection.columns].sort((a, b) => a - b);
      return createRange(sheetId, 0, columns[0]!, totalRows - 1, columns[columns.length - 1]!);
    }
    if (snapshot.selection.kind === 'sheet') {
      return createRange(sheetId, 0, 0, totalRows - 1, totalCols - 1);
    }
    const state = dragStateRef.current;
    if (state.startRow >= 0 && state.endRow >= 0) {
      return createRange(sheetId, state.startRow, state.startCol, state.endRow, state.endCol);
    }
    if (selectedCell) {
      return createRange(sheetId, selectedCell.row, selectedCell.col, selectedCell.row, selectedCell.col);
    }
    return null;
  }, [previewRange, selectedCell, sheetId, snapshot.activeRange, snapshot.selection]);

  const isInRange = useCallback((row: number, col: number): boolean => {
    const range = getSelectedRange();
    if (!range) return false;
    return row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol;
  }, [getSelectedRange]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!hasDraggedRef.current) {
      if (editingCellRef.current) {
        const currentEditCell = editingCellRef.current;
        const currentEditValue = editValueRef.current;
        const addr = cellAddress(currentEditCell.row, currentEditCell.col);
        // eslint-disable-next-line react-compiler/react-compiler
        editingCellRef.current = null;
        editValueRef.current = '';
        setEditingCell(null);
        bridge.dispatch({
          type: 'spreadsheet:setCellValue',
          cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
          value: currentEditValue,
        });
      }
      setSelectedCell({ row, col });
      dragStateRef.current = { isDragging: false, startRow: row, startCol: col, endRow: row, endCol: col };
      setPreviewRange(null);
      const cell = snapshot.activeSheet?.cells?.[cellAddress(row, col)];
      setCellValue(String(cell?.value ?? ''));
      const comment = cell?.comment;
      setCommentText(typeof comment === 'string' ? comment : comment?.text ?? '');
      addLog(`Selected ${cellAddress(row, col)}`);
    }
    hasDraggedRef.current = false;
  }, [snapshot, addLog, bridge, sheetId, editingCellRef, editValueRef, setEditingCell, setCommentText, setCellValue, setSelectedCell]);

  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    hasDraggedRef.current = false;
    dragStateRef.current = { isDragging: true, startRow: row, startCol: col, endRow: row, endCol: col };
    setPreviewRange(createRange(sheetId, row, col, row, col));
    setSelectedCell({ row, col });
  }, [setSelectedCell, sheetId]);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (dragStateRef.current.isDragging) {
      hasDraggedRef.current = true;
      dragStateRef.current = { ...dragStateRef.current, endRow: row, endCol: col };
      const nextRange = createRange(
        sheetId,
        dragStateRef.current.startRow,
        dragStateRef.current.startCol,
        row,
        col,
      );
      setPreviewRange((current) => (isSameRange(current, nextRange) ? current : nextRange));
    }
  }, [sheetId]);

  const handleMouseUp = useCallback((isResizing: boolean, onResizeEnd: () => void, getSelectedRangeFn: () => SpreadsheetRange | null) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current = { ...dragStateRef.current, isDragging: false };
      const range = getSelectedRangeFn();
      if (range && hasDraggedRef.current) {
        syncRangeSelectionToCore(range);
        setPreviewRange(null);
        addLog(`Selected range ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
      } else {
        setPreviewRange(null);
      }
    }
    if (isResizing) {
      onResizeEnd();
    }
  }, [addLog, syncRangeSelectionToCore]);

  const handleSelectRow = useCallback((row: number, extend = false) => {
    void bridge.dispatch({ type: 'spreadsheet:selectRow', sheetId, row, extend });
    dragStateRef.current = { isDragging: false, startRow: row, startCol: 0, endRow: row, endCol: 0 };
    setPreviewRange(null);
    addLog(`Selected row ${row + 1}`);
  }, [addLog, bridge, sheetId]);

  const handleSelectColumn = useCallback((col: number, extend = false) => {
    void bridge.dispatch({ type: 'spreadsheet:selectColumn', sheetId, col, extend });
    dragStateRef.current = { isDragging: false, startRow: 0, startCol: col, endRow: 0, endCol: col };
    setPreviewRange(null);
    addLog(`Selected column ${cellAddress(0, col).replace(/[0-9]/g, '')}`);
  }, [addLog, bridge, sheetId]);

  const handleSelectAll = useCallback(() => {
    void bridge.dispatch({ type: 'spreadsheet:selectAll', sheetId });
    dragStateRef.current = { isDragging: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    setPreviewRange(null);
    addLog('Selected entire sheet');
  }, [addLog, bridge, sheetId]);

  return {
    selectedCell,
    setSelectedCell,
    dragStateRef,
    hasDraggedRef,
    getSelectedRange,
    isInRange,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
  };
}

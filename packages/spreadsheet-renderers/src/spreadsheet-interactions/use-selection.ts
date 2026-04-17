import { useCallback, useRef, useState } from 'react';
import { cellAddress, type SpreadsheetRange, type SpreadsheetSelection } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export interface DragState {
  isDragging: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
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
  const [selectedCell, setSelectedCellLocal] = useState<{ row: number; col: number } | null>(null);
  const [, setDragEnd] = useState<{ row: number; col: number } | null>(null);
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
      setSelectedCellLocal(cell);
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
    const state = dragStateRef.current;
    if (state.startRow >= 0 && state.endRow >= 0) {
      return {
        sheetId,
        startRow: Math.min(state.startRow, state.endRow),
        startCol: Math.min(state.startCol, state.endCol),
        endRow: Math.max(state.startRow, state.endRow),
        endCol: Math.max(state.startCol, state.endCol),
      };
    }
    if (selectedCell) {
      return {
        sheetId,
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: selectedCell.row,
        endCol: selectedCell.col,
      };
    }
    return null;
  }, [selectedCell, sheetId]);

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
    setDragEnd(null);
    setSelectedCell({ row, col });
  }, [setSelectedCell]);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (dragStateRef.current.isDragging) {
      hasDraggedRef.current = true;
      dragStateRef.current = { ...dragStateRef.current, endRow: row, endCol: col };
      setDragEnd({ row, col });
    }
  }, []);

  const handleMouseUp = useCallback((isResizing: boolean, onResizeEnd: () => void, getSelectedRangeFn: () => SpreadsheetRange | null) => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current = { ...dragStateRef.current, isDragging: false };
      const range = getSelectedRangeFn();
      if (range && hasDraggedRef.current) {
        syncRangeSelectionToCore(range);
        addLog(`Selected range ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
      }
    }
    if (isResizing) {
      onResizeEnd();
    }
  }, [addLog, syncRangeSelectionToCore]);

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
  };
}

import { useCallback, useRef, useState } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export function useEditing(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  cellValue: string,
) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingCellRef = useRef<{ row: number; col: number } | null>(null);
  const editValueRef = useRef('');

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      const addr = cellAddress(row, col);
      const cell = snapshot.activeSheet?.cells?.[addr];
      const editCell = { row, col };
      const val = cell?.value != null ? String(cell.value) : '';
      setEditingCell(editCell);
      editingCellRef.current = editCell;
      setEditValue(val);
      editValueRef.current = val;
    },
    [snapshot],
  );

  const handleEditSave = useCallback(async () => {
    const currentEditCell = editingCellRef.current;
    if (!currentEditCell) return;
    const currentEditValue = editValueRef.current;
    const addr = cellAddress(currentEditCell.row, currentEditCell.col);
    const result = await bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
      value: currentEditValue,
    });

    if (result.ok) {
      editingCellRef.current = null;
      editValueRef.current = '';
      setEditingCell(null);
    }
  }, [bridge, sheetId]);

  const handleEditCancel = useCallback(() => {
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
  }, []);

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
    editValueRef.current = value;
  }, []);

  const handleCellValueSave = useCallback(async () => {
    if (!selectedCell) return;
    await bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: {
        sheetId,
        address: cellAddress(selectedCell.row, selectedCell.col),
        row: selectedCell.row,
        col: selectedCell.col,
      },
      value: cellValue,
    });
  }, [selectedCell, sheetId, bridge, cellValue]);

  return {
    editingCell,
    setEditingCell,
    editValue,
    editingCellRef,
    editValueRef,
    handleCellDoubleClick,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    handleCellValueSave,
  };
}

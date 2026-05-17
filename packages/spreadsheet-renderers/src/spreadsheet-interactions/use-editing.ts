import { useCallback, useRef, useState } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

type EditSaveState =
  | { status: 'idle' }
  | { status: 'saving'; message: string }
  | { status: 'cancelled'; message: string }
  | { status: 'failed'; message: string };

function getResultMessage(prefix: string, error: unknown) {
  return error instanceof Error && error.message ? `${prefix}: ${error.message}` : prefix;
}

export function useEditing(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  cellValue: string,
) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaveState, setEditSaveState] = useState<EditSaveState>({ status: 'idle' });
  const editingCellRef = useRef<{ row: number; col: number } | null>(null);
  const editValueRef = useRef('');

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      if (snapshot.runtime.readonly) {
        return;
      }
      const addr = cellAddress(row, col);
      const cell = snapshot.activeSheet?.cells?.[addr];
      const editCell = { row, col };
      const val = cell?.value != null ? String(cell.value) : '';
      setEditSaveState({ status: 'idle' });
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
    if (snapshot.runtime.readonly) {
      editingCellRef.current = null;
      editValueRef.current = '';
      setEditingCell(null);
      setEditValue('');
      return;
    }
    const currentEditValue = editValueRef.current;
    const addr = cellAddress(currentEditCell.row, currentEditCell.col);
    setEditSaveState({ status: 'saving', message: 'Saving cell...' });
    const result = await bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
      value: currentEditValue,
    });

    if ('cancelled' in result && result.cancelled) {
      setEditSaveState({ status: 'cancelled', message: 'Cell save cancelled' });
      return;
    }

    if (!result.ok) {
      setEditSaveState({
        status: 'failed',
        message: getResultMessage('Cell save failed', result.error),
      });
      return;
    }

    if (result.ok) {
      editingCellRef.current = null;
      editValueRef.current = '';
      setEditingCell(null);
      setEditValue('');
      setEditSaveState({ status: 'idle' });
    }
  }, [bridge, sheetId, snapshot.runtime.readonly]);

  const handleEditCancel = useCallback(() => {
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
    setEditValue('');
    setEditSaveState({ status: 'idle' });
  }, []);

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
    editValueRef.current = value;
    setEditSaveState({ status: 'idle' });
  }, []);

  const handleCellValueSave = useCallback(async () => {
    if (!selectedCell) return;
    if (snapshot.runtime.readonly) {
      return;
    }
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
  }, [selectedCell, sheetId, bridge, cellValue, snapshot.runtime.readonly]);

  return {
    editingCell,
    setEditingCell,
    editValue,
    editSaveState,
    editingCellRef,
    editValueRef,
    handleCellDoubleClick,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    handleCellValueSave,
  };
}

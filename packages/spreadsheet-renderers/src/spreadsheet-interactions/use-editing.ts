import { useCallback } from 'react';
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
  const core = bridge.getCore();
  const editingCell = snapshot.editing ?? null;

  const coreEditing = core.getSnapshot().editing;
  const editValue = coreEditing ? String(coreEditing.draftValue ?? '') : '';
  const editSaveState: EditSaveState = coreEditing
    ? coreEditing.saveStatus === 'idle'
      ? { status: 'idle' }
      : { status: coreEditing.saveStatus, message: coreEditing.saveMessage ?? '' }
    : { status: 'idle' };

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      if (snapshot.runtime.readonly) {
        return;
      }
      const addr = cellAddress(row, col);
      const cell = snapshot.activeSheet?.cells?.[addr];
      const val = cell?.value != null ? String(cell.value) : '';
      core.startEditing({ sheetId, address: addr, row, col }, val);
    },
    [snapshot, core, sheetId],
  );

  const handleEditSave = useCallback(async () => {
    const editingState = core.getSnapshot().editing;
    if (!editingState) return;
    if (snapshot.runtime.readonly) {
      core.clearEditing();
      return;
    }
    const { cell, draftValue } = editingState;
    if (cell.row < 0 || cell.col < 0) {
      core.clearEditing();
      return;
    }
    const targetSheet = snapshot.workbook.sheets.find((s) => s.id === cell.sheetId);
    if (!targetSheet) {
      core.clearEditing();
      return;
    }
    const addr = cellAddress(cell.row, cell.col);
    core.setEditSaveStatus('saving', 'Saving cell...');
    const result = await bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: addr, row: cell.row, col: cell.col },
      value: String(draftValue ?? ''),
    });

    if ('cancelled' in result && result.cancelled) {
      core.setEditSaveStatus('cancelled', 'Cell save cancelled');
      return;
    }

    if (!result.ok) {
      core.setEditSaveStatus('failed', getResultMessage('Cell save failed', result.error));
      return;
    }

    if (result.ok) {
      core.clearEditing();
    }
  }, [bridge, core, sheetId, snapshot]);

  const handleEditCancel = useCallback(() => {
    core.clearEditing();
  }, [core]);

  const handleEditValueChange = useCallback(
    (value: string) => {
      core.updateEditValue(value);
    },
    [core],
  );

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
    editValue,
    editSaveState,
    handleCellDoubleClick,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    handleCellValueSave,
  };
}

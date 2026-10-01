import { useCallback } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import { t } from '@nop-chaos/flux-i18n';
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

  // Seed for the uncontrolled cell editor, re-read per render so a session
  // opened by grid keyboard typing (startEditing + updateEditValue in one
  // handler) mounts with the typed replacement rather than the cell's old
  // value. Keystrokes after mount live in the DOM + core draft only.
  const editValue = core.getEditValue();
  const coreEditing = core.getSnapshot().editing;
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
      // 编辑态回显公式原文（ux-r4）：有 formula 显示 `=...` 而非缓存计算值
      const val =
        typeof cell?.formula === 'string'
          ? cell.formula
          : cell?.value != null
            ? String(cell.value)
            : '';
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
    const { cell } = editingState;
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
    const value = core.commitEditValue();
    core.setEditSaveStatus('saving', t('flux.spreadsheet.savingCell'));
    // 提交路由升格（ux-r4）：`=` 前缀内容写 formula 字段（公式权威存储），
    // 其余走 value 通路；重算由 dispatch 出口的 recalcDocument 统一处理
    const isFormula = typeof value === 'string' && value.trim().startsWith('=');
    const result = await bridge.dispatch(
      isFormula
        ? {
            type: 'spreadsheet:setCellFormula',
            cell: { sheetId, address: addr, row: cell.row, col: cell.col },
            formula: value,
          }
        : {
            type: 'spreadsheet:setCellValue',
            cell: { sheetId, address: addr, row: cell.row, col: cell.col },
            value,
          },
    );

    if ('cancelled' in result && result.cancelled) {
      core.setEditSaveStatus('cancelled', t('flux.spreadsheet.cellSaveCancelled'));
      return;
    }

    if (!result.ok) {
      core.setEditSaveStatus(
        'failed',
        getResultMessage(t('flux.spreadsheet.cellSaveFailed'), result.error),
      );
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

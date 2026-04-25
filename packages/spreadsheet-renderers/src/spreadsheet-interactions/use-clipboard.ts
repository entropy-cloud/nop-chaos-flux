import { useCallback } from 'react';
import { cellAddress, type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export function useClipboard(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  getSelectedRange: () => SpreadsheetRange | null,
  setCellValue: (value: string) => void,
  addLog: (msg: string) => void
) {
  const handleCopy = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:copyCells', range });
    addLog(`Copied ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
  }, [getSelectedRange, bridge, addLog]);

  const handleCut = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:cutCells', range });
    addLog(`Cut ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
  }, [getSelectedRange, bridge, addLog]);

  const handlePaste = useCallback(async () => {
    const range = getSelectedRange();
    const targetCell = selectedCell ?? (range ? { row: range.startRow, col: range.startCol } : null);
    if (!targetCell) return;
    const result = await bridge.dispatch({
      type: 'spreadsheet:pasteCells',
      target: {
        sheetId,
        address: cellAddress(targetCell.row, targetCell.col),
        row: targetCell.row,
        col: targetCell.col,
      },
    });
    if (result.ok) {
      addLog(`Pasted to ${cellAddress(targetCell.row, targetCell.col)}`);
    } else {
      addLog(`Paste failed: ${result.error}`);
    }
  }, [selectedCell, getSelectedRange, sheetId, bridge, addLog]);

  const handleClear = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:clearCells', target: range });
    setCellValue('');
    addLog('Cleared selection');
  }, [getSelectedRange, bridge, setCellValue, addLog]);

  return { handleCopy, handleCut, handlePaste, handleClear };
}

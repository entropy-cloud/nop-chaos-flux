import { useCallback } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';

export function useCellValueSync(input: {
  bridge: SpreadsheetBridge;
  sheetId: string;
  selectedCell: { row: number; col: number } | null;
  setCellValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  return useCallback((value: string) => {
    if (!input.selectedCell) {
      return;
    }

    input.setCellValue(value);
    input.bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: {
        sheetId: input.sheetId,
        address: cellAddress(input.selectedCell.row, input.selectedCell.col),
        row: input.selectedCell.row,
        col: input.selectedCell.col,
      },
      value,
    });
  }, [input]);
}

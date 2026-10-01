import { useCallback } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';

export function useCellValueSync(input: {
  bridge: SpreadsheetBridge;
  sheetId: string;
  selectedCell: { row: number; col: number } | null;
  readOnly: boolean;
}) {
  return useCallback(
    async (value: string) => {
      if (!input.selectedCell || input.readOnly) {
        return;
      }

      // 提交路由升格（ux-r4）：`=` 前缀内容写 formula 字段（公式权威存储），
      // 重算由 dispatch 出口的 recalcDocument 统一处理
      const isFormula = typeof value === 'string' && value.trim().startsWith('=');
      await input.bridge.dispatch(
        isFormula
          ? {
              type: 'spreadsheet:setCellFormula',
              cell: {
                sheetId: input.sheetId,
                address: cellAddress(input.selectedCell.row, input.selectedCell.col),
                row: input.selectedCell.row,
                col: input.selectedCell.col,
              },
              formula: value,
            }
          : {
              type: 'spreadsheet:setCellValue',
              cell: {
                sheetId: input.sheetId,
                address: cellAddress(input.selectedCell.row, input.selectedCell.col),
                row: input.selectedCell.row,
                col: input.selectedCell.col,
              },
              value,
            },
      );
    },
    [input],
  );
}

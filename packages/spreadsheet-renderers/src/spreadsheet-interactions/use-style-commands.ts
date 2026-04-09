import { useCallback } from 'react';
import { cellAddress, type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export type StyleToolType =
  | 'bold' | 'italic' | 'underline'
  | 'align-left' | 'align-center' | 'align-right'
  | 'bg-yellow' | 'bg-green' | 'bg-blue' | 'bg-none'
  | 'font-color-red' | 'font-color-blue' | 'font-color-black';

export function useStyleCommands(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  selectedCell: { row: number; col: number } | null,
  getSelectedRange: () => SpreadsheetRange | null,
  addLog: (msg: string) => void
) {
  const handleStyleTool = useCallback(async (tool: StyleToolType) => {
    const range = getSelectedRange();
    if (!range) return;
    const cell = selectedCell ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)] : undefined;
    switch (tool) {
      case 'bold':
        await bridge.dispatch({ type: 'spreadsheet:setCellFontWeight', target: range, fontWeight: cell?.style?.fontWeight === 'bold' ? 'normal' : 'bold' });
        break;
      case 'italic':
        await bridge.dispatch({ type: 'spreadsheet:setCellFontStyle', target: range, fontStyle: cell?.style?.fontStyle === 'italic' ? 'normal' : 'italic' });
        break;
      case 'underline':
        await bridge.dispatch({ type: 'spreadsheet:setCellTextDecoration', target: range, textDecoration: cell?.style?.textDecoration === 'underline' ? 'none' : 'underline' });
        break;
      case 'align-left':
        await bridge.dispatch({ type: 'spreadsheet:setCellTextAlign', target: range, textAlign: 'left' });
        break;
      case 'align-center':
        await bridge.dispatch({ type: 'spreadsheet:setCellTextAlign', target: range, textAlign: 'center' });
        break;
      case 'align-right':
        await bridge.dispatch({ type: 'spreadsheet:setCellTextAlign', target: range, textAlign: 'right' });
        break;
      case 'bg-yellow':
        await bridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: '#ffff00' });
        break;
      case 'bg-green':
        await bridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: '#90EE90' });
        break;
      case 'bg-blue':
        await bridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: '#87CEEB' });
        break;
      case 'bg-none':
        await bridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: 'transparent' });
        break;
      case 'font-color-red':
        await bridge.dispatch({ type: 'spreadsheet:setCellFontColor', target: range, color: '#ff0000' });
        break;
      case 'font-color-blue':
        await bridge.dispatch({ type: 'spreadsheet:setCellFontColor', target: range, color: '#0000ff' });
        break;
      case 'font-color-black':
        await bridge.dispatch({ type: 'spreadsheet:setCellFontColor', target: range, color: '#000000' });
        break;
    }
    addLog(`Style: ${tool}`);
  }, [selectedCell, getSelectedRange, bridge, snapshot, addLog]);

  return { handleStyleTool };
}

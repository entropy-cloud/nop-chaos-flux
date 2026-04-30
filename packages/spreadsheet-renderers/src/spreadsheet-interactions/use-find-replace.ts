import { startTransition, useCallback, useState } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';

export function useFindReplace(
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  addLog: (msg: string) => void,
) {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findResults, setFindResults] = useState('');

  const handleFind = useCallback(async () => {
    if (!findQuery) return;
    const result = await bridge.dispatch({
      type: 'spreadsheet:find',
      options: { query: findQuery, matchCase: false },
    });
    if (result.ok && result.data) {
      const found = result.data as { address: string; value: string };
      startTransition(() => {
        setFindResults(`Found at ${found.address}: "${found.value}"`);
      });
      addLog(`Found: ${found.address}`);
    } else {
      startTransition(() => {
        setFindResults('Not found');
      });
    }
  }, [findQuery, bridge, addLog]);

  const handleReplace = useCallback(async () => {
    if (!selectedCell || !findQuery) return;
    await bridge.dispatch({
      type: 'spreadsheet:replace',
      cell: {
        sheetId,
        address: cellAddress(selectedCell.row, selectedCell.col),
        row: selectedCell.row,
        col: selectedCell.col,
      },
      options: { query: findQuery },
      replacement: replaceText,
    });
    addLog('Replaced');
  }, [selectedCell, findQuery, replaceText, sheetId, bridge, addLog]);

  const handleReplaceAll = useCallback(async () => {
    if (!findQuery) return;
    const result = await bridge.dispatch({
      type: 'spreadsheet:replaceAll',
      options: { query: findQuery, matchCase: false },
      replacement: replaceText,
    });
    if (result.ok) {
      const count = (result.data as { count?: number })?.count ?? 0;
      startTransition(() => {
        setFindResults(`Replaced ${count} occurrences`);
      });
      addLog(`Replaced all: ${count}`);
    }
  }, [findQuery, replaceText, bridge, addLog]);

  return {
    showFindReplace,
    setShowFindReplace,
    findQuery,
    setFindQuery,
    replaceText,
    setReplaceText,
    findResults,
    setFindResults,
    handleFind,
    handleReplace,
    handleReplaceAll,
  };
}

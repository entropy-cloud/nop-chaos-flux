import { useCallback, useRef, useState } from 'react';

export function useSpreadsheetShell(onLog?: (msg: string) => void) {
  const addLog = useCallback((msg: string) => {
    onLog?.(msg);
  }, [onLog]);
  const [cellValue, setCellValue] = useState('');
  const [commentText, setCommentText] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  return {
    addLog,
    cellValue,
    setCellValue,
    commentText,
    setCommentText,
    gridRef,
  };
}

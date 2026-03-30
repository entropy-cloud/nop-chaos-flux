import { useCallback, useEffect, useRef, useState } from 'react';
import { cellAddress, } from '@nop-chaos/spreadsheet-core';
export function useSpreadsheetInteractions(config) {
    const { bridge, sheetId, rows: _rows = 30, cols: _cols = 10, onLog } = config;
    const addLog = useCallback((msg) => { onLog?.(msg); }, [onLog]);
    // -- Snapshot subscription --
    const [snapshot, setSnapshot] = useState(() => bridge.getSnapshot());
    useEffect(() => {
        const unsub = bridge.subscribe(() => {
            setSnapshot(bridge.getSnapshot());
        });
        return unsub;
    }, [bridge]);
    // -- Selection state --
    const [selectedCell, setSelectedCell] = useState(null);
    const [cellValue, setCellValue] = useState('');
    const dragStateRef = useRef({ isDragging: false, startRow: -1, startCol: -1, endRow: -1, endCol: -1 });
    const hasDraggedRef = useRef(false);
    // -- Editing state --
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const editingCellRef = useRef(null);
    const editValueRef = useRef('');
    // -- Fill handle state --
    const [fillHandleState, setFillHandleState] = useState({
        isFilling: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, currentRow: 0, currentCol: 0,
    });
    const fillHandleRef = useRef(fillHandleState);
    fillHandleRef.current = fillHandleState;
    // -- Resize state --
    const [resizeState, setResizeState] = useState({
        isResizing: false, type: 'column', index: -1, startPos: 0, startSize: 0,
    });
    const [columnWidths, setColumnWidths] = useState({});
    const [rowHeights, setRowHeights] = useState({});
    // -- Find/Replace state --
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findQuery, setFindQuery] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [findResults, setFindResults] = useState('');
    // -- Comment state --
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState('');
    // -- Drop target state --
    const [dropTargetCell, setDropTargetCell] = useState(null);
    const dropTargetCellRef = useRef(null);
    // -- Grid ref --
    const gridRef = useRef(null);
    // -- Current document --
    // -- Current cell --
    const currentCell = selectedCell
        ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)]
        : undefined;
    const hasComment = !!currentCell?.comment;
    // -- Range helpers --
    const getSelectedRange = useCallback(() => {
        const state = dragStateRef.current;
        if (state.startRow >= 0 && state.endRow >= 0) {
            return {
                sheetId,
                startRow: Math.min(state.startRow, state.endRow),
                startCol: Math.min(state.startCol, state.endCol),
                endRow: Math.max(state.startRow, state.endRow),
                endCol: Math.max(state.startCol, state.endCol),
            };
        }
        if (selectedCell) {
            return {
                sheetId,
                startRow: selectedCell.row,
                startCol: selectedCell.col,
                endRow: selectedCell.row,
                endCol: selectedCell.col,
            };
        }
        return null;
    }, [selectedCell, sheetId]);
    const isInRange = useCallback((row, col) => {
        const range = getSelectedRange();
        if (!range)
            return false;
        return row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol;
    }, [getSelectedRange]);
    const isFillPreview = useCallback((row, col) => {
        if (!fillHandleState.isFilling)
            return false;
        const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleState;
        let previewEndRow = endRow;
        let previewEndCol = endCol;
        if (currentRow > endRow) {
            previewEndRow = currentRow;
        }
        else if (currentCol > endCol) {
            previewEndCol = currentCol;
        }
        else {
            return false;
        }
        return row >= startRow && row <= previewEndRow && col >= startCol && col <= previewEndCol;
    }, [fillHandleState]);
    const getMergeInfo = useCallback((row, col) => {
        const merges = snapshot.activeSheet?.merges ?? [];
        for (const merge of merges) {
            if (row >= merge.startRow && row <= merge.endRow && col >= merge.startCol && col <= merge.endCol) {
                return {
                    isMerged: true,
                    isTopLeft: row === merge.startRow && col === merge.startCol,
                    rowSpan: merge.endRow - merge.startRow + 1,
                    colSpan: merge.endCol - merge.startCol + 1,
                };
            }
        }
        return { isMerged: false, isTopLeft: false, rowSpan: 1, colSpan: 1 };
    }, [snapshot.activeSheet?.merges]);
    // -- Cell selection handlers --
    const handleCellClick = useCallback((row, col) => {
        if (fillHandleRef.current.isFilling)
            return;
        if (!hasDraggedRef.current) {
            if (editingCellRef.current) {
                const currentEditCell = editingCellRef.current;
                const currentEditValue = editValueRef.current;
                const addr = cellAddress(currentEditCell.row, currentEditCell.col);
                editingCellRef.current = null;
                editValueRef.current = '';
                setEditingCell(null);
                bridge.dispatch({
                    type: 'spreadsheet:setCellValue',
                    cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
                    value: currentEditValue,
                });
            }
            setSelectedCell({ row, col });
            dragStateRef.current = { isDragging: false, startRow: row, startCol: col, endRow: row, endCol: col };
            const cell = snapshot.activeSheet?.cells?.[cellAddress(row, col)];
            setCellValue(String(cell?.value ?? ''));
            const comment = cell?.comment;
            setCommentText(typeof comment === 'string' ? comment : comment?.text ?? '');
            addLog(`Selected ${cellAddress(row, col)}`);
        }
        hasDraggedRef.current = false;
    }, [snapshot, addLog, bridge, sheetId]);
    const handleCellDoubleClick = useCallback((row, col) => {
        const addr = cellAddress(row, col);
        const cell = snapshot.activeSheet?.cells?.[addr];
        const editCell = { row, col };
        const val = cell?.value != null ? String(cell.value) : '';
        setEditingCell(editCell);
        editingCellRef.current = editCell;
        setEditValue(val);
        editValueRef.current = val;
    }, [snapshot]);
    const handleCellMouseDown = useCallback((row, col, e) => {
        if (fillHandleRef.current.isFilling)
            return;
        if (e.button !== 0)
            return;
        e.preventDefault();
        hasDraggedRef.current = false;
        dragStateRef.current = { isDragging: true, startRow: row, startCol: col, endRow: row, endCol: col };
        setSelectedCell({ row, col });
    }, []);
    const handleCellMouseEnter = useCallback((row, col) => {
        if (dragStateRef.current.isDragging) {
            hasDraggedRef.current = true;
            dragStateRef.current = { ...dragStateRef.current, endRow: row, endCol: col };
        }
    }, []);
    const handleMouseUp = useCallback(() => {
        if (dragStateRef.current.isDragging) {
            dragStateRef.current = { ...dragStateRef.current, isDragging: false };
            const range = getSelectedRange();
            if (range && hasDraggedRef.current) {
                addLog(`Selected range ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
            }
        }
        if (resizeState.isResizing) {
            setResizeState(prev => ({ ...prev, isResizing: false }));
        }
    }, [resizeState.isResizing, getSelectedRange, addLog]);
    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);
    // -- Editing handlers --
    const handleEditSave = useCallback(async () => {
        const currentEditCell = editingCellRef.current;
        if (!currentEditCell)
            return;
        const currentEditValue = editValueRef.current;
        const addr = cellAddress(currentEditCell.row, currentEditCell.col);
        editingCellRef.current = null;
        editValueRef.current = '';
        setEditingCell(null);
        await bridge.dispatch({
            type: 'spreadsheet:setCellValue',
            cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
            value: currentEditValue,
        });
    }, [bridge, sheetId]);
    const handleEditCancel = useCallback(() => {
        editingCellRef.current = null;
        editValueRef.current = '';
        setEditingCell(null);
    }, []);
    const handleEditValueChange = useCallback((value) => {
        setEditValue(value);
        editValueRef.current = value;
    }, []);
    const handleCellValueChange = useCallback((value) => {
        if (!selectedCell)
            return;
        setCellValue(value);
        bridge.dispatch({
            type: 'spreadsheet:setCellValue',
            cell: {
                sheetId,
                address: cellAddress(selectedCell.row, selectedCell.col),
                row: selectedCell.row,
                col: selectedCell.col,
            },
            value,
        });
    }, [selectedCell, sheetId, bridge]);
    const handleCellValueSave = useCallback(async () => {
        if (!selectedCell)
            return;
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
    // -- Fill handle handlers --
    const handleFillHandleMouseDown = useCallback((row, col, e) => {
        e.preventDefault();
        e.stopPropagation();
        const range = getSelectedRange();
        if (!range)
            return;
        const state = {
            isFilling: true,
            startRow: range.startRow,
            startCol: range.startCol,
            endRow: range.endRow,
            endCol: range.endCol,
            currentRow: row,
            currentCol: col,
        };
        fillHandleRef.current = state;
        setFillHandleState(state);
    }, [getSelectedRange]);
    useEffect(() => {
        if (!fillHandleState.isFilling)
            return;
        const handleMouseMove = (e) => {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el)
                return;
            const td = el.closest('td.ss-cell');
            if (!td)
                return;
            const row = parseInt(td.dataset.row || '-1');
            const col = parseInt(td.dataset.col || '-1');
            if (row >= 0 && col >= 0) {
                fillHandleRef.current = { ...fillHandleRef.current, currentRow: row, currentCol: col };
                setFillHandleState(prev => ({ ...prev, currentRow: row, currentCol: col }));
            }
        };
        const handleMouseUp = async () => {
            const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleRef.current;
            let fillDirection = null;
            let targetRange = null;
            if (currentRow > endRow) {
                fillDirection = 'down';
                targetRange = { sheetId, startRow, startCol, endRow: currentRow, endCol };
            }
            else if (currentCol > endCol) {
                fillDirection = 'right';
                targetRange = { sheetId, startRow, startCol, endRow, endCol: currentCol };
            }
            if (fillDirection && targetRange) {
                await bridge.dispatch({
                    type: 'spreadsheet:fillSeries',
                    range: targetRange,
                    direction: fillDirection,
                });
                addLog(`Series fill ${fillDirection}: ${cellAddress(startRow, startCol)}:${cellAddress(targetRange.endRow, targetRange.endCol)}`);
            }
            const reset = { isFilling: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, currentRow: 0, currentCol: 0 };
            fillHandleRef.current = reset;
            setFillHandleState(reset);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [fillHandleState.isFilling, bridge, sheetId, addLog]);
    // -- Resize handlers --
    const handleColumnResizeStart = useCallback((col, e) => {
        e.preventDefault();
        e.stopPropagation();
        setResizeState({
            isResizing: true, type: 'column', index: col,
            startPos: e.clientX, startSize: columnWidths[col] ?? 80,
        });
    }, [columnWidths]);
    const handleRowResizeStart = useCallback((row, e) => {
        e.preventDefault();
        e.stopPropagation();
        setResizeState({
            isResizing: true, type: 'row', index: row,
            startPos: e.clientY, startSize: rowHeights[row] ?? 24,
        });
    }, [rowHeights]);
    useEffect(() => {
        if (!resizeState.isResizing)
            return;
        const handleMouseMove = (e) => {
            if (resizeState.type === 'column') {
                const delta = e.clientX - resizeState.startPos;
                const newWidth = Math.max(30, resizeState.startSize + delta);
                setColumnWidths(prev => ({ ...prev, [resizeState.index]: newWidth }));
            }
            else {
                const delta = e.clientY - resizeState.startPos;
                const newHeight = Math.max(16, resizeState.startSize + delta);
                setRowHeights(prev => ({ ...prev, [resizeState.index]: newHeight }));
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [resizeState]);
    // -- Canvas --
    const onCanvasMouseDown = useCallback((_e) => {
        if (editingCellRef.current) {
            handleEditSave();
        }
    }, [handleEditSave]);
    // -- Clipboard --
    const handleCopy = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:copyCells', range });
        addLog(`Copied ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
    }, [getSelectedRange, bridge, addLog]);
    const handleCut = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:cutCells', range });
        addLog(`Cut ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
    }, [getSelectedRange, bridge, addLog]);
    const handlePaste = useCallback(async () => {
        if (!selectedCell)
            return;
        const result = await bridge.dispatch({
            type: 'spreadsheet:pasteCells',
            target: {
                sheetId,
                address: cellAddress(selectedCell.row, selectedCell.col),
                row: selectedCell.row,
                col: selectedCell.col,
            },
        });
        if (result.ok) {
            addLog(`Pasted to ${cellAddress(selectedCell.row, selectedCell.col)}`);
        }
        else {
            addLog(`Paste failed: ${result.error}`);
        }
    }, [selectedCell, sheetId, bridge, addLog]);
    const handleClear = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:clearCells', target: range });
        setCellValue('');
        addLog('Cleared selection');
    }, [getSelectedRange, bridge, addLog]);
    // -- Style --
    const handleStyleTool = useCallback(async (tool) => {
        const range = getSelectedRange();
        if (!range)
            return;
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
    // -- Row/Column --
    const handleInsertRow = useCallback(async () => {
        if (!selectedCell)
            return;
        await bridge.dispatch({ type: 'spreadsheet:insertRow', sheetId, row: selectedCell.row });
        addLog(`Inserted row at ${selectedCell.row + 1}`);
    }, [selectedCell, sheetId, bridge, addLog]);
    const handleDeleteRow = useCallback(async () => {
        if (!selectedCell)
            return;
        await bridge.dispatch({ type: 'spreadsheet:deleteRow', sheetId, row: selectedCell.row });
        addLog(`Deleted row ${selectedCell.row + 1}`);
    }, [selectedCell, sheetId, bridge, addLog]);
    const handleInsertColumn = useCallback(async () => {
        if (!selectedCell)
            return;
        await bridge.dispatch({ type: 'spreadsheet:insertColumn', sheetId, col: selectedCell.col });
        addLog(`Inserted column at ${String.fromCharCode(65 + selectedCell.col)}`);
    }, [selectedCell, sheetId, bridge, addLog]);
    const handleDeleteColumn = useCallback(async () => {
        if (!selectedCell)
            return;
        await bridge.dispatch({ type: 'spreadsheet:deleteColumn', sheetId, col: selectedCell.col });
        addLog(`Deleted column ${String.fromCharCode(65 + selectedCell.col)}`);
    }, [selectedCell, sheetId, bridge, addLog]);
    // -- Fill --
    const handleFillDown = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:fillDown', range });
        addLog('Filled down');
    }, [getSelectedRange, bridge, addLog]);
    const handleFillSeries = useCallback(async (direction) => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:fillSeries', range, direction, seriesType: 'linear' });
        addLog(`Filled series ${direction}`);
    }, [getSelectedRange, bridge, addLog]);
    // -- Sheet --
    const handleAddSheet = useCallback(async () => {
        await bridge.dispatch({ type: 'spreadsheet:addSheet', name: `Sheet${snapshot.workbook.sheets.length + 1}` });
        addLog('Added new sheet');
    }, [bridge, snapshot, addLog]);
    const handleRemoveSheet = useCallback(async (id) => {
        if (snapshot.workbook.sheets.length <= 1) {
            addLog('Cannot remove last sheet');
            return;
        }
        await bridge.dispatch({ type: 'spreadsheet:removeSheet', sheetId: id });
        addLog('Removed sheet');
    }, [bridge, snapshot, addLog]);
    const handleRenameSheet = useCallback(async (id, name) => {
        await bridge.dispatch({ type: 'spreadsheet:renameSheet', sheetId: id, name });
        addLog(`Renamed sheet to "${name}"`);
    }, [bridge, addLog]);
    // -- Merge --
    const handleMerge = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:mergeRange', range });
        addLog('Merged cells');
    }, [getSelectedRange, bridge, addLog]);
    const handleUnmerge = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:unmergeRange', range });
        addLog('Unmerged cells');
    }, [getSelectedRange, bridge, addLog]);
    const handleMergeCenter = useCallback(async () => {
        const range = getSelectedRange();
        if (!range)
            return;
        await bridge.dispatch({ type: 'spreadsheet:mergeCellsCenter', range });
        addLog('Merged and centered');
    }, [getSelectedRange, bridge, addLog]);
    // -- Freeze --
    const handleFreeze = useCallback(async () => {
        if (!selectedCell)
            return;
        await bridge.dispatch({ type: 'spreadsheet:freezePanes', sheetId, row: selectedCell.row, col: selectedCell.col });
        addLog(`Froze panes at ${cellAddress(selectedCell.row, selectedCell.col)}`);
    }, [selectedCell, sheetId, bridge, addLog]);
    const handleUnfreeze = useCallback(async () => {
        await bridge.dispatch({ type: 'spreadsheet:unfreezePanes', sheetId });
        addLog('Unfroze panes');
    }, [sheetId, bridge, addLog]);
    // -- Undo/Redo --
    const handleUndo = useCallback(async () => {
        await bridge.dispatch({ type: 'spreadsheet:undo' });
        addLog('Undo');
    }, [bridge, addLog]);
    const handleRedo = useCallback(async () => {
        await bridge.dispatch({ type: 'spreadsheet:redo' });
        addLog('Redo');
    }, [bridge, addLog]);
    // -- Find/Replace --
    const handleFind = useCallback(async () => {
        if (!findQuery)
            return;
        const result = await bridge.dispatch({
            type: 'spreadsheet:find',
            options: { query: findQuery, matchCase: false },
        });
        if (result.ok && result.data) {
            const found = result.data;
            setFindResults(`Found at ${found.address}: "${found.value}"`);
            addLog(`Found: ${found.address}`);
        }
        else {
            setFindResults('Not found');
        }
    }, [findQuery, bridge, addLog]);
    const handleReplace = useCallback(async () => {
        if (!selectedCell || !findQuery)
            return;
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
        if (!findQuery)
            return;
        const result = await bridge.dispatch({
            type: 'spreadsheet:replaceAll',
            options: { query: findQuery, matchCase: false },
            replacement: replaceText,
        });
        if (result.ok) {
            const count = result.data?.count ?? 0;
            setFindResults(`Replaced ${count} occurrences`);
            addLog(`Replaced all: ${count}`);
        }
    }, [findQuery, replaceText, bridge, addLog]);
    // -- Comments --
    const handleAddComment = useCallback(async () => {
        if (!selectedCell || !commentText.trim())
            return;
        await bridge.dispatch({
            type: 'spreadsheet:addComment',
            cell: {
                sheetId,
                address: cellAddress(selectedCell.row, selectedCell.col),
                row: selectedCell.row,
                col: selectedCell.col,
            },
            text: commentText.trim(),
        });
        setShowCommentInput(false);
        addLog('Added comment');
    }, [selectedCell, commentText, sheetId, bridge, addLog]);
    const handleDeleteComment = useCallback(async () => {
        if (!selectedCell)
            return;
        await bridge.dispatch({
            type: 'spreadsheet:deleteComment',
            cell: {
                sheetId,
                address: cellAddress(selectedCell.row, selectedCell.col),
                row: selectedCell.row,
                col: selectedCell.col,
            },
        });
        setCommentText('');
        addLog('Deleted comment');
    }, [selectedCell, sheetId, bridge, addLog]);
    // -- Field drop --
    const handleFieldDrop = useCallback((cb) => {
        const targetCell = dropTargetCellRef.current || dropTargetCell || selectedCell;
        if (targetCell) {
            cb(targetCell);
        }
        setDropTargetCell(null);
        dropTargetCellRef.current = null;
    }, [dropTargetCell, selectedCell]);
    const handleFieldDragOver = useCallback((row, col) => {
        const t = { row, col };
        setDropTargetCell(t);
        dropTargetCellRef.current = t;
    }, []);
    const handleFieldDragLeave = useCallback(() => {
        setDropTargetCell(null);
    }, []);
    // -- Keyboard shortcuts --
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key === 'c') {
                e.preventDefault();
                handleCopy();
            }
            else if (ctrl && e.key === 'x') {
                e.preventDefault();
                handleCut();
            }
            else if (ctrl && e.key === 'v') {
                e.preventDefault();
                handlePaste();
            }
            else if (ctrl && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
            else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                handleRedo();
            }
            else if (ctrl && e.key === 'b') {
                e.preventDefault();
                handleStyleTool('bold');
            }
            else if (ctrl && e.key === 'i') {
                e.preventDefault();
                handleStyleTool('italic');
            }
            else if (ctrl && e.key === 'u') {
                e.preventDefault();
                handleStyleTool('underline');
            }
            else if (ctrl && e.key === 'f') {
                e.preventDefault();
                setShowFindReplace(prev => !prev);
            }
            else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedCell && !(e.target instanceof HTMLInputElement)) {
                    e.preventDefault();
                    handleClear();
                }
            }
            else if (e.key === 'Escape') {
                setShowFindReplace(false);
                setShowCommentInput(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCopy, handleCut, handlePaste, handleUndo, handleRedo, handleStyleTool, handleClear, selectedCell]);
    // -- Update cellValue on selection change --
    useEffect(() => {
        if (selectedCell) {
            const cell = snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)];
            setCellValue(String(cell?.value ?? ''));
            const comment = cell?.comment;
            setCommentText(typeof comment === 'string' ? comment : comment?.text ?? '');
        }
    }, [selectedCell, snapshot]);
    return {
        snapshot,
        selectedCell,
        setSelectedCell,
        cellValue,
        getSelectedRange,
        editingCell,
        editValue,
        editingCellRef,
        editValueRef,
        handleEditSave,
        handleEditCancel,
        handleEditValueChange,
        fillHandleState,
        fillHandleRef,
        isFillPreview,
        handleFillHandleMouseDown,
        handleCellClick,
        handleCellDoubleClick,
        handleCellMouseDown,
        handleCellMouseEnter,
        handleMouseUp,
        handleColumnResizeStart,
        handleRowResizeStart,
        columnWidths,
        rowHeights,
        gridRef,
        onCanvasMouseDown,
        isInRange,
        getMergeInfo,
        handleCellValueChange,
        handleCopy,
        handleCut,
        handlePaste,
        handleClear,
        handleStyleTool,
        handleInsertRow,
        handleDeleteRow,
        handleInsertColumn,
        handleDeleteColumn,
        handleFillDown,
        handleFillSeries,
        handleAddSheet,
        handleRemoveSheet,
        handleRenameSheet,
        handleMerge,
        handleUnmerge,
        handleMergeCenter,
        handleFreeze,
        handleUnfreeze,
        handleUndo,
        handleRedo,
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
        showCommentInput,
        setShowCommentInput,
        commentText,
        setCommentText,
        handleAddComment,
        handleDeleteComment,
        hasComment,
        currentCell,
        dropTargetCell,
        setDropTargetCell,
        dropTargetCellRef,
        handleFieldDrop,
        handleFieldDragOver,
        handleFieldDragLeave,
        handleCellValueSave,
    };
}
//# sourceMappingURL=use-spreadsheet-interactions.js.map
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  cellAddress,
  type SpreadsheetRange,
} from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  SheetTabBar,
} from '@nop-chaos/spreadsheet-renderers';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type FieldSourceSnapshot,
  type InspectorProvider,
  type InspectorPanelDescriptor,
  type FieldDropAdapter,
} from '@nop-chaos/report-designer-core';
import {
  createReportDesignerBridge,
} from '@nop-chaos/report-designer-renderers';
import { Button } from '@nop-chaos/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@nop-chaos/ui';
import {
  Undo2,
  Redo2,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Merge,
  TableCellsMerge,
  TableCellsSplit,
  ArrowDown,
  ArrowRight,
  Plus,
  Minus,
  Search,
  MessageSquare,
  Snowflake,
  Sun,
  Type,
} from 'lucide-react';

const fieldSources: FieldSourceSnapshot[] = [
  {
    id: 'orders',
    label: 'Orders Dataset',
    groups: [
      {
        id: 'basic',
        label: 'Basic Fields',
        expanded: true,
        fields: [
          { id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' },
          { id: 'customer', label: 'Customer', path: 'orders.customer', fieldType: 'string' },
          { id: 'amount', label: 'Amount', path: 'orders.amount', fieldType: 'number' },
          { id: 'date', label: 'Order Date', path: 'orders.date', fieldType: 'date' },
        ],
      },
    ],
  },
];

const cellInspectorProvider: InspectorProvider = {
  id: 'cell-basic-inspector',
  match: (target) => target.kind === 'cell',
  priority: 0,
  getPanels: (context): InspectorPanelDescriptor[] => {
    const cell = context.target.kind === 'cell' ? context.target.cell : undefined;
    if (!cell) return [];
    const meta = context.metadata;
    return [{
      id: 'cell-basic',
      title: 'Cell',
      targetKind: 'cell',
      mode: 'tab',
      order: 0,
      body: {
        address: cell.address,
        row: cell.row + 1,
        col: cell.col + 1,
        metadata: meta ?? {},
      },
    }];
  },
};

const dropAdapter: FieldDropAdapter = {
  id: 'basic-field-drop',
  canHandle: () => true,
  mapDropToMetaPatch: ({ field }) => ({
    binding: {
      type: field.type,
      sourceId: field.sourceId,
      fieldId: field.fieldId,
      label: field.data.label,
    },
  }),
};

type StyleToolType =
  | 'bold' | 'italic' | 'underline'
  | 'align-left' | 'align-center' | 'align-right'
  | 'bg-yellow' | 'bg-green' | 'bg-blue' | 'bg-none'
  | 'font-color-red' | 'font-color-blue' | 'font-color-black';

interface DragState {
  isDragging: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface ResizeState {
  isResizing: boolean;
  type: 'row' | 'column';
  index: number;
  startPos: number;
  startSize: number;
}

interface FillHandleState {
  isFilling: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  currentRow: number;
  currentCol: number;
  isCtrlPressed: boolean;
}

export function ReportDesignerDemo() {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [, setClipboardInfo] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findResults, setFindResults] = useState<string>('');
  const [draggingField, setDraggingField] = useState<{
    sourceId: string;
    fieldId: string;
    label: string;
  } | null>(null);

  // Drag selection state
  const [, setDragState] = useState<DragState>({
    isDragging: false,
    startRow: -1,
    startCol: -1,
    endRow: -1,
    endCol: -1,
  });

  // Column/Row resize state
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    type: 'column',
    index: -1,
    startPos: 0,
    startSize: 0,
  });

  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingCellRef = useRef<{ row: number; col: number } | null>(null);
  const editValueRef = useRef('');

  // Field drop target state
  const [dropTargetCell, setDropTargetCell] = useState<{ row: number; col: number } | null>(null);
  const dropTargetCellRef = useRef<{ row: number; col: number } | null>(null);

  // Fill handle state
  const [fillHandleState, setFillHandleState] = useState<FillHandleState>({
    isFilling: false,
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
    currentRow: 0,
    currentCol: 0,
    isCtrlPressed: false,
  });
  const fillHandleRef = useRef<FillHandleState>(fillHandleState);
  fillHandleRef.current = fillHandleState;

  const gridRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    startRow: -1,
    startCol: -1,
    endRow: -1,
    endCol: -1,
  });
  const hasDraggedRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Core setup
  const spreadsheetDoc = useMemo(() => createEmptyDocument('demo-spreadsheet'), []);
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: spreadsheetDoc }),
    [spreadsheetDoc],
  );
  const spreadsheetBridge = useMemo(
    () => createSpreadsheetBridge(spreadsheetCore),
    [spreadsheetCore],
  );
  const reportDoc = useMemo(
    () => createReportTemplateDocument(spreadsheetDoc, 'Demo Report'),
    [spreadsheetDoc],
  );
  const designerConfig: ReportDesignerConfig = useMemo(() => ({
    kind: 'report-template',
    fieldSources: fieldSources.map(fs => ({ ...fs, provider: undefined })),
  }), []);

  const designerCore = useMemo(
    () => createReportDesignerCore({ document: reportDoc, config: designerConfig }),
    [reportDoc, designerConfig],
  );
  const designerBridge = useMemo(
    () => createReportDesignerBridge(spreadsheetBridge, designerCore),
    [spreadsheetBridge, designerCore],
  );

  useEffect(() => {
    designerCore.registerInspector(cellInspectorProvider);
    designerCore.registerFieldDrop(dropAdapter);
  }, [designerCore]);

  const sheetId = spreadsheetDoc.workbook.sheets[0].id;
  const [snapshot, setSnapshot] = useState(() => spreadsheetBridge.getSnapshot());

  useEffect(() => {
    const unsub = spreadsheetBridge.subscribe(() => {
      setSnapshot(spreadsheetBridge.getSnapshot());
      const clip = spreadsheetCore.getClipboard();
      setClipboardInfo(clip ? `${clip.type}: ${clip.cells.length}x${clip.cells[0]?.length ?? 0}` : '');
    });
    return unsub;
  }, [spreadsheetBridge, spreadsheetCore]);

  // Get selected range
  const getSelectedRange = useCallback((): SpreadsheetRange | null => {
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

  // Check if cell is in fill preview range
  const isFillPreview = useCallback((row: number, col: number): boolean => {
    if (!fillHandleState.isFilling) return false;
    const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleState;
    
    // Determine fill range
    const previewStartRow = startRow;
    const previewStartCol = startCol;
    let previewEndRow = endRow;
    let previewEndCol = endCol;

    if (currentRow > endRow) {
      previewEndRow = currentRow;
    } else if (currentCol > endCol) {
      previewEndCol = currentCol;
    } else {
      return false;
    }

    // Check if cell is in fill preview range
    return row >= previewStartRow && row <= previewEndRow &&
           col >= previewStartCol && col <= previewEndCol;
  }, [fillHandleState]);

  // Cell selection
  const handleCellClick = useCallback((row: number, col: number) => {
    if (fillHandleRef.current.isFilling) return;
    if (!hasDraggedRef.current) {
      if (editingCellRef.current) {
        const currentEditCell = editingCellRef.current;
        const currentEditValue = editValueRef.current;
        const addr = cellAddress(currentEditCell.row, currentEditCell.col);
        editingCellRef.current = null;
        editValueRef.current = '';
        setEditingCell(null);
        spreadsheetBridge.dispatch({
          type: 'spreadsheet:setCellValue',
          cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
          value: currentEditValue,
        });
      }
      setSelectedCell({ row, col });
      setDragState({ isDragging: false, startRow: row, startCol: col, endRow: row, endCol: col });
      const cell = snapshot.activeSheet?.cells?.[cellAddress(row, col)];
      setCellValue(String(cell?.value ?? ''));
      const comment = cell?.comment;
      setCommentText(typeof comment === 'string' ? comment : comment?.text ?? '');
      addLog(`Selected ${cellAddress(row, col)}`);
    }
    hasDraggedRef.current = false;
  }, [snapshot, addLog, spreadsheetBridge, sheetId]);

  // Drag selection handlers
  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (fillHandleRef.current.isFilling) return;
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    hasDraggedRef.current = false;
    dragStateRef.current = {
      isDragging: true,
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
    };
    setDragState(dragStateRef.current);
    setSelectedCell({ row, col });
  }, []);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (dragStateRef.current.isDragging) {
      hasDraggedRef.current = true;
      dragStateRef.current = {
        ...dragStateRef.current,
        endRow: row,
        endCol: col,
      };
      // Batch state update for performance
      setDragState(dragStateRef.current);
    }
  }, []);

  // Cell double-click to edit
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const addr = cellAddress(row, col);
    const cell = snapshot.activeSheet?.cells?.[addr];
    const editCell = { row, col };
    const val = cell?.value != null ? String(cell.value) : '';
    setEditingCell(editCell);
    editingCellRef.current = editCell;
    setEditValue(val);
    editValueRef.current = val;
  }, [snapshot]);

  const handleEditSave = useCallback(async () => {
    const currentEditCell = editingCellRef.current;
    if (!currentEditCell) return;
    const currentEditValue = editValueRef.current;
    const addr = cellAddress(currentEditCell.row, currentEditCell.col);
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
      value: currentEditValue,
    });
  }, [spreadsheetBridge, sheetId]);

  const handleEditCancel = useCallback(() => {
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
  }, []);

  // Fill handle handlers
  const handleFillHandleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const range = getSelectedRange();
    if (!range) return;
    const state: FillHandleState = {
      isFilling: true,
      startRow: range.startRow,
      startCol: range.startCol,
      endRow: range.endRow,
      endCol: range.endCol,
      currentRow: row,
      currentCol: col,
      isCtrlPressed: e.ctrlKey || e.metaKey,
    };
    fillHandleRef.current = state;
    setFillHandleState(state);
  }, [getSelectedRange]);

  useEffect(() => {
    if (!fillHandleState.isFilling) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const td = (el as HTMLElement).closest('td.ss-cell');
      if (!td) return;
      const row = parseInt((td as HTMLElement).dataset.row || '-1');
      const col = parseInt((td as HTMLElement).dataset.col || '-1');
      if (row >= 0 && col >= 0) {
        fillHandleRef.current = { ...fillHandleRef.current, currentRow: row, currentCol: col };
        setFillHandleState(prev => ({ ...prev, currentRow: row, currentCol: col }));
      }
    };

    const handleMouseUp = async () => {
      const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleRef.current;

      let fillDirection: 'down' | 'right' | null = null;
      let targetRange: SpreadsheetRange | null = null;

      if (currentRow > endRow) {
        fillDirection = 'down';
        targetRange = { sheetId, startRow, startCol, endRow: currentRow, endCol };
      } else if (currentCol > endCol) {
        fillDirection = 'right';
        targetRange = { sheetId, startRow, startCol, endRow, endCol: currentCol };
      }

      if (fillDirection && targetRange) {
        await spreadsheetBridge.dispatch({
          type: 'spreadsheet:fillSeries',
          range: targetRange,
          direction: fillDirection,
        });
        addLog(`Series fill ${fillDirection}: ${cellAddress(startRow, startCol)}:${cellAddress(targetRange.endRow, targetRange.endCol)}`);
      }

      const reset: FillHandleState = { isFilling: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, currentRow: 0, currentCol: 0, isCtrlPressed: false };
      fillHandleRef.current = reset;
      setFillHandleState(reset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fillHandleState.isFilling, spreadsheetBridge, sheetId, addLog]);

  const handleMouseUp = useCallback(() => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current = { ...dragStateRef.current, isDragging: false };
      setDragState(dragStateRef.current);
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

  // Column resize handlers
  const handleColumnResizeStart = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeState({
      isResizing: true,
      type: 'column',
      index: col,
      startPos: e.clientX,
      startSize: columnWidths[col] ?? 80,
    });
  }, [columnWidths]);

  // Row resize handlers
  const handleRowResizeStart = useCallback((row: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeState({
      isResizing: true,
      type: 'row',
      index: row,
      startPos: e.clientY,
      startSize: rowHeights[row] ?? 24,
    });
  }, [rowHeights]);

  // Handle resize drag
  useEffect(() => {
    if (!resizeState.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizeState.type === 'column') {
        const delta = e.clientX - resizeState.startPos;
        const newWidth = Math.max(30, resizeState.startSize + delta);
        setColumnWidths(prev => ({ ...prev, [resizeState.index]: newWidth }));
      } else {
        const delta = e.clientY - resizeState.startPos;
        const newHeight = Math.max(16, resizeState.startSize + delta);
        setRowHeights(prev => ({ ...prev, [resizeState.index]: newHeight }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resizeState]);

  // Cell value edit
  const handleCellValueChange = useCallback(async (value: string) => {
    if (!selectedCell) return;
    setCellValue(value);
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: {
        sheetId,
        address: cellAddress(selectedCell.row, selectedCell.col),
        row: selectedCell.row,
        col: selectedCell.col,
      },
      value,
    });
  }, [selectedCell, sheetId, spreadsheetBridge]);

  // Clipboard operations
  const handleCopy = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:copyCells', range });
    addLog(`Copied ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  const handleCut = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:cutCells', range });
    addLog(`Cut ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`);
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  const handlePaste = useCallback(async () => {
    if (!selectedCell) return;
    const result = await spreadsheetBridge.dispatch({
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
    } else {
      addLog(`Paste failed: ${result.error}`);
    }
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  const handleClear = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:clearCells',
      target: range,
    });
    setCellValue('');
    addLog('Cleared selection');
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  // Style operations
  const handleStyleTool = useCallback(async (tool: StyleToolType) => {
    const range = getSelectedRange();
    if (!range) return;

    const cell = selectedCell ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)] : undefined;

    switch (tool) {
      case 'bold':
        await spreadsheetBridge.dispatch({
          type: 'spreadsheet:setCellFontWeight',
          target: range,
          fontWeight: cell?.style?.fontWeight === 'bold' ? 'normal' : 'bold',
        });
        break;
      case 'italic':
        await spreadsheetBridge.dispatch({
          type: 'spreadsheet:setCellFontStyle',
          target: range,
          fontStyle: cell?.style?.fontStyle === 'italic' ? 'normal' : 'italic',
        });
        break;
      case 'underline':
        await spreadsheetBridge.dispatch({
          type: 'spreadsheet:setCellTextDecoration',
          target: range,
          textDecoration: cell?.style?.textDecoration === 'underline' ? 'none' : 'underline',
        });
        break;
      case 'align-left':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellTextAlign', target: range, textAlign: 'left' });
        break;
      case 'align-center':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellTextAlign', target: range, textAlign: 'center' });
        break;
      case 'align-right':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellTextAlign', target: range, textAlign: 'right' });
        break;
      case 'bg-yellow':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: '#ffff00' });
        break;
      case 'bg-green':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: '#90EE90' });
        break;
      case 'bg-blue':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: '#87CEEB' });
        break;
      case 'bg-none':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: range, color: 'transparent' });
        break;
      case 'font-color-red':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellFontColor', target: range, color: '#ff0000' });
        break;
      case 'font-color-blue':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellFontColor', target: range, color: '#0000ff' });
        break;
      case 'font-color-black':
        await spreadsheetBridge.dispatch({ type: 'spreadsheet:setCellFontColor', target: range, color: '#000000' });
        break;
    }
    addLog(`Style: ${tool}`);
  }, [selectedCell, getSelectedRange, spreadsheetBridge, snapshot, addLog]);

  // Row/Column operations
  const handleInsertRow = useCallback(async () => {
    if (!selectedCell) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:insertRow',
      sheetId,
      row: selectedCell.row,
    });
    addLog(`Inserted row at ${selectedCell.row + 1}`);
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  const handleDeleteRow = useCallback(async () => {
    if (!selectedCell) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:deleteRow',
      sheetId,
      row: selectedCell.row,
    });
    addLog(`Deleted row ${selectedCell.row + 1}`);
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  const handleInsertColumn = useCallback(async () => {
    if (!selectedCell) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:insertColumn',
      sheetId,
      col: selectedCell.col,
    });
    addLog(`Inserted column at ${String.fromCharCode(65 + selectedCell.col)}`);
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  const handleDeleteColumn = useCallback(async () => {
    if (!selectedCell) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:deleteColumn',
      sheetId,
      col: selectedCell.col,
    });
    addLog(`Deleted column ${String.fromCharCode(65 + selectedCell.col)}`);
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  // Fill operations
  const handleFillDown = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:fillDown', range });
    addLog('Filled down');
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  const handleFillSeries = useCallback(async (direction: 'down' | 'right') => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:fillSeries',
      range,
      direction,
      seriesType: 'linear',
    });
    addLog(`Filled series ${direction}`);
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  // Sheet operations
  const handleAddSheet = useCallback(async () => {
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:addSheet',
      name: `Sheet${snapshot.workbook.sheets.length + 1}`,
    });
    addLog('Added new sheet');
  }, [spreadsheetBridge, snapshot, addLog]);

  const handleRemoveSheet = useCallback(async (id: string) => {
    if (snapshot.workbook.sheets.length <= 1) {
      addLog('Cannot remove last sheet');
      return;
    }
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:removeSheet', sheetId: id });
    addLog('Removed sheet');
  }, [spreadsheetBridge, snapshot, addLog]);

  // Merge/Unmerge
  const handleMerge = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:mergeRange', range });
    addLog('Merged cells');
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  const handleUnmerge = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:unmergeRange', range });
    addLog('Unmerged cells');
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  const handleMergeCenter = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:mergeCellsCenter', range });
    addLog('Merged and centered');
  }, [getSelectedRange, spreadsheetBridge, addLog]);

  // Freeze panes
  const handleFreeze = useCallback(async () => {
    if (!selectedCell) return;
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:freezePanes',
      sheetId,
      row: selectedCell.row,
      col: selectedCell.col,
    });
    addLog(`Froze panes at ${cellAddress(selectedCell.row, selectedCell.col)}`);
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  const handleUnfreeze = useCallback(async () => {
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:unfreezePanes', sheetId });
    addLog('Unfroze panes');
  }, [sheetId, spreadsheetBridge, addLog]);

  // Undo/Redo
  const handleUndo = useCallback(async () => {
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:undo' });
    addLog('Undo');
  }, [spreadsheetBridge, addLog]);

  const handleRedo = useCallback(async () => {
    await spreadsheetBridge.dispatch({ type: 'spreadsheet:redo' });
    addLog('Redo');
  }, [spreadsheetBridge, addLog]);

  // Find/Replace
  const handleFind = useCallback(async () => {
    if (!findQuery) return;
    const result = await spreadsheetBridge.dispatch({
      type: 'spreadsheet:find',
      options: { query: findQuery, matchCase: false },
    });
    if (result.ok && result.data) {
      const found = result.data as { address: string; value: string };
      setFindResults(`Found at ${found.address}: "${found.value}"`);
      addLog(`Found: ${found.address}`);
    } else {
      setFindResults('Not found');
    }
  }, [findQuery, spreadsheetBridge, addLog]);

  const handleReplace = useCallback(async () => {
    if (!selectedCell || !findQuery) return;
    await spreadsheetBridge.dispatch({
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
  }, [selectedCell, findQuery, replaceText, sheetId, spreadsheetBridge, addLog]);

  const handleReplaceAll = useCallback(async () => {
    if (!findQuery) return;
    const result = await spreadsheetBridge.dispatch({
      type: 'spreadsheet:replaceAll',
      options: { query: findQuery, matchCase: false },
      replacement: replaceText,
    });
    if (result.ok) {
      const count = (result.data as { count?: number })?.count ?? 0;
      setFindResults(`Replaced ${count} occurrences`);
      addLog(`Replaced all: ${count}`);
    }
  }, [findQuery, replaceText, spreadsheetBridge, addLog]);

  // Comments
  const handleAddComment = useCallback(async () => {
    if (!selectedCell || !commentText.trim()) return;
    await spreadsheetBridge.dispatch({
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
  }, [selectedCell, commentText, sheetId, spreadsheetBridge, addLog]);

  const handleDeleteComment = useCallback(async () => {
    if (!selectedCell) return;
    await spreadsheetBridge.dispatch({
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
  }, [selectedCell, sheetId, spreadsheetBridge, addLog]);

  // Field drag-drop
  const handleFieldDrop = useCallback(async () => {
    const targetCell = dropTargetCellRef.current || dropTargetCell || selectedCell;
    if (!draggingField || !targetCell) return;
    const addr = cellAddress(targetCell.row, targetCell.col);
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
      value: `\${${draggingField.fieldId}}`,
    });
    await designerBridge.dispatchDesigner({
      type: 'report-designer:dropFieldToTarget',
      field: {
        type: 'report-field',
        sourceId: draggingField.sourceId,
        fieldId: draggingField.fieldId,
        data: { label: draggingField.label },
      },
      target: {
        kind: 'cell',
        cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
      },
    });
    addLog(`Bound field "${draggingField.label}" to ${addr}`);
    setDraggingField(null);
    setDropTargetCell(null);
    dropTargetCellRef.current = null;
  }, [draggingField, dropTargetCell, selectedCell, spreadsheetBridge, designerBridge, sheetId, addLog]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (ctrl && e.key === 'x') {
        e.preventDefault();
        handleCut();
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (ctrl && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      } else if (ctrl && e.key === 'b') {
        e.preventDefault();
        handleStyleTool('bold');
      } else if (ctrl && e.key === 'i') {
        e.preventDefault();
        handleStyleTool('italic');
      } else if (ctrl && e.key === 'u') {
        e.preventDefault();
        handleStyleTool('underline');
      } else if (ctrl && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(prev => !prev);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCell && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          handleClear();
        }
      } else if (e.key === 'Escape') {
        setShowFindReplace(false);
        setShowCommentInput(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handleCut, handlePaste, handleUndo, handleRedo, handleStyleTool, handleClear, selectedCell]);

  const ROWS = 30;
  const COLS = 10;
  const frozen = snapshot.activeSheet?.frozen;

  const currentCell = selectedCell
    ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)]
    : undefined;

  // Check if a cell is in the selected range
  const isInRange = useCallback((row: number, col: number): boolean => {
    const range = getSelectedRange();
    if (!range) return false;
    return row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol;
  }, [getSelectedRange]);

  // Check if a cell is part of a merge and get merge info
  const getMergeInfo = useCallback((row: number, col: number): { isMerged: boolean; isTopLeft: boolean; rowSpan: number; colSpan: number } => {
    const merges = snapshot.activeSheet?.merges ?? [];
    for (const merge of merges) {
      if (row >= merge.startRow && row <= merge.endRow && col >= merge.startCol && col <= merge.endCol) {
        const isTopLeft = row === merge.startRow && col === merge.startCol;
        return {
          isMerged: true,
          isTopLeft,
          rowSpan: merge.endRow - merge.startRow + 1,
          colSpan: merge.endCol - merge.startCol + 1,
        };
      }
    }
    return { isMerged: false, isTopLeft: false, rowSpan: 1, colSpan: 1 };
  }, [snapshot.activeSheet?.merges]);

  return (
    <div className="report-designer-demo">
      {/* Header & Main Toolbar */}
      <div className="report-designer-demo__header">
        <h2>Report Designer Playground</h2>

        {/* Main toolbar */}
        <TooltipProvider>
          <div className="rd-toolbar">
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleUndo}><Undo2 /></Button></TooltipTrigger><TooltipContent>Undo <kbd>Ctrl+Z</kbd></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleRedo}><Redo2 /></Button></TooltipTrigger><TooltipContent>Redo <kbd>Ctrl+Y</kbd></TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleCopy} disabled={!selectedCell}><Copy /></Button></TooltipTrigger><TooltipContent>Copy <kbd>Ctrl+C</kbd></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleCut} disabled={!selectedCell}><Scissors /></Button></TooltipTrigger><TooltipContent>Cut <kbd>Ctrl+X</kbd></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handlePaste} disabled={!selectedCell}><ClipboardPaste /></Button></TooltipTrigger><TooltipContent>Paste <kbd>Ctrl+V</kbd></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleClear} disabled={!selectedCell}><Trash2 /></Button></TooltipTrigger><TooltipContent>Clear <kbd>Delete</kbd></TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleStyleTool('bold')} disabled={!selectedCell}><Bold /></Button></TooltipTrigger><TooltipContent>Bold <kbd>Ctrl+B</kbd></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleStyleTool('italic')} disabled={!selectedCell}><Italic /></Button></TooltipTrigger><TooltipContent>Italic <kbd>Ctrl+I</kbd></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleStyleTool('underline')} disabled={!selectedCell}><Underline /></Button></TooltipTrigger><TooltipContent>Underline <kbd>Ctrl+U</kbd></TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleStyleTool('align-left')} disabled={!selectedCell}><AlignLeft /></Button></TooltipTrigger><TooltipContent>Align Left</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleStyleTool('align-center')} disabled={!selectedCell}><AlignCenter /></Button></TooltipTrigger><TooltipContent>Align Center</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleStyleTool('align-right')} disabled={!selectedCell}><AlignRight /></Button></TooltipTrigger><TooltipContent>Align Right</TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="bg-btn bg-yellow" onClick={() => handleStyleTool('bg-yellow')} disabled={!selectedCell}></Button></TooltipTrigger><TooltipContent>Yellow Background</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="bg-btn bg-green" onClick={() => handleStyleTool('bg-green')} disabled={!selectedCell}></Button></TooltipTrigger><TooltipContent>Green Background</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="bg-btn bg-blue" onClick={() => handleStyleTool('bg-blue')} disabled={!selectedCell}></Button></TooltipTrigger><TooltipContent>Blue Background</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="bg-btn bg-none" onClick={() => handleStyleTool('bg-none')} disabled={!selectedCell}></Button></TooltipTrigger><TooltipContent>No Background</TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="color-btn color-red" onClick={() => handleStyleTool('font-color-red')} disabled={!selectedCell}><Type /></Button></TooltipTrigger><TooltipContent>Red Font</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="color-btn color-blue" onClick={() => handleStyleTool('font-color-blue')} disabled={!selectedCell}><Type /></Button></TooltipTrigger><TooltipContent>Blue Font</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" className="color-btn color-black" onClick={() => handleStyleTool('font-color-black')} disabled={!selectedCell}><Type /></Button></TooltipTrigger><TooltipContent>Black Font</TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleMerge} disabled={!selectedCell}><TableCellsMerge /></Button></TooltipTrigger><TooltipContent>Merge Cells</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleUnmerge} disabled={!selectedCell}><TableCellsSplit /></Button></TooltipTrigger><TooltipContent>Unmerge Cells</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleMergeCenter} disabled={!selectedCell}><Merge /></Button></TooltipTrigger><TooltipContent>Merge &amp; Center</TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleFillDown} disabled={!selectedCell}><ArrowDown /></Button></TooltipTrigger><TooltipContent>Fill Down</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => handleFillSeries('right')} disabled={!selectedCell}><ArrowRight /></Button></TooltipTrigger><TooltipContent>Fill Series Right</TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleInsertRow} disabled={!selectedCell}><Plus /></Button></TooltipTrigger><TooltipContent>Insert Row</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleDeleteRow} disabled={!selectedCell}><Minus /></Button></TooltipTrigger><TooltipContent>Delete Row</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleInsertColumn} disabled={!selectedCell}><Plus /></Button></TooltipTrigger><TooltipContent>Insert Column</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleDeleteColumn} disabled={!selectedCell}><Minus /></Button></TooltipTrigger><TooltipContent>Delete Column</TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => setShowCommentInput(!showCommentInput)} disabled={!selectedCell}><MessageSquare /></Button></TooltipTrigger><TooltipContent>Comment</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={() => setShowFindReplace(!showFindReplace)}><Search /></Button></TooltipTrigger><TooltipContent>Find &amp; Replace <kbd>Ctrl+F</kbd></TooltipContent></Tooltip>
            </div>
            <span className="rd-toolbar-separator" />
            <div className="rd-toolbar-group">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleFreeze} disabled={!selectedCell}><Snowflake /></Button></TooltipTrigger><TooltipContent>Freeze Panes</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-sm" onClick={handleUnfreeze}><Sun /></Button></TooltipTrigger><TooltipContent>Unfreeze Panes</TooltipContent></Tooltip>
            </div>
            <div className="rd-toolbar-status">
              <span className="rd-toolbar-cell-addr">{selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : ''}</span>
              {frozen && <span className="rd-toolbar-frozen-badge">Frozen</span>}
            </div>
          </div>
        </TooltipProvider>

        {/* Find/Replace Panel */}
        {showFindReplace && (
          <div className="find-replace-panel">
            <div className="find-row">
              <label>Find:</label>
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Search text..."
                autoFocus
              />
              <button onClick={handleFind}>Find Next</button>
            </div>
            <div className="find-row">
              <label>Replace:</label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with..."
              />
              <button onClick={handleReplace} disabled={!selectedCell}>Replace</button>
              <button onClick={handleReplaceAll}>Replace All</button>
            </div>
            {findResults && <div className="find-results">{findResults}</div>}
          </div>
        )}
      </div>

      <div className="report-designer-demo__body">
        {/* Field Panel */}
        <div className="report-designer-demo__field-panel">
          <h3>Field Sources</h3>
          {fieldSources.map((source) => (
            <div key={source.id} className="field-source">
              <div className="field-source__label">{source.label}</div>
              {source.groups.map((group) => (
                <div key={group.id} className="field-group">
                  <div className="field-group__items">
                    {group.fields.map((field) => (
                      <div
                        key={field.id}
                        className="field-item"
                        draggable
                        onDragStart={() => setDraggingField({
                          sourceId: source.id,
                          fieldId: field.id,
                          label: field.label,
                        })}
                      >
                        <span className="field-item__type">{field.fieldType}</span>
                        <span className="field-item__label">{field.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={gridRef}
          className="report-designer-demo__canvas"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFieldDrop}
          onMouseDown={(e) => {
            if (editingCellRef.current && (e.target as HTMLElement).tagName !== 'INPUT') {
              handleEditSave();
            }
          }}
        >
          {/* Grid */}
          <div className="spreadsheet-grid" data-fill-dragging={fillHandleState.isFilling || undefined}>
            <table>
              <thead>
                <tr>
                  <th className="row-header header-corner" style={{ width: 40 }}></th>
                  {Array.from({ length: COLS }, (_, c) => (
                    <th
                      key={c}
                      style={{ width: columnWidths[c] ?? 80 }}
                      className="col-header"
                    >
                      {String.fromCharCode(65 + c)}
                      <div
                        className="col-resize-handle"
                        onMouseDown={(e) => handleColumnResizeStart(c, e)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROWS }, (_, r) => (
                  <tr
                    key={r}
                    style={{ height: rowHeights[r] ?? 24 }}
                    className={frozen && r < (frozen.row ?? 0) ? 'frozen-row' : ''}
                  >
                    <td className="row-header">
                      {r + 1}
                      <div
                        className="row-resize-handle"
                        onMouseDown={(e) => handleRowResizeStart(r, e)}
                      />
                    </td>
                    {Array.from({ length: COLS }, (_, c) => {
                      const addr = cellAddress(r, c);
                      const cell = snapshot.activeSheet?.cells?.[addr];
                      const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                      const inRange = isInRange(r, c);
                      const hasComment = !!cell?.comment;
                      const hasBinding = designerCore.getMetadata({
                        kind: 'cell',
                        cell: { sheetId, address: addr, row: r, col: c },
                      });
                      const isFrozen = frozen && (r < (frozen.row ?? 0) || c < (frozen.col ?? 0));
                      const mergeInfo = getMergeInfo(r, c);
                      const isEditing = editingCell?.row === r && editingCell?.col === c;
                      const isDropTarget = dropTargetCell?.row === r && dropTargetCell?.col === c && !!draggingField;
                      
                      // Check if this cell is the bottom-right corner of selection (for fill handle)
                      const selectedRange = getSelectedRange();
                      const isFillHandleCell = selectedRange && 
                        r === selectedRange.endRow && 
                        c === selectedRange.endCol &&
                        !isEditing;

                      // Skip rendering if this cell is merged and not the top-left cell
                      if (mergeInfo.isMerged && !mergeInfo.isTopLeft) {
                        return null;
                      }

                      const style: React.CSSProperties = {
                        width: columnWidths[c] ?? 80,
                        fontWeight: cell?.style?.fontWeight,
                        fontStyle: cell?.style?.fontStyle,
                        textDecoration: cell?.style?.textDecoration,
                        color: cell?.style?.fontColor,
                        backgroundColor: cell?.style?.backgroundColor,
                        textAlign: cell?.style?.textAlign,
                        verticalAlign: cell?.style?.verticalAlign,
                        borderStyle: cell?.style?.borderStyle === 'all' ? 'solid' : undefined,
                        borderColor: cell?.style?.borderColor,
                      };

                      return (
                        <td
                          key={c}
                          className="ss-cell"
                          style={style}
                          data-row={r}
                          data-col={c}
                          data-cell-active={isSelected || undefined}
                          data-cell-selected={isSelected || undefined}
                          data-range-highlight={inRange || undefined}
                          data-cell-bound={hasBinding || undefined}
                          data-cell-comment={hasComment || undefined}
                          data-cell-frozen={isFrozen || undefined}
                          data-cell-merged={mergeInfo.isMerged || undefined}
                          data-cell-editing={isEditing || undefined}
                          data-cell-drop-target={isDropTarget || undefined}
                          data-cell-fill-preview={isFillPreview(r, c) || undefined}
                          rowSpan={mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined}
                          colSpan={mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined}
                          onClick={() => handleCellClick(r, c)}
                          onDoubleClick={() => handleCellDoubleClick(r, c)}
                          onMouseDown={(e) => handleCellMouseDown(r, c, e)}
                          onMouseEnter={() => handleCellMouseEnter(r, c)}
                          onDragOver={(e) => { e.preventDefault(); const t = { row: r, col: c }; setDropTargetCell(t); dropTargetCellRef.current = t; }}
                          onDragLeave={() => setDropTargetCell(null)}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              className="ss-cell-edit-input"
                              value={editValue}
                              onChange={(e) => { setEditValue(e.target.value); editValueRef.current = e.target.value; }}
                              onBlur={handleEditSave}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditSave();
                                } else if (e.key === 'Escape') {
                                  handleEditCancel();
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <>
                              {cell?.value != null ? String(cell.value) : ''}
                              {isFillHandleCell && (
                                <div
                                  className="ss-fill-handle"
                                  onMouseDown={(e) => handleFillHandleMouseDown(r, c, e)}
                                />
                              )}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cell Editor */}
          {selectedCell && (
            <div className="cell-editor">
              <label>
                {cellAddress(selectedCell.row, selectedCell.col)}:
                <input
                  type="text"
                  value={cellValue}
                  onChange={(e) => handleCellValueChange(e.target.value)}
                  placeholder="Enter cell value"
                />
              </label>
              {showCommentInput && (
                <div className="comment-editor">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add comment..."
                  />
                  <button onClick={handleAddComment}>Add</button>
                  {currentCell?.comment && (
                    <button onClick={handleDeleteComment}>Delete</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sheet Tabs (Excel-style bottom tab bar) */}
          <SheetTabBar
            sheets={snapshot.workbook.sheets}
            activeSheetId={snapshot.activeSheet?.id ?? ''}
            onSwitchSheet={(sheetId) => spreadsheetBridge.dispatch({
              type: 'spreadsheet:setActiveSheet',
              sheetId,
            })}
            onAddSheet={handleAddSheet}
            onRemoveSheet={handleRemoveSheet}
            onRenameSheet={async (sheetId, name) => {
              await spreadsheetBridge.dispatch({
                type: 'spreadsheet:renameSheet',
                sheetId,
                name,
              });
              addLog(`Renamed sheet to "${name}"`);
            }}
            canRemoveSheet={snapshot.workbook.sheets.length > 1}
          />
        </div>

        {/* Inspector */}
        <div className="report-designer-demo__inspector">
          <h3>Inspector</h3>
          {selectedCell ? (
            <div className="inspector-content">
              <div className="inspector-section">
                <h4>Cell: {cellAddress(selectedCell.row, selectedCell.col)}</h4>
                <div className="inspector-field">
                  <span>Row:</span> <span>{selectedCell.row + 1}</span>
                </div>
                <div className="inspector-field">
                  <span>Col:</span> <span>{selectedCell.col + 1}</span>
                </div>
                <div className="inspector-field">
                  <span>Value:</span> <span>{String(currentCell?.value ?? '(empty)')}</span>
                </div>
              </div>
              <div className="inspector-section">
                <h4>Style</h4>
                <div className="inspector-field">
                  <span>Bold:</span> <span>{currentCell?.style?.fontWeight === 'bold' ? '✓' : '✗'}</span>
                </div>
                <div className="inspector-field">
                  <span>Italic:</span> <span>{currentCell?.style?.fontStyle === 'italic' ? '✓' : '✗'}</span>
                </div>
                <div className="inspector-field">
                  <span>Color:</span>
                  <span className="color-preview" style={{ backgroundColor: currentCell?.style?.fontColor ?? '#000' }} />
                </div>
                <div className="inspector-field">
                  <span>BG:</span>
                  <span className="color-preview" style={{ backgroundColor: currentCell?.style?.backgroundColor ?? 'transparent' }} />
                </div>
                <div className="inspector-field">
                  <span>Align:</span> <span>{currentCell?.style?.textAlign ?? 'left'}</span>
                </div>
              </div>
              {currentCell?.comment && (
                <div className="inspector-section">
                  <h4>Comment</h4>
                  <p className="comment-text">
                    {typeof currentCell.comment === 'string' ? currentCell.comment : currentCell.comment.text}
                  </p>
                </div>
              )}
              {frozen && (
                <div className="inspector-section">
                  <h4>Frozen Panes</h4>
                  <div className="inspector-field">
                    <span>Row:</span> <span>{frozen.row ?? 0}</span>
                  </div>
                  <div className="inspector-field">
                    <span>Col:</span> <span>{frozen.col ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="inspector-empty">Click a cell to inspect.</p>
          )}
        </div>
      </div>

      {/* Event Log */}
      <div className="report-designer-demo__log">
        <h3>Event Log</h3>
        <div className="log-content">
          {log.length === 0 ? (
            <p className="log-empty">Interact with the spreadsheet to see events.</p>
          ) : (
            log.map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="shortcuts-help">
        <h4>Keyboard Shortcuts</h4>
        <div className="shortcuts-grid">
          <span><kbd>Ctrl+C</kbd> Copy</span>
          <span><kbd>Ctrl+X</kbd> Cut</span>
          <span><kbd>Ctrl+V</kbd> Paste</span>
          <span><kbd>Ctrl+Z</kbd> Undo</span>
          <span><kbd>Ctrl+Y</kbd> Redo</span>
          <span><kbd>Ctrl+B</kbd> Bold</span>
          <span><kbd>Ctrl+I</kbd> Italic</span>
          <span><kbd>Ctrl+U</kbd> Underline</span>
          <span><kbd>Ctrl+F</kbd> Find</span>
          <span><kbd>Delete</kbd> Clear</span>
          <span><kbd>Esc</kbd> Close panels</span>
          <span><kbd>Drag</kbd> Select range</span>
          <span><kbd>DblClick</kbd> Rename sheet</span>
        </div>
      </div>
    </div>
  );
}

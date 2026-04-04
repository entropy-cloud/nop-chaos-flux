import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  cellAddress,
  createSpreadsheetCore,
} from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  SheetTabBar,
  SpreadsheetGrid,
  useSpreadsheetInteractions,
} from '@nop-chaos/spreadsheet-renderers';
import type {
  ReportDesignerCore,
  ReportDesignerRuntimeSnapshot,
} from '@nop-chaos/report-designer-core';
import { createReportDesignerBridge } from './bridge.js';

const ROWS = 30;
const COLS = 10;

export interface ReportSpreadsheetCanvasProps {
  core: ReportDesignerCore;
  snapshot: ReportDesignerRuntimeSnapshot;
}

export function ReportSpreadsheetCanvas({ core, snapshot }: ReportSpreadsheetCanvasProps) {
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: core.exportDocument().spreadsheet }),
    [core],
  );

  const spreadsheetBridge = useMemo(
    () => createSpreadsheetBridge(spreadsheetCore),
    [spreadsheetCore],
  );

  const designerBridge = useMemo(
    () => createReportDesignerBridge(spreadsheetBridge, core),
    [spreadsheetBridge, core],
  );

  const sheetId = snapshot.document.spreadsheet.workbook.sheets[0]?.id ?? '';

  const interactions = useSpreadsheetInteractions({ bridge: spreadsheetBridge, sheetId, rows: ROWS, cols: COLS });

  const {
    snapshot: ssSnapshot,
    selectedCell,
    editingCell,
    editValue,
    editingCellRef,
    fillHandleState,
    isFillPreview,
    handleFillHandleMouseDown,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    handleCellClick,
    handleCellDoubleClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleColumnResizeStart,
    handleRowResizeStart,
    columnWidths,
    rowHeights,
    gridRef,
    isInRange,
    getMergeInfo,
    handleAddSheet,
    handleRemoveSheet,
    handleRenameSheet,
    dropTargetCell,
    handleFieldDragOver,
    handleFieldDragLeave,
    handleFieldDrop,
  } = interactions;

  const prevSelectedCell = useRef<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const prev = prevSelectedCell.current;
    if (!selectedCell) {
      prevSelectedCell.current = null;
      return;
    }
    if (prev && prev.row === selectedCell.row && prev.col === selectedCell.col) {
      return;
    }
    prevSelectedCell.current = selectedCell;
    void core.setSelectionTarget({
      kind: 'cell',
      cell: {
        sheetId,
        address: cellAddress(selectedCell.row, selectedCell.col),
        row: selectedCell.row,
        col: selectedCell.col,
      },
    });
  }, [selectedCell, core, sheetId]);

  const getCellMetadata = useCallback(
    (row: number, col: number) =>
      core.getMetadata({
        kind: 'cell',
        cell: { sheetId, address: cellAddress(row, col), row, col },
      }),
    [core, sheetId],
  );

  const handleFieldDropOnCell = useCallback(() => {
    handleFieldDrop(async (targetCell) => {
      const dragState = core.getSnapshot().fieldDrag;
      if (!dragState.active || !dragState.payload) return;
      const addr = cellAddress(targetCell.row, targetCell.col);
      await spreadsheetBridge.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
        value: `\${${dragState.payload.fieldId}}`,
      });
      await designerBridge.dispatchDesigner({
        type: 'report-designer:dropFieldToTarget',
        field: dragState.payload,
        target: {
          kind: 'cell',
          cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
        },
      });
    });
  }, [handleFieldDrop, spreadsheetBridge, designerBridge, sheetId, core]);

  return (
    <div
      ref={gridRef}
      className="nop-report-designer__spreadsheet-canvas"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFieldDropOnCell}
      onMouseDown={(e) => {
        if (editingCellRef.current && (e.target as HTMLElement).tagName !== 'INPUT') {
          void handleEditSave();
        }
      }}
    >
      <SpreadsheetGrid
        snapshot={ssSnapshot}
        bridge={spreadsheetBridge}
        rows={ROWS}
        cols={COLS}
        columnWidths={columnWidths}
        rowHeights={rowHeights}
        selectedCell={selectedCell}
        editingCell={editingCell}
        editValue={editValue}
        fillHandleState={fillHandleState}
        isInRange={isInRange}
        isFillPreview={isFillPreview}
        getSelectedRange={interactions.getSelectedRange}
        getMergeInfo={getMergeInfo}
        onCellClick={handleCellClick}
        onCellDoubleClick={handleCellDoubleClick}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onColumnResizeStart={handleColumnResizeStart}
        onRowResizeStart={handleRowResizeStart}
        onFillHandleMouseDown={handleFillHandleMouseDown}
        onEditValueChange={handleEditValueChange}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
        dropTargetCell={dropTargetCell}
        draggingField={null}
        getCellMetadata={getCellMetadata}
        onFieldDragOver={handleFieldDragOver}
        onFieldDragLeave={handleFieldDragLeave}
      />

      <SheetTabBar
        sheets={ssSnapshot.workbook.sheets}
        activeSheetId={ssSnapshot.activeSheet?.id ?? ''}
        onSwitchSheet={(id) => spreadsheetBridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: id })}
        onAddSheet={handleAddSheet}
        onRemoveSheet={handleRemoveSheet}
        onRenameSheet={handleRenameSheet}
        canRemoveSheet={ssSnapshot.workbook.sheets.length > 1}
      />
    </div>
  );
}

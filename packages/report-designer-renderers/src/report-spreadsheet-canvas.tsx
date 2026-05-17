import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import '@nop-chaos/spreadsheet-renderers/canvas-styles.css';
import { reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { useRendererEnv } from '@nop-chaos/flux-react';
import { cellAddress, type SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import {
  SheetTabBar,
  SpreadsheetGrid,
  type SpreadsheetBridge,
  useSpreadsheetInteractions,
} from '@nop-chaos/spreadsheet-renderers';
import type {
  ReportDesignerCore,
  ReportDesignerRuntimeSnapshot,
} from '@nop-chaos/report-designer-core';
import { createReportDesignerBridge } from './bridge.js';

function getFailureMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : t('flux.common.saveFailed');
}

const ROWS = 30;
const COLS = 10;

export interface ReportSpreadsheetCanvasProps {
  core: ReportDesignerCore;
  snapshot: ReportDesignerRuntimeSnapshot;
  spreadsheetBridge: SpreadsheetBridge;
  spreadsheetSnapshot: SpreadsheetRuntimeSnapshot;
}

export function ReportSpreadsheetCanvas({
  core,
  snapshot,
  spreadsheetBridge,
  spreadsheetSnapshot,
}: ReportSpreadsheetCanvasProps) {
  const env = useRendererEnv();
  const designerBridge = useMemo(
    () => createReportDesignerBridge(spreadsheetBridge, core),
    [spreadsheetBridge, core],
  );

  const sheetId =
    spreadsheetSnapshot.activeSheetId || snapshot.document.spreadsheet.workbook.sheets[0]?.id || '';

  const interactions = useSpreadsheetInteractions({
    bridge: spreadsheetBridge,
    sheetId,
    rows: ROWS,
    cols: COLS,
  });

  const {
    snapshot: ssSnapshot,
    selectedCell,
    editingCell,
    editValue,
    editSaveState,
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
  const hasMirroredSpreadsheetSelection = useRef(false);

  useEffect(() => {
    const selection = ssSnapshot.selection;
    const selectedCellTarget =
      selection.kind === 'cell' && selection.anchor
        ? { row: selection.anchor.row, col: selection.anchor.col }
        : null;
    if (selection.kind === 'column' && selection.columns?.length) {
      prevSelectedCell.current = null;
      hasMirroredSpreadsheetSelection.current = true;
      void core.setSelectionTarget({ kind: 'column', sheetId, col: selection.columns[0]! });
      return;
    }
    if (selection.kind === 'row' && selection.rows?.length) {
      prevSelectedCell.current = null;
      hasMirroredSpreadsheetSelection.current = true;
      void core.setSelectionTarget({ kind: 'row', sheetId, row: selection.rows[0]! });
      return;
    }
    if (selection.kind === 'sheet') {
      prevSelectedCell.current = null;
      hasMirroredSpreadsheetSelection.current = true;
      void core.setSelectionTarget({ kind: 'sheet', sheetId });
      return;
    }
    if (selection.kind === 'range' && selection.range) {
      prevSelectedCell.current = null;
      hasMirroredSpreadsheetSelection.current = true;
      void core.setSelectionTarget({ kind: 'range', range: selection.range });
      return;
    }

    const prev = prevSelectedCell.current;
    if (!selectedCellTarget) {
      prevSelectedCell.current = null;
      if (selection.kind === 'none' && hasMirroredSpreadsheetSelection.current) {
        hasMirroredSpreadsheetSelection.current = false;
        void core.setSelectionTarget(undefined);
      }
      return;
    }
    if (prev && prev.row === selectedCellTarget.row && prev.col === selectedCellTarget.col) {
      return;
    }
    prevSelectedCell.current = selectedCellTarget;
    hasMirroredSpreadsheetSelection.current = true;
    void core.setSelectionTarget({
      kind: 'cell',
      cell: {
        sheetId,
        address: cellAddress(selectedCellTarget.row, selectedCellTarget.col),
        row: selectedCellTarget.row,
        col: selectedCellTarget.col,
      },
    });
  }, [core, sheetId, ssSnapshot.selection]);

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
      if (!dragState.active || !dragState.payload) {
        return;
      }
      const addr = cellAddress(targetCell.row, targetCell.col);
      const previousCellValue = ssSnapshot.activeSheet?.cells?.[addr]?.value;
      const spreadsheetResult = await spreadsheetBridge.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
        value: `\${${dragState.payload.fieldId}}`,
      });

      if (spreadsheetResult.cancelled) {
        throw new Error('Field drop cancelled');
      }
      if (!spreadsheetResult.ok) {
        throw spreadsheetResult.error instanceof Error
          ? spreadsheetResult.error
          : new Error('Field drop failed before designer update');
      }

      const designerResult = await designerBridge.dispatchDesigner({
        type: 'report-designer:dropFieldToTarget',
        field: dragState.payload,
        target: {
          kind: 'cell',
          cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
        },
      });

      if (designerResult.cancelled || !designerResult.ok) {
        const rollbackResult =
          previousCellValue == null
            ? await spreadsheetBridge.dispatch({
                type: 'spreadsheet:clearCells',
                target: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
                clearValues: true,
              })
            : await spreadsheetBridge.dispatch({
                type: 'spreadsheet:setCellValue',
                cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
                value: previousCellValue,
              });

        if (!rollbackResult.ok) {
          throw rollbackResult.error instanceof Error
            ? rollbackResult.error
            : new Error('Field drop rollback failed');
        }

        throw designerResult.error instanceof Error
          ? designerResult.error
          : new Error(designerResult.cancelled ? 'Field drop cancelled' : 'Field drop failed');
      }
    }).catch((error: unknown) => {
      reportRuntimeHostIssue({
        env,
        error,
        phase: 'action',
        path: 'report-designer.spreadsheet-canvas',
        details: {
          operation: 'report-field-drop',
          sheetId,
        },
      });
      env.notify?.(
        'warning',
        getFailureMessage(error),
      );
    });
  }, [core, designerBridge, env, handleFieldDrop, sheetId, spreadsheetBridge, ssSnapshot.activeSheet?.cells]);

  return (
    <div
      ref={gridRef}
      data-slot="report-designer-spreadsheet-canvas"
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
        selection={ssSnapshot.selection}
        editingCell={editingCell}
        editValue={editValue}
        editSaveState={editSaveState}
        fillHandleState={fillHandleState}
        isInRange={isInRange}
        isFillPreview={isFillPreview}
        getSelectedRange={interactions.getSelectedRange}
        getMergeInfo={getMergeInfo}
        onCellClick={handleCellClick}
        onCellDoubleClick={handleCellDoubleClick}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onSelectRow={interactions.handleSelectRow}
        onSelectColumn={interactions.handleSelectColumn}
        onSelectAll={interactions.handleSelectAll}
        onColumnResizeStart={handleColumnResizeStart}
        onRowResizeStart={handleRowResizeStart}
        onFillHandleMouseDown={handleFillHandleMouseDown}
        onFillHandleDoubleClick={interactions.handleFillHandleDoubleClick}
        onEditValueChange={handleEditValueChange}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
        dropTargetCell={dropTargetCell}
        draggingField={null}
        getCellMetadata={getCellMetadata}
        onFieldDragOver={handleFieldDragOver}
        onFieldDragLeave={handleFieldDragLeave}
        readonly={ssSnapshot.runtime.readonly}
      />

      <SheetTabBar
        sheets={ssSnapshot.workbook.sheets}
        activeSheetId={ssSnapshot.activeSheet?.id ?? ''}
        onSwitchSheet={(id) =>
          spreadsheetBridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: id })
        }
        onAddSheet={handleAddSheet}
        onRemoveSheet={handleRemoveSheet}
        onRenameSheet={handleRenameSheet}
        canRemoveSheet={ssSnapshot.workbook.sheets.length > 1}
        readOnly={ssSnapshot.runtime.readonly}
      />
    </div>
  );
}

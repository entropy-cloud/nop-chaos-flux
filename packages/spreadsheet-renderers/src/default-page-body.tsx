import React from 'react';
import { cellAddress, type SpreadsheetConfig } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from './bridge.js';
import { SpreadsheetGrid } from './spreadsheet-grid.js';
import { SheetTabBar } from './sheet-tab-bar.js';
import { SpreadsheetToolbar } from './spreadsheet-toolbar.js';
import { useSpreadsheetInteractions } from './use-spreadsheet-interactions.js';

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26;

function resolveGridDimensions(
  snapshot: SpreadsheetHostSnapshot,
  config: SpreadsheetConfig | undefined,
) {
  const activeSheet = snapshot.activeSheet;
  const rowIndexes = Object.values(activeSheet?.rows ?? {}).map((row) => row.index);
  const columnIndexes = Object.values(activeSheet?.columns ?? {}).map((column) => column.index);
  const cellEntries = Object.values(activeSheet?.cells ?? {});
  const mergeEntries = activeSheet?.merges ?? [];
  const lastRowIndex = Math.max(
    -1,
    ...rowIndexes,
    ...cellEntries.map((cell) => cell.row),
    ...mergeEntries.map((merge) => merge.endRow),
  );
  const lastColumnIndex = Math.max(
    -1,
    ...columnIndexes,
    ...cellEntries.map((cell) => cell.col),
    ...mergeEntries.map((merge) => merge.endCol),
  );

  return {
    rows: Math.max(DEFAULT_ROWS, lastRowIndex + 1, 1),
    cols: Math.max(DEFAULT_COLS, lastColumnIndex + 1, 1),
    defaultRowHeight: config?.defaultRowHeight,
    defaultColumnWidth: config?.defaultColumnWidth,
  };
}

export function DefaultSpreadsheetPageBody(props: {
  bridge: SpreadsheetBridge;
  snapshot: SpreadsheetHostSnapshot;
  config?: SpreadsheetConfig;
  showToolbar: boolean;
}) {
  const sheetId = props.snapshot.activeSheet?.id ?? props.snapshot.workbook.sheets[0]?.id ?? '';
  const dimensions = resolveGridDimensions(props.snapshot, props.config);
  const interactions = useSpreadsheetInteractions({
    bridge: props.bridge,
    sheetId,
    rows: dimensions.rows,
    cols: dimensions.cols,
  });
  const {
    snapshot,
    selectedCell,
    cellValue,
    currentCell,
    columnWidths,
    rowHeights,
    editingCell,
    editValue,
    fillHandleState,
    dropTargetCell,
    showFindReplace,
    setShowFindReplace,
    findQuery,
    setFindQuery,
    replaceText,
    setReplaceText,
    findResults,
    showCommentInput,
    setShowCommentInput,
    commentText,
    setCommentText,
    hasComment,
    gridRef,
    editingCellRef,
    isInRange,
    isFillPreview,
    getSelectedRange,
    getMergeInfo,
    handleUndo,
    handleRedo,
    handleCopy,
    handleCut,
    handlePaste,
    handleClear,
    handleStyleTool,
    handleMerge,
    handleUnmerge,
    handleMergeCenter,
    handleFillDown,
    handleFillSeries,
    handleAddSheet,
    handleRemoveSheet,
    handleRenameSheet,
    handleInsertRow,
    handleDeleteRow,
    handleInsertColumn,
    handleDeleteColumn,
    handleFreeze,
    handleUnfreeze,
    handleCellValueChange,
    handleFind,
    handleReplace,
    handleReplaceAll,
    handleAddComment,
    handleDeleteComment,
    handleCellClick,
    handleCellDoubleClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
    handleColumnResizeStart,
    handleRowResizeStart,
    handleFillHandleMouseDown,
    handleFillHandleDoubleClick,
    handleEditValueChange,
    editSaveState,
    handleEditSave,
    handleEditCancel,
    handleFieldDragOver,
    handleFieldDragLeave,
  } = interactions;
  const currentSheet = snapshot.activeSheet;
  const cellRef = selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : '';
  const frozen = Boolean(
    currentSheet?.frozen &&
      ((currentSheet.frozen.row ?? 0) > 0 || (currentSheet.frozen.col ?? 0) > 0),
  );

  return (
    <div
      ref={gridRef}
      data-slot="spreadsheet-default-host"
      role="region"
      tabIndex={-1}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement | null;
        const isEditingInput = target?.closest('input.ss-cell-edit-input');
        if (editingCellRef.current && !isEditingInput) {
          void handleEditSave();
        }
      }}
    >
      {props.showToolbar ? (
        <div data-slot="spreadsheet-default-toolbar">
          <SpreadsheetToolbar
            selectedCell={selectedCell}
            cellAddress={cellRef}
            cellValue={cellValue}
            frozen={frozen}
            hasSelection={Boolean(selectedCell)}
            currentCellStyle={currentCell?.style}
            onUndo={() => void handleUndo()}
            onRedo={() => void handleRedo()}
            onCopy={() => void handleCopy()}
            onCut={() => void handleCut()}
            onPaste={() => void handlePaste()}
            onClear={() => void handleClear()}
            onStyleTool={(tool) => void handleStyleTool(tool)}
            onMerge={() => void handleMerge()}
            onUnmerge={() => void handleUnmerge()}
            onMergeCenter={() => void handleMergeCenter()}
            onFillDown={() => void handleFillDown()}
            onFillSeries={(direction) => void handleFillSeries(direction)}
            onInsertRow={() => void handleInsertRow()}
            onDeleteRow={() => void handleDeleteRow()}
            onInsertColumn={() => void handleInsertColumn()}
            onDeleteColumn={() => void handleDeleteColumn()}
            onFreeze={() => void handleFreeze()}
            onUnfreeze={() => void handleUnfreeze()}
            onCellValueChange={handleCellValueChange}
            showFindReplace={showFindReplace}
            onToggleFindReplace={() => setShowFindReplace((value) => !value)}
            findQuery={findQuery}
            onFindQueryChange={setFindQuery}
            replaceText={replaceText}
            onReplaceTextChange={setReplaceText}
            findResults={findResults}
            onFind={() => void handleFind()}
            onReplace={() => void handleReplace()}
            onReplaceAll={() => void handleReplaceAll()}
            showCommentInput={showCommentInput}
            onToggleCommentInput={() => setShowCommentInput((value) => !value)}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onAddComment={() => void handleAddComment()}
            onDeleteComment={() => void handleDeleteComment()}
            hasComment={hasComment}
            readOnly={snapshot.runtime.readonly}
          />
        </div>
      ) : null}

      <SpreadsheetGrid
        snapshot={snapshot}
        bridge={props.bridge}
        rows={dimensions.rows}
        cols={dimensions.cols}
        columnWidths={columnWidths}
        rowHeights={rowHeights}
        selectedCell={selectedCell}
        selection={snapshot.selection}
        editingCell={editingCell}
        editValue={editValue}
        editSaveState={editSaveState}
        fillHandleState={fillHandleState}
        isInRange={isInRange}
        isFillPreview={isFillPreview}
        getSelectedRange={getSelectedRange}
        getMergeInfo={getMergeInfo}
        onCellClick={handleCellClick}
        onCellDoubleClick={handleCellDoubleClick}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onSelectRow={handleSelectRow}
        onSelectColumn={handleSelectColumn}
        onSelectAll={handleSelectAll}
        onColumnResizeStart={handleColumnResizeStart}
        onRowResizeStart={handleRowResizeStart}
        onFillHandleMouseDown={handleFillHandleMouseDown}
        onFillHandleDoubleClick={handleFillHandleDoubleClick}
        onEditValueChange={handleEditValueChange}
        onEditSave={() => void handleEditSave()}
        onEditCancel={handleEditCancel}
        dropTargetCell={dropTargetCell}
        draggingField={null}
        onFieldDragOver={handleFieldDragOver}
        onFieldDragLeave={handleFieldDragLeave}
        readonly={snapshot.runtime.readonly}
      />

      <SheetTabBar
        sheets={snapshot.workbook.sheets}
        activeSheetId={snapshot.activeSheet?.id ?? ''}
        onSwitchSheet={(nextSheetId) =>
          void props.bridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: nextSheetId })
        }
        onAddSheet={() => void handleAddSheet()}
        onRemoveSheet={(nextSheetId) => void handleRemoveSheet(nextSheetId)}
        onRenameSheet={(nextSheetId, name) => void handleRenameSheet(nextSheetId, name)}
        canRemoveSheet={snapshot.workbook.sheets.length > 1}
        readOnly={snapshot.runtime.readonly}
      />
    </div>
  );
}

import React from 'react';
import type { SpreadsheetBridge } from '../index.js';
import { SpreadsheetGrid, useSpreadsheetInteractions } from '../index.js';

export function SpreadsheetGridHarness(props: {
  sheetId: string;
  bridge: SpreadsheetBridge;
}) {
  const interactions = useSpreadsheetInteractions({
    bridge: props.bridge,
    sheetId: props.sheetId,
    rows: 5,
    cols: 5,
  });

  return (
    <SpreadsheetGrid
      snapshot={interactions.snapshot}
      bridge={props.bridge}
      rows={5}
      cols={5}
      columnWidths={interactions.columnWidths}
      rowHeights={interactions.rowHeights}
      selectedCell={interactions.selectedCell}
      selection={interactions.snapshot.selection}
      editingCell={interactions.editingCell}
      editValue={interactions.editValue}
      editSaveState={interactions.editSaveState}
      fillHandleState={interactions.fillHandleState}
      isInRange={interactions.isInRange}
      isFillPreview={interactions.isFillPreview}
      getSelectedRange={interactions.getSelectedRange}
      getMergeInfo={interactions.getMergeInfo}
      onCellClick={interactions.handleCellClick}
      onCellDoubleClick={interactions.handleCellDoubleClick}
      onCellMouseDown={interactions.handleCellMouseDown}
      onCellMouseEnter={interactions.handleCellMouseEnter}
      onSelectRow={interactions.handleSelectRow}
      onSelectColumn={interactions.handleSelectColumn}
      onSelectAll={interactions.handleSelectAll}
      onColumnResizeStart={interactions.handleColumnResizeStart}
      onRowResizeStart={interactions.handleRowResizeStart}
      onFillHandleMouseDown={interactions.handleFillHandleMouseDown}
      onFillHandleDoubleClick={interactions.handleFillHandleDoubleClick}
      onEditValueChange={interactions.handleEditValueChange}
      onEditSave={interactions.handleEditSave}
      onEditCancel={interactions.handleEditCancel}
      dropTargetCell={interactions.dropTargetCell}
      draggingField={null}
    />
  );
}

// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge, SpreadsheetGrid, useSpreadsheetInteractions } from '../index.js';

function SpreadsheetGridHarness(props: {
  sheetId: string;
  bridge: ReturnType<typeof createSpreadsheetBridge>;
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

afterEach(() => {
  cleanup();
});

describe('spreadsheet context menu operations', () => {
  it('opens the shared context menu and clears the selected cell', async () => {
    const documentModel = createEmptyDocument('contextmenu-clear-cell');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: '42',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;

    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-clear'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBeUndefined();
    });
  });

  it('double-clicks the fill handle to auto-fill downward using adjacent data extent', async () => {
    const documentModel = createEmptyDocument('double-click-fill-handle');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 1,
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'x',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B2', row: 1, col: 1 },
      value: 'x',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B3', row: 2, col: 1 },
      value: 'x',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);

    await waitFor(() => {
      expect(core.getSnapshot().selection.anchor?.address).toBe('A1');
    });

    const fillHandle = container.querySelector('.ss-fill-handle') as HTMLElement | null;
    expect(fillHandle).toBeTruthy();
    fireEvent.doubleClick(fillHandle!);

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe(1);
      expect(activeSheet?.cells?.A2?.value).toBe(2);
      expect(activeSheet?.cells?.A3?.value).toBe(3);
    });
  });

  it('does not auto-fill on fill-handle double-click when no adjacent data extent exists', async () => {
    const documentModel = createEmptyDocument('double-click-fill-handle-no-adjacent-data');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 1,
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);

    const fillHandle = container.querySelector('.ss-fill-handle') as HTMLElement | null;
    expect(fillHandle).toBeTruthy();
    fireEvent.doubleClick(fillHandle!);

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A2).toBeUndefined();
      expect(activeSheet?.cells?.A3).toBeUndefined();
    });
  });

  it('inserts a row below from the shared context menu using Excel-style directional semantics', async () => {
    const documentModel = createEmptyDocument('contextmenu-insert-row-below');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'top',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A2', row: 1, col: 0 },
      value: 'second',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-insert-row-below'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe('top');
      expect(activeSheet?.cells?.A2).toBeUndefined();
      expect(activeSheet?.cells?.A3?.value).toBe('second');
    });
  });

  it('inserts rows below using the full selected row count', async () => {
    const documentModel = createEmptyDocument('contextmenu-insert-multi-row-below');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'r1',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A2', row: 1, col: 0 },
      value: 'r2',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A3', row: 2, col: 0 },
      value: 'r3',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const rowHeaderButtons = container.querySelectorAll('.ss-row-header-button');
    const firstRow = rowHeaderButtons[0] as HTMLElement | undefined;
    const secondRow = rowHeaderButtons[1] as HTMLElement | undefined;

    expect(firstRow).toBeTruthy();
    expect(secondRow).toBeTruthy();

    fireEvent.click(firstRow!);
    fireEvent.click(secondRow!, { shiftKey: true });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('row');
      expect(core.getSnapshot().selection.rows).toEqual([0, 1]);
    });

    fireEvent.contextMenu(secondRow!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-insert-row-below'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe('r1');
      expect(activeSheet?.cells?.A2?.value).toBe('r2');
      expect(activeSheet?.cells?.A3).toBeUndefined();
      expect(activeSheet?.cells?.A4).toBeUndefined();
      expect(activeSheet?.cells?.A5?.value).toBe('r3');
    });
  });

  it('merges the selected range from the shared context menu', async () => {
    const documentModel = createEmptyDocument('contextmenu-merge-cells');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'left',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'right',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cells = container.querySelectorAll('td.ss-cell');
    const firstCell = cells[0] as HTMLElement | undefined;
    const secondCell = cells[1] as HTMLElement | undefined;

    expect(firstCell).toBeTruthy();
    expect(secondCell).toBeTruthy();

    fireEvent.mouseDown(firstCell!, { button: 0 });
    fireEvent.mouseEnter(secondCell!);
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('range');
      expect(core.getSnapshot().selection.range).toMatchObject({
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 1,
      });
    });

    fireEvent.contextMenu(secondCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-merge'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.merges).toContainEqual({
        sheetId,
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 1,
      });
    });
  });

  it('freezes panes from the shared context menu at the selected cell', async () => {
    const documentModel = createEmptyDocument('contextmenu-freeze-panes');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cells = container.querySelectorAll('td.ss-cell');
    const secondRowSecondColCell = cells[6] as HTMLElement | undefined;

    expect(secondRowSecondColCell).toBeTruthy();

    fireEvent.click(secondRowSecondColCell!);
    fireEvent.contextMenu(secondRowSecondColCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-freeze'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.frozen).toEqual({ row: 1, col: 1 });
    });
  });

  it('unfreezes panes from the shared context menu', async () => {
    const documentModel = createEmptyDocument('contextmenu-unfreeze-panes');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({ type: 'spreadsheet:freezePanes', sheetId, row: 1, col: 1 });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-unfreeze'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.frozen).toBeUndefined();
    });
  });

  it('inserts columns to the right using the full selected column count', async () => {
    const documentModel = createEmptyDocument('contextmenu-insert-multi-column-right');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'a',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'b',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'C1', row: 0, col: 2 },
      value: 'c',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const columnHeaders = container.querySelectorAll('th.col-header');
    const firstHeader = columnHeaders[0] as HTMLElement | undefined;
    const secondHeader = columnHeaders[1] as HTMLElement | undefined;

    expect(firstHeader).toBeTruthy();
    expect(secondHeader).toBeTruthy();

    fireEvent.click(firstHeader!);
    fireEvent.click(secondHeader!, { shiftKey: true });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('column');
      expect(core.getSnapshot().selection.columns).toEqual([0, 1]);
    });

    fireEvent.contextMenu(secondHeader!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-insert-column-right'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe('a');
      expect(activeSheet?.cells?.B1?.value).toBe('b');
      expect(activeSheet?.cells?.C1).toBeUndefined();
      expect(activeSheet?.cells?.D1).toBeUndefined();
      expect(activeSheet?.cells?.E1?.value).toBe('c');
    });
  });

  it('deletes columns using the full selected column count', async () => {
    const documentModel = createEmptyDocument('contextmenu-delete-multi-column');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'a',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'b',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'C1', row: 0, col: 2 },
      value: 'c',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'D1', row: 0, col: 3 },
      value: 'd',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const columnHeaders = container.querySelectorAll('th.col-header');
    const secondHeader = columnHeaders[1] as HTMLElement | undefined;
    const thirdHeader = columnHeaders[2] as HTMLElement | undefined;

    expect(secondHeader).toBeTruthy();
    expect(thirdHeader).toBeTruthy();

    fireEvent.click(secondHeader!);
    fireEvent.click(thirdHeader!, { shiftKey: true });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('column');
      expect(core.getSnapshot().selection.columns).toEqual([1, 2]);
    });

    fireEvent.contextMenu(thirdHeader!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-delete-column'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe('a');
      expect(activeSheet?.cells?.B1?.value).toBe('d');
      expect(activeSheet?.cells?.C1).toBeUndefined();
      expect(activeSheet?.cells?.D1).toBeUndefined();
    });
  });

  it('sorts the selected range ascending from the shared context menu', async () => {
    const documentModel = createEmptyDocument('contextmenu-sort-ascending');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'b',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'row-b',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A2', row: 1, col: 0 },
      value: 'a',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B2', row: 1, col: 1 },
      value: 'row-a',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cells = container.querySelectorAll('td.ss-cell');
    const firstCell = cells[0] as HTMLElement | undefined;
    const secondRowFirstCell = cells[5] as HTMLElement | undefined;

    expect(firstCell).toBeTruthy();
    expect(secondRowFirstCell).toBeTruthy();

    fireEvent.mouseDown(firstCell!, { button: 0 });
    fireEvent.mouseEnter(secondRowFirstCell!);
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('range');
    });

    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-sort-asc'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe('a');
      expect(activeSheet?.cells?.B1?.value).toBe('row-a');
      expect(activeSheet?.cells?.A2?.value).toBe('b');
      expect(activeSheet?.cells?.B2?.value).toBe('row-b');
    });
  });

  it('filters rows by the selected cell value from the shared context menu and clears the filter', async () => {
    const documentModel = createEmptyDocument('contextmenu-filter-by-selected-value');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'x',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A2', row: 1, col: 0 },
      value: 'y',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A3', row: 2, col: 0 },
      value: 'x',
    });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-filter-by-value'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.rows?.['1']?.filteredOut).toBe(true);
    });

    await waitFor(() => {
      const rowButtons = Array.from(container.querySelectorAll('.ss-row-header-button')).map(
        (node) => node.textContent,
      );
      expect(rowButtons).toEqual(expect.arrayContaining(['1', '3']));
      expect(rowButtons).not.toContain('2');
    });

    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-clear-filter'));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.rows?.['1']?.filteredOut).toBe(false);
    });
  });

  it('disables merge from the shared context menu for a single-cell selection', async () => {
    const documentModel = createEmptyDocument('contextmenu-disable-merge-single-cell');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    fireEvent.contextMenu(firstCell!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    const mergeItem = screen.getByTestId('spreadsheet-context-merge');
    expect(mergeItem.getAttribute('data-disabled')).not.toBeNull();
  });

  it('disables freeze panes from the shared context menu for whole-sheet selection', async () => {
    const documentModel = createEmptyDocument('contextmenu-disable-freeze-sheet-selection');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const corner = container.querySelector('th.header-corner') as HTMLElement | null;
    expect(corner).toBeTruthy();

    fireEvent.click(corner!);

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('sheet');
    });

    fireEvent.contextMenu(corner!);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    const freezeItem = screen.getByTestId('spreadsheet-context-freeze');
    expect(freezeItem.getAttribute('data-disabled')).not.toBeNull();
  });
});

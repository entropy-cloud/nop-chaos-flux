// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../index.js';
import { SpreadsheetGridHarness } from './spreadsheet-grid-harness.js';

afterEach(() => {
  cleanup();
});

describe('spreadsheet context menu structure commands', () => {
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

    const columnHeaders = container.querySelectorAll('th[data-slot="spreadsheet-column-header"]');
    const firstHeader = columnHeaders[0]?.querySelector('[data-slot="spreadsheet-header-button"]') as HTMLElement | undefined;
    const secondHeader = columnHeaders[1]?.querySelector('[data-slot="spreadsheet-header-button"]') as HTMLElement | undefined;

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

    const columnHeaders = container.querySelectorAll('th[data-slot="spreadsheet-column-header"]');
    const secondHeader = columnHeaders[1]?.querySelector('[data-slot="spreadsheet-header-button"]') as HTMLElement | undefined;
    const thirdHeader = columnHeaders[2]?.querySelector('[data-slot="spreadsheet-header-button"]') as HTMLElement | undefined;

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
});

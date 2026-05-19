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

describe('spreadsheet context menu fill and range commands', () => {
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

  it('keeps the fill handle presentational instead of exposing faux button semantics', async () => {
    const documentModel = createEmptyDocument('fill-handle-presentational');
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
    expect(fillHandle?.getAttribute('aria-hidden')).toBe('true');
    expect(fillHandle?.hasAttribute('role')).toBe(false);
    expect(fillHandle?.hasAttribute('tabindex')).toBe(false);
    expect(screen.queryByRole('button', { name: /fill handle/i })).toBeNull();
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
});

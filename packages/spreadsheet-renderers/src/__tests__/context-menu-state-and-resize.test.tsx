import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../index.js';
import { SpreadsheetGridHarness } from './spreadsheet-grid-harness.js';

afterEach(() => {
  cleanup();
});

describe('spreadsheet context menu state and resize commands', () => {
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

    const corner = container.querySelector('[data-slot="spreadsheet-corner-header"] [data-slot="spreadsheet-header-button"]') as HTMLElement | null;
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

  it('opens row height editing from the shared context menu after keyboard selection normalization', async () => {
    const documentModel = createEmptyDocument('contextmenu-row-height-keyboard');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstRow = container.querySelector('.ss-row-header-button') as HTMLElement | null;
    expect(firstRow).toBeTruthy();

    fireEvent.keyDown(firstRow!, { key: 'ContextMenu' });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('row');
      expect(core.getSnapshot().selection.rows).toEqual([0]);
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-resize-row'));

    const dialog = await screen.findByRole('dialog');
    const input = screen.getByRole('spinbutton', { name: 'Row height' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '48' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.rows?.['0']?.height).toBe(48);
    });

    expect(container.querySelector('[data-slot="spreadsheet-row-resize-handle"]')?.getAttribute('role')).toBeNull();
  });

  it('opens column width editing from the shared context menu and disables it for multi-column selection', async () => {
    const documentModel = createEmptyDocument('contextmenu-column-width-keyboard');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const columnHeaders = container.querySelectorAll('.ss-header-button');
    const firstColumn = columnHeaders[1] as HTMLElement | undefined;
    const secondColumn = columnHeaders[2] as HTMLElement | undefined;
    expect(firstColumn).toBeTruthy();
    expect(secondColumn).toBeTruthy();

    fireEvent.keyDown(firstColumn!, { key: 'ContextMenu' });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('column');
      expect(core.getSnapshot().selection.columns).toEqual([0]);
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('spreadsheet-context-resize-column'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Column width' }), {
      target: { value: '120' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(core.getSnapshot().selection.columns).toEqual([0]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    fireEvent.click(firstColumn!);
    fireEvent.click(secondColumn!, { shiftKey: true });
    fireEvent.contextMenu(secondColumn!);

    await waitFor(() => {
      expect(core.getSnapshot().selection.columns).toEqual([0, 1]);
      expect(document.querySelector('[data-slot="context-menu-content"]')).toBeTruthy();
    });

    expect(screen.getByTestId('spreadsheet-context-resize-column').getAttribute('data-disabled')).not.toBeNull();
    expect(container.querySelector('[data-slot="spreadsheet-column-resize-handle"]')?.getAttribute('role')).toBeNull();
  });

  it('keeps mouse-drag resize on canonical row and column command surfaces', async () => {
    const documentModel = createEmptyDocument('mouse-drag-resize-commands');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const dispatchSpy = vi.spyOn(bridge, 'dispatch');
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const rowHandle = container.querySelector('[data-slot="spreadsheet-row-resize-handle"]') as HTMLElement | null;
    const columnHandle = container.querySelector('[data-slot="spreadsheet-column-resize-handle"]') as HTMLElement | null;
    expect(rowHandle).toBeTruthy();
    expect(columnHandle).toBeTruthy();

    fireEvent.mouseDown(rowHandle!, { clientY: 0, button: 0 });
    fireEvent.mouseMove(window, { clientY: 20, buttons: 1 });
    fireEvent.mouseUp(window);

    fireEvent.mouseDown(columnHandle!, { clientX: 0, button: 0 });
    fireEvent.mouseMove(window, { clientX: 25, buttons: 1 });
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'spreadsheet:resizeRow' }));
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'spreadsheet:resizeColumn' }));
    });
  });
});

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../index.js';
import { SpreadsheetGridHarness } from './spreadsheet-grid-harness.js';

afterEach(() => {
  cleanup();
});

describe('spreadsheet grid editing', () => {
  it('supports keyboard navigation and keyboard entry from the grid root', async () => {
    const documentModel = createEmptyDocument('grid-keyboard-navigation');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();

    grid?.focus();
    fireEvent.keyDown(grid!, { key: 'ArrowRight' });
    fireEvent.keyDown(grid!, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(core.getSnapshot().selection.anchor?.address).toBe('B2');
    });

    fireEvent.keyDown(grid!, { key: 'x' });

    await waitFor(() => {
      expect(container.querySelector('input.ss-cell-edit-input')).toBeTruthy();
      expect((container.querySelector('input.ss-cell-edit-input') as HTMLInputElement).value).toBe(
        'x',
      );
    });
  });

  it('keeps grid keyboard navigation working after a mouse cell selection', async () => {
    const documentModel = createEmptyDocument('grid-click-then-arrow-navigation');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();
    expect(grid).toBeTruthy();

    fireEvent.mouseDown(firstCell!, { button: 0 });
    fireEvent.click(firstCell!);

    await waitFor(() => {
      expect(document.activeElement).toBe(grid);
      expect(core.getSnapshot().selection.anchor?.address).toBe('A1');
    });

    fireEvent.keyDown(grid!, { key: 'ArrowRight' });
    fireEvent.keyDown(grid!, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(core.getSnapshot().selection.anchor?.address).toBe('B2');
    });
  });

  it('starts inline editing from Enter after a mouse cell selection', async () => {
    const documentModel = createEmptyDocument('grid-click-then-enter-editing');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();
    expect(grid).toBeTruthy();

    fireEvent.mouseDown(firstCell!, { button: 0 });
    fireEvent.click(firstCell!);

    await waitFor(() => {
      expect(document.activeElement).toBe(grid);
      expect(core.getSnapshot().selection.anchor?.address).toBe('A1');
    });

    fireEvent.keyDown(grid!, { key: 'Enter' });

    await waitFor(() => {
      expect(container.querySelector('[data-slot="spreadsheet-cell-editor-input"]')).toBeTruthy();
      expect(firstCell?.getAttribute('data-cell-editing')).toBe('true');
    });
  });

  it('keeps the cell editor open when setCellValue dispatch fails', async () => {
    const documentModel = createEmptyDocument('edit-failure-keeps-draft');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    vi.spyOn(bridge, 'dispatch').mockResolvedValueOnce({
      ok: false,
      changed: false,
      error: new Error('save failed'),
    });
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.doubleClick(firstCell!);

    await waitFor(() => {
      expect(container.querySelector('input.ss-cell-edit-input')).toBeTruthy();
    });

    const input = container.querySelector('input.ss-cell-edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'draft' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(container.querySelector('input.ss-cell-edit-input')).toBeTruthy();
      expect((container.querySelector('input.ss-cell-edit-input') as HTMLInputElement).value).toBe(
        'draft',
      );
      expect(screen.getByRole('alert').textContent).toBe('Cell save failed: save failed');
    });
  });

  it('shows an explicit cancelled status when edit-save resolves as cancelled', async () => {
    const documentModel = createEmptyDocument('edit-cancelled-status');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    vi.spyOn(bridge, 'dispatch').mockResolvedValueOnce({
      ok: false,
      changed: false,
      cancelled: true,
    });
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.doubleClick(firstCell!);

    await waitFor(() => {
      expect(container.querySelector('input.ss-cell-edit-input')).toBeTruthy();
    });

    const input = container.querySelector('input.ss-cell-edit-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'draft' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(container.querySelector('input.ss-cell-edit-input')).toBeTruthy();
      expect(screen.getByRole('status').textContent).toBe('Cell save cancelled');
    });
  });

  it('starts inline cell editing from F2 on the active cell', async () => {
    const documentModel = createEmptyDocument('grid-f2-editing');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();
    fireEvent.click(firstCell!);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();
    fireEvent.keyDown(grid!, { key: 'F2' });

    await waitFor(() => {
      expect(container.querySelector('[data-slot="spreadsheet-cell-editor-input"]')).toBeTruthy();
      expect(firstCell?.getAttribute('data-cell-editing')).toBe('true');
    });
  });

  it('uses the dedicated compact inline editor without introducing shared Input sizing attrs', async () => {
    const documentModel = createEmptyDocument('grid-compact-inline-editor');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();
    fireEvent.click(firstCell!);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();
    fireEvent.keyDown(grid!, { key: 'F2' });

    await waitFor(() => {
      const editor = container.querySelector('[data-slot="spreadsheet-cell-editor-input"]') as HTMLInputElement | null;
      expect(editor).toBeTruthy();
      expect(editor?.tagName).toBe('INPUT');
      expect(editor?.getAttribute('data-size')).toBeNull();
      expect(editor?.className).toContain('ss-cell-edit-input');
    });
  });

  it('moves focus into the inline editor so subsequent typing updates the cell draft', async () => {
    const documentModel = createEmptyDocument('grid-inline-editor-focus');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell[data-row="0"][data-col="0"]') as HTMLElement | null;
    expect(firstCell).toBeTruthy();
    fireEvent.click(firstCell!);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();
    fireEvent.keyDown(grid!, { key: 'F2' });

    const editor = await waitFor(() => {
      const next = container.querySelector('[data-slot="spreadsheet-cell-editor-input"]') as HTMLInputElement | null;
      expect(next).toBeTruthy();
      return next as HTMLInputElement;
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(editor);
    });

    fireEvent.change(editor, { target: { value: 'Hello' } });
    expect(editor.value).toBe('Hello');
  });
});

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../index.js';
import { SpreadsheetGridHarness } from './spreadsheet-grid-harness.js';

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('spreadsheet grid selection', () => {
  it('publishes translated header labels and gridcell semantics', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const documentModel = createEmptyDocument('grid-aria-semantics');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    expect(screen.getByLabelText('Select entire sheet')).toBeTruthy();
    expect(screen.getByLabelText('Select column B')).toBeTruthy();
    expect(screen.getByLabelText('Select row 1')).toBeTruthy();

    const firstRow = container.querySelector('tbody tr[role="row"]') as HTMLElement | null;
    const firstCell = container.querySelector('td[role="gridcell"]') as HTMLElement | null;

    expect(firstRow?.getAttribute('aria-rowindex')).toBe('1');
    expect(firstCell?.getAttribute('aria-rowindex')).toBe('1');
    expect(firstCell?.getAttribute('aria-colindex')).toBe('1');
  });

  it('publishes bound field metadata through gridcell accessible names', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const documentModel = createEmptyDocument('grid-bound-cell-accessibility');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);

    render(
      <SpreadsheetGridHarness
        sheetId={sheetId}
        bridge={bridge}
        getCellMetadata={(row, col) =>
          row === 0 && col === 0
            ? {
                field: {
                  sourceId: 'sales',
                  fieldId: 'amount',
                  data: { label: 'Amount' },
                },
              }
            : undefined
        }
      />,
    );

    const boundCell = screen.getByRole('gridcell', { name: 'Cell A1, bound to field Amount' });
    expect(boundCell.getAttribute('data-cell-bound')).toBe('true');
    expect(boundCell.querySelector('[data-slot="spreadsheet-bound-indicator"]')?.textContent).toBe('fx');
  });

  it('updates the spreadsheet viewport contract on scroll', async () => {
    const documentModel = createEmptyDocument('grid-viewport-sync');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const dispatchSpy = vi.spyOn(bridge, 'dispatch');
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();

    Object.defineProperty(grid!, 'scrollTop', { value: 40, writable: true });
    Object.defineProperty(grid!, 'scrollLeft', { value: 24, writable: true });
    Object.defineProperty(grid!, 'clientHeight', { value: 600, writable: true });
    Object.defineProperty(grid!, 'clientWidth', { value: 800, writable: true });
    fireEvent.scroll(grid!);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'spreadsheet:setViewport',
          viewport: expect.objectContaining({ scrollX: 24, scrollY: 40, zoom: 1 }),
        }),
      );
    });
  });

  it('shows range highlight while dragging before mouseup', async () => {
    const documentModel = createEmptyDocument('drag-selection-preview');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cells = container.querySelectorAll('td.ss-cell');
    const firstCell = cells[0] as HTMLElement | undefined;
    const secondRowSecondColCell = cells[6] as HTMLElement | undefined;

    expect(firstCell).toBeTruthy();
    expect(secondRowSecondColCell).toBeTruthy();

    fireEvent.mouseDown(firstCell!, { button: 0 });
    fireEvent.mouseEnter(secondRowSecondColCell!);

    await waitFor(() => {
      expect(container.querySelectorAll('td.ss-cell[data-range-highlight]').length).toBeGreaterThan(
        1,
      );
    });

    fireEvent.mouseUp(window);
  });

  it('selects a column when clicking the column header', async () => {
    const documentModel = createEmptyDocument('column-header-selection');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const columnHeaders = container.querySelectorAll('th[data-slot="spreadsheet-column-header"]');
    const secondHeader = columnHeaders[1]?.querySelector(
      'button[data-slot="spreadsheet-header-button"]',
    ) as HTMLElement | undefined;

    expect(secondHeader).toBeTruthy();
    fireEvent.click(secondHeader!);

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('column');
      expect(core.getSnapshot().selection.columns).toEqual([1]);
    });
  });

  it('keeps column headers in table-cell layout', () => {
    const documentModel = createEmptyDocument('column-header-layout');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstHeader = container.querySelector(
      'th[data-slot="spreadsheet-column-header"]',
    ) as HTMLElement | null;

    expect(firstHeader).toBeTruthy();
    expect(firstHeader!.tagName).toBe('TH');
  });

  it('supports keyboard selection on the corner and column headers', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const documentModel = createEmptyDocument('header-keyboard-selection');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cornerHeader = screen.getByLabelText('Select entire sheet');
    fireEvent.keyDown(cornerHeader, { key: 'Enter' });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('sheet');
    });

    const columnHeader = screen.getByLabelText('Select column B');
    fireEvent.keyDown(columnHeader, { key: ' ' });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('column');
      expect(core.getSnapshot().selection.columns).toEqual([1]);
    });
  });

  it('extends column selection with shift-click on headers', async () => {
    const documentModel = createEmptyDocument('column-header-shift-selection');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const columnHeaders = container.querySelectorAll('th[data-slot="spreadsheet-column-header"]');
    const secondHeader = columnHeaders[1]?.querySelector(
      'button[data-slot="spreadsheet-header-button"]',
    ) as HTMLElement | undefined;
    const fourthHeader = columnHeaders[3]?.querySelector(
      'button[data-slot="spreadsheet-header-button"]',
    ) as HTMLElement | undefined;

    expect(secondHeader).toBeTruthy();
    expect(fourthHeader).toBeTruthy();

    fireEvent.click(secondHeader!);
    fireEvent.click(fourthHeader!, { shiftKey: true });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('column');
      expect(core.getSnapshot().selection.columns).toEqual([1, 3]);
    });
  });

  it('extends row selection with shift-click on row headers', async () => {
    const documentModel = createEmptyDocument('row-header-shift-selection');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const rowHeaderButtons = container.querySelectorAll('.ss-row-header-button');
    const secondRow = rowHeaderButtons[1] as HTMLElement | undefined;
    const fourthRow = rowHeaderButtons[3] as HTMLElement | undefined;

    expect(secondRow).toBeTruthy();
    expect(fourthRow).toBeTruthy();

    fireEvent.click(secondRow!);
    fireEvent.click(fourthRow!, { shiftKey: true });

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('row');
      expect(core.getSnapshot().selection.rows).toEqual([1, 3]);
    });
  });

  it('selects the right-clicked cell before opening a context action path', async () => {
    const documentModel = createEmptyDocument('contextmenu-cell-selection');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cells = container.querySelectorAll('td.ss-cell');
    const firstCell = cells[0] as HTMLElement | undefined;
    const secondRowSecondColCell = cells[6] as HTMLElement | undefined;

    expect(firstCell).toBeTruthy();
    expect(secondRowSecondColCell).toBeTruthy();

    fireEvent.click(firstCell!);

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('cell');
      expect(core.getSnapshot().selection.anchor?.address).toBe('A1');
    });

    fireEvent.contextMenu(secondRowSecondColCell!);

    await waitFor(() => {
      expect(core.getSnapshot().selection.kind).toBe('cell');
      expect(core.getSnapshot().selection.anchor?.address).toBe('B2');
    });
  });
});

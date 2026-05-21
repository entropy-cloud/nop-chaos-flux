// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  spreadsheetRendererDefinitions,
  useSpreadsheetInteractions,
} from '../index.js';
import { SpreadsheetGridHarness } from './spreadsheet-grid-harness.js';
import * as viewportModule from '../spreadsheet-grid/viewport.js';

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

  it('uses header buttons inside semantic header cells', () => {
    const documentModel = createEmptyDocument('header-button-primitives');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const cornerHeader = container.querySelector('th[data-slot="spreadsheet-corner-header"]');
    const columnHeader = container.querySelector('th[data-slot="spreadsheet-column-header"]');
    const rowHeader = container.querySelector('[data-slot="spreadsheet-row-header"]');

    expect(cornerHeader?.querySelector('button[data-slot="spreadsheet-header-button"]')).toBeTruthy();
    expect(columnHeader?.querySelector('button[data-slot="spreadsheet-header-button"]')).toBeTruthy();
    expect(rowHeader?.querySelector('button[data-slot="spreadsheet-header-button"]')).toBeTruthy();
  });

  it('commits column resize to spreadsheet core state on mouseup', async () => {
    const documentModel = createEmptyDocument('column-resize-commit');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const handle = container.querySelector(
      '[data-slot="spreadsheet-column-resize-handle"]',
    ) as HTMLElement | null;
    expect(handle).toBeTruthy();

    fireEvent.mouseDown(handle!, { clientX: 100, button: 0 });
    fireEvent.mouseMove(window, { clientX: 150, buttons: 1 });

    await waitFor(() => {
      const headerCell = container.querySelector(
        'th[data-slot="spreadsheet-column-header"]',
      ) as HTMLElement | null;
      expect(headerCell?.style.width).toBe('130px');
    });

    fireEvent.mouseUp(window);

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.columns?.['0']?.width).toBe(130);
    });
  });

  it('commits row resize to spreadsheet core state on mouseup', async () => {
    const documentModel = createEmptyDocument('row-resize-commit');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const handle = container.querySelector(
      '[data-slot="spreadsheet-row-resize-handle"]',
    ) as HTMLElement | null;
    expect(handle).toBeTruthy();

    fireEvent.mouseDown(handle!, { clientY: 100, button: 0 });
    fireEvent.mouseMove(window, { clientY: 120, buttons: 1 });

    await waitFor(() => {
      const firstRow = container.querySelector('tbody tr') as HTMLElement | null;
      expect(firstRow?.style.height).toBe('44px');
    });

    fireEvent.mouseUp(window);

    await waitFor(() => {
      const activeSheet = core
        .getSnapshot()
        .document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.rows?.['0']?.height).toBe(44);
    });
  });

  it('resyncs toolbar draft cell values from the selected live cell', async () => {
    const documentModel = createEmptyDocument('toolbar-cell-value-sync');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'first',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B2', row: 1, col: 1 },
      value: 'second',
    });

    const bridge = createSpreadsheetBridge(core);

    function Probe() {
      const interactions = useSpreadsheetInteractions({
        bridge,
        sheetId,
        rows: 5,
        cols: 5,
      });

      return (
        <div>
          <button type="button" onClick={() => interactions.handleCellClick(0, 0)}>
            Select A1
          </button>
          <button type="button" onClick={() => interactions.handleCellClick(1, 1)}>
            Select B2
          </button>
          <div data-testid="cell-value">{interactions.cellValue}</div>
        </div>
      );
    }

    render(<Probe />);

    fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(document.querySelector('[data-testid="cell-value"]')?.textContent).toBe('first'));

    fireEvent.click(document.querySelectorAll('button')[1] as HTMLButtonElement);
    await waitFor(() => expect(document.querySelector('[data-testid="cell-value"]')?.textContent).toBe('second'));
  });

  it('exposes domain host metadata on the registered spreadsheet page renderer', () => {
    const definition = spreadsheetRendererDefinitions.find(
      (candidate) => candidate.type === 'spreadsheet-page',
    );

    expect(definition?.rendererClass).toBe('domain-host-renderer');
    expect(definition?.rendererTraits).toEqual(
      expect.arrayContaining(['workbench-shell', 'builder-facing']),
    );
    expect(definition?.propContracts?.document?.required).toBe(true);
  });

  it('records selection dispatch failures instead of dropping them silently', async () => {
    const documentModel = createEmptyDocument('selection-failure-log');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const dispatchSpy = vi.spyOn(bridge, 'dispatch').mockRejectedValueOnce(new Error('select failed'));
    const logs: string[] = [];

    function Probe() {
      const interactions = useSpreadsheetInteractions({
        bridge,
        sheetId,
        rows: 5,
        cols: 5,
        onLog: (message: string) => logs.push(message),
      });

      return (
        <button type="button" onClick={() => interactions.handleSelectAll()}>
          Select all
        </button>
      );
    }

    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
      expect(logs).toContain('Selection failed: select failed');
    });
  });

  it('only points aria-activedescendant at mounted virtual cells', async () => {
    const documentModel = createEmptyDocument('aria-activedescendant-mounted-cell');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    fireEvent.click(container.querySelector('td.ss-cell') as HTMLElement);

    await waitFor(() => {
      expect(grid.getAttribute('aria-activedescendant')).toBe('spreadsheet-cell-A1');
    });
  });

  it('logs edit-save failures before selecting a different cell', async () => {
    const documentModel = createEmptyDocument('selection-save-failure-log');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const originalDispatch = bridge.dispatch.bind(bridge);
    const dispatchSpy = vi.spyOn(bridge, 'dispatch').mockImplementation((action) => {
      if (action.type === 'spreadsheet:setCellValue') {
        return Promise.reject(new Error('save failed'));
      }

      return originalDispatch(action);
    });
    const logs: string[] = [];

    function Probe() {
      const interactions = useSpreadsheetInteractions({
        bridge,
        sheetId,
        rows: 5,
        cols: 5,
        onLog: (message: string) => logs.push(message),
      });

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              interactions.handleCellDoubleClick(0, 0);
              interactions.handleEditValueChange('draft');
            }}
          >
            Edit A1
          </button>
          <button type="button" onClick={() => interactions.handleCellClick(1, 1)}>
            Select B2
          </button>
        </div>
      );
    }

    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit A1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select B2' }));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'spreadsheet:setCellValue' }),
      );
      expect(logs).toContain('Cell save failed: save failed');
      expect(core.getSnapshot().selection.anchor?.address).toBe('B2');
    });
  });

  it('does not rebuild viewport offsets on ordinary scroll renders', async () => {
    const documentModel = createEmptyDocument('viewport-offset-cache');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const offsetsSpy = vi.spyOn(viewportModule, 'buildSpreadsheetGridOffsets');
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();

    if (grid) {
      Object.defineProperty(grid, 'clientHeight', { value: 240, configurable: true });
      Object.defineProperty(grid, 'clientWidth', { value: 320, configurable: true });
      fireEvent.scroll(grid);
    }

    await waitFor(() => {
      expect(offsetsSpy.mock.calls.length).toBeGreaterThan(0);
    });

    const callsAfterMeasure = offsetsSpy.mock.calls.length;

    if (grid) {
      Object.defineProperty(grid, 'scrollTop', { value: 120, configurable: true, writable: true });
      Object.defineProperty(grid, 'scrollLeft', { value: 40, configurable: true, writable: true });
      fireEvent.scroll(grid);
    }

    expect(offsetsSpy.mock.calls.length).toBe(callsAfterMeasure);
  });
});

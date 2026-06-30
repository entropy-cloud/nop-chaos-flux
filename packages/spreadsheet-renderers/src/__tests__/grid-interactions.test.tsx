import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});

describe('spreadsheet grid interactions', () => {
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

  it('syncs DOM scroll position from runtime viewport updates', async () => {
    const documentModel = createEmptyDocument('runtime-viewport-sync');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const grid = container.querySelector('[role="grid"]') as HTMLElement | null;
    expect(grid).toBeTruthy();

    if (!grid) {
      return;
    }

    Object.defineProperty(grid, 'scrollTop', { value: 0, configurable: true, writable: true });
    Object.defineProperty(grid, 'scrollLeft', { value: 0, configurable: true, writable: true });

    await act(async () => {
      await core.dispatch({
        type: 'spreadsheet:setViewport',
        viewport: { scrollX: 56, scrollY: 132, zoom: 1 },
      });
    });

    await waitFor(() => {
      expect(grid.scrollTop).toBe(132);
      expect(grid.scrollLeft).toBe(56);
    });
  });
});

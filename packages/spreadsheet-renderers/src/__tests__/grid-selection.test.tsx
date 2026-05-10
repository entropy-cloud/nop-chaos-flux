// @vitest-environment jsdom
import React from 'react';
 import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  SpreadsheetGrid,
  spreadsheetRendererDefinitions,
  useSpreadsheetInteractions,
} from '../index.js';

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

describe('spreadsheet grid selection', () => {
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
    const secondHeader = columnHeaders[1] as HTMLElement | undefined;

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
    expect(window.getComputedStyle(firstHeader!).display).toBe('table-cell');
  });

  it('supports keyboard selection on the corner and column headers', async () => {
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
    const secondHeader = columnHeaders[1] as HTMLElement | undefined;
    const fourthHeader = columnHeaders[3] as HTMLElement | undefined;

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
      const header = screen.getByLabelText('Select column A');
      expect((header as HTMLElement).style.width).toBe('130px');
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
        onLog: (message) => logs.push(message),
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
        onLog: (message) => logs.push(message),
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
});

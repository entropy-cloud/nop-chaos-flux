// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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

    const columnHeaders = container.querySelectorAll('th.col-header');
    const secondHeader = columnHeaders[1] as HTMLElement | undefined;

    expect(secondHeader).toBeTruthy();
    fireEvent.click(secondHeader!);

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

    const columnHeaders = container.querySelectorAll('th.col-header');
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
});

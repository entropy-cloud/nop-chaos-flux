// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, useScopeSelector } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  defineSpreadsheetPageSchema,
  registerSpreadsheetRenderers,
  SpreadsheetGrid,
  useSpreadsheetInteractions,
} from './index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Action')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function A1ValueProbe() {
  const a1Value = useScopeSelector((data: any) => {
    const activeSheet = data.spreadsheet?.activeSheet;
    return activeSheet?.cells?.A1?.value;
  });
  return <span data-testid="a1-value">{a1Value == null ? '' : String(a1Value)}</span>;
}

const a1ProbeRenderer: RendererDefinition = {
  type: 'a1-value-probe',
  component: A1ValueProbe,
};

function ReadOnlyProbe() {
  const isReadOnly = useScopeSelector((data: any) => data.spreadsheet?.runtime?.readonly);
  return <span data-testid="read-only-value">{String(Boolean(isReadOnly))}</span>;
}

const readOnlyProbeRenderer: RendererDefinition = {
  type: 'read-only-probe',
  component: ReadOnlyProbe,
};

function TopLevelReadOnlyProbe() {
  const isReadOnly = useScopeSelector((data: any) => data.runtime?.readonly);
  return <span data-testid="top-level-read-only-value">{String(Boolean(isReadOnly))}</span>;
}

const topLevelReadOnlyProbeRenderer: RendererDefinition = {
  type: 'top-level-read-only-probe',
  component: TopLevelReadOnlyProbe,
};

function TopLevelA1ValueProbe() {
  const a1Value = useScopeSelector((data: any) => data.activeSheet?.cells?.A1?.value);
  return <span data-testid="top-level-a1-value">{a1Value == null ? '' : String(a1Value)}</span>;
}

const topLevelA1ProbeRenderer: RendererDefinition = {
  type: 'top-level-a1-probe',
  component: TopLevelA1ValueProbe,
};

function SpreadsheetStatusProbe() {
  const status = useScopeSelector((data: any) => data.spreadsheetStatus);
  return <span data-testid="spreadsheet-status">{status ? `${status.kind}:${status.readonly}:${status.canUndo}` : ''}</span>;
}

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body']
};

function SpreadsheetGridHarness(props: { sheetId: string; bridge: ReturnType<typeof createSpreadsheetBridge> }) {
  const interactions = useSpreadsheetInteractions({ bridge: props.bridge, sheetId: props.sheetId, rows: 5, cols: 5 });

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

describe('spreadsheet-page namespaced actions integration', () => {
  it('updates cell value via spreadsheet namespaced action', async () => {
    const document = createEmptyDocument('integration-spreadsheet');
    const sheetId = document.workbook.sheets[0].id;
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document,
      toolbar: [
        {
          type: 'action-button',
          label: 'Set A1',
          onClick: {
            action: 'spreadsheet:setCellValue',
            args: {
              cell: {
                sheetId,
                address: 'A1',
                row: 0,
                col: 0,
              },
              value: '42',
            },
          },
        },
        {
          type: 'a1-value-probe',
        },
        {
          type: 'top-level-a1-probe',
        },
      ],
    });

    const registry = createDefaultRegistry([actionButtonRenderer, a1ProbeRenderer, topLevelA1ProbeRenderer]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set A1' }));

    await waitFor(() => {
      expect(screen.getByTestId('a1-value').textContent).toBe('42');
      expect(screen.getByTestId('top-level-a1-value').textContent).toBe('42');
    });
  });

  it('passes readOnly schema prop into the spreadsheet runtime', async () => {
    const document = createEmptyDocument('read-only-spreadsheet');
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document,
      readOnly: true,
      body: [
        {
          type: 'read-only-probe',
        },
        {
          type: 'top-level-read-only-probe',
        },
      ],
    });

    const registry = createDefaultRegistry([
      actionButtonRenderer,
      a1ProbeRenderer,
      readOnlyProbeRenderer,
      topLevelReadOnlyProbeRenderer,
    ]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('read-only-value').textContent).toBe('true');
      expect(screen.getByTestId('top-level-read-only-value').textContent).toBe('true');
    });
  });

  it('publishes spreadsheet host status through statusPath', async () => {
    const sheetDocument = createEmptyDocument('status-spreadsheet');
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document: sheetDocument,
      statusPath: 'spreadsheetStatus',
      body: [
        {
          type: 'read-only-probe',
        },
        {
          type: 'a1-value-probe',
        },
      ],
      toolbar: [
        {
          type: 'action-button',
          label: 'noop',
          onClick: {
            action: 'showToast',
            args: {
              message: 'noop'
            }
          }
        }
      ]
    });

    const statusProbeRenderer: RendererDefinition = {
      type: 'spreadsheet-status-probe',
      component: SpreadsheetStatusProbe
    };

    const registry = createDefaultRegistry([
      pageRenderer,
      actionButtonRenderer,
      a1ProbeRenderer,
      readOnlyProbeRenderer,
      topLevelReadOnlyProbeRenderer,
      topLevelA1ProbeRenderer,
      statusProbeRenderer,
    ]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration"
        schema={{ type: 'page', body: [schema, { type: 'spreadsheet-status-probe' }] } as any}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('spreadsheet-status').textContent).toContain('spreadsheet:false');
    });

    expect(document.querySelector('.nop-spreadsheet-page')).toBeTruthy();
    expect(document.querySelector('[data-slot="spreadsheet-page-header"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="spreadsheet-page-body"]')).toBeTruthy();
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
      expect(container.querySelectorAll('td.ss-cell[data-range-highlight]').length).toBeGreaterThan(1);
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
      const activeSheet = core.getSnapshot().document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBeUndefined();
    });
  });

  it('double-clicks the fill handle to auto-fill downward using adjacent data extent', async () => {
    const documentModel = createEmptyDocument('double-click-fill-handle');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 1 });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'B1', row: 0, col: 1 }, value: 'x' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'B2', row: 1, col: 1 }, value: 'x' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'B3', row: 2, col: 1 }, value: 'x' });
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
      const activeSheet = core.getSnapshot().document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe(1);
      expect(activeSheet?.cells?.A2?.value).toBe(2);
      expect(activeSheet?.cells?.A3?.value).toBe(3);
    });
  });

  it('does not auto-fill on fill-handle double-click when no adjacent data extent exists', async () => {
    const documentModel = createEmptyDocument('double-click-fill-handle-no-adjacent-data');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 1 });
    const bridge = createSpreadsheetBridge(core);
    const { container } = render(<SpreadsheetGridHarness sheetId={sheetId} bridge={bridge} />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);

    const fillHandle = container.querySelector('.ss-fill-handle') as HTMLElement | null;
    expect(fillHandle).toBeTruthy();
    fireEvent.doubleClick(fillHandle!);

    await waitFor(() => {
      const activeSheet = core.getSnapshot().document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A2).toBeUndefined();
      expect(activeSheet?.cells?.A3).toBeUndefined();
    });
  });

  it('inserts a row below from the shared context menu using Excel-style directional semantics', async () => {
    const documentModel = createEmptyDocument('contextmenu-insert-row-below');
    const core = createSpreadsheetCore({ document: documentModel });
    const sheetId = core.getSnapshot().activeSheetId;
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'top' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A2', row: 1, col: 0 }, value: 'second' });
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
      const activeSheet = core.getSnapshot().document.workbook.sheets.find((sheet) => sheet.id === sheetId);
      expect(activeSheet?.cells?.A1?.value).toBe('top');
      expect(activeSheet?.cells?.A2).toBeUndefined();
      expect(activeSheet?.cells?.A3?.value).toBe('second');
    });
  });
});

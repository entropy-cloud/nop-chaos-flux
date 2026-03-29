import { describe, it, expect, beforeEach } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-runtime';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
} from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  deriveHostSnapshot,
  registerSpreadsheetRenderers,
  type SpreadsheetBridge,
} from './index.js';

describe('deriveHostSnapshot', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should derive host snapshot with workbook', () => {
    const runtime = core.getSnapshot();
    const host = deriveHostSnapshot(runtime);

    expect(host.workbook).toBe(runtime.document.workbook);
    expect(host.activeSheet).toBe(runtime.document.workbook.sheets[0]);
    expect(host.selection.kind).toBe('none');
    expect(host.activeCell).toBeUndefined();
    expect(host.activeRange).toBeUndefined();
    expect(host.runtime.readonly).toBe(false);
    expect(host.runtime.dirty).toBe(false);
    expect(host.runtime.zoom).toBe(1);
  });

  it('should derive activeCell from cell selection', async () => {
    await core.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'cell',
        sheetId,
        anchor: { sheetId, address: 'B3', row: 2, col: 1 },
      },
    });

    const runtime = core.getSnapshot();
    const host = deriveHostSnapshot(runtime);

    expect(host.activeCell).toEqual({
      sheetId,
      address: 'B3',
      row: 2,
      col: 1,
    });
    expect(host.activeRange).toBeUndefined();
  });

  it('should derive activeRange from range selection', async () => {
    await core.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'range',
        sheetId,
        range: { sheetId, startRow: 0, startCol: 0, endRow: 2, endCol: 3 },
      },
    });

    const runtime = core.getSnapshot();
    const host = deriveHostSnapshot(runtime);

    expect(host.activeRange).toEqual({
      sheetId,
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 3,
    });
    expect(host.activeCell).toBeUndefined();
  });

  it('should reflect undo/redo state', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'test',
    });

    const host = deriveHostSnapshot(core.getSnapshot());
    expect(host.runtime.canUndo).toBe(true);
    expect(host.runtime.canRedo).toBe(false);
  });

  it('should reflect dirty state', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'dirty',
    });

    const host = deriveHostSnapshot(core.getSnapshot());
    expect(host.runtime.dirty).toBe(true);
  });

  it('should reflect readonly state', () => {
    const roCore = createSpreadsheetCore({
      document: createEmptyDocument(),
      readonly: true,
    });
    const host = deriveHostSnapshot(roCore.getSnapshot());
    expect(host.runtime.readonly).toBe(true);
  });

  it('should handle activeSheet lookup', async () => {
    await core.dispatch({ type: 'spreadsheet:addSheet', name: 'Data' });
    const dataSheet = core.getSnapshot().document.workbook.sheets[1];
    await core.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: dataSheet.id });

    const host = deriveHostSnapshot(core.getSnapshot());
    expect(host.activeSheet?.id).toBe(dataSheet.id);
    expect(host.activeSheet?.name).toBe('Data');
  });
});

describe('createSpreadsheetBridge', () => {
  let core: SpreadsheetCore;
  let bridge: SpreadsheetBridge;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
    bridge = createSpreadsheetBridge(core);
  });

  it('should get snapshot from bridge', () => {
    const snap = bridge.getSnapshot();
    expect(snap.workbook).toBeDefined();
    expect(snap.selection.kind).toBe('none');
    expect(snap.runtime.readonly).toBe(false);
  });

  it('should dispatch commands through bridge', async () => {
    const result = await bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Bridge Test',
    });

    expect(result.ok).toBe(true);
    const snap = bridge.getSnapshot();
    const cells = snap.activeSheet?.cells;
    expect(cells?.['A1']?.value).toBe('Bridge Test');
  });

  it('should subscribe to changes through bridge', async () => {
    let notified = false;
    bridge.subscribe(() => { notified = true; });

    await bridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'notify',
    });

    expect(notified).toBe(true);
  });

  it('should expose underlying core', () => {
    expect(bridge.getCore()).toBe(core);
  });

  it('should reflect selection changes', async () => {
    await bridge.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'cell',
        sheetId,
        anchor: { sheetId, address: 'C5', row: 4, col: 2 },
      },
    });

    const snap = bridge.getSnapshot();
    expect(snap.activeCell?.address).toBe('C5');
  });

  it('should return correct host snapshot for row selection', async () => {
    await bridge.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'row',
        sheetId,
        rows: [0, 1, 2],
      },
    });

    const snap = bridge.getSnapshot();
    expect(snap.selection.kind).toBe('row');
    expect(snap.activeCell).toBeUndefined();
    expect(snap.activeRange).toBeUndefined();
  });

  it('should return correct host snapshot for column selection', async () => {
    await bridge.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'column',
        sheetId,
        columns: [0, 1],
      },
    });

    const snap = bridge.getSnapshot();
    expect(snap.selection.kind).toBe('column');
  });
});

describe('registerSpreadsheetRenderers', () => {
  it('registers spreadsheet-page renderer definition', () => {
    const registry = createRendererRegistry([]);

    registerSpreadsheetRenderers(registry);

    const definition = registry.get('spreadsheet-page');
    expect(definition).toBeDefined();
    expect(definition?.regions).toEqual(['toolbar', 'body', 'dialogs']);
  });
});


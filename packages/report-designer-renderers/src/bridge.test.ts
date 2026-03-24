import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
} from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  type SpreadsheetBridge,
} from '@nop-chaos/spreadsheet-renderers';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCore,
  type ReportDesignerConfig,
} from '@nop-chaos/report-designer-core';
import {
  createReportDesignerBridge,
  createEventEmitter,
  deriveDesignerHostSnapshot,
  type ReportDesignerBridge,
  type ReportDesignerEvent,
} from './index.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

describe('createEventEmitter', () => {
  it('should emit events to registered handlers', () => {
    const emitter = createEventEmitter();
    const events: ReportDesignerEvent[] = [];

    emitter.on((event) => events.push(event));

    emitter.emit({
      type: 'report-designer:fieldDragStart',
      payload: { active: true },
    });

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('report-designer:fieldDragStart');
  });

  it('should allow unsubscribing', () => {
    const emitter = createEventEmitter();
    let count = 0;

    const unsub = emitter.on(() => { count++; });
    emitter.emit({ type: 'report-designer:fieldDragStart', payload: { active: true } });
    unsub();
    emitter.emit({ type: 'report-designer:fieldDragEnd', payload: { active: false } });

    expect(count).toBe(1);
  });

  it('should notify multiple handlers', () => {
    const emitter = createEventEmitter();
    let count1 = 0;
    let count2 = 0;

    emitter.on(() => { count1++; });
    emitter.on(() => { count2++; });

    emitter.emit({ type: 'report-designer:previewStarted', payload: { mode: 'inline' } });

    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });
});

describe('deriveDesignerHostSnapshot', () => {
  let spreadsheetCore: SpreadsheetCore;
  let designerCore: ReportDesignerCore;
  let spreadsheetBridge: SpreadsheetBridge;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    spreadsheetCore = createSpreadsheetCore({ document: spreadsheetDoc });
    const reportDoc = createReportTemplateDocument(spreadsheetDoc);
    designerCore = createReportDesignerCore({
      document: reportDoc,
      config: defaultConfig,
    });
    spreadsheetBridge = createSpreadsheetBridge(spreadsheetCore);
  });

  it('should derive host snapshot with designer info', () => {
    const spreadsheet = spreadsheetBridge.getSnapshot();
    const designer = designerCore.getSnapshot();
    const host = deriveDesignerHostSnapshot(spreadsheet, designer);

    expect(host.workbook).toBeDefined();
    expect(host.designer.kind).toBe('report-template');
    expect(host.designer.dirty).toBe(false);
    expect(host.designer.inspector.open).toBe(false);
    expect(host.fieldSources).toEqual([]);
    expect(host.fieldDrag.active).toBe(false);
    expect(host.preview.running).toBe(false);
  });

  it('should include active metadata', async () => {
    await designerCore.dispatch({
      type: 'report-designer:openInspector',
      target: { kind: 'workbook' },
    });
    await designerCore.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'Sales' },
    });

    const spreadsheet = spreadsheetBridge.getSnapshot();
    const designer = designerCore.getSnapshot();
    const host = deriveDesignerHostSnapshot(spreadsheet, designer);

    expect(host.meta).toEqual({ title: 'Sales' });
  });

  it('should reflect spreadsheet dirty flag in designer snapshot', async () => {
    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: spreadsheetCore.getSnapshot().activeSheetId, address: 'A1', row: 0, col: 0 },
      value: 'changed',
    });

    const spreadsheet = spreadsheetBridge.getSnapshot();
    const designer = designerCore.getSnapshot();
    const host = deriveDesignerHostSnapshot(spreadsheet, designer);

    expect(host.runtime.dirty).toBe(true);
    expect(host.designer.dirty).toBe(true);
  });
});

describe('createReportDesignerBridge', () => {
  let spreadsheetCore: SpreadsheetCore;
  let designerCore: ReportDesignerCore;
  let spreadsheetBridge: SpreadsheetBridge;
  let designerBridge: ReportDesignerBridge;
  let sheetId: string;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    sheetId = spreadsheetDoc.workbook.sheets[0].id;
    spreadsheetCore = createSpreadsheetCore({ document: spreadsheetDoc });
    const reportDoc = createReportTemplateDocument(spreadsheetDoc);
    designerCore = createReportDesignerCore({
      document: reportDoc,
      config: defaultConfig,
    });
    spreadsheetBridge = createSpreadsheetBridge(spreadsheetCore);
    designerBridge = createReportDesignerBridge(spreadsheetBridge, designerCore);
  });

  it('should get designer snapshot', () => {
    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.workbook).toBeDefined();
    expect(snap.designer.kind).toBe('report-template');
  });

  it('should dispatch spreadsheet commands', async () => {
    const result = await designerBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Hello',
    });

    expect(result.ok).toBe(true);
    const snap = designerBridge.getSnapshot();
    expect(snap.activeSheet?.cells?.['A1']?.value).toBe('Hello');
  });

  it('should dispatch designer commands', async () => {
    const result = await designerBridge.dispatchDesigner({
      type: 'report-designer:openInspector',
      target: { kind: 'cell', cell: { sheetId, address: 'A1', row: 0, col: 0 } },
    });

    expect(result.ok).toBe(true);
    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.designer.inspector.open).toBe(true);
  });

  it('should subscribe to changes', async () => {
    let notified = false;
    designerBridge.subscribe(() => { notified = true; });

    await designerBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'notify',
    });

    expect(notified).toBe(true);
  });

  it('should expose underlying cores', () => {
    expect(designerBridge.getCore()).toBe(spreadsheetCore);
    expect(designerBridge.getDesignerCore()).toBe(designerCore);
  });

  it('should update designer snapshot after metadata change', async () => {
    await designerBridge.dispatchDesigner({
      type: 'report-designer:openInspector',
      target: { kind: 'workbook' },
    });
    await designerBridge.dispatchDesigner({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { version: '2.0' },
    });

    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.meta).toEqual({ version: '2.0' });
  });

  it('should track field drag state', async () => {
    await designerBridge.dispatchDesigner({
      type: 'report-designer:dropFieldToTarget',
      field: {
        type: 'field',
        sourceId: 'ds1',
        fieldId: 'amount',
        data: { label: 'Amount' },
      },
      target: {
        kind: 'cell',
        cell: { sheetId, address: 'B2', row: 1, col: 1 },
      },
    });

    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.fieldDrag.active).toBe(false);
  });

  it('should track preview state', async () => {
    await designerBridge.dispatchDesigner({
      type: 'report-designer:preview',
      mode: 'inline',
    });

    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.preview.running).toBe(false);
  });

  it('should return inspector state in designer snapshot', async () => {
    await designerBridge.dispatchDesigner({
      type: 'report-designer:openInspector',
      target: { kind: 'sheet', sheetId },
    });

    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.designer.inspector.open).toBe(true);
  });

  it('should include inspector panels in designer snapshot', () => {
    const snap = designerBridge.getDesignerSnapshot();
    expect(snap.inspectorPanels).toEqual([]);
  });
});

import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createEmptyAdapterRegistry } from '../adapters.js';
import {
  dispatchReportDesignerCommand,
  type DispatchContext,
  type ReportDesignerInternalState,
} from '../core-dispatch.js';
import { UndoCommandStack } from '@nop-chaos/editor-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCommandResult,
  type ReportDesignerConfig,
  type ReportDesignerCore,
  type ReportDesignerRuntimeSnapshot,
  type ReportTemplateDocument,
} from '../index.js';

/**
 * plan 598 (CX-18) Phase 1 characterization pin: undo/redo 7-step
 * rebuild-opposite-entry shape, report face. The shared skeleton absorbed by
 * the G3 editor-core helper: peek → empty early-return → pop → rebuild
 * opposite entry {forward/inverse: operation-time currentDocument, opposite:
 * restored, timestamp: Date.now()} → return restored. Call sites keep their
 * divergent steps: functional setState + spreadsheetSyncSource reset + await
 * ctx.refreshDerivedState().
 *
 * Drift scenario: a hand-applied document drift between undo and redo (no
 * stack push — the dispatch-level equivalent of transaction-open drift) must
 * surface in the rebuilt entry: redo restores the UNDO-TIMEPOINT document.
 */

const defaultConfig: ReportDesignerConfig = { kind: 'report-template' };

function reportWithCellValue(value: unknown): ReportTemplateDocument {
  const doc = createReportTemplateDocument(createEmptyDocument('cx18-report-undo-sheet'), 'cx18 undo pin');
  const sheet = doc.spreadsheet.workbook.sheets[0];
  sheet.cells = { A1: { address: 'A1', row: 0, col: 0, value } };
  return doc;
}

describe('report undo/redo 7-step shape pin — public core API (plan 598 G3)', () => {
  let core: ReportDesignerCore;

  beforeAll(() => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  beforeEach(() => {
    core = createReportDesignerCore({
      document: reportWithCellValue('base'),
      config: defaultConfig,
    });
  });

  it('empty-stack undo/redo: peek-empty early-return with per-domain i18n error text', async () => {
    const undoResult = await core.dispatch({ type: 'report-designer:undo' });
    expect(undoResult).toEqual({ ok: false, changed: false, error: 'Nothing to undo' });

    const redoResult = await core.dispatch({ type: 'report-designer:redo' });
    expect(redoResult).toEqual({ ok: false, changed: false, error: 'Nothing to redo' });

    expect(core.getSnapshot().canUndo).toBe(false);
    expect(core.getSnapshot().canRedo).toBe(false);
  });

  it('mutation → undo → redo restores the pre-mutation document reference', async () => {
    const preMutationDocument = core.getSnapshot().document;
    await core.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'edited' },
    });
    expect(core.getSnapshot().canUndo).toBe(true);
    expect(core.getSnapshot().canRedo).toBe(false);
    expect(core.getSnapshot().dirty).toBe(true);

    const undo = await core.dispatch({ type: 'report-designer:undo' });
    expect(undo).toEqual({ ok: true, changed: true });
    expect(core.getSnapshot().document).toBe(preMutationDocument);
    expect(core.getSnapshot().canUndo).toBe(false);
    expect(core.getSnapshot().canRedo).toBe(true);

    const redo = await core.dispatch({ type: 'report-designer:redo' });
    expect(redo).toEqual({ ok: true, changed: true });
    expect(core.getSnapshot().canUndo).toBe(true);
    expect(core.getSnapshot().canRedo).toBe(false);
  });

  it('undo/redo clear spreadsheetSyncSource (report-only divergent step)', async () => {
    await core.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'edited' },
    });
    const driftedSpreadsheet = reportWithCellValue('host-drift').spreadsheet;
    core.syncSpreadsheetDocument(driftedSpreadsheet);
    expect(core.getSnapshot().spreadsheetSyncSource).toBe(driftedSpreadsheet);

    await core.dispatch({ type: 'report-designer:undo' });
    expect(core.getSnapshot().spreadsheetSyncSource).toBeUndefined();

    // Redo restores the undo-timepoint document and clears the source again.
    // (No re-sync here: a sync pushes a fresh entry and truncates the redo
    // chain by design.)
    await core.dispatch({ type: 'report-designer:redo' });
    expect(core.getSnapshot().spreadsheetSyncSource).toBeUndefined();
  });
});

describe('report undo/redo 7-step shape pin — dispatch-level rebuilt-entry fields (plan 598 G3)', () => {
  let refreshCalls: number;

  function buildHarness(document: ReportTemplateDocument) {
    refreshCalls = 0;
    const store = createStore<ReportDesignerInternalState>(() => ({
      document,
      savedDocument: document,
      selectionTarget: undefined,
      inspector: { open: false, loading: false },
      fieldSources: [],
      fieldDrag: { active: false },
      preview: { running: false },
      readonly: false,
      undo: new UndoCommandStack<ReportTemplateDocument>(),
    }));

    const ctx: DispatchContext = {
      store,
      registry: createEmptyAdapterRegistry(),
      config: defaultConfig,
      profile: undefined,
      allowedFieldDropIds: undefined,
      buildSnapshot: () => ({}) as unknown as ReportDesignerRuntimeSnapshot,
      refreshDerivedState: () => {
        refreshCalls += 1;
        return Promise.resolve();
      },
      setSelectionTarget: () => Promise.resolve(),
      pushUndoEntry: (current) => {
        current.undo.push({
          forward: current.document,
          inverse: current.document,
          timestamp: Date.now(),
        });
        return {};
      },
      startPreviewRun: () => ({ requestId: 0, signal: new AbortController().signal }),
      cancelPreviewRun: () => undefined,
      isCurrentPreviewRun: () => false,
    };
    return { store, ctx };
  }

  async function dispatchUndo(ctx: DispatchContext): Promise<ReportDesignerCommandResult> {
    return dispatchReportDesignerCommand(ctx, { type: 'report-designer:undo' });
  }

  async function dispatchRedo(ctx: DispatchContext): Promise<ReportDesignerCommandResult> {
    return dispatchReportDesignerCommand(ctx, { type: 'report-designer:redo' });
  }

  it('undo rebuilds the redo entry from the operation-time document (exact entry fields)', async () => {
    const doc0 = reportWithCellValue('base');
    const doc1 = reportWithCellValue('edited');
    const { store, ctx } = buildHarness(doc1);

    // Simulate the committed mutation D0 → D1: entry pushed, document = D1.
    store.getState().undo.push({ forward: doc1, inverse: doc0, timestamp: 1 });

    const before = Date.now();
    const result = await dispatchUndo(ctx);
    const after = Date.now();

    expect(result).toEqual({ ok: true, changed: true });
    expect(store.getState().document).toBe(doc0);
    expect(refreshCalls).toBe(1);

    // Rebuilt redo entry: forward = undo-timepoint current document (doc1),
    // inverse = restored document (doc0) — NOT the original entry moved as-is.
    const redoEntries = store.getState().undo.listRedo();
    expect(redoEntries).toHaveLength(1);
    expect(redoEntries[0].forward).toBe(doc1);
    expect(redoEntries[0].inverse).toBe(doc0);
    expect(redoEntries[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(redoEntries[0].timestamp).toBeLessThanOrEqual(after);
    expect(store.getState().undo.listUndo()).toHaveLength(0);
  });

  it('drift scenario: redo restores the undo-timepoint document, not the pushed forward', async () => {
    const doc0 = reportWithCellValue('base');
    const doc1 = reportWithCellValue('edited');
    const { store, ctx } = buildHarness(doc1);
    store.getState().undo.push({ forward: doc1, inverse: doc0, timestamp: 1 });

    // Undo: document → D0, redo entry rebuilt with forward = D1 (pre-drift).
    await dispatchUndo(ctx);

    // Drift the document without any stack push (transaction-open equivalent).
    const doc2 = reportWithCellValue('drifted');
    store.setState({ document: doc2 });

    // Redo AFTER the drift: the redo entry is REBUILT again at redo operation
    // time — restored = entry.forward = D1, rebuilt undo entry inverse =
    // redo-timepoint current document = D2.
    const result = await dispatchRedo(ctx);

    expect(result).toEqual({ ok: true, changed: true });
    expect(store.getState().document).toBe(doc1);
    expect(refreshCalls).toBe(2);

    const undoEntries = store.getState().undo.listUndo();
    expect(undoEntries).toHaveLength(1);
    expect(undoEntries[0].forward).toBe(doc1);
    expect(undoEntries[0].inverse).toBe(doc2);
  });

  it('undo/redo reset spreadsheetSyncSource at the dispatch level (report-only step)', async () => {
    const doc0 = reportWithCellValue('base');
    const doc1 = reportWithCellValue('edited');
    const { store, ctx } = buildHarness(doc1);
    store.getState().undo.push({ forward: doc1, inverse: doc0, timestamp: 1 });
    store.setState({ spreadsheetSyncSource: doc1.spreadsheet });

    await dispatchUndo(ctx);
    expect(store.getState().spreadsheetSyncSource).toBeUndefined();

    store.setState({ spreadsheetSyncSource: doc1.spreadsheet });
    await dispatchRedo(ctx);
    expect(store.getState().spreadsheetSyncSource).toBeUndefined();
  });
});

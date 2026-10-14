import type { ReportDesignerCore, ReportTemplateDocument } from '@nop-chaos/report-designer-core';
import type { SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';

// Report-spreadsheet snapshot twins deleted (plan 598 G1): the verbatim
// identical trio (ReportSpreadsheetSnapshotSlice / select /
// equal, ex :55-95) is single-sourced in @nop-chaos/spreadsheet-core
// (snapshot-selectors.ts). The report-side RuntimeSlice variant below is
// deliberately distinct (document/history/dirty projection) and stays local.

export interface ReportPageSnapshotSlice {
  document: ReportTemplateDocument;
  spreadsheetSyncSource?: ReportTemplateDocument['spreadsheet'];
  dirty: boolean;
  readonly: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectionTarget: ReturnType<ReportDesignerCore['getSnapshot']>['selectionTarget'];
  inspector: ReturnType<ReportDesignerCore['getSnapshot']>['inspector'];
  fieldDrag: ReturnType<ReportDesignerCore['getSnapshot']>['fieldDrag'];
  preview: ReturnType<ReportDesignerCore['getSnapshot']>['preview'];
  activeMeta: ReturnType<ReportDesignerCore['getSnapshot']>['activeMeta'];
  fieldSources: ReturnType<ReportDesignerCore['getSnapshot']>['fieldSources'];
}

export function selectReportPageSnapshot(
  snapshot: ReturnType<ReportDesignerCore['getSnapshot']>,
): ReportPageSnapshotSlice {
  return {
    document: snapshot.document,
    spreadsheetSyncSource: snapshot.spreadsheetSyncSource,
    dirty: snapshot.dirty,
    readonly: snapshot.readonly,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    selectionTarget: snapshot.selectionTarget,
    inspector: snapshot.inspector,
    fieldDrag: snapshot.fieldDrag,
    preview: snapshot.preview,
    activeMeta: snapshot.activeMeta,
    fieldSources: snapshot.fieldSources,
  };
}

export function equalReportPageSnapshot(a: ReportPageSnapshotSlice, b: ReportPageSnapshotSlice) {
  return (
    a.document === b.document &&
    a.spreadsheetSyncSource === b.spreadsheetSyncSource &&
    a.dirty === b.dirty &&
    a.readonly === b.readonly &&
    a.canUndo === b.canUndo &&
    a.canRedo === b.canRedo &&
    a.selectionTarget === b.selectionTarget &&
    a.inspector === b.inspector &&
    a.fieldDrag === b.fieldDrag &&
    a.preview === b.preview &&
    a.activeMeta === b.activeMeta &&
    a.fieldSources === b.fieldSources
  );
}

export interface ReportSpreadsheetRuntimeSlice {
  document: SpreadsheetRuntimeSnapshot['document'];
  history: SpreadsheetRuntimeSnapshot['history'];
  dirty: boolean;
}

export function selectReportSpreadsheetRuntimeSnapshot(
  snapshot: SpreadsheetRuntimeSnapshot,
): ReportSpreadsheetRuntimeSlice {
  return {
    document: snapshot.document,
    history: snapshot.history,
    dirty: snapshot.dirty,
  };
}

export function equalReportSpreadsheetRuntimeSnapshot(
  a: ReportSpreadsheetRuntimeSlice,
  b: ReportSpreadsheetRuntimeSlice,
) {
  return a.document === b.document && a.history === b.history && a.dirty === b.dirty;
}

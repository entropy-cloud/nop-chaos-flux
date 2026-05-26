import type { ReportDesignerCore, ReportTemplateDocument } from '@nop-chaos/report-designer-core';
import type { SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';

export interface ReportPageSnapshotSlice {
  document: ReportTemplateDocument;
  spreadsheetSyncSource?: ReportTemplateDocument['spreadsheet'];
  dirty: boolean;
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

export interface ReportSpreadsheetSnapshotSlice {
  document: SpreadsheetRuntimeSnapshot['document'];
  activeSheetId: SpreadsheetRuntimeSnapshot['activeSheetId'];
  selection: SpreadsheetRuntimeSnapshot['selection'];
  history: SpreadsheetRuntimeSnapshot['history'];
  dirty: boolean;
  readonly: boolean;
  viewport: SpreadsheetRuntimeSnapshot['viewport'];
  layout: SpreadsheetRuntimeSnapshot['layout'];
}

export function selectReportSpreadsheetSnapshot(
  snapshot: SpreadsheetRuntimeSnapshot,
): ReportSpreadsheetSnapshotSlice {
  return {
    document: snapshot.document,
    activeSheetId: snapshot.activeSheetId,
    selection: snapshot.selection,
    history: snapshot.history,
    dirty: snapshot.dirty,
    readonly: snapshot.readonly,
    viewport: snapshot.viewport,
    layout: snapshot.layout,
  };
}

export function equalReportSpreadsheetSnapshot(
  a: ReportSpreadsheetSnapshotSlice,
  b: ReportSpreadsheetSnapshotSlice,
) {
  return (
    a.document === b.document &&
    a.activeSheetId === b.activeSheetId &&
    a.selection === b.selection &&
    a.history === b.history &&
    a.dirty === b.dirty &&
    a.readonly === b.readonly &&
    a.viewport === b.viewport &&
    a.layout === b.layout
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

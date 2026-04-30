import { useMemo } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { useHostScope } from '@nop-chaos/flux-react';
import type { SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';
import type {
  FieldSourceSnapshot,
  ReportDesignerCore,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
} from '@nop-chaos/report-designer-core';
import { getFieldCount } from './helpers.js';

function getActiveSheet(snapshot: ReportDesignerRuntimeSnapshot, target: ReportSelectionTarget | undefined) {
  switch (target?.kind) {
    case 'sheet':
      return snapshot.document.spreadsheet.workbook.sheets.find((sheet) => sheet.id === target.sheetId);
    case 'cell':
      return snapshot.document.spreadsheet.workbook.sheets.find((sheet) => sheet.id === target.cell.sheetId);
    case 'range':
      return snapshot.document.spreadsheet.workbook.sheets.find((sheet) => sheet.id === target.range.sheetId);
    default:
      return undefined;
  }
}

function getSpreadsheetSelectionTarget(snapshot: SpreadsheetRuntimeSnapshot) {
  return snapshot.selection;
}

function getSpreadsheetActiveSheet(snapshot: SpreadsheetRuntimeSnapshot) {
  return snapshot.document.workbook.sheets.find((sheet) => sheet.id === snapshot.activeSheetId);
}

function buildSpreadsheetScopeData(snapshot: SpreadsheetRuntimeSnapshot) {
  const activeSheet = getSpreadsheetActiveSheet(snapshot);
  const activeCell = snapshot.selection.kind === 'cell' ? snapshot.selection.anchor : undefined;
  const activeRange = snapshot.selection.kind === 'range' ? snapshot.selection.range : undefined;

  return {
    workbook: snapshot.document.workbook,
    activeSheet,
    selection: getSpreadsheetSelectionTarget(snapshot),
    activeCell,
    activeRange,
    runtime: {
      canUndo: snapshot.history.canUndo,
      canRedo: snapshot.history.canRedo,
      readonly: snapshot.readonly,
      dirty: snapshot.dirty,
      zoom: snapshot.viewport.zoom,
    },
  };
}

export interface ReportDesignerHostData {
  designer: {
    kind: string;
    documentId: string;
    documentName: string;
    selectionTarget: ReportSelectionTarget | undefined;
    selectionKind: ReportSelectionTarget['kind'] | undefined;
    inspector: ReportDesignerRuntimeSnapshot['inspector'];
    fieldDrag: ReportDesignerRuntimeSnapshot['fieldDrag'];
    preview: ReportDesignerRuntimeSnapshot['preview'];
    activeMeta: ReportDesignerRuntimeSnapshot['activeMeta'];
    fieldSources: FieldSourceSnapshot[];
    fieldSourceCount: number;
    fieldCount: number;
  };
  /** @compat alias for selectionTarget — prefer selectionTarget in new schema */
  selection: ReportSelectionTarget | undefined;
  /** @compat alias for selectionTarget — prefer selectionTarget in new schema */
  target: ReportSelectionTarget | undefined;
  selectionTarget: ReportSelectionTarget | undefined;
  reportDocument: ReportDesignerRuntimeSnapshot['document'];
  workbook: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook'];
  activeSheet: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook']['sheets'][number] | undefined;
  canUndo: boolean;
  canRedo: boolean;
  documentName: string;
  fieldCount: number;
}

export function createHostData(core: ReportDesignerCore, snapshot: ReportDesignerRuntimeSnapshot): ReportDesignerHostData {
  const fieldCount = getFieldCount(snapshot.fieldSources);
  const reportDocument = {
    ...snapshot.document,
    spreadsheet: {
      ...snapshot.document.spreadsheet,
      workbook: {
        ...snapshot.document.spreadsheet.workbook,
      },
    },
  };

  return {
    designer: {
      kind: snapshot.document.kind,
      documentId: snapshot.document.id,
      documentName: snapshot.document.name,
      selectionTarget: snapshot.selectionTarget,
      selectionKind: snapshot.selectionTarget?.kind,
      inspector: snapshot.inspector,
      fieldDrag: snapshot.fieldDrag,
      preview: snapshot.preview,
      activeMeta: snapshot.activeMeta,
      fieldSources: snapshot.fieldSources,
      fieldSourceCount: snapshot.fieldSources.length,
      fieldCount,
    },
    selection: snapshot.selectionTarget,
    target: snapshot.selectionTarget,
    selectionTarget: snapshot.selectionTarget,
    reportDocument,
    workbook: reportDocument.spreadsheet.workbook,
    activeSheet: getActiveSheet(snapshot, snapshot.selectionTarget),
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    documentName: snapshot.document.name,
    fieldCount,
  };
}

export function buildReportDesignerScopeData(
  core: ReportDesignerCore,
  snapshot: ReportDesignerRuntimeSnapshot,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
): Record<string, unknown> {
  const fieldCount = getFieldCount(snapshot.fieldSources);
  const spreadsheet = spreadsheetSnapshot ? buildSpreadsheetScopeData(spreadsheetSnapshot) : undefined;
  const workbook = spreadsheet?.workbook ?? snapshot.document.spreadsheet.workbook;
  const activeSheet = spreadsheet?.activeSheet ?? getActiveSheet(snapshot, snapshot.selectionTarget);
  const runtimeCanUndo = snapshot.canUndo || (spreadsheetSnapshot?.history.canUndo ?? false);
  const runtimeCanRedo = snapshot.canRedo || (spreadsheetSnapshot?.history.canRedo ?? false);
  const runtimeDirty = snapshot.dirty || (spreadsheetSnapshot?.dirty ?? false);
  const reportDocument = spreadsheetSnapshot
    ? { ...snapshot.document, spreadsheet: spreadsheetSnapshot.document }
    : snapshot.document;

  return {
    designer: {
      kind: snapshot.document.kind,
      documentId: snapshot.document.id,
        documentName: snapshot.document.name,
        selectionTarget: snapshot.selectionTarget,
        selectionKind: snapshot.selectionTarget?.kind,
        inspector: snapshot.inspector,
        fieldDrag: snapshot.fieldDrag,
        preview: snapshot.preview,
      activeMeta: snapshot.activeMeta,
      fieldSources: snapshot.fieldSources,
      fieldSourceCount: snapshot.fieldSources.length,
      fieldCount,
    },
    runtime: {
      canUndo: runtimeCanUndo,
      canRedo: runtimeCanRedo,
      previewRunning: snapshot.preview.running,
      previewMode: snapshot.preview.mode,
      dirty: runtimeDirty,
    },
    spreadsheet,
    selection: snapshot.selectionTarget,
    target: snapshot.selectionTarget,
    selectionTarget: snapshot.selectionTarget,
    reportDocument,
    workbook,
    activeSheet,
    activeCell: spreadsheet?.activeCell,
    activeRange: spreadsheet?.activeRange,
    canUndo: runtimeCanUndo,
    canRedo: runtimeCanRedo,
    documentName: snapshot.document.name,
    fieldCount,
    inspector: snapshot.inspector,
    inspectorBody: snapshot.inspector.resolvedSchema,
    meta: snapshot.activeMeta,
  };
}

export function useReportDesignerHostScope(
  core: ReportDesignerCore,
  snapshot: ReportDesignerRuntimeSnapshot,
  path: string,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
): ScopeRef {
  const scopeData = useMemo(
    () => buildReportDesignerScopeData(core, snapshot, spreadsheetSnapshot),
    [core, snapshot, spreadsheetSnapshot],
  );
  return useHostScope(scopeData, path, 'report-designer');
}

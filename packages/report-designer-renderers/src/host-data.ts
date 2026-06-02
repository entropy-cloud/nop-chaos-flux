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

export interface ReportDesignerAggregatedRuntimeSummary {
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
}

export function buildAggregatedRuntimeSummary(
  snapshot: ReportDesignerRuntimeSnapshot,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
): ReportDesignerAggregatedRuntimeSummary {
  return {
    canUndo: snapshot.canUndo || Boolean(spreadsheetSnapshot?.history.canUndo),
    canRedo: snapshot.canRedo || Boolean(spreadsheetSnapshot?.history.canRedo),
    dirty: snapshot.dirty || Boolean(spreadsheetSnapshot?.dirty),
  };
}

function getActiveSheet(snapshot: ReportDesignerRuntimeSnapshot) {
  const workbook = snapshot.document.spreadsheet.workbook;
  const target = snapshot.selectionTarget;

  switch (target?.kind) {
    case 'sheet':
      return workbook.sheets.find((sheet) => sheet.id === target.sheetId);
    case 'row':
      return workbook.sheets.find((sheet) => sheet.id === target.sheetId);
    case 'column':
      return workbook.sheets.find((sheet) => sheet.id === target.sheetId);
    case 'cell':
      return workbook.sheets.find((sheet) => sheet.id === target.cell.sheetId);
    case 'range':
      return workbook.sheets.find((sheet) => sheet.id === target.range.sheetId);
    case 'workbook':
    default:
      return workbook.sheets[0];
  }
}

function getSpreadsheetActiveSheet(snapshot: SpreadsheetRuntimeSnapshot) {
  return snapshot.document.workbook.sheets.find((sheet) => sheet.id === snapshot.activeSheetId);
}

function resolveActiveSheet(
  snapshot: ReportDesignerRuntimeSnapshot,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
) {
  if (spreadsheetSnapshot) {
    return getSpreadsheetActiveSheet(spreadsheetSnapshot);
  }

  return getActiveSheet(snapshot);
}

function getSpreadsheetSelectionTarget(snapshot: SpreadsheetRuntimeSnapshot) {
  switch (snapshot.selection.kind) {
    case 'cell':
      return snapshot.selection.anchor;
    case 'range':
      return snapshot.selection.range;
    case 'row':
      return {
        kind: 'row',
        sheetId: snapshot.selection.sheetId,
        rows: snapshot.selection.rows,
      };
    case 'column':
      return {
        kind: 'column',
        sheetId: snapshot.selection.sheetId,
        columns: snapshot.selection.columns,
      };
    case 'sheet':
      return {
        kind: 'sheet',
        sheetId: snapshot.selection.sheetId,
      };
    default:
      return undefined;
  }
}

function buildSpreadsheetScopeData(snapshot: SpreadsheetRuntimeSnapshot) {
  const activeSheet = getSpreadsheetActiveSheet(snapshot);
  const activeCell = snapshot.selection.kind === 'cell' ? (snapshot.selection.anchor ?? null) : null;
  const activeRange = snapshot.selection.kind === 'range' ? (snapshot.selection.range ?? null) : null;

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
      viewport: snapshot.viewport,
    },
  };
}

export interface ReportDesignerHostData {
  designer: {
    kind: string;
    dirty: boolean;
    documentId: string;
    documentName: string;
    selectionTarget: ReportSelectionTarget | undefined;
    selectionKind: ReportSelectionTarget['kind'] | null;
    inspector: ReportDesignerRuntimeSnapshot['inspector'];
    inspectorPanels: ReportDesignerRuntimeSnapshot['inspector']['resolvedSchema'] | null;
    fieldDrag: ReportDesignerRuntimeSnapshot['fieldDrag'];
    preview: ReportDesignerRuntimeSnapshot['preview'];
    activeMeta: ReportDesignerRuntimeSnapshot['activeMeta'];
    canUndo: boolean;
    canRedo: boolean;
    fieldSources: FieldSourceSnapshot[];
    fieldSourceCount: number;
    fieldCount: number;
  };
  selectionTarget: ReportSelectionTarget | undefined;
  reportDocument: ReportDesignerRuntimeSnapshot['document'];
  workbook: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook'];
  activeSheet:
    | ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook']['sheets'][number]
    | undefined;
  documentName: string;
  fieldCount: number;
}

function defensiveCopyWorkbook(
  workbook: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook'],
) {
  return {
    ...workbook,
    sheets: [...workbook.sheets],
  };
}

function resolveCanonicalWorkbook(
  snapshot: ReportDesignerRuntimeSnapshot,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
) {
  if (spreadsheetSnapshot) {
    return spreadsheetSnapshot.document.workbook;
  }
  return snapshot.document.spreadsheet.workbook;
}

function buildCanonicalReportDocument(
  snapshot: ReportDesignerRuntimeSnapshot,
  workbook: ReportDesignerRuntimeSnapshot['document']['spreadsheet']['workbook'],
) {
  const doc = snapshot.document;
  return {
    ...doc,
    spreadsheet: {
      ...doc.spreadsheet,
      workbook,
    },
  };
}

export function createHostData(
  core: ReportDesignerCore,
  snapshot: ReportDesignerRuntimeSnapshot,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
): ReportDesignerHostData {
  const fieldCount = getFieldCount(snapshot.fieldSources);
  const workbook = defensiveCopyWorkbook(resolveCanonicalWorkbook(snapshot, spreadsheetSnapshot));
  const reportDocument = buildCanonicalReportDocument(snapshot, workbook);

  return {
    designer: {
      kind: snapshot.document.kind,
      dirty: snapshot.dirty,
      documentId: snapshot.document.id,
      documentName: snapshot.document.name,
      selectionTarget: snapshot.selectionTarget,
      selectionKind: snapshot.selectionTarget?.kind ?? null,
      inspector: snapshot.inspector,
      inspectorPanels: snapshot.inspector.resolvedSchema ?? null,
      fieldDrag: snapshot.fieldDrag,
      preview: snapshot.preview,
      activeMeta: snapshot.activeMeta,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      fieldSources: snapshot.fieldSources,
      fieldSourceCount: snapshot.fieldSources.length,
      fieldCount,
    },
    selectionTarget: snapshot.selectionTarget,
    reportDocument,
    workbook,
    activeSheet: resolveActiveSheet(snapshot, spreadsheetSnapshot),
    documentName: snapshot.document.name,
    fieldCount,
  };
}

export function buildReportDesignerScopeData(
  _core: ReportDesignerCore,
  snapshot: ReportDesignerRuntimeSnapshot,
  spreadsheetSnapshot?: SpreadsheetRuntimeSnapshot,
): Record<string, unknown> {
  const fieldCount = getFieldCount(snapshot.fieldSources);
  const runtime = buildAggregatedRuntimeSummary(snapshot, spreadsheetSnapshot);
  const spreadsheet = spreadsheetSnapshot
    ? buildSpreadsheetScopeData(spreadsheetSnapshot)
    : undefined;
  const workbook = defensiveCopyWorkbook(resolveCanonicalWorkbook(snapshot, spreadsheetSnapshot));
  const reportDocument = buildCanonicalReportDocument(snapshot, workbook);
  const activeSheet = resolveActiveSheet(snapshot, spreadsheetSnapshot);

  return {
    designer: {
      kind: snapshot.document.kind,
      dirty: snapshot.dirty,
      documentId: snapshot.document.id,
      documentName: snapshot.document.name,
      selectionTarget: snapshot.selectionTarget,
      selectionKind: snapshot.selectionTarget?.kind ?? null,
      inspector: snapshot.inspector,
      inspectorPanels: snapshot.inspector.resolvedSchema ?? null,
      fieldDrag: snapshot.fieldDrag,
      preview: snapshot.preview,
      activeMeta: snapshot.activeMeta,
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      fieldSources: snapshot.fieldSources,
      fieldSourceCount: snapshot.fieldSources.length,
      fieldCount,
    },
    runtime: {
      canUndo: runtime.canUndo,
      canRedo: runtime.canRedo,
      previewRunning: snapshot.preview.running,
      previewMode: snapshot.preview.mode ?? null,
      dirty: runtime.dirty,
    },
    spreadsheet: spreadsheet ?? null,
    selectionTarget: snapshot.selectionTarget ?? null,
    reportDocument,
    workbook,
    activeSheet: activeSheet ?? null,
    activeCell:
      snapshot.selectionTarget?.kind === 'cell' ? snapshot.selectionTarget.cell : null,
    activeRange:
      snapshot.selectionTarget?.kind === 'range' ? snapshot.selectionTarget.range : null,
    documentName: snapshot.document.name,
    fieldSources: snapshot.fieldSources,
    fieldCount,
    inspector: snapshot.inspector,
    inspectorPanels: snapshot.inspector.resolvedSchema ?? null,
    meta: snapshot.activeMeta ?? null,
    preview: snapshot.preview,
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

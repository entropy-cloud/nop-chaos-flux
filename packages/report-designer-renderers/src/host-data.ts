import { useMemo } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { useHostScope } from '@nop-chaos/flux-react';
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

export interface ReportDesignerHostData {
  reportDesignerCore: ReportDesignerCore;
  designer: {
    kind: string;
    documentId: string;
    documentName: string;
    selectionTarget: ReportSelectionTarget | undefined;
    selectionKind: ReportSelectionTarget['kind'] | undefined;
    inspector: ReportDesignerRuntimeSnapshot['inspector'];
    inspectorPanels: ReturnType<ReportDesignerCore['getInspectorPanels']>;
    fieldDrag: ReportDesignerRuntimeSnapshot['fieldDrag'];
    preview: ReportDesignerRuntimeSnapshot['preview'];
    activeMeta: ReportDesignerRuntimeSnapshot['activeMeta'];
    fieldSources: FieldSourceSnapshot[];
    fieldSourceCount: number;
    fieldCount: number;
  };
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: ReportDesignerRuntimeSnapshot['fieldDrag'];
  meta: ReportDesignerRuntimeSnapshot['activeMeta'];
  preview: ReportDesignerRuntimeSnapshot['preview'];
  inspectorPanels: ReturnType<ReportDesignerCore['getInspectorPanels']>;
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
  const inspectorPanels = core.getInspectorPanels();
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
    reportDesignerCore: core,
    designer: {
      kind: snapshot.document.kind,
      documentId: snapshot.document.id,
      documentName: snapshot.document.name,
      selectionTarget: snapshot.selectionTarget,
      selectionKind: snapshot.selectionTarget?.kind,
      inspector: snapshot.inspector,
      inspectorPanels,
      fieldDrag: snapshot.fieldDrag,
      preview: snapshot.preview,
      activeMeta: snapshot.activeMeta,
      fieldSources: snapshot.fieldSources,
      fieldSourceCount: snapshot.fieldSources.length,
      fieldCount,
    },
    fieldSources: snapshot.fieldSources,
    fieldDrag: snapshot.fieldDrag,
    meta: snapshot.activeMeta,
    preview: snapshot.preview,
    inspectorPanels,
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
): Record<string, unknown> {
  const inspectorPanels = core.getInspectorPanels();
  const fieldCount = getFieldCount(snapshot.fieldSources);

  return {
    designer: {
      kind: snapshot.document.kind,
      documentId: snapshot.document.id,
      documentName: snapshot.document.name,
      selectionTarget: snapshot.selectionTarget,
      selectionKind: snapshot.selectionTarget?.kind,
      inspector: snapshot.inspector,
      inspectorPanels,
      fieldDrag: snapshot.fieldDrag,
      preview: snapshot.preview,
      activeMeta: snapshot.activeMeta,
      fieldSources: snapshot.fieldSources,
      fieldSourceCount: snapshot.fieldSources.length,
      fieldCount,
    },
    runtime: {
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      previewRunning: snapshot.preview.running,
      previewMode: snapshot.preview.mode,
      dirty: false,
    },
    fieldSources: snapshot.fieldSources,
    fieldDrag: snapshot.fieldDrag,
    meta: snapshot.activeMeta,
    preview: snapshot.preview,
    inspectorPanels,
    selectionTarget: snapshot.selectionTarget,
    reportDocument: snapshot.document,
    workbook: snapshot.document.spreadsheet.workbook,
    activeSheet: getActiveSheet(snapshot, snapshot.selectionTarget),
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    documentName: snapshot.document.name,
    fieldCount,
    reportDesignerCore: core,
  };
}

export function useReportDesignerHostScope(
  core: ReportDesignerCore,
  snapshot: ReportDesignerRuntimeSnapshot,
  path: string,
): ScopeRef {
  const scopeData = useMemo(
    () => buildReportDesignerScopeData(core, snapshot),
    [core, snapshot],
  );
  return useHostScope(scopeData, path, 'report-designer');
}

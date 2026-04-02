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
  };
}

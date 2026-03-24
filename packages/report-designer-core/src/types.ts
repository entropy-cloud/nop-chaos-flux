import type {
  SpreadsheetDocument,
  SpreadsheetCellRef,
  SpreadsheetRange,
} from '@nop-chaos/spreadsheet-core';

export type ReportSelectionTargetKind = 'workbook' | 'sheet' | 'row' | 'column' | 'cell' | 'range';

export type ReportSelectionTarget =
  | { kind: 'workbook' }
  | { kind: 'sheet'; sheetId: string }
  | { kind: 'row'; sheetId: string; row: number }
  | { kind: 'column'; sheetId: string; col: number }
  | { kind: 'cell'; cell: SpreadsheetCellRef }
  | { kind: 'range'; range: SpreadsheetRange };

export interface MetadataBag {
  [key: string]: unknown;
}

export interface ReportSemanticDocument {
  workbookMeta?: MetadataBag;
  sheetMeta?: Record<string, MetadataBag>;
  rowMeta?: Record<string, Record<string, MetadataBag>>;
  columnMeta?: Record<string, Record<string, MetadataBag>>;
  cellMeta?: Record<string, Record<string, MetadataBag>>;
  rangeMeta?: Record<string, RangeMetaDocument[]>;
}

export interface RangeMetaDocument {
  id: string;
  range: SpreadsheetRange;
  meta: MetadataBag;
}

export interface ReportTemplateDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  spreadsheet: SpreadsheetDocument;
  semantic?: ReportSemanticDocument;
}

export interface FieldSourceSnapshot {
  id: string;
  label: string;
  groups: FieldGroupSnapshot[];
  provider?: string;
}

export interface FieldGroupSnapshot {
  id: string;
  label: string;
  fields: FieldItemSnapshot[];
  expanded: boolean;
}

export interface FieldItemSnapshot {
  id: string;
  label: string;
  path?: string;
  fieldType?: string;
  meta?: Record<string, unknown>;
}

export interface FieldDragState {
  active: boolean;
  sourceId?: string;
  fieldId?: string;
  payload?: FieldDragPayload;
  hoverTarget?: ReportSelectionTarget;
}

export interface FieldDragPayload {
  type: string;
  sourceId: string;
  fieldId: string;
  data: Record<string, unknown>;
}

export interface InspectorRuntimeState {
  open: boolean;
  activePanelId?: string;
  providerIds: string[];
  panelIds: string[];
  loading: boolean;
  error?: unknown;
}

export interface ReportDesignerRuntimeSnapshot {
  document: ReportTemplateDocument;
  selectionTarget?: ReportSelectionTarget;
  activeMeta?: MetadataBag;
  inspector: InspectorRuntimeState;
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  preview: {
    running: boolean;
    mode?: string;
    lastResult?: unknown;
  };
}

export interface ReportDesignerConfig {
  kind?: string;
  fieldSources?: FieldSourceSnapshot[];
  maxUndoDepth?: number;
  inspector?: {
    providers: Array<{
      id: string;
      label?: string;
      match: { kinds: ReportSelectionTargetKind[] };
      body?: Record<string, unknown>;
      provider?: string;
      submitAction?: Record<string, unknown>;
      readonly?: boolean;
      badge?: string;
      group?: string;
      order?: number;
      mode?: 'tab' | 'section' | 'inline';
    }>;
  };
  preview?: {
    provider?: string;
  };
}

export function getDefaultSelectionTarget(
  document: ReportTemplateDocument,
): ReportSelectionTarget {
  const firstSheet = document.spreadsheet.workbook.sheets[0];

  if (!firstSheet) {
    return { kind: 'workbook' };
  }

  return { kind: 'sheet', sheetId: firstSheet.id };
}

export function createDefaultSemantic(): ReportSemanticDocument {
  return {
    workbookMeta: {},
    sheetMeta: {},
    cellMeta: {},
    rangeMeta: {},
  };
}

export function createReportTemplateDocument(
  spreadsheet: SpreadsheetDocument,
  name?: string,
): ReportTemplateDocument {
  return {
    id: crypto.randomUUID(),
    kind: 'report-template',
    name: name ?? 'Untitled Report',
    version: '1.0.0',
    spreadsheet,
    semantic: createDefaultSemantic(),
  };
}

export function getCellMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
  address: string,
): MetadataBag | undefined {
  return semantic?.cellMeta?.[sheetId]?.[address];
}

export function setCellMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  address: string,
  meta: MetadataBag,
): ReportSemanticDocument {
  const sheetEntries = { ...(semantic.cellMeta ?? {}) };
  const cellEntries = { ...(sheetEntries[sheetId] ?? {}) };
  cellEntries[address] = meta;
  sheetEntries[sheetId] = cellEntries;
  return { ...semantic, cellMeta: sheetEntries };
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

export function updateCellMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  address: string,
  patch: MetadataBag,
): ReportSemanticDocument {
  const existing = getCellMeta(semantic, sheetId, address) ?? {};
  const merged = deepMerge(existing, patch);
  return setCellMeta(semantic, sheetId, address, merged);
}

export function getRowMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
  row: number,
): MetadataBag | undefined {
  return semantic?.rowMeta?.[sheetId]?.[String(row)];
}

export function setRowMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  row: number,
  meta: MetadataBag,
): ReportSemanticDocument {
  const sheetEntries = { ...(semantic.rowMeta ?? {}) };
  const rowEntries = { ...(sheetEntries[sheetId] ?? {}) };
  rowEntries[String(row)] = meta;
  sheetEntries[sheetId] = rowEntries;
  return { ...semantic, rowMeta: sheetEntries };
}

export function updateRowMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  row: number,
  patch: MetadataBag,
): ReportSemanticDocument {
  const existing = getRowMeta(semantic, sheetId, row) ?? {};
  const merged: MetadataBag = { ...existing, ...patch };
  return setRowMeta(semantic, sheetId, row, merged);
}

export function getColumnMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
  col: number,
): MetadataBag | undefined {
  return semantic?.columnMeta?.[sheetId]?.[String(col)];
}

export function setColumnMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  col: number,
  meta: MetadataBag,
): ReportSemanticDocument {
  const sheetEntries = { ...(semantic.columnMeta ?? {}) };
  const colEntries = { ...(sheetEntries[sheetId] ?? {}) };
  colEntries[String(col)] = meta;
  sheetEntries[sheetId] = colEntries;
  return { ...semantic, columnMeta: sheetEntries };
}

export function updateColumnMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  col: number,
  patch: MetadataBag,
): ReportSemanticDocument {
  const existing = getColumnMeta(semantic, sheetId, col) ?? {};
  const merged: MetadataBag = { ...existing, ...patch };
  return setColumnMeta(semantic, sheetId, col, merged);
}

export function getSheetMeta(
  semantic: ReportSemanticDocument | undefined,
  sheetId: string,
): MetadataBag | undefined {
  return semantic?.sheetMeta?.[sheetId];
}

export function setSheetMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  meta: MetadataBag,
): ReportSemanticDocument {
  const sheetEntries = { ...(semantic.sheetMeta ?? {}) };
  sheetEntries[sheetId] = meta;
  return { ...semantic, sheetMeta: sheetEntries };
}

export function updateSheetMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  patch: MetadataBag,
): ReportSemanticDocument {
  const existing = getSheetMeta(semantic, sheetId) ?? {};
  const merged: MetadataBag = { ...existing, ...patch };
  return setSheetMeta(semantic, sheetId, merged);
}

export function setRangeMeta(
  semantic: ReportSemanticDocument,
  sheetId: string,
  rangeMeta: RangeMetaDocument,
): ReportSemanticDocument {
  const rangeEntries = { ...(semantic.rangeMeta ?? {}) };
  const sheetRanges = [...(rangeEntries[sheetId] ?? [])];
  const idx = sheetRanges.findIndex((r) => r.id === rangeMeta.id);
  if (idx >= 0) {
    sheetRanges[idx] = rangeMeta;
  } else {
    sheetRanges.push(rangeMeta);
  }
  rangeEntries[sheetId] = sheetRanges;
  return { ...semantic, rangeMeta: rangeEntries };
}

export function getTargetMeta(
  semantic: ReportSemanticDocument | undefined,
  target: ReportSelectionTarget,
): MetadataBag | undefined {
  switch (target.kind) {
    case 'workbook':
      return semantic?.workbookMeta;
    case 'sheet':
      return getSheetMeta(semantic, target.sheetId);
    case 'row':
      return getRowMeta(semantic, target.sheetId, target.row);
    case 'column':
      return getColumnMeta(semantic, target.sheetId, target.col);
    case 'cell':
      return getCellMeta(semantic, target.cell.sheetId, target.cell.address);
    case 'range': {
      const rangeEntries = semantic?.rangeMeta?.[target.range.sheetId];
      if (rangeEntries && rangeEntries.length > 0) {
        return rangeEntries[0].meta;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

export function isSameTarget(a: ReportSelectionTarget, b: ReportSelectionTarget): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'workbook':
      return b.kind === 'workbook';
    case 'sheet':
      return b.kind === 'sheet' && a.sheetId === b.sheetId;
    case 'row':
      return b.kind === 'row' && a.sheetId === b.sheetId && a.row === b.row;
    case 'column':
      return b.kind === 'column' && a.sheetId === b.sheetId && a.col === b.col;
    case 'cell':
      return (
        b.kind === 'cell' &&
        a.cell.sheetId === b.cell.sheetId &&
        a.cell.row === b.cell.row &&
        a.cell.col === b.cell.col
      );
    case 'range':
      return (
        b.kind === 'range' &&
        a.range.sheetId === b.range.sheetId &&
        a.range.startRow === b.range.startRow &&
        a.range.startCol === b.range.startCol &&
        a.range.endRow === b.range.endRow &&
        a.range.endCol === b.range.endCol
      );
  }
}

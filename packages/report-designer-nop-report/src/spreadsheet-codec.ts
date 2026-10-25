import type {
  CellDocument,
  MergeRange,
  SpreadsheetDocument,
  WorksheetDocument,
} from '@nop-chaos/spreadsheet-core';
import type { ExcelCellLike, ExcelSheetLike, ExcelWorkbookLike } from './types.js';

/**
 * SpreadsheetCodec：`SpreadsheetDocument <-> ExcelWorkbookLike`（codec-design.md §2/§4）。
 * merge 以 `MergeRange[]` 为 canonical 表示；`SpreadsheetDocument.meta`/`viewport`
 * 属视图信息，不回写领域模型（§4.1）。未知字段经 `raw`/`props` 保真往返。
 */

const DOC_ID = 'documentId';
const DOC_KIND = 'documentKind';
const DOC_NAME = 'documentName';
const DOC_VERSION = 'documentVersion';
const DOC_IDENTITY_KEYS = [DOC_ID, DOC_KIND, DOC_NAME, DOC_VERSION];

const SHEET_PASSTHROUGH_KEYS = [
  'filters',
  'frozen',
  'tabColor',
  'hidden',
  'protected',
  'protectionOptions',
  'defaultRowHeight',
  'defaultColumnWidth',
] as const;

export interface SpreadsheetCodec {
  importSpreadsheet(input: unknown): SpreadsheetDocument;
  exportSpreadsheet(document: SpreadsheetDocument): ExcelWorkbookLike;
}

function cloneRecord<T extends Record<string, unknown>>(input: T | undefined): T | undefined {
  return input ? ({ ...input } as T) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createSpreadsheetCodec(): SpreadsheetCodec {
  return {
    importSpreadsheet(input) {
      return importWorkbook(input);
    },
    exportSpreadsheet(document) {
      return exportWorkbook(document);
    },
  };
}

function importWorkbook(input: unknown): SpreadsheetDocument {
  if (!isRecord(input) || !Array.isArray((input as unknown as ExcelWorkbookLike).sheets)) {
    throw new Error('codec-envelope-invalid: workbook.sheets must be an array');
  }
  const source = input as unknown as ExcelWorkbookLike;
  const raw = { ...(source.raw ?? {}) };

  const document: SpreadsheetDocument = {
    id: typeof raw[DOC_ID] === 'string' ? (raw[DOC_ID] as string) : crypto.randomUUID(),
    kind: typeof raw[DOC_KIND] === 'string' ? (raw[DOC_KIND] as string) : 'spreadsheet',
    name: typeof raw[DOC_NAME] === 'string' ? (raw[DOC_NAME] as string) : 'Imported Workbook',
    version: typeof raw[DOC_VERSION] === 'string' ? (raw[DOC_VERSION] as string) : '1.0.0',
    workbook: {
      name: typeof raw[DOC_NAME] === 'string' ? (raw[DOC_NAME] as string) : undefined,
      props: cloneRecord(source.props),
      styles: source.styles
        ? (source.styles.map((style) => ({ ...(style as Record<string, unknown>) })) as unknown as SpreadsheetDocument['workbook']['styles'])
        : undefined,
      sheets: source.sheets.map((sheet, index) => importSheet(sheet, index)),
    },
  };
  for (const key of DOC_IDENTITY_KEYS) {
    delete raw[key];
  }
  if (Object.keys(raw).length > 0) {
    document.meta = { raw };
  }
  return document;
}

function importSheet(sheet: ExcelSheetLike, sheetIndex: number): WorksheetDocument {
  if (typeof sheet?.name !== 'string') {
    throw new Error(`codec-sheet-invalid: sheets[${sheetIndex}].name must be a string`);
  }

  const sheetProps = { ...(sheet.props ?? {}) };
  const order = typeof sheetProps.order === 'number' ? (sheetProps.order as number) : sheetIndex;
  delete sheetProps.order;
  const sheetRest: Record<string, unknown> = {};
  for (const key of SHEET_PASSTHROUGH_KEYS) {
    const value = (sheet as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      sheetRest[key] = value;
    }
  }

  const cells: Record<string, CellDocument> = {};
  for (const [address, cell] of Object.entries(sheet.cells ?? {})) {
    cells[address] = importCell(address, cell);
  }

  const merges = normalizeMerges(sheet);

  const document: WorksheetDocument = {
    id: typeof sheet.id === 'string' ? sheet.id : `sheet-${sheetIndex}`,
    name: sheet.name,
    order,
    props: Object.keys(sheetProps).length > 0 ? sheetProps : undefined,
    rows: sheet.rows ? ({ ...sheet.rows } as WorksheetDocument['rows']) : undefined,
    columns: sheet.columns ? ({ ...sheet.columns } as WorksheetDocument['columns']) : undefined,
    cells: Object.keys(cells).length > 0 ? cells : undefined,
    merges: merges.length > 0 ? merges : undefined,
    ...sheetRest,
  };
  return document;
}

function importCell(address: string, cell: ExcelCellLike): CellDocument {
  const raw: Record<string, unknown> = { ...(cell.raw ?? {}) };
  let row = raw.rowIndex as number | undefined;
  let col = raw.colIndex as number | undefined;
  delete raw.rowIndex;
  delete raw.colIndex;
  if (typeof row !== 'number' || typeof col !== 'number') {
    const parsed = parseAddress(address);
    row = parsed.row;
    col = parsed.col;
  }

  const document: CellDocument = { address, row, col };
  if (cell.value !== undefined) document.value = cell.value;
  if (cell.formula !== undefined) document.formula = cell.formula;
  if (cell.type !== undefined) document.type = cell.type;
  if (cell.styleId !== undefined) document.styleId = cell.styleId;
  if (typeof cell.comment === 'string') {
    document.comment = cell.comment;
  } else if (cell.comment !== undefined) {
    document.comment = cell.comment;
  }
  if (raw.commentObject !== undefined) {
    document.comment = raw.commentObject as CellDocument['comment'];
    delete raw.commentObject;
  }
  if (cell.linkUrl !== undefined) document.linkUrl = cell.linkUrl;
  if (cell.protected !== undefined) document.protected = cell.protected;
  if (cell.richText !== undefined) document.richText = cell.richText;
  if (raw.numberFormat !== undefined) {
    document.numberFormat = raw.numberFormat as string;
    delete raw.numberFormat;
  }
  if (raw.style !== undefined) {
    document.style = raw.style as CellDocument['style'];
    delete raw.style;
  }
  if (Object.keys(raw).length > 0) {
    document.raw = raw;
  }
  return document;
}

export function parseAddress(address: string): { row: number; col: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) {
    throw new Error(`codec-address-invalid: ${address}`);
  }
  let col = 0;
  for (const char of match[1]) {
    col = col * 26 + (char.charCodeAt(0) - 64);
  }
  return { row: Number(match[2]) - 1, col: col - 1 };
}

export function formatAddress(row: number, col: number): string {
  let rest = col + 1;
  let letters = '';
  while (rest > 0) {
    const remainder = (rest - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    rest = Math.floor((rest - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

function normalizeMerges(sheet: ExcelSheetLike): MergeRange[] {
  const merges: MergeRange[] = [];
  const seen = new Set<string>();
  const push = (merge: MergeRange) => {
    const key = `${merge.startRow}:${merge.startCol}:${merge.endRow}:${merge.endCol}`;
    if (seen.has(key)) return;
    seen.add(key);
    merges.push(merge);
  };

  for (const merge of sheet.merges ?? []) {
    if (
      isRecord(merge) &&
      typeof merge.startRow === 'number' &&
      typeof merge.startCol === 'number' &&
      typeof merge.endRow === 'number' &&
      typeof merge.endCol === 'number'
    ) {
      push({
        startRow: merge.startRow,
        startCol: merge.startCol,
        endRow: merge.endRow,
        endCol: merge.endCol,
      });
    }
  }

  for (const cell of Object.values(sheet.cells ?? {})) {
    const across = cell?.mergeAcross ?? 0;
    const down = cell?.mergeDown ?? 0;
    if ((across > 0 || down > 0) && cell?.name) {
      const parsed = parseAddress(cell.name);
      push({
        startRow: parsed.row,
        startCol: parsed.col,
        endRow: parsed.row + down,
        endCol: parsed.col + across,
      });
    }
  }

  return merges;
}

function exportWorkbook(document: SpreadsheetDocument): ExcelWorkbookLike {
  const raw: Record<string, unknown> = {
    [DOC_ID]: document.id,
    [DOC_KIND]: document.kind,
    [DOC_NAME]: document.name,
    [DOC_VERSION]: document.version,
  };
  const extra = isRecord(document.meta?.raw) ? document.meta.raw : {};
  for (const [key, value] of Object.entries(extra)) {
    if (!DOC_IDENTITY_KEYS.includes(key)) {
      raw[key] = value;
    }
  }

  return {
    props: cloneRecord(document.workbook.props),
    styles: document.workbook.styles
      ? (document.workbook.styles.map((style) => ({ ...style })) as unknown[])
      : undefined,
    sheets: document.workbook.sheets.map((sheet) => exportSheet(sheet)),
    raw,
  };
}

function exportSheet(sheet: WorksheetDocument): ExcelSheetLike {
  const props: Record<string, unknown> = { ...(sheet.props ?? {}), order: sheet.order };
  const like: ExcelSheetLike = {
    id: sheet.id,
    name: sheet.name,
    props,
    rows: sheet.rows ? ({ ...sheet.rows } as Record<string, unknown>) : undefined,
    columns: sheet.columns ? ({ ...sheet.columns } as Record<string, unknown>) : undefined,
    cells: {},
    merges: sheet.merges ? sheet.merges.map((merge) => ({ ...merge })) : undefined,
  };

  for (const key of SHEET_PASSTHROUGH_KEYS) {
    const value = (sheet as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      (like as unknown as Record<string, unknown>)[key] = value;
    }
  }

  for (const [address, cell] of Object.entries(sheet.cells ?? {})) {
    like.cells![address] = exportCell(cell);
  }

  for (const merge of sheet.merges ?? []) {
    const anchor = like.cells?.[formatAddress(merge.startRow, merge.startCol)];
    if (anchor) {
      anchor.mergeAcross = merge.endCol - merge.startCol;
      anchor.mergeDown = merge.endRow - merge.startRow;
    }
  }

  return like;
}

function exportCell(cell: CellDocument): ExcelCellLike {
  const like: ExcelCellLike = {};
  const raw: Record<string, unknown> = { ...(cell.raw ?? {}) };

  raw.rowIndex = cell.row;
  raw.colIndex = cell.col;

  if (cell.value !== undefined) like.value = cell.value;
  if (cell.formula !== undefined) like.formula = cell.formula;
  if (cell.type !== undefined) like.type = cell.type;
  if (cell.styleId !== undefined) like.styleId = cell.styleId;
  if (typeof cell.comment === 'string') {
    like.comment = cell.comment;
  } else if (cell.comment !== undefined) {
    raw.commentObject = cell.comment;
  }
  if (cell.linkUrl !== undefined) like.linkUrl = cell.linkUrl;
  if (cell.protected !== undefined) like.protected = cell.protected;
  if (cell.richText !== undefined) like.richText = cell.richText;
  if (cell.numberFormat !== undefined) raw.numberFormat = cell.numberFormat;
  if (cell.style !== undefined) raw.style = cell.style;

  if (Object.keys(raw).length > 0) {
    like.raw = raw;
  }
  return like;
}

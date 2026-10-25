import type {
  MetadataBag,
  ReportSemanticDocument,
} from '@nop-chaos/report-designer-core';
import type { XptCellLike, XptSheetLike, XptWorkbookLike } from './types.js';

/**
 * ReportSemanticCodec：`ReportSemanticDocument <-> XptWorkbookLike`
 * （codec-design.md §2/§5）。XPT model 存于 namespaced meta
 * `semantic.*Meta['nop-report'].model`；非 nop-report 命名空间与
 * row/column/range meta 经 `XptWorkbookLike.raw` 保真往返。
 * `rowParent`/`colParent` 保留原始表示，不做规范化（§10.3）。
 */

const NAMESPACE = 'nop-report';

export interface SemanticCodec {
  importSemantic(input: unknown): ReportSemanticDocument | undefined;
  exportSemantic(document: ReportSemanticDocument | undefined): XptWorkbookLike | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bagModel(bag: MetadataBag | undefined): Record<string, unknown> | undefined {
  const namespace = bag?.[NAMESPACE];
  if (!isRecord(namespace)) {
    return undefined;
  }
  return isRecord(namespace.model) ? { ...namespace.model } : undefined;
}

function bagRest(bag: MetadataBag | undefined): Record<string, unknown> | undefined {
  const namespace = bag?.[NAMESPACE];
  if (!isRecord(namespace)) {
    return undefined;
  }
  const rest = Object.fromEntries(Object.entries(namespace).filter(([key]) => key !== 'model'));
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export function createSemanticCodec(): SemanticCodec {
  return {
    importSemantic(input) {
      if (!isRecord(input)) {
        return undefined;
      }
      const source = input as XptWorkbookLike;
      const semantic: ReportSemanticDocument = {
        workbookMeta: {},
        sheetMeta: {},
        cellMeta: {},
        rangeMeta: {},
      };

      const workbookBag: MetadataBag = {};
      if (isRecord(source.model)) {
        workbookBag[NAMESPACE] = { model: { ...source.model } };
      }
      const workbookRaw = source.raw;
      if (isRecord(workbookRaw)) {
        if (isRecord(workbookRaw.namespaces)) {
          for (const [key, value] of Object.entries(workbookRaw.namespaces)) {
            workbookBag[key] = value;
          }
        }
        for (const key of ['rowMeta', 'columnMeta', 'rangeMeta'] as const) {
          const value = workbookRaw[key];
          if (value !== undefined) {
            (semantic as unknown as Record<string, unknown>)[key] = value;
          }
        }
      }
      if (Object.keys(workbookBag).length > 0) {
        semantic.workbookMeta = workbookBag;
      }

      for (const [sheetId, sheet] of Object.entries(source.sheets ?? {})) {
        const sheetBag: MetadataBag = {};
        if (isRecord(sheet?.model)) {
          sheetBag[NAMESPACE] = { model: { ...sheet!.model } };
        }
        const sheetRaw = sheet?.raw;
        if (isRecord(sheetRaw) && isRecord(sheetRaw.namespaces)) {
          for (const [key, value] of Object.entries(sheetRaw.namespaces)) {
            sheetBag[key] = value;
          }
        }
        if (Object.keys(sheetBag).length > 0) {
          semantic.sheetMeta![sheetId] = sheetBag;
        }

        for (const [address, cell] of Object.entries(sheet?.cells ?? {})) {
          const cellBag: MetadataBag = {};
          if (isRecord(cell?.model)) {
            cellBag[NAMESPACE] = { model: { ...cell!.model } };
          }
          const cellRaw = cell?.raw;
          if (isRecord(cellRaw) && isRecord(cellRaw.namespaces)) {
            for (const [key, value] of Object.entries(cellRaw.namespaces)) {
              cellBag[key] = value;
            }
          }
          if (Object.keys(cellBag).length > 0) {
            (semantic.cellMeta ??= {})[sheetId] ??= {};
            semantic.cellMeta[sheetId][address] = cellBag;
          }
        }
      }

      return semantic;
    },

    exportSemantic(document) {
      if (!document) {
        return undefined;
      }

      const xpt: XptWorkbookLike = {};
      const model = bagModel(document.workbookMeta);
      if (model) {
        xpt.model = model;
      }
      const workbookRest = bagRest(document.workbookMeta);
      const otherNamespaces: Record<string, unknown> = { ...(workbookRest ?? {}) };
      for (const [key, value] of Object.entries(document.workbookMeta ?? {})) {
        if (key !== NAMESPACE) {
          otherNamespaces[key] = value;
        }
      }

      const extra: Record<string, unknown> = {};
      if (document.rowMeta !== undefined) extra.rowMeta = document.rowMeta;
      if (document.columnMeta !== undefined) extra.columnMeta = document.columnMeta;
      if (document.rangeMeta !== undefined) extra.rangeMeta = document.rangeMeta;
      if (Object.keys(otherNamespaces).length > 0) extra.namespaces = otherNamespaces;
      if (Object.keys(extra).length > 0) {
        xpt.raw = extra;
      }

      const sheetIds = new Set([
        ...Object.keys(document.sheetMeta ?? {}),
        ...Object.keys(document.cellMeta ?? {}),
      ]);
      if (sheetIds.size > 0) {
        xpt.sheets = {};
      }
      for (const sheetId of sheetIds) {
        const sheet: XptSheetLike = {};
        const sheetModel = bagModel(document.sheetMeta?.[sheetId]);
        if (sheetModel) {
          sheet.model = sheetModel;
        }
        const sheetRest = bagRest(document.sheetMeta?.[sheetId]);
        const sheetNamespaces: Record<string, unknown> = { ...(sheetRest ?? {}) };
        for (const [key, value] of Object.entries(document.sheetMeta?.[sheetId] ?? {})) {
          if (key !== NAMESPACE) {
            sheetNamespaces[key] = value;
          }
        }
        if (Object.keys(sheetNamespaces).length > 0) {
          sheet.raw = { namespaces: sheetNamespaces };
        }

        const sheetCellMeta = document.cellMeta?.[sheetId];
        if (sheetCellMeta && Object.keys(sheetCellMeta).length > 0) {
          sheet.cells = {};
          for (const [address, bag] of Object.entries(sheetCellMeta)) {
            const cell: XptCellLike = {};
            const cellModel = bagModel(bag);
            if (cellModel) {
              cell.model = cellModel;
            }
            const cellRest = bagRest(bag);
            const cellNamespaces: Record<string, unknown> = { ...(cellRest ?? {}) };
            for (const [key, value] of Object.entries(bag ?? {})) {
              if (key !== NAMESPACE) {
                cellNamespaces[key] = value;
              }
            }
            if (Object.keys(cellNamespaces).length > 0) {
              cell.raw = { namespaces: cellNamespaces };
            }
            sheet.cells[address] = cell;
          }
        }

        xpt.sheets![sheetId] = sheet;
      }

      return xpt;
    },
  };
}

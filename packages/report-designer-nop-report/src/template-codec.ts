import type { ReportTemplateDocument } from '@nop-chaos/report-designer-core';
import type {
  ReportDesignerAdapterContext,
  TemplateCodecAdapter,
} from '@nop-chaos/report-designer-core';
import { CodecError, type CodecDiagnostic, type CodecImportResult } from './diagnostics.js';
import { createSemanticCodec } from './semantic-codec.js';
import { createSpreadsheetCodec } from './spreadsheet-codec.js';
import type { ExcelWorkbookLike, XptWorkbookLike } from './types.js';

/**
 * 组合 codec（codec-design.md §7/§8）：外部信封
 * `{ format: 'nop-report-template', version, workbook: ExcelWorkbookLike, xpt?: XptWorkbookLike }`。
 * Excel 结构层失败 → import 失败；XPT 语义层缺失/部分失败 → warning 降级导入。
 */

export const NOP_REPORT_TEMPLATE_FORMAT = 'nop-report-template';

export interface NopReportTemplateEnvelope {
  format: typeof NOP_REPORT_TEMPLATE_FORMAT;
  version: string;
  workbook: ExcelWorkbookLike;
  xpt?: XptWorkbookLike;
}

export interface NopReportTemplateCodec extends TemplateCodecAdapter {
  importTemplate(payload: unknown): CodecImportResult;
  exportTemplate(document: ReportTemplateDocument): NopReportTemplateEnvelope;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const KNOWN_XPT_MODEL_FIELDS = new Set([
  'field',
  'ds',
  'expandType',
  'expandExpr',
  'valueExpr',
  'formatExpr',
  'styleIdExpr',
  'linkExpr',
  'rowParent',
  'colParent',
  'exportFormula',
  'editorId',
  'viewerId',
]);

const DOC_IDENTITY_KEYS = ['documentId', 'documentKind', 'documentName', 'documentVersion'];

/**
 * unknown 字段保真探测（Failure Path `codec-unknown-field`）：UI 未建模字段
 * 保留进 `raw`/namespaces 的同时，产生不中断导入的 `info` 诊断。
 */
function collectUnknownFieldDiagnostics(payload: NopReportTemplateEnvelope): CodecDiagnostic[] {
  const diagnostics: CodecDiagnostic[] = [];
  const push = (path: string, key: string) => {
    diagnostics.push({
      level: 'info',
      code: 'codec-unknown-field',
      message: `unmodeled field '${key}' preserved via raw passthrough`,
      path,
    });
  };

  const workbookRaw = payload.workbook.raw ?? {};
  for (const key of Object.keys(workbookRaw)) {
    if (!DOC_IDENTITY_KEYS.includes(key)) {
      push('workbook', key);
    }
  }

  payload.workbook.sheets.forEach((sheet, sheetIndex) => {
    for (const [address, cell] of Object.entries(sheet.cells ?? {})) {
      const cellRaw = cell?.raw ?? {};
      for (const key of Object.keys(cellRaw)) {
        if (key !== 'rowIndex' && key !== 'colIndex') {
          push(`sheets[${sheetIndex}].cells[${address}]`, key);
        }
      }
    }
  });

  for (const [sheetId, sheet] of Object.entries(payload.xpt?.sheets ?? {})) {
    for (const [address, cell] of Object.entries(sheet?.cells ?? {})) {
      for (const key of Object.keys(cell?.model ?? {})) {
        if (!KNOWN_XPT_MODEL_FIELDS.has(key)) {
          push(`xpt.sheets[${sheetId}].cells[${address}].model`, key);
        }
      }
    }
  }

  return diagnostics;
}

export function createNopReportTemplateCodec(): NopReportTemplateCodec {
  const spreadsheetCodec = createSpreadsheetCodec();
  const semanticCodec = createSemanticCodec();

  function importTemplate(payload: unknown): CodecImportResult {
    const diagnostics: CodecDiagnostic[] = [];
    if (!isRecord(payload) || payload.format !== NOP_REPORT_TEMPLATE_FORMAT) {
      diagnostics.push({
        level: 'error',
        code: 'codec-envelope-invalid',
        message: `payload.format must be '${NOP_REPORT_TEMPLATE_FORMAT}'`,
      });
      return { ok: false, diagnostics };
    }
    if (!isRecord(payload.workbook) || !Array.isArray((payload.workbook as unknown as ExcelWorkbookLike).sheets)) {
      diagnostics.push({
        level: 'error',
        code: 'codec-envelope-invalid',
        message: 'envelope.workbook.sheets must be an array',
      });
      return { ok: false, diagnostics };
    }

    try {
      const spreadsheet = spreadsheetCodec.importSpreadsheet(payload.workbook);
      diagnostics.push(...collectUnknownFieldDiagnostics(payload as unknown as NopReportTemplateEnvelope));
      if (payload.xpt === undefined) {
        diagnostics.push({
          level: 'warning',
          code: 'codec-semantic-missing',
          message: 'envelope has no xpt layer; report semantics imported as empty',
        });
      }
      const semantic = semanticCodec.importSemantic(payload.xpt);
      const document: ReportTemplateDocument = {
        id: spreadsheet.id,
        kind: 'report-template',
        name: spreadsheet.name,
        version:
          typeof payload.version === 'string'
            ? payload.version
            : (spreadsheet.version ?? '1.0.0'),
        spreadsheet,
        semantic: semantic ?? { workbookMeta: {}, sheetMeta: {}, cellMeta: {}, rangeMeta: {} },
      };
      return { ok: true, document, diagnostics };
    } catch (error) {
      diagnostics.push({
        level: 'error',
        code: 'codec-spreadsheet-invalid',
        message: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, diagnostics };
    }
  }

  function exportTemplate(document: ReportTemplateDocument): NopReportTemplateEnvelope {
    const envelope: NopReportTemplateEnvelope = {
      format: NOP_REPORT_TEMPLATE_FORMAT,
      version: document.version,
      workbook: spreadsheetCodec.exportSpreadsheet(document.spreadsheet),
    };
    const xpt = semanticCodec.exportSemantic(document.semantic);
    if (xpt) {
      envelope.xpt = xpt;
    }
    return envelope;
  }

  return {
    id: 'nop-report-xpt-codec',

    importTemplate,
    exportTemplate,

    importDocument(payload: unknown, _context: ReportDesignerAdapterContext): ReportTemplateDocument {
      const result = importTemplate(payload);
      if (!result.ok || !result.document) {
        throw new CodecError(result.diagnostics);
      }
      return result.document;
    },

    exportDocument(
      document: ReportTemplateDocument,
      _format: string | undefined,
      _context: ReportDesignerAdapterContext,
    ): unknown {
      return exportTemplate(document);
    },
  };
}

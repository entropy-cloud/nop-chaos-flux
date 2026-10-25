export type {
  ExcelWorkbookLike,
  ExcelSheetLike,
  ExcelCellLike,
  XptWorkbookLike,
  XptSheetLike,
  XptCellLike,
} from './types.js';

export { CodecError, type CodecDiagnostic, type CodecImportResult } from './diagnostics.js';
export { createSpreadsheetCodec, parseAddress, formatAddress, type SpreadsheetCodec } from './spreadsheet-codec.js';
export { createSemanticCodec, type SemanticCodec } from './semantic-codec.js';
export {
  createNopReportTemplateCodec,
  NOP_REPORT_TEMPLATE_FORMAT,
  type NopReportTemplateCodec,
  type NopReportTemplateEnvelope,
} from './template-codec.js';

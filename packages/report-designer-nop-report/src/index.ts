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
export {
  createNopReportDatasetProvider,
  NOP_REPORT_FIELD_SOURCE_PROVIDER_ID,
  type NopReportDataset,
  type NopReportDatasetField,
  type NopReportDatasetProviderOptions,
} from './field-source.js';
export {
  createNopReportCellBindingDropAdapter,
  NOP_REPORT_FIELD_DROP_ADAPTER_ID,
  NOP_REPORT_FIELD_DRAG_TYPE,
} from './field-drop.js';
export {
  buildNopReportMetaPatch,
  createNopReportInspectorSchemas,
  NOP_REPORT_EXPRESSION_FIELDS,
  NOP_REPORT_EXPRESSION_KIND_MARKER,
  NOP_REPORT_INSPECTOR_SCHEMA_ID,
  NOP_REPORT_XPT_MODEL_FIELDS,
  type NopReportInspectorSchemas,
} from './inspector-schema.js';

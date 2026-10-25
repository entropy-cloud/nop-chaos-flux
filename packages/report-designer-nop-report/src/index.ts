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
  NOP_REPORT_REFERENCE_FIELDS,
  NOP_REPORT_REFERENCE_KIND_MARKER,
  NOP_REPORT_XPT_MODEL_FIELDS,
  type NopReportInspectorSchemas,
} from './inspector-schema.js';
export {
  createNopReportExpressionEditorAdapter,
  NOP_REPORT_EXPRESSION_EDITOR_ADAPTER_ID,
  NOP_REPORT_EXPRESSION_EDITOR_SLOT,
} from './expression-editor-adapter.js';
export {
  createNopReportReferencePickerAdapter,
  NOP_REPORT_REFERENCE_PICKER_ADAPTER_ID,
} from './reference-picker-adapter.js';
export {
  NOP_REPORT_EXPRESSION_RENDERER_TYPE,
  NOP_REPORT_REFERENCE_RENDERER_TYPE,
  withNopReportFieldKinds,
} from './field-kinds.js';
export {
  createNopReportRendererDefinitions,
  NOP_REPORT_REFERENCE_PICK_SLOT,
} from './renderers.js';

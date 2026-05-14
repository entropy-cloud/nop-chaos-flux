export type { WordEditorHostStatusSummary } from './host-status.js';
export {
  RowFlex,
  TitleLevel,
  ListType,
  ListStyle,
  PageMode,
  PaperDirection,
} from './canvas-editor-types.js';
export type {
  WordEditorCatalog,
  WordEditorCatalogItem,
  WordEditorData,
  WordEditorElement,
  WordEditorRangeStyle,
  WordEditorResult,
  WordEditorWatermark,
} from './canvas-editor-types.js';

export { CanvasEditorBridge } from './canvas-editor-bridge.js';
export type { CanvasEditorBridgeOptions } from './canvas-editor-bridge.js';
export { createEditorStore } from './editor-store.js';
export type { EditorStoreApi, EditorSelectionState, EditorState } from './editor-store.js';
export { createDatasetStore } from './dataset-store.js';
export type { DatasetStoreApi } from './dataset-store.js';
export {
  captureDocumentSnapshot,
  persistSavedDocument,
  saveDocument,
  loadDocument,
  clearDocument,
  saveDatasets,
  loadDatasets,
  loadRecoveredState,
  normalizeWordDocument,
  normalizeDocCharts,
  normalizeDocCodes,
  normalizeDataset,
  normalizeDatasets,
} from './document-io.js';
export { createSavedDocumentData } from './document-io.js';
export type { SavedDocumentData, WordEditorRecoveredState } from './document-io.js';
export type { DocumentData, WordDocument, SavedDocument } from './template-model.js';
export { DEFAULT_PAPER_SETTINGS, PAPER_SIZE_PRESETS } from './paper-settings.js';
export type { PaperSettings } from './paper-settings.js';
export {
  createDataset,
  createDataColumn,
  validateDataset,
  datasetColumnToExpression,
} from './dataset-model.js';
export type {
  Dataset,
  DataColumn,
  DatasetSourceType,
  DatasetValidationResult,
  DatasetValidationInput,
  DataColumnInput,
} from './dataset-model.js';
export {
  isTemplateUrl,
  parseExprFromUrl,
  exprToUrl,
  parseElExpression,
  buildElExpression,
  parseTagAttributes,
  buildTagOpenString,
  buildTagSelfcloseString,
  buildFieldExpression,
  parseFieldReference,
  validateFieldReference,
  parseTemplate,
  extractFieldReferences,
  hasFieldReferences,
} from './template-expr.js';
export type {
  TemplateExpr,
  TemplateExprKind,
  FieldReference,
  ParsedTemplate,
} from './template-expr.js';
export {
  BUILTIN_TEMPLATE_TAGS,
  findTagDefinition,
  getOpeningTag,
  getClosingTag,
  getMatchingCloseTag,
} from './template-tags.js';
export type { TemplateTag } from './template-tags.js';
export { createDocChart, validateDocChart } from './chart-model.js';
export type { ChartType, DocChart } from './chart-model.js';
export { createDocCode, validateDocCode } from './code-model.js';
export type { CodeType, DocCode } from './code-model.js';

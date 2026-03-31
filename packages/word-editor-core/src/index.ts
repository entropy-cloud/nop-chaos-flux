export { CanvasEditorBridge } from './canvas-editor-bridge.js'
export type { CanvasEditorBridgeOptions, IRangeStyle } from './canvas-editor-bridge.js'
export { createEditorStore } from './editor-store.js'
export type { EditorStoreApi, EditorSelectionState, EditorState } from './editor-store.js'
export { createDatasetStore } from './dataset-store.js'
export type { DatasetStoreApi } from './dataset-store.js'
export { saveDocument, loadDocument, clearDocument, saveDatasets, loadDatasets } from './document-io.js'
export type { SavedDocumentData } from './document-io.js'
export type { DocumentData, SavedDocument } from './template-model.js'
export { DEFAULT_PAPER_SETTINGS, PAPER_SIZE_PRESETS } from './paper-settings.js'
export type { PaperSettings } from './paper-settings.js'
export { createDataSet, createDataColumn, validateDataSet, dataSetColumnToExpression } from './dataset-model.js'
export type { DataSet, DataColumn, DataSetSourceType, DataSetValidationResult, DataSetValidationInput, DataColumnInput } from './dataset-model.js'
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
  hasFieldReferences
} from './template-expr.js'
export type { TemplateExpr, TemplateExprKind, FieldReference, ParsedTemplate } from './template-expr.js'
export { BUILTIN_TEMPLATE_TAGS, findTagDefinition, getOpeningTag, getClosingTag, getMatchingCloseTag } from './template-tags.js'
export type { TemplateTag } from './template-tags.js'

export { RowFlex, TitleLevel, ListType, ListStyle, PageMode, PaperDirection } from '@hufe921/canvas-editor'
export type { IWatermark, IEditorData, IEditorResult, IElement, ICatalog, ICatalogItem } from '@hufe921/canvas-editor'

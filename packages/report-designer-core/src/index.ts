export type {
  ReportSelectionTargetKind,
  ReportSelectionTarget,
  MetadataBag,
  ReportSemanticDocument,
  RangeMetaDocument,
  ReportTemplateDocument,
  FieldSourceSnapshot,
  FieldGroupSnapshot,
  FieldItemSnapshot,
  FieldDragState,
  FieldDragPayload,
  InspectorRuntimeState,
  ReportDesignerRuntimeSnapshot,
  ReportDesignerConfig,
} from './types.js';

export {
  createDefaultSemantic,
  createReportTemplateDocument,
  getDefaultSelectionTarget,
  getCellMeta,
  setCellMeta,
  updateCellMeta,
  getRowMeta,
  setRowMeta,
  updateRowMeta,
  getColumnMeta,
  setColumnMeta,
  updateColumnMeta,
  getSheetMeta,
  setSheetMeta,
  updateSheetMeta,
  setRangeMeta,
  getTargetMeta,
  isSameTarget,
} from './types.js';

export type {
  ReportDesignerCommand,
  ReportDesignerCommandBase,
  DropFieldToTargetCommand,
  UpdateReportMetaCommand,
  ReplaceReportMetaCommand,
  OpenInspectorCommand,
  CloseInspectorCommand,
  PreviewReportCommand,
  ImportTemplateCommand,
  ExportTemplateCommand,
  ReportDesignerCommandResult,
} from './commands.js';

export { isReportDesignerCommand } from './commands.js';

export type {
  ReportDesignerAdapterContext,
  FieldSourceProvider,
  InspectorPanelDescriptor,
  InspectorPanelContext,
  InspectorProvider,
  FieldDropAdapter,
  PreviewAdapter,
  PreviewResult,
  TemplateCodecAdapter,
  ExpressionEditorProps,
  ExpressionEditorContext,
  ExpressionEditorAdapter,
  ReferencePickerContext,
  ReferencePickerAdapter,
  InspectorValueAdapter,
  InspectorWritePlan,
  ReportDesignerAdapterRegistry,
  ReportDesignerProfile,
} from './adapters.js';

export {
  createEmptyAdapterRegistry,
  createStaticFieldSourceProvider,
  createStaticInspectorProvider,
  createMetaPatchDropAdapter,
  createUnsupportedTemplateCodecAdapter,
} from './adapters.js';

export type {
  ReportDesignerCore,
  CreateReportDesignerCoreOptions,
} from './core.js';

export { createReportDesignerCore } from './core.js';

export type {
  InspectorMatchResult,
} from './inspector.js';

export {
  matchInspectorProviders,
  resolveInspectorPanels,
  groupPanelsByMode,
  findDefaultActivePanel,
} from './inspector.js';

export {
  REPORT_DESIGNER_DOMAIN_KIND,
  REPORT_DESIGNER_COMMAND_TYPES,
  hasReportDocChanges,
  createReportDesignerDomainAdapter,
  registerReportDesignerDomain,
  isReportDesignerCommand as isReportDesignerDomainCommand,
} from './editor-core-adapter.js';

export type {
  ReportDesignerHostStatusSummary,
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
  FieldDropAdapter,
  PreviewAdapter,
  PreviewResult,
  TemplateCodecAdapter,
  ExpressionEditorProps,
  ExpressionEditorContext,
  ExpressionEditorAdapter,
  ReferencePickerContext,
  ReferencePickerAdapter,
  ReportDesignerAdapterRegistry,
  ReportDesignerProfile,
} from './adapters.js';

export {
  createEmptyAdapterRegistry,
  createStaticFieldSourceProvider,
  createMetaPatchDropAdapter,
  createUnsupportedTemplateCodecAdapter,
} from './adapters.js';

export type { ReportDesignerCore, CreateReportDesignerCoreOptions } from './core.js';

export { createReportDesignerCore } from './core.js';

// Package-internal export of the existing runtime resolver (same precedent as
// rangeMetaId): profile packages (report-designer-nop-report) assert schema
// resolution through the live consumption path without deep-importing runtime/.
export { resolveInspectorSchemaForTarget } from './runtime/inspector-panels.js';

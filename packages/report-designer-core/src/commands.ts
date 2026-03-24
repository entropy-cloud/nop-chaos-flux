import type {
  ReportSelectionTarget,
  MetadataBag,
  FieldDragPayload,
} from './types.js';

export type ReportDesignerCommand =
  | DropFieldToTargetCommand
  | UpdateReportMetaCommand
  | ReplaceReportMetaCommand
  | OpenInspectorCommand
  | CloseInspectorCommand
  | PreviewReportCommand
  | ImportTemplateCommand
  | ExportTemplateCommand;

export interface ReportDesignerCommandBase {
  type: string;
  source?: 'user' | 'toolbar' | 'field-panel' | 'inspector' | 'adapter';
}

export interface DropFieldToTargetCommand extends ReportDesignerCommandBase {
  type: 'report-designer:dropFieldToTarget';
  field: FieldDragPayload;
  target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>;
}

export interface UpdateReportMetaCommand extends ReportDesignerCommandBase {
  type: 'report-designer:updateMeta';
  target: ReportSelectionTarget;
  patch: MetadataBag;
}

export interface ReplaceReportMetaCommand extends ReportDesignerCommandBase {
  type: 'report-designer:replaceMeta';
  target: ReportSelectionTarget;
  nextMeta: MetadataBag;
}

export interface OpenInspectorCommand extends ReportDesignerCommandBase {
  type: 'report-designer:openInspector';
  target?: ReportSelectionTarget;
}

export interface CloseInspectorCommand extends ReportDesignerCommandBase {
  type: 'report-designer:closeInspector';
}

export interface PreviewReportCommand extends ReportDesignerCommandBase {
  type: 'report-designer:preview';
  mode?: 'inline' | 'dialog' | 'replace-page' | 'download';
  args?: Record<string, unknown>;
}

export interface ImportTemplateCommand extends ReportDesignerCommandBase {
  type: 'report-designer:importTemplate';
  payload: unknown;
}

export interface ExportTemplateCommand extends ReportDesignerCommandBase {
  type: 'report-designer:exportTemplate';
  format?: string;
}

export interface ReportDesignerCommandResult {
  ok: boolean;
  changed: boolean;
  error?: unknown;
  data?: unknown;
}

export function isReportDesignerCommand(value: unknown): value is ReportDesignerCommand {
  if (typeof value !== 'object' || value === null) return false;
  const cmd = value as ReportDesignerCommand;
  return typeof cmd.type === 'string' && cmd.type.startsWith('report-designer:');
}

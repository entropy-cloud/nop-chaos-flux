import type { BaseSchema } from '@nop-chaos/flux-core';
import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
  ReportDesignerProfile,
  ReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import type { ReportFieldPanelSchema, ReportInspectorSchema, ReportToolbarSchema } from './schemas.js';

export type { ToolbarItem, ReportToolbarSchema, ReportFieldPanelSchema, ReportInspectorSchema } from './schemas.js';

export interface ReportDesignerPageSchemaInput {
  type: 'report-designer-page';
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  document: ReportTemplateDocument;
  designer: ReportDesignerConfig;
  profile?: ReportDesignerProfile;
  adapters?: Partial<ReportDesignerAdapterRegistry>;
  toolbar?: ReportToolbarSchema;
  fieldPanel?: ReportFieldPanelSchema;
  inspector?: ReportInspectorSchema;
  dialogs?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
}

export type ReportDesignerPageSchema = BaseSchema & ReportDesignerPageSchemaInput;

export function defineReportDesignerPageSchema<T extends ReportDesignerPageSchemaInput>(schema: T): ReportDesignerPageSchema {
  return schema as unknown as ReportDesignerPageSchema;
}

export interface ReportInspectorShellSchema extends BaseSchema {
  type: 'report-inspector-shell';
  emptyLabel?: string;
  noSelectionLabel?: string;
  saveLabel?: string;
  errorLabel?: string;
}


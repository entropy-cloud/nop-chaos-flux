import type { BaseSchema } from '@nop-chaos/amis-schema';
import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
  ReportDesignerProfile,
  ReportTemplateDocument,
} from '@nop-chaos/report-designer-core';

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
  toolbar?: BaseSchema | BaseSchema[];
  fieldPanel?: BaseSchema | BaseSchema[];
  inspector?: BaseSchema | BaseSchema[];
  dialogs?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
}

export type ReportDesignerPageSchema = BaseSchema & ReportDesignerPageSchemaInput;

export function defineReportDesignerPageSchema<T extends ReportDesignerPageSchemaInput>(schema: T): ReportDesignerPageSchema {
  return schema as unknown as ReportDesignerPageSchema;
}

export interface ReportFieldPanelSchema extends BaseSchema {
  type: 'report-field-panel';
  emptyLabel?: string;
}

export interface ReportInspectorShellSchema extends BaseSchema {
  type: 'report-inspector-shell';
  emptyLabel?: string;
  noSelectionLabel?: string;
  saveLabel?: string;
  errorLabel?: string;
}

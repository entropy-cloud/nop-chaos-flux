import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerConfig,
  ReportDesignerProfile,
  ReportTemplateDocument,
} from '@nop-chaos/report-designer-core';

export type {
  ToolbarItem,
  ReportToolbarSchema,
  ReportFieldPanelSchema,
  ReportInspectorSchema,
} from './schemas.js';

export interface ReportDesignerPageSchemaInput {
  type: 'report-designer-page';
  id?: string;
  name?: string;
  label?: string;
  title?: string | SchemaInput;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  document: ReportTemplateDocument;
  config: ReportDesignerConfig;
  profile?: ReportDesignerProfile;
  adapters?: Partial<ReportDesignerAdapterRegistry>;
  statusPath?: string;
  readOnly?: boolean;
  toolbar?: BaseSchema | BaseSchema[];
  fieldPanel?: BaseSchema | BaseSchema[];
  inspector?: BaseSchema | BaseSchema[];
  dialogs?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
}

export type ReportDesignerPageSchema = BaseSchema & ReportDesignerPageSchemaInput;

export function defineReportDesignerPageSchema<T extends ReportDesignerPageSchemaInput>(
  schema: T,
): ReportDesignerPageSchema {
  return schema as unknown as ReportDesignerPageSchema;
}

export interface ReportInspectorShellSchema extends BaseSchema {
  type: 'report-inspector-shell';
  title?: string | SchemaInput;
  emptyLabel?: string;
  noSelectionLabel?: string;
  errorLabel?: string;
}

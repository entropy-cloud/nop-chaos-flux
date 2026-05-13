import type { BaseSchema, SchemaObject } from '@nop-chaos/flux-core';

export type ActionIntent = 'neutral' | 'primary' | 'danger' | 'warning' | 'success' | 'info';

export interface ToolbarItem extends SchemaObject {
  type: 'button' | 'divider' | 'spacer' | 'text' | 'badge' | 'switch' | 'title';
  id?: string;
  label?: string;
  text?: string;
  body?: string;
  icon?: string;
  action?: string;
  disabled?: boolean | string;
  active?: boolean | string;
  intent?: ActionIntent;
  level?: string;
  visible?: boolean | string;
}

export interface ReportToolbarSchema extends BaseSchema {
  type: 'report-toolbar';
  itemsOverride?: ToolbarItem[];
}

export interface ReportFieldPanelSchema extends BaseSchema {
  type: 'report-field-panel';
  fieldSources?: SchemaObject[];
  emptyLabel?: string;
  showFieldSourceHeader?: boolean;
  dragEnabled?: boolean;
  keyboardInsertEnabled?: boolean;
}

export interface ReportInspectorSchema extends BaseSchema {
  type: 'report-inspector';
  body?: SchemaObject;
  emptyLabel?: string;
  noSelectionLabel?: string;
}

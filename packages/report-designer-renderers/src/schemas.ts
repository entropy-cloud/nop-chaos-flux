import type { BaseSchema, SchemaObject } from '@nop-chaos/flux-core';

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
  variant?: 'default' | 'primary' | 'danger';
  level?: string;
  visible?: boolean | string;
}

export interface ReportToolbarSchema extends BaseSchema {
  type: 'report-toolbar';
  itemsOverride?: ToolbarItem[];
}

export interface ReportFieldPanelSchema extends BaseSchema {
  type: 'report-field-panel';
  emptyLabel?: string;
  showFieldSourceHeader?: boolean;
  dragEnabled?: boolean;
}

export interface ReportInspectorSchema extends BaseSchema {
  type: 'report-inspector';
  inspectorPanels?: SchemaObject[];
  emptyLabel?: string;
  noSelectionLabel?: string;
}

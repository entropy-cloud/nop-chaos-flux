import type {
  RendererDefinition,
  RendererRegistry,
} from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { ReportFieldPanelRenderer } from './field-panel-renderer.js';
import { ReportInspectorShellRenderer } from './inspector-shell-renderer.js';
import { ReportDesignerPageRenderer } from './page-renderer.js';
import type {
  ReportDesignerPageSchemaInput,
  ReportDesignerPageSchema,
} from './types.js';
export { defineReportDesignerPageSchema } from './types.js';

export type {
  ReportDesignerPageSchemaInput,
  ReportDesignerPageSchema,
};

export const reportDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'report-inspector-shell',
    component: ReportInspectorShellRenderer,
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
  },
  {
    type: 'report-field-panel',
    component: ReportFieldPanelRenderer,
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
  },
  {
    type: 'report-designer-page',
    component: ReportDesignerPageRenderer,
    regions: ['toolbar', 'fieldPanel', 'inspector', 'dialogs', 'body'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
  },
];

export function registerReportDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, reportDesignerRendererDefinitions);
}


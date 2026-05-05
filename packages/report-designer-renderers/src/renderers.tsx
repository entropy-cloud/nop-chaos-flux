import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-core';
import { ReportFieldPanelRenderer } from './field-panel-renderer.js';
import { ReportInspectorShellRenderer } from './inspector-shell-renderer.js';
import { ReportDesignerPageRenderer } from './page-renderer.js';
import { ReportInspectorRenderer } from './report-designer-inspector.js';
import { ReportToolbarRenderer } from './report-designer-toolbar.js';
import { reportDesignerHostContract } from './report-designer-manifest.js';
import type { ReportDesignerPageSchemaInput, ReportDesignerPageSchema } from './types.js';
export { defineReportDesignerPageSchema } from './types.js';

export type { ReportDesignerPageSchemaInput, ReportDesignerPageSchema };

export const reportDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'report-inspector-shell',
    component: ReportInspectorShellRenderer,
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
  },
  {
    type: 'report-inspector',
    component: ReportInspectorRenderer,
    fields: [{ key: 'body', kind: 'prop' }],
  },
  {
    type: 'report-field-panel',
    component: ReportFieldPanelRenderer,
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
  },
  {
    type: 'report-designer-page',
    component: ReportDesignerPageRenderer,
    displayName: 'Report Designer Page',
    sourcePackage: '@nop-chaos/report-designer-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    propContracts: {
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description: 'Publishes report designer host summary outside the host boundary.',
        editorType: 'path',
      },
      document: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Document',
        description: 'Initial report template document.',
        editorType: 'object',
        required: true,
      },
      designer: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Designer',
        description: 'Report designer runtime config.',
        editorType: 'object',
        required: true,
      },
      profile: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Profile',
        description: 'Optional report profile adapter.',
        editorType: 'object',
      },
      adapters: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Adapters',
        description: 'Optional host adapter bag.',
        editorType: 'object',
      },
    },
    regions: ['toolbar', 'fieldPanel', 'inspector', 'dialogs', 'body'],
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'document', kind: 'prop' },
      { key: 'designer', kind: 'prop' },
      { key: 'profile', kind: 'prop' },
      { key: 'adapters', kind: 'prop' },
    ],
    actionScopePolicy: 'new',
    hostContract: reportDesignerHostContract,
  },
  {
    type: 'report-toolbar',
    component: ReportToolbarRenderer,
    fields: [{ key: 'itemsOverride', kind: 'prop' }],
  },
];

export function registerReportDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, reportDesignerRendererDefinitions);
}

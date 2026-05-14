import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { reportDesignerHostContract } from './report-designer-manifest.js';
import type {
  ReportDesignerPageSchemaInput,
  ReportDesignerPageSchema,
  ReportInspectorShellSchema,
} from './types.js';
import type {
  ReportFieldPanelSchema,
  ReportInspectorSchema,
  ReportToolbarSchema,
} from './schemas.js';
export { defineReportDesignerPageSchema } from './types.js';

const LazyReportFieldPanelRenderer = createLazyRendererComponent<ReportFieldPanelSchema>(
  () => import('./field-panel-renderer.js').then((m) => m.ReportFieldPanelRenderer),
);
const LazyReportInspectorShellRenderer = createLazyRendererComponent<ReportInspectorShellSchema>(
  () => import('./inspector-shell-renderer.js').then((m) => m.ReportInspectorShellRenderer),
);
const LazyReportDesignerPageRenderer = createLazyRendererComponent<ReportDesignerPageSchema>(
  () => import('./page-renderer.js').then((m) => m.ReportDesignerPageRenderer),
);
const LazyReportInspectorRenderer = createLazyRendererComponent<ReportInspectorSchema>(
  () => import('./report-designer-inspector.js').then((m) => m.ReportInspectorRenderer),
);
const LazyReportToolbarRenderer = createLazyRendererComponent<ReportToolbarSchema>(
  () => import('./report-designer-toolbar.js').then((m) => m.ReportToolbarRenderer),
);

const actionIntentShape = {
  kind: 'union' as const,
  anyOf: [
    { kind: 'literal' as const, value: 'neutral' },
    { kind: 'literal' as const, value: 'primary' },
    { kind: 'literal' as const, value: 'danger' },
    { kind: 'literal' as const, value: 'warning' },
    { kind: 'literal' as const, value: 'success' },
    { kind: 'literal' as const, value: 'info' },
  ],
};

export type { ReportDesignerPageSchemaInput, ReportDesignerPageSchema };

export const reportDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'report-inspector-shell',
    component: LazyReportInspectorShellRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'noSelectionLabel', kind: 'prop' },
      { key: 'errorLabel', kind: 'prop' },
    ],
  },
  {
    type: 'report-inspector',
    component: LazyReportInspectorRenderer,
    fields: [
      { key: 'body', kind: 'prop' },
      { key: 'emptyLabel', kind: 'prop' },
      { key: 'noSelectionLabel', kind: 'prop' },
    ],
  },
  {
    type: 'report-field-panel',
    component: LazyReportFieldPanelRenderer,
      fields: [
        { key: 'title', kind: 'value-or-region', regionKey: 'title' },
        { key: 'fieldSources', kind: 'prop' },
        { key: 'emptyLabel', kind: 'prop' },
        { key: 'showFieldSourceHeader', kind: 'prop' },
        { key: 'dragEnabled', kind: 'prop' },
        { key: 'keyboardInsertEnabled', kind: 'prop' },
      ],
    },
  {
    type: 'report-designer-page',
    component: LazyReportDesignerPageRenderer,
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
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'document', kind: 'prop' },
      { key: 'designer', kind: 'prop' },
      { key: 'profile', kind: 'prop' },
      { key: 'adapters', kind: 'prop' },
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'fieldPanel', kind: 'region', regionKey: 'fieldPanel' },
      { key: 'inspector', kind: 'region', regionKey: 'inspector' },
      { key: 'dialogs', kind: 'region', regionKey: 'dialogs' },
      { key: 'body', kind: 'region', regionKey: 'body' },
    ],
    actionScopePolicy: 'new',
    hostContract: reportDesignerHostContract,
  },
  {
    type: 'report-toolbar',
    component: LazyReportToolbarRenderer,
    propContracts: {
      itemsOverride: {
        shape: {
          kind: 'array',
          item: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              intent: actionIntentShape,
            },
            optional: ['type', 'intent'],
          },
        },
        displayName: 'Items Override',
        description: 'Toolbar item overrides merged with report toolbar defaults.',
        editorType: 'object-array',
      },
    },
    fields: [{ key: 'itemsOverride', kind: 'prop' }],
  },
];

export function registerReportDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, reportDesignerRendererDefinitions);
}

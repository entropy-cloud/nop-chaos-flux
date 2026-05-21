import type { BaseSchema, FieldCompileContext, RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import type { RendererAuthoringTransformContext } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { reportDesignerHostContract } from './report-designer-manifest.js';
import type {
  ReportDesignerPageSchemaInput,
  ReportDesignerPageSchema,
  ReportInspectorShellSchema,
} from './types.js';
import type { ReportDesignerConfig } from '@nop-chaos/report-designer-core';
import type {
  ReportFieldPanelSchema,
  ReportInspectorSchema,
  ReportToolbarSchema,
} from './schemas.js';
import { ReportFieldPanelRenderer } from './field-panel-renderer.js';
import { ReportInspectorShellRenderer } from './inspector-shell-renderer.js';
import { ReportDesignerPageRenderer } from './page-renderer.js';
import { ReportInspectorRenderer } from './report-designer-inspector.js';
import { ReportToolbarRenderer } from './report-designer-toolbar.js';
export { defineReportDesignerPageSchema } from './types.js';

function authoringTransformReportDesignerPage(
  context: RendererAuthoringTransformContext<BaseSchema>,
): BaseSchema {
  const next = { ...context.schema } as BaseSchema & { config?: ReportDesignerConfig; designer?: ReportDesignerConfig };
  if (next.config === undefined && next.designer !== undefined) {
    next.config = next.designer;
    delete next.designer;
  }
  return next;
}

const useEagerRenderersInTests =
  (globalThis as { process?: { env?: { VITEST?: string } } }).process?.env?.VITEST === 'true';

const LazyReportFieldPanelRenderer = useEagerRenderersInTests
  ? ReportFieldPanelRenderer
  : createLazyRendererComponent<ReportFieldPanelSchema>(
      () => import('./field-panel-renderer.js').then((m) => m.ReportFieldPanelRenderer),
    );
const LazyReportInspectorShellRenderer = useEagerRenderersInTests
  ? ReportInspectorShellRenderer
  : createLazyRendererComponent<ReportInspectorShellSchema>(
      () => import('./inspector-shell-renderer.js').then((m) => m.ReportInspectorShellRenderer),
    );
const LazyReportDesignerPageRenderer = useEagerRenderersInTests
  ? ReportDesignerPageRenderer
  : createLazyRendererComponent<ReportDesignerPageSchema>(
      () => import('./page-renderer.js').then((m) => m.ReportDesignerPageRenderer),
    );
const LazyReportInspectorRenderer = useEagerRenderersInTests
  ? ReportInspectorRenderer
  : createLazyRendererComponent<ReportInspectorSchema>(
      () => import('./report-designer-inspector.js').then((m) => m.ReportInspectorRenderer),
    );
const LazyReportToolbarRenderer = useEagerRenderersInTests
  ? ReportToolbarRenderer
  : createLazyRendererComponent<ReportToolbarSchema>(
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

const reportDesignerConfigShape = {
  kind: 'object' as const,
  fields: {
    kind: { kind: 'string' as const },
    fieldSources: { kind: 'array' as const, item: { kind: 'object' as const, fields: {} } },
    maxUndoDepth: { kind: 'number' as const },
    features: {
      kind: 'object' as const,
      fields: {
        fieldPanel: { kind: 'boolean' as const },
        inspector: { kind: 'boolean' as const },
        preview: { kind: 'boolean' as const },
        expressionEditor: { kind: 'boolean' as const },
        dragFieldToCell: { kind: 'boolean' as const },
        dragFieldToRange: { kind: 'boolean' as const },
        customPropertyPanels: { kind: 'boolean' as const },
      },
      optional: [
        'fieldPanel',
        'inspector',
        'preview',
        'expressionEditor',
        'dragFieldToCell',
        'dragFieldToRange',
        'customPropertyPanels',
      ],
    },
    inspector: {
      kind: 'object' as const,
      fields: {
        mode: {
          kind: 'union' as const,
          anyOf: [
            { kind: 'literal' as const, value: 'panel' },
            { kind: 'literal' as const, value: 'drawer' },
          ],
        },
        body: { kind: 'object' as const, fields: {} },
        byTarget: { kind: 'object' as const, fields: {} },
        byProfile: { kind: 'object' as const, fields: {} },
      },
      optional: ['mode', 'body', 'byTarget', 'byProfile'],
    },
    preview: {
      kind: 'object' as const,
      fields: {
        provider: { kind: 'string' as const },
      },
      optional: ['provider'],
    },
  },
  optional: ['kind', 'fieldSources', 'maxUndoDepth', 'features', 'inspector', 'preview'],
};

function compileToolbarItemsOverride(
  value: unknown,
  context: FieldCompileContext,
): unknown {
  if (!Array.isArray(value)) {
    return context.compileValue(value);
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return context.compileValue(item, `${context.sourcePath}[${index}]`);
    }

    return compileToolbarItem(item as Record<string, unknown>, context, index);
  });
}

function validateReportToolbarItems(context: import('@nop-chaos/flux-core').RendererSchemaValidationContext<ReportToolbarSchema>) {
  const items = context.schema.itemsOverride;
  if (!Array.isArray(items)) {
    return;
  }

  items.forEach((item, index) => {
    for (const key of ['disabled', 'active', 'visible'] as const) {
      const value = item[key];
      if (value === undefined || typeof value === 'boolean') {
        continue;
      }
      if (typeof value === 'string' && value.trim().startsWith('${') && value.trim().endsWith('}')) {
        continue;
      }

      context.emit({
        code: 'invalid-property-value',
        path: `/itemsOverride/${index}/${key}`,
        message: `Invalid boolean value for report toolbar item "${key}". Use a boolean literal or a \${expr} expression.`,
      });
    }
  });
}

function compileToolbarItem(
  item: Record<string, unknown>,
  context: FieldCompileContext,
  index: number,
) {
  const normalizeBooleanLikeCandidate = (candidate: unknown): boolean | undefined =>
    typeof candidate === 'boolean' ? candidate : undefined;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    const sourcePath = `${context.sourcePath}[${index}].${key}`;
    result[key] = context.compileValue(value, sourcePath);
    if (key === 'disabled' || key === 'active' || key === 'visible') {
      result[key] = context.compileValue(value, sourcePath, {
        transform: normalizeBooleanLikeCandidate,
      });
    }
  }

  return result;
}

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
    authoringTransform: authoringTransformReportDesignerPage,
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
      config: {
        shape: reportDesignerConfigShape,
        displayName: 'Config',
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
      { key: 'config', kind: 'prop' },
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
    schemaValidator: validateReportToolbarItems,
    fields: [{ key: 'itemsOverride', kind: 'prop', compile: compileToolbarItemsOverride }],
  },
];

export function registerReportDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, reportDesignerRendererDefinitions);
}

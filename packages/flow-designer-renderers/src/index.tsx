import './designer-theme.css';
import {
  isPlainObject,
  isSchemaInput,
  registerRendererDefinitions,
  type FieldCompileContext,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { ActionIntent } from '@nop-chaos/flow-designer-core';
import { designerHostContract } from './designer-manifest.js';
import {
  DesignerCanvasRenderer,
  DesignerPageRenderer,
  DesignerPaletteRenderer,
} from './designer-page.js';
import { DesignerFieldRenderer } from './designer-field.js';
import type {
  DesignerPageSchema,
  DesignerFieldSchema,
  DesignerCanvasSchema,
  DesignerPaletteSchema,
} from './schemas.js';

const useEagerRenderersInTests =
  (globalThis as { process?: { env?: { VITEST?: string } } }).process?.env?.VITEST === 'true';

const LazyDesignerPageRenderer = useEagerRenderersInTests
  ? DesignerPageRenderer
  : createLazyRendererComponent<DesignerPageSchema>(
      () => import('./designer-page.js').then((m) => m.DesignerPageRenderer),
    );
const LazyDesignerCanvasRenderer = useEagerRenderersInTests
  ? DesignerCanvasRenderer
  : createLazyRendererComponent<DesignerCanvasSchema>(
      () => import('./designer-page.js').then((m) => m.DesignerCanvasRenderer),
    );
const LazyDesignerPaletteRenderer = useEagerRenderersInTests
  ? DesignerPaletteRenderer
  : createLazyRendererComponent<DesignerPaletteSchema>(
      () => import('./designer-page.js').then((m) => m.DesignerPaletteRenderer),
    );
const LazyDesignerFieldRenderer = useEagerRenderersInTests
  ? DesignerFieldRenderer
  : createLazyRendererComponent<DesignerFieldSchema>(
      () => import('./designer-field.js').then((m) => m.DesignerFieldRenderer),
    );

function compileDesignerConfig(value: unknown, context: FieldCompileContext): unknown {
  const normalizeBooleanLikeCandidate = (candidate: unknown): boolean | undefined =>
    typeof candidate === 'boolean' ? candidate : undefined;

  if (!isPlainObject(value) && context.sourcePath.endsWith('.config')) {
    return context.compileValue(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      compileDesignerConfig(item, { ...context, sourcePath: `${context.sourcePath}.${index}` }),
    );
  }

  if (!isPlainObject(value)) {
    return context.compileValue(value);
  }

  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    const childPath = `${context.sourcePath}.${key}`;

    if (isSchemaInput(child)) {
      result[key] = child;
      continue;
    }

    if (key === 'disabled' || key === 'active' || key === 'visible') {
      result[key] = context.compileValue(child, childPath, {
        transform: normalizeBooleanLikeCandidate,
      });
    } else {
      result[key] = compileDesignerConfig(child, {
        ...context,
        sourcePath: childPath,
      });
    }
  }

  return result;
}

export * from './schemas.js';
export { createDesignerActionProvider } from './designer-action-provider.js';
export {
  FLOW_DESIGNER_MANIFEST_V1,
  resolveDesignerManifest,
  designerHostContract,
  DESIGNER_CAPABILITY_PUBLICATION,
} from './designer-manifest.js';

function validateDesignerToolbarIntent(value: unknown): value is ActionIntent {
  return (
    value === 'neutral' ||
    value === 'primary' ||
    value === 'danger' ||
    value === 'warning' ||
    value === 'success' ||
    value === 'info'
  );
}

function validateDesignerConfigToolbar(context: import('@nop-chaos/flux-core').RendererSchemaValidationContext) {
  if (context.schema.type !== 'designer-page') {
    return;
  }

  const config = (context.schema as { config?: unknown }).config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return;
  }

  const toolbar = (config as { toolbar?: { items?: unknown } }).toolbar;
  if (!toolbar || !Array.isArray(toolbar.items)) {
    return;
  }

  toolbar.items.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return;
    }

    const button = item as { type?: unknown; intent?: unknown };
    for (const key of ['disabled', 'active', 'visible'] as const) {
      const value = (item as Record<string, unknown>)[key];
      if (value === undefined || typeof value === 'boolean') {
        continue;
      }
      if (typeof value === 'string' && value.trim().startsWith('${') && value.trim().endsWith('}')) {
        continue;
      }

      context.emit({
        code: 'invalid-property-value',
        path: `/config/toolbar/items/${index}/${key}`,
        message: `Invalid boolean value for Flow Designer toolbar item "${key}". Use a boolean literal or a \${expr} expression.`,
      });
    }

    if (button.type !== 'button' || button.intent === undefined) {
      return;
    }

    if (!validateDesignerToolbarIntent(button.intent)) {
      context.emit({
        code: 'invalid-property-value',
        path: `/config/toolbar/items/${index}/intent`,
        message:
          'Invalid value for property "intent" on Flow Designer toolbar button. Expected neutral | primary | danger | warning | success | info.',
      });
    }
  });
}

export const flowDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'designer-page',
    component: LazyDesignerPageRenderer,
    displayName: 'Designer Page',
    sourcePackage: '@nop-chaos/flow-designer-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    propContracts: {
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description: 'Publishes designer host summary outside the host boundary.',
        editorType: 'path',
      },
      document: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Document',
        description: 'Initial designer graph document.',
        editorType: 'object',
      },
      treeDocument: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Tree Document',
        description: 'Initial designer tree document for tree mode.',
        editorType: 'object',
      },
      config: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Config',
        description: 'Designer host configuration.',
        editorType: 'designer-config',
        required: true,
      },
    },
    schemaValidator: validateDesignerConfigToolbar,
    scopeExportContracts: {
      $designer: {
        kind: 'object',
        fields: {
          kind: { kind: 'literal', value: 'designer' },
          dirty: { kind: 'boolean' },
          busy: { kind: 'boolean' },
          canUndo: { kind: 'boolean' },
          canRedo: { kind: 'boolean' },
          selectionKind: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'node' },
              { kind: 'literal', value: 'edge' },
              { kind: 'literal', value: 'none' },
            ],
          },
          selectionCount: { kind: 'number' },
        },
      },
    },
    fields: [
      { key: 'statusPath', kind: 'prop' },
      { key: 'document', kind: 'prop' },
      { key: 'treeDocument', kind: 'prop' },
      { key: 'config', kind: 'prop', compile: compileDesignerConfig },
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'inspector', kind: 'region', regionKey: 'inspector' },
      { key: 'dialogs', kind: 'region', regionKey: 'dialogs' },
    ],
    actionScopePolicy: 'new',
    hostContract: designerHostContract,
  },
  {
    type: 'designer-field',
    component: LazyDesignerFieldRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'name', kind: 'prop' },
      { key: 'fieldType', kind: 'prop' },
      { key: 'options', kind: 'prop' },
    ],
  },
  {
    type: 'designer-canvas',
    component: LazyDesignerCanvasRenderer,
    fields: [{ key: 'className', kind: 'prop' }],
  },
  {
    type: 'designer-palette',
    component: LazyDesignerPaletteRenderer,
    fields: [{ key: 'className', kind: 'prop' }],
  },
];

export function registerFlowDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, flowDesignerRendererDefinitions);
}

export function extendFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
  return registerFlowDesignerRenderers(baseRegistry);
}

/**
 * @deprecated Use `extendFlowDesignerRegistry()` for register/extend semantics.
 */
export function createFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
  return extendFlowDesignerRegistry(baseRegistry);
}

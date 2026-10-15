import {
  registerRendererDefinitions,
  type RegisteredRendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { wordEditorHostContract } from './word-editor-manifest.js';
import type { WordEditorPageSchema } from './types.js';
import { WordEditorPage } from './word-editor-page.js';
export { defineWordEditorPageSchema } from './types.js';
export type { WordEditorPageSchema, WordEditorPageSchemaInput } from './types.js';

const useEagerRenderersInTests =
  (globalThis as { process?: { env?: { VITEST?: string } } }).process?.env?.VITEST === 'true';

const LazyWordEditorPage = useEagerRenderersInTests
  ? WordEditorPage
  : createLazyRendererComponent<WordEditorPageSchema>(
      () => import('./word-editor-page.js').then((m) => m.WordEditorPage),
    );

const wordEditorPanelConfigShape = {
  kind: 'object' as const,
  fields: {
    generator: { kind: 'literal' as const, value: 'default' },
  },
  optional: ['generator'],
};

// P3.2（plan 553，裁决③）：payload 统一 `serialized` primary；旧 SavedDocumentData 三顶层键
// 保留一版兼容读（description 注记 deprecated；FluxValueShape 无结构化 deprecated 标志）。
const savedDocumentDataShape = {
  kind: 'object' as const,
  fields: {
    serialized: { kind: 'string' as const, description: 'Serialized document JSON (primary, P3.2 裁决③).' },
    data: { kind: 'object' as const, fields: {}, description: 'Deprecated compat: saved document object (one version).' },
    paperSettings: { kind: 'object' as const, fields: {}, description: 'Deprecated compat: paper settings (one version).' },
    savedAt: { kind: 'string' as const, description: 'Deprecated compat: save timestamp (one version).' },
  },
};

export const wordEditorRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'word-editor-page',
    component: LazyWordEditorPage,
    displayName: 'Word Editor Page',
    sourcePackage: '@nop-chaos/word-editor-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      {
        key: 'config',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'object',
            fields: {
              leftPanel: wordEditorPanelConfigShape,
              rightPanel: wordEditorPanelConfigShape,
            },
            optional: ['leftPanel', 'rightPanel'],
          },
          displayName: 'Config',
          description: 'Config-driven side-panel contract for the word editor workbench shell.',
          editorType: 'object',
        },
      },
      {
        key: 'statusPath',
        kind: 'prop',
        contract: {
          shape: { kind: 'string' },
          displayName: 'Status Path',
          description: 'Publishes word editor host summary outside the host boundary.',
          editorType: 'path',
        },
      },
      {
        key: 'onBack',
        kind: 'event',
        contract: {
          displayName: 'Back',
          description: 'Handles navigation back from the workbench shell.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'string' },
              nativeEvent: { kind: 'unknown' },
              currentTarget: { kind: 'unknown' },
              target: { kind: 'unknown' },
            },
            optional: ['nativeEvent', 'currentTarget', 'target'],
          },
        },
      },
      {
        key: 'onSave',
        kind: 'event',
        contract: {
          displayName: 'Save',
          description: 'Handles save completion for the current document.',
          payload: savedDocumentDataShape,
        },
      },
      {
        key: 'initialDocument',
        kind: 'prop',
        contract: {
          shape: { kind: 'object', fields: {} },
          displayName: 'Initial Document',
          description: 'Initial word document data.',
          editorType: 'object',
        },
      },
      {
        key: 'datasets',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'object', fields: {} } },
          displayName: 'Datasets',
          description: 'Initial dataset definitions available to the editor.',
          editorType: 'array',
        },
      },
      {
        key: 'initialCharts',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'object', fields: {} } },
          displayName: 'Initial Charts',
          description: 'Initial chart placeholders.',
          editorType: 'array',
        },
      },
      {
        key: 'initialCodes',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'object', fields: {} } },
          displayName: 'Initial Codes',
          description: 'Initial code placeholders.',
          editorType: 'array',
        },
      },
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'leftPanel', kind: 'region', regionKey: 'leftPanel' },
      { key: 'rightPanel', kind: 'region', regionKey: 'rightPanel' },
    ],
    actionScopePolicy: 'new',
    hostContract: wordEditorHostContract,
  },
];

export function registerWordEditorRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, wordEditorRendererDefinitions);
}

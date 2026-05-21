import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { SavedDocumentData } from '@nop-chaos/word-editor-core';
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

const savedDocumentDataShape = {
  kind: 'object' as const,
  fields: {
    data: { kind: 'object' as const, fields: {} },
    paperSettings: { kind: 'object' as const, fields: {} },
    savedAt: { kind: 'string' as const },
  },
} satisfies {
  kind: 'object';
  fields: Record<keyof SavedDocumentData, unknown>;
};

export const wordEditorRendererDefinitions: RendererDefinition[] = [
  {
    type: 'word-editor-page',
    component: LazyWordEditorPage,
    displayName: 'Word Editor Page',
    sourcePackage: '@nop-chaos/word-editor-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    propContracts: {
      config: {
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
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description: 'Publishes word editor host summary outside the host boundary.',
        editorType: 'path',
      },
      initialDocument: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Initial Document',
        description: 'Initial word document data.',
        editorType: 'object',
      },
      datasets: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Datasets',
        description: 'Initial dataset definitions available to the editor.',
        editorType: 'array',
      },
      initialCharts: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Initial Charts',
        description: 'Initial chart placeholders.',
        editorType: 'array',
      },
      initialCodes: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Initial Codes',
        description: 'Initial code placeholders.',
        editorType: 'array',
      },
    },
    eventContracts: {
      onBack: {
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
      onSave: {
        displayName: 'Save',
        description: 'Handles save completion for the current document.',
        payload: savedDocumentDataShape,
      },
    },
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'config', kind: 'prop' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'onBack', kind: 'event' },
      { key: 'onSave', kind: 'event' },
      { key: 'initialDocument', kind: 'prop' },
      { key: 'datasets', kind: 'prop' },
      { key: 'initialCharts', kind: 'prop' },
      { key: 'initialCodes', kind: 'prop' },
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

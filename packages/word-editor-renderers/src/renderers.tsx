import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { WordEditorPage } from './word-editor-page.js';
import { wordEditorHostContract } from './word-editor-manifest.js';
export { defineWordEditorPageSchema } from './types.js';
export type { WordEditorPageSchema, WordEditorPageSchemaInput } from './types.js';

export const wordEditorRendererDefinitions: RendererDefinition[] = [
  {
    type: 'word-editor-page',
    component: WordEditorPage,
    displayName: 'Word Editor Page',
    sourcePackage: '@nop-chaos/word-editor-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    propContracts: {
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
        payload: { kind: 'object', fields: {} },
      },
      onSave: {
        displayName: 'Save',
        description: 'Handles save completion for the current document.',
        payload: { kind: 'object', fields: {} },
      },
    },
    regions: ['toolbar', 'leftPanel', 'rightPanel'],
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'onBack', kind: 'event' },
      { key: 'onSave', kind: 'event' },
      { key: 'initialDocument', kind: 'prop' },
      { key: 'datasets', kind: 'prop' },
      { key: 'initialCharts', kind: 'prop' },
      { key: 'initialCodes', kind: 'prop' },
    ],
    actionScopePolicy: 'new',
    hostContract: wordEditorHostContract,
  },
];

export function registerWordEditorRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, wordEditorRendererDefinitions);
}

import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { WordEditorPage } from './word-editor-page.js';
import { wordEditorHostContract } from './word-editor-manifest.js';
export { defineWordEditorPageSchema } from './types.js';
export type { WordEditorPageSchema, WordEditorPageSchemaInput } from './types.js';

export const wordEditorRendererDefinitions: RendererDefinition[] = [
  {
    type: 'word-editor-page',
    component: WordEditorPage,
    regions: ['toolbar', 'leftPanel', 'rightPanel'],
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
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

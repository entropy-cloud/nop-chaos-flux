import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { SpreadsheetPageRenderer } from './page-renderer.js';

export const spreadsheetRendererDefinitions: RendererDefinition[] = [
  {
    type: 'spreadsheet-page',
    component: SpreadsheetPageRenderer,
    regions: ['toolbar', 'body', 'dialogs'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
  },
];

export function registerSpreadsheetRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, spreadsheetRendererDefinitions);
}

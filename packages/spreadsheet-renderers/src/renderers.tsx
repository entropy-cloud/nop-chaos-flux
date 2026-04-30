import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { SpreadsheetPageRenderer } from './page-renderer.js';
import { spreadsheetHostContract } from './spreadsheet-manifest.js';

export const spreadsheetRendererDefinitions: RendererDefinition[] = [
  {
    type: 'spreadsheet-page',
    component: SpreadsheetPageRenderer,
    regions: ['toolbar', 'body', 'dialogs'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
    actionScopePolicy: 'new',
    hostContract: spreadsheetHostContract,
  },
];

export function registerSpreadsheetRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, spreadsheetRendererDefinitions);
}

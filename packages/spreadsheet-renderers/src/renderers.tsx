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
    displayName: 'Spreadsheet Page',
    sourcePackage: '@nop-chaos/spreadsheet-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    propContracts: {
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description: 'Publishes spreadsheet host summary outside the host boundary.',
        editorType: 'path',
      },
      document: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Document',
        description: 'Initial workbook document.',
        editorType: 'object',
        required: true,
      },
      config: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Config',
        description: 'Spreadsheet host configuration.',
        editorType: 'object',
      },
      readOnly: {
        shape: { kind: 'boolean' },
        displayName: 'Read Only',
        description: 'Locks editing interactions while keeping host projections readable.',
        editorType: 'boolean',
      },
    },
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
      { key: 'statusPath', kind: 'prop' },
      { key: 'document', kind: 'prop' },
      { key: 'config', kind: 'prop' },
      { key: 'readOnly', kind: 'prop' },
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'body', kind: 'region', regionKey: 'body' },
      { key: 'dialogs', kind: 'region', regionKey: 'dialogs' },
    ],
    actionScopePolicy: 'new',
    hostContract: spreadsheetHostContract,
  },
];

export function registerSpreadsheetRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, spreadsheetRendererDefinitions);
}

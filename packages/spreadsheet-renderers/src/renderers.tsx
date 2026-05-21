import '@nop-chaos/spreadsheet-renderers/canvas-styles.css';
import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import { spreadsheetHostContract } from './spreadsheet-manifest.js';
import type { SpreadsheetPageSchema } from './types.js';

const LazySpreadsheetPageRenderer = createLazyRendererComponent<SpreadsheetPageSchema>(
  () => import('./page-renderer.js').then((m) => m.SpreadsheetPageRenderer),
);

export const spreadsheetRendererDefinitions: RendererDefinition[] = [
  {
    type: 'spreadsheet-page',
    component: LazySpreadsheetPageRenderer,
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
        shape: {
          kind: 'object',
          fields: {
            defaultRowHeight: { kind: 'number' },
            defaultColumnWidth: { kind: 'number' },
            maxUndoDepth: { kind: 'number' },
          },
          optional: ['defaultRowHeight', 'defaultColumnWidth', 'maxUndoDepth'],
        },
        displayName: 'Config',
        description: 'Spreadsheet host configuration. The current supported knobs are default row height, default column width, and undo depth.',
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

import type { RendererDefinition } from '@nop-chaos/flux-core';
import { DashboardEditorRenderer } from './dashboard-editor-renderer.js';

/** dashboard editor renderer definition（编辑态：palette/canvas/inspector + editor-core 会话）。 */
export const dashboardEditorRendererDefinition: RendererDefinition = {
  type: 'dashboard-editor',
  displayName: 'Dashboard Editor',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-dashboard',
  component: DashboardEditorRenderer,
  propContracts: {
    layout: {
      shape: { kind: 'unknown' },
      displayName: 'Layout',
      description:
        'Initial layout document: { panels: [{ id, type, x, y, w, h, title?, props?, source? }] } (object or JSON string; expression usable).',
      editorType: 'expression',
    },
    cols: {
      shape: { kind: 'number' },
      displayName: 'Columns',
      description: 'Grid column count (default 12).',
      editorType: 'expression',
    },
    rowHeight: {
      shape: { kind: 'number' },
      displayName: 'Row Height',
      description: 'Grid row height in px (default 40).',
      editorType: 'expression',
    },
    gap: {
      shape: { kind: 'number' },
      displayName: 'Gap',
      description: 'Panel gap in px (default 8).',
      editorType: 'expression',
    },
    height: {
      shape: { kind: 'number' },
      displayName: 'Height',
      description: 'Canvas height in px (default 600).',
      editorType: 'expression',
    },
    mode: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'edit' },
          { kind: 'literal', value: 'preview' },
        ],
      },
      displayName: 'Mode',
      description: 'Initial editor mode (default edit).',
      editorType: 'select',
    },
    commitPolicy: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'manual' },
          { kind: 'literal', value: 'auto' },
        ],
      },
      displayName: 'Commit Policy',
      description: 'manual (default): explicit Save commits; auto: every change commits.',
      editorType: 'select',
      defaultValue: 'manual',
    },
  },
  eventContracts: {
    onSave: {
      displayName: 'On Save',
      description:
        'Dispatched as dashboard-editor:save after a successful commit. Payload: { serialized }.',
      payload: {
        kind: 'object',
        fields: {
          serialized: { kind: 'string' },
        },
      },
    },
    onError: {
      displayName: 'On Error',
      description:
        'Dispatched as dashboard-editor:error when a save fails. Payload: { code, message }.',
      payload: {
        kind: 'object',
        fields: {
          code: { kind: 'string' },
          message: { kind: 'string' },
        },
      },
    },
  },
  fields: [
    { key: 'layout', kind: 'prop' },
    { key: 'cols', kind: 'prop' },
    { key: 'rowHeight', kind: 'prop' },
    { key: 'gap', kind: 'prop' },
    { key: 'height', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'commitPolicy', kind: 'prop' },
    { key: 'onSave', kind: 'event' },
    { key: 'onError', kind: 'event' },
  ],
};

import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { DashboardEditorRenderer } from './dashboard-editor-renderer.js';
import { dashboardEditorHostContract } from './dashboard-editor-manifest.js';

/** dashboard editor renderer definition（编辑态：palette/canvas/inspector + editor-core 会话）。 */
export const dashboardEditorRendererDefinition: RegisteredRendererDefinition = {
  type: 'dashboard-editor',
  displayName: 'Dashboard Editor',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-dashboard',
  rendererClass: 'domain-host-renderer',
  component: DashboardEditorRenderer,
  hostContract: dashboardEditorHostContract,
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
    statusPath: {
      shape: { kind: 'string' },
      displayName: 'Status Path',
      description: 'Host runtime status publication path (P3.3): {kind, dirty, busy, error, canUndo, canRedo, selectionCount}.',
      editorType: 'expression',
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
    onSessionChange: {
      displayName: 'Session Change',
      description:
        'Dispatched as dashboard-editor:sessionChange on any session notify (P3.2 minimal event set). Payload: session summary.',
      payload: {
        kind: 'object',
        fields: {
          canUndo: { kind: 'boolean' },
          canRedo: { kind: 'boolean' },
          dirty: { kind: 'boolean' },
          selection: { kind: 'array', item: { kind: 'string' } },
          mode: { kind: 'string' },
        },
      },
    },
    onModeChange: {
      displayName: 'Mode Change',
      description:
        'Dispatched as dashboard-editor:modeChange when the editor switches edit/preview (P3.2). Payload: { mode }.',
      payload: {
        kind: 'object',
        fields: {
          mode: { kind: 'string' },
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
    { key: 'onSessionChange', kind: 'event' },
    { key: 'onModeChange', kind: 'event' },
    { key: 'statusPath', kind: 'prop' },
  ],
};

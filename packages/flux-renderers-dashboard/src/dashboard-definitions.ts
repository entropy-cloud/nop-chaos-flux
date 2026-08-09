import type { RendererDefinition } from '@nop-chaos/flux-core';
import { DashboardRenderer } from './dashboard-renderer.js';

/** dashboard 运行态 renderer definition（编辑态 `dashboard-editor` 见 editor/）。 */
export const dashboardRendererDefinition: RendererDefinition = {
  type: 'dashboard',
  displayName: 'Dashboard',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-dashboard',
  component: DashboardRenderer,
  propContracts: {
    panels: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            id: 'value',
            type: 'value',
            title: 'value',
            x: 'value',
            y: 'value',
            w: 'value',
            h: 'value',
            props: 'value',
            source: 'value',
          },
        },
      },
      displayName: 'Panels',
      description:
        'Dashboard panel list. Each panel: { id, type, x, y, w, h, title?, props?, source? }. Grid coordinates (x/y/w/h) are shared between edit and runtime.',
      editorType: 'object-array',
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
      description: 'Canvas height in px (default derived from panel bounds).',
      editorType: 'expression',
    },
  },
  fields: [
    { key: 'panels', kind: 'prop' },
    { key: 'cols', kind: 'prop' },
    { key: 'rowHeight', kind: 'prop' },
    { key: 'gap', kind: 'prop' },
    { key: 'height', kind: 'prop' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
  ],
};

import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { DashboardRenderer } from './dashboard-renderer.js';

/** dashboard 运行态 renderer definition（编辑态 `dashboard-editor` 见 editor/）。 */
export const dashboardRendererDefinition: RegisteredRendererDefinition = {
  type: 'dashboard',
  displayName: 'Dashboard',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-dashboard',
  component: DashboardRenderer,
  fields: [
    {
      key: 'panels',
      kind: 'prop',
      contract: {
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
    },
    {
      key: 'cols',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Columns',
        description: 'Grid column count (default 12).',
        editorType: 'expression',
      },
    },
    {
      key: 'rowHeight',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Row Height',
        description: 'Grid row height in px (default 40).',
        editorType: 'expression',
      },
    },
    {
      key: 'gap',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Gap',
        description: 'Panel gap in px (default 8).',
        editorType: 'expression',
      },
    },
    {
      key: 'height',
      kind: 'prop',
      contract: {
        shape: { kind: 'number' },
        displayName: 'Height',
        description: 'Canvas height in px (default derived from panel bounds).',
        editorType: 'expression',
      },
    },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
  ],
};

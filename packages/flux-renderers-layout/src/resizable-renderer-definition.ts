import type { RendererDefinition } from '@nop-chaos/flux-core';
import { ResizableRenderer } from './resizable-renderer.js';

export const resizableRendererDefinition: RendererDefinition = {
  type: 'resizable',
  displayName: 'Resizable',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-layout',
  component: ResizableRenderer,
  propContracts: {
    direction: {
      shape: {
        kind: 'union',
        anyOf: ['horizontal', 'vertical'].map((v) => ({ kind: 'literal', value: v })),
      },
      displayName: 'Direction',
      description: "Split axis. Default 'horizontal' (side-by-side columns).",
      editorType: 'select',
      defaultValue: 'horizontal',
    },
    persistStatePath: {
      shape: { kind: 'string' },
      displayName: 'Persist State Path',
      description:
        'Scope path receiving the panel size percentages after each drag settle; seeded back on mount (corrupt values fall back to defaultSize). Omit for no persistence.',
      editorType: 'expression',
    },
    panels: {
      shape: {
        kind: 'array',
        item: {
          kind: 'schema-definition',
          fieldRules: {
            key: 'literal',
            defaultSize: 'literal',
            min: 'literal',
            max: 'literal',
            body: {
              kind: 'region',
              regionKey: 'bodyRegionKey',
              isolate: false,
            },
          },
        },
      },
      displayName: 'Panels',
      description:
        'Split panes in order. key is required and unique; defaultSize/min/max are percentages; each panel body renders its own schema.',
      editorType: 'object-array',
    },
  },
  fields: [
    { key: 'direction', kind: 'prop' },
    { key: 'persistStatePath', kind: 'prop' },
    { key: 'panels', kind: 'prop' },
  ],
  defaultSchema: {
    type: 'resizable',
    direction: 'horizontal',
    panels: [{ key: 'left', defaultSize: 30 }, { key: 'right' }],
  },
};


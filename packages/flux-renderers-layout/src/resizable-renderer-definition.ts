import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { ResizableRenderer } from './resizable-renderer.js';

/**
 * Capability contracts for collapsible resizable panels: `component:collapse` /
 * `component:expand` / `component:toggle` actions with `componentId` equal to a
 * panel's `id`/`key` drive the imperative react-resizable-panels API (same
 * contract family as dialog / drawer / palette surfaces).
 */
const resizablePanelCapabilityContracts = [
  {
    handle: 'collapse',
    displayName: 'Collapse',
    description:
      'Collapse the resizable panel to its collapsedSize. No-op when already collapsed; returns { ok: true, skipped: true } in that case.',
  },
  {
    handle: 'expand',
    displayName: 'Expand',
    description:
      'Expand a collapsed resizable panel back to its most recent size. No-op when already expanded; returns { ok: true, skipped: true } in that case.',
  },
  {
    handle: 'toggle',
    displayName: 'Toggle',
    description: 'Toggle the resizable panel between collapsed and expanded states.',
  },
] as const;

export const resizableRendererDefinition: RegisteredRendererDefinition = {
  type: 'resizable',
  displayName: 'Resizable',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-layout',
  component: ResizableRenderer,
  componentCapabilityContracts: resizablePanelCapabilityContracts,
  fields: [
    {
      key: 'direction',
      kind: 'prop',
      contract: {
        shape: {
          kind: 'union',
          anyOf: ['horizontal', 'vertical'].map((v) => ({ kind: 'literal', value: v })),
        },
        displayName: 'Direction',
        description: "Split axis. Default 'horizontal' (side-by-side columns).",
        editorType: 'select',
        defaultValue: 'horizontal',
      },
    },
    {
      key: 'persistStatePath',
      kind: 'prop',
      contract: {
        shape: { kind: 'string' },
        displayName: 'Persist State Path',
        description:
          'Scope path receiving the panel size percentages after each drag settle; seeded back on mount (corrupt values fall back to defaultSize). Omit for no persistence.',
        editorType: 'expression',
      },
    },
    {
      key: 'panels',
      kind: 'prop',
      contract: {
        shape: {
          kind: 'array',
          item: {
            kind: 'schema-definition',
            fieldRules: {
              key: 'literal',
              defaultSize: 'literal',
              min: 'literal',
              max: 'literal',
              collapsible: 'literal',
              collapsedSize: 'literal',
              defaultCollapsed: 'literal',
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
          'Split panes in order. key is required and unique; defaultSize/min/max are percentages; each panel body renders its own schema. A collapsible panel snaps to collapsedSize when dragged below min and exposes collapse/expand/toggle component methods (componentId = panel key).',
        editorType: 'object-array',
      },
    },
  ],
  defaultSchema: {
    type: 'resizable',
    direction: 'horizontal',
    panels: [{ key: 'left', defaultSize: 30 }, { key: 'right' }],
  },
};


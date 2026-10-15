import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { GraphSchema } from './schemas.js';

// 统一延迟加载机制：@xyflow/react + dagre 全量留在 graph 异步 chunk。
const LazyGraphRenderer = createLazyRendererComponent<GraphSchema>(
  () => import('./graph-renderer.js').then((m) => m.GraphRenderer),
);

export const graphRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'graph',
    displayName: 'Graph',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-graph',
    component: LazyGraphRenderer,
    componentCapabilityContracts: [
      { handle: 'zoomIn', displayName: 'Zoom In', description: 'Zoom the graph viewport in one step.' },
      { handle: 'zoomOut', displayName: 'Zoom Out', description: 'Zoom the graph viewport out one step.' },
      {
        handle: 'fitView',
        displayName: 'Fit View',
        description: 'Fit the whole graph into the visible viewport.',
        args: { kind: 'object', fields: { padding: { kind: 'number' } } },
      },
      { handle: 'resetView', displayName: 'Reset View', description: 'Reset the viewport to its initial state.' },
      {
        handle: 'setLayout',
        displayName: 'Set Layout',
        description: 'Switch layout mode at runtime (flow | hierarchy). Invalid values are ignored.',
        args: {
          kind: 'object',
          fields: {
            layout: {
              kind: 'union',
              anyOf: [
                { kind: 'literal', value: 'flow' },
                { kind: 'literal', value: 'hierarchy' },
              ],
            },
          },
        },
      },
      {
        handle: 'focusNode',
        displayName: 'Focus Node',
        description: 'Locate and select a node by id; unknown id falls back to a full fitView.',
        args: { kind: 'object', fields: { nodeId: { kind: 'string' } } },
      },
      {
        handle: 'search',
        displayName: 'Search',
        description: 'Activate local substring search and locate the first match. Empty keyword clears search.',
        args: { kind: 'object', fields: { keyword: { kind: 'string' } } },
      },
    ],
    fields: [
      {
        key: 'nodes',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'object', fields: {} } },
          displayName: 'Nodes',
          description: 'GraphNode[] injected via data-source/scope. Empty renders the empty slot.',
          editorType: 'expression',
        },
      },
      {
        key: 'edges',
        kind: 'prop',
        contract: {
          shape: { kind: 'array', item: { kind: 'object', fields: {} } },
          displayName: 'Edges',
          description: 'GraphEdge[] injected via data-source/scope. Dangling edges are skipped with a dev warning.',
          editorType: 'expression',
        },
      },
      {
        key: 'layout',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'flow' },
              { kind: 'literal', value: 'hierarchy' },
            ],
          },
          displayName: 'Layout',
          editorType: 'select',
          defaultValue: 'flow',
        },
      },
      {
        key: 'orientation',
        kind: 'prop',
        contract: {
          shape: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'LR' },
              { kind: 'literal', value: 'TB' },
            ],
          },
          displayName: 'Orientation',
          description: 'Only applies to hierarchy layout.',
          editorType: 'select',
          defaultValue: 'LR',
        },
      },
      { key: 'labelField', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Label Field', defaultValue: 'label' } },
      { key: 'typeField', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Type Field', defaultValue: 'type' } },
      { key: 'levelField', kind: 'prop', contract: { shape: { kind: 'string' }, displayName: 'Level Field', defaultValue: 'level' } },
      {
        key: 'levelMap',
        kind: 'prop',
        contract: {
          shape: { kind: 'object', fields: {} },
          displayName: 'Level Map',
          description: 'Node level value → semantic level (info/success/warning/danger).',
          editorType: 'object',
        },
      },
      { key: 'fitView', kind: 'prop', contract: { shape: { kind: 'boolean' }, displayName: 'Fit View', defaultValue: true } },
      { key: 'zoomable', kind: 'prop', contract: { shape: { kind: 'boolean' }, displayName: 'Zoomable', defaultValue: true } },
      { key: 'pannable', kind: 'prop', contract: { shape: { kind: 'boolean' }, displayName: 'Pannable', defaultValue: true } },
      {
        key: 'selectable',
        kind: 'prop',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Selectable',
          description: 'Single-selection model; multi-select and box-select are always disabled.',
          defaultValue: true,
        },
      },
      {
        key: 'searchable',
        kind: 'prop',
        contract: {
          shape: { kind: 'boolean' },
          displayName: 'Searchable',
          description: 'Shows the built-in search box. The component:search handle always works.',
          defaultValue: false,
        },
      },
      { key: 'showControls', kind: 'prop', contract: { shape: { kind: 'boolean' }, displayName: 'Show Controls', defaultValue: true } },
      { key: 'minZoom', kind: 'prop', contract: { shape: { kind: 'number' }, displayName: 'Min Zoom', defaultValue: 0.2 } },
      { key: 'maxZoom', kind: 'prop', contract: { shape: { kind: 'number' }, displayName: 'Max Zoom', defaultValue: 2 } },
      { key: 'node', kind: 'region', params: ['node', 'nodeId', 'index'] },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      {
        key: 'onNodeClick',
        kind: 'event',
        contract: {
          displayName: 'On Node Click',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'literal', value: 'graph:node-click' },
              nodeId: { kind: 'string' },
              node: { kind: 'object', fields: {} },
            },
          },
        },
      },
      {
        key: 'onNodeDoubleClick',
        kind: 'event',
        contract: {
          displayName: 'On Node Double Click',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'literal', value: 'graph:node-double-click' },
              nodeId: { kind: 'string' },
              node: { kind: 'object', fields: {} },
            },
          },
        },
      },
      {
        key: 'onSelectionChange',
        kind: 'event',
        contract: {
          displayName: 'On Selection Change',
          description: 'Single-selection payload; both fields are null when deselected.',
          payload: {
            kind: 'object',
            fields: {
              type: { kind: 'literal', value: 'graph:selection-change' },
              nodeId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'literal', value: null }] },
              node: {
                kind: 'union',
                anyOf: [{ kind: 'object', fields: {} }, { kind: 'literal', value: null }],
              },
            },
          },
        },
      },
    ],
  },
];

import type { RendererDefinition } from '@nop-chaos/flux-core';
import { GraphRenderer } from './graph-renderer.js';

export const graphRendererDefinitions: RendererDefinition[] = [
  {
    type: 'graph',
    displayName: 'Graph',
    category: 'data',
    sourcePackage: '@nop-chaos/flux-renderers-graph',
    component: GraphRenderer,
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
    propContracts: {
      nodes: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Nodes',
        description: 'GraphNode[] injected via data-source/scope. Empty renders the empty slot.',
        editorType: 'expression',
      },
      edges: {
        shape: { kind: 'array', item: { kind: 'object', fields: {} } },
        displayName: 'Edges',
        description: 'GraphEdge[] injected via data-source/scope. Dangling edges are skipped with a dev warning.',
        editorType: 'expression',
      },
      layout: {
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
      orientation: {
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
      labelField: { shape: { kind: 'string' }, displayName: 'Label Field', defaultValue: 'label' },
      typeField: { shape: { kind: 'string' }, displayName: 'Type Field', defaultValue: 'type' },
      levelField: { shape: { kind: 'string' }, displayName: 'Level Field', defaultValue: 'level' },
      levelMap: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Level Map',
        description: 'Node level value → semantic level (info/success/warning/danger).',
        editorType: 'object',
      },
      fitView: { shape: { kind: 'boolean' }, displayName: 'Fit View', defaultValue: true },
      zoomable: { shape: { kind: 'boolean' }, displayName: 'Zoomable', defaultValue: true },
      pannable: { shape: { kind: 'boolean' }, displayName: 'Pannable', defaultValue: true },
      selectable: {
        shape: { kind: 'boolean' },
        displayName: 'Selectable',
        description: 'Single-selection model; multi-select and box-select are always disabled.',
        defaultValue: true,
      },
      searchable: {
        shape: { kind: 'boolean' },
        displayName: 'Searchable',
        description: 'Shows the built-in search box. The component:search handle always works.',
        defaultValue: false,
      },
      showControls: { shape: { kind: 'boolean' }, displayName: 'Show Controls', defaultValue: true },
      minZoom: { shape: { kind: 'number' }, displayName: 'Min Zoom', defaultValue: 0.2 },
      maxZoom: { shape: { kind: 'number' }, displayName: 'Max Zoom', defaultValue: 2 },
    },
    eventContracts: {
      onNodeClick: {
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
      onNodeDoubleClick: {
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
      onSelectionChange: {
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
    fields: [
      { key: 'nodes', kind: 'prop' },
      { key: 'edges', kind: 'prop' },
      { key: 'layout', kind: 'prop' },
      { key: 'orientation', kind: 'prop' },
      { key: 'labelField', kind: 'prop' },
      { key: 'typeField', kind: 'prop' },
      { key: 'levelField', kind: 'prop' },
      { key: 'levelMap', kind: 'prop' },
      { key: 'fitView', kind: 'prop' },
      { key: 'zoomable', kind: 'prop' },
      { key: 'pannable', kind: 'prop' },
      { key: 'selectable', kind: 'prop' },
      { key: 'searchable', kind: 'prop' },
      { key: 'showControls', kind: 'prop' },
      { key: 'minZoom', kind: 'prop' },
      { key: 'maxZoom', kind: 'prop' },
      { key: 'node', kind: 'region', params: ['node', 'nodeId', 'index'] },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
      { key: 'onNodeClick', kind: 'event' },
      { key: 'onNodeDoubleClick', kind: 'event' },
      { key: 'onSelectionChange', kind: 'event' },
    ],
  },
];

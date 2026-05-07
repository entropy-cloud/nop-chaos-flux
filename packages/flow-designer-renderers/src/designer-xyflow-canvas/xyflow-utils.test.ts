import { describe, expect, it } from 'vitest';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { createXyflowEdges, createXyflowNodes } from './xyflow-utils.js';

function createSnapshot(): DesignerSnapshot {
  return {
    doc: {
      id: 'doc-1',
      kind: 'tree',
      name: 'Tree',
      version: '1.0.0',
      nodes: [
        {
          id: 'owner',
          type: 'condition',
          position: { x: 0, y: 0 },
          data: {
            label: 'Owner',
            branches: [{ id: 'b1', data: { label: 'Branch 1' }, childId: 'branch-node' }],
          },
        },
        {
          id: 'branch-node',
          type: 'task',
          position: { x: 0, y: 120 },
          data: { label: 'Branch Node' },
        },
        { id: 'end', type: 'end', position: { x: 0, y: 240 }, data: { label: 'End' } },
      ],
      edges: [
        {
          id: 'e1',
          type: 'branch',
          source: 'owner',
          target: 'branch-node',
          data: { leg: 'near-target' },
        },
        {
          id: 'e2',
          type: 'merge',
          source: 'branch-node',
          target: 'end',
          data: { leg: 'near-source' },
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    selection: {
      selectedNodeIds: ['owner'],
      selectedEdgeIds: [],
      activeNodeId: 'owner',
      activeEdgeId: null,
      activeBranchId: 'b1',
    },
    activeNode: {
      id: 'owner',
      type: 'condition',
      position: { x: 0, y: 0 },
      data: {
        label: 'Owner',
        branches: [{ id: 'b1', data: { label: 'Branch 1' }, childId: 'branch-node' }],
      },
    },
    activeEdge: null,
    activeBranch: { id: 'b1', data: { label: 'Branch 1' }, childId: 'branch-node' },
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('xyflow branch focus mapping', () => {
  it('marks the active branch child node as branch-focused', () => {
    const nodes = createXyflowNodes(createSnapshot(), undefined, 'tree');

    expect(nodes.find((node) => node.id === 'branch-node')?.data.__fdBranchFocused).toBe(true);
    expect(nodes.find((node) => node.id === 'owner')?.data.__fdBranchFocused).toBe(false);
  });

  it('marks edges touching the active branch child as branch-focused', () => {
    const edges = createXyflowEdges(createSnapshot(), 'tree');

    expect(edges.find((edge) => edge.id === 'e1')?.data.__fdBranchFocused).toBe(true);
    expect(edges.find((edge) => edge.id === 'e2')?.data.__fdBranchFocused).toBe(true);
  });

  it('uses fixed tree handles in tree mode', () => {
    const edges = createXyflowEdges(createSnapshot(), 'tree');

    expect(edges[0]?.sourceHandle).toBe('tree-out');
    expect(edges[0]?.targetHandle).toBe('tree-in');
  });
});

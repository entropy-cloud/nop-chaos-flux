import { describe, expect, it } from 'vitest';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { resolveEdgeSummary, resolveNodeSummary } from './designer-summary-helpers.js';

function createSnapshot(overrides: Partial<DesignerSnapshot> = {}): DesignerSnapshot {
  return {
    doc: {
      id: 'doc-1',
      kind: 'flow',
      name: 'Test',
      version: '1.0.0',
      nodes: [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 10, y: 20 },
          data: { label: 'Task' },
        },
        {
          id: 'node-2',
          type: 'end',
          position: { x: 30, y: 40 },
          data: {},
        },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'node-1',
          target: 'node-2',
          sourcePort: 'out',
          data: { condition: 'ok' },
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    selection: {
      selectedNodeIds: ['node-1'],
      selectedEdgeIds: ['edge-1'],
      activeNodeId: 'node-1',
      activeEdgeId: 'edge-1',
      activeBranchId: null,
    },
    activeNode: null,
    activeEdge: null,
    activeBranch: null,
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: { x: 0, y: 0, zoom: 1 },
    ...overrides,
  };
}

describe('resolveNodeSummary', () => {
  it('returns a normalized summary when the node id matches a doc node', () => {
    const summary = resolveNodeSummary(createSnapshot(), 'node-1');
    expect(summary).toEqual({
      id: 'node-1',
      type: 'task',
      position: { x: 10, y: 20 },
      data: { label: 'Task' },
      selected: true,
      active: true,
    });
  });

  it('returns undefined when the node id does not match any doc node', () => {
    const summary = resolveNodeSummary(createSnapshot(), 'missing-node');
    expect(summary).toBeUndefined();
  });

  it('returns undefined for empty or undefined node id (node-card-no-id fallback)', () => {
    expect(resolveNodeSummary(createSnapshot(), undefined)).toBeUndefined();
    expect(resolveNodeSummary(createSnapshot(), '')).toBeUndefined();
  });

  it('reflects selection state independent of active state', () => {
    const snapshot = createSnapshot({
      selection: {
        selectedNodeIds: ['node-2'],
        selectedEdgeIds: [],
        activeNodeId: 'node-1',
        activeEdgeId: null,
        activeBranchId: null,
      },
    });
    const node1 = resolveNodeSummary(snapshot, 'node-1');
    const node2 = resolveNodeSummary(snapshot, 'node-2');
    expect(node1?.selected).toBe(false);
    expect(node1?.active).toBe(true);
    expect(node2?.selected).toBe(true);
    expect(node2?.active).toBe(false);
  });
});

describe('resolveEdgeSummary', () => {
  it('returns a normalized summary when the edge id matches a doc edge', () => {
    const summary = resolveEdgeSummary(createSnapshot(), 'edge-1');
    expect(summary).toEqual({
      id: 'edge-1',
      type: 'default',
      source: 'node-1',
      target: 'node-2',
      sourcePort: 'out',
      targetPort: undefined,
      data: { condition: 'ok' },
      selected: true,
      active: true,
    });
  });

  it('returns undefined when the edge id does not match any doc edge', () => {
    const summary = resolveEdgeSummary(createSnapshot(), 'missing-edge');
    expect(summary).toBeUndefined();
  });

  it('returns undefined for empty or undefined edge id', () => {
    expect(resolveEdgeSummary(createSnapshot(), undefined)).toBeUndefined();
    expect(resolveEdgeSummary(createSnapshot(), '')).toBeUndefined();
  });
});

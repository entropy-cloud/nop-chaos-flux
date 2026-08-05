import { describe, expect, it } from 'vitest';
import { createTreeDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, TreeDocument, DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { buildDesignerHostProjection, sanitizeProjectedEdgeForHost } from './designer-host-projection.js';

function createConfig(): DesignerConfig {
  return {
    version: '1.1.0',
    kind: 'test-tree',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      chainEdgeType: 'chain',
      branchEdgeType: 'branch',
      mergeEdgeType: 'merge',
    },
    nodeTypes: [
      { id: 'start', label: 'Start' },
      { id: 'task', label: 'Task' },
      { id: 'condition', label: 'Condition' },
      { id: 'end', label: 'End' },
    ],
    edgeTypes: [
      { id: 'chain', label: 'Chain', appearance: { strokeWidth: 2 } },
      { id: 'branch', label: 'Branch', appearance: { strokeWidth: 2 } },
      { id: 'merge', label: 'Merge', appearance: { strokeWidth: 2 } },
      { id: 'default', label: 'Default' },
    ],
  };
}

function createBranchTreeWithEmptySlot(): TreeDocument {
  return {
    id: 'tree-1',
    kind: 'test-tree',
    name: 'Host Projection Tree',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'task',
      data: { label: 'Root' },
      child: {
        id: 'cond',
        type: 'condition',
        data: { label: 'Condition' },
        branches: [
          { id: 'b1', data: { label: 'A' }, child: { id: 'leaf-a', type: 'task', data: { label: 'A' } } },
          { id: 'b2', data: { label: 'B' } },
        ],
        child: { id: 'after', type: 'task', data: { label: 'After' } },
      },
    },
  };
}

describe('designer host projection sanitization', () => {
  it('strips virtual slots and their incident edges from the host projection', () => {
    const creation = createTreeDesignerCore(createBranchTreeWithEmptySlot(), createConfig());
    if (!creation.ok) throw new Error('tree core creation failed');
    const core = creation.core;

    const snapshot: DesignerSnapshot = core.getSnapshot();
    const projection = buildDesignerHostProjection({ snapshot });

    const hasVirtualId = (id: string) => id.startsWith('__fd_internal__/');
    expect(projection.doc.nodes.every((node) => !hasVirtualId(node.id))).toBe(true);
    expect(projection.doc.edges.every((edge) => !hasVirtualId(edge.source) && !hasVirtualId(edge.target))).toBe(true);
    expect(projection.doc.nodeCount).toBe(snapshot.doc.nodes.filter((node) => !hasVirtualId(node.id)).length);
    expect(projection.doc.edgeCount).toBe(
      snapshot.doc.edges.filter((edge) => !hasVirtualId(edge.source) && !hasVirtualId(edge.target)).length,
    );
  });

  it('never leaks __fd runtime geometry through the host activeEdge', () => {
    const creation = createTreeDesignerCore(createBranchTreeWithEmptySlot(), createConfig());
    if (!creation.ok) throw new Error('tree core creation failed');
    const core = creation.core;

    core.selectEdge('te-1');
    const snapshot: DesignerSnapshot = core.getSnapshot();
    expect(snapshot.activeEdge?.data.__fdTree).toBeTruthy();

    const sanitized = sanitizeProjectedEdgeForHost(snapshot.activeEdge!);
    expect(sanitized.data.__fdTree).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain('__fdTree');
  });

  it('strips virtual ids from the host selection summaries', () => {
    const creation = createTreeDesignerCore(createBranchTreeWithEmptySlot(), createConfig());
    if (!creation.ok) throw new Error('tree core creation failed');
    const core = creation.core;

    const snapshot: DesignerSnapshot = core.getSnapshot();
    const slot = snapshot.doc.nodes.find((node) => node.id.startsWith('__fd_internal__/'));
    expect(slot).toBeTruthy();
    if (!slot) return;

    core.selectNode(slot.id);
    const projection = buildDesignerHostProjection({ snapshot: core.getSnapshot() });
    expect(projection.selection.nodeIds).toEqual([]);
    expect(projection.selection.count).toBe(0);
    expect(projection.selection.activeNodeId).toBeNull();
  });

  it('keeps normal business node summaries intact', () => {
    const creation = createTreeDesignerCore(createBranchTreeWithEmptySlot(), createConfig());
    if (!creation.ok) throw new Error('tree core creation failed');
    const core = creation.core;

    core.selectNode('leaf-a');
    const projection = buildDesignerHostProjection({ snapshot: core.getSnapshot() });
    expect(projection.selection.nodeIds).toEqual(['leaf-a']);
    expect(projection.selection.activeNodeId).toBe('leaf-a');
    expect(projection.activeNode?.id).toBe('leaf-a');
    expect(projection.doc.nodes.some((node) => node.id === 'leaf-a')).toBe(true);
  });
});

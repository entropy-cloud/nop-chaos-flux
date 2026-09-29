import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Edge, Node } from '@xyflow/react';
import { syncLocalNodesWithSnapshot, useXyflowSync } from './use-xyflow-sync.js';
import { createXyflowNodes } from './xyflow-utils.js';

describe('useXyflowSync', () => {
  it('merges snapshot data after drag acknowledgement at the same position', () => {
    const currentNodes: Node[] = [
      { id: 'node-1', position: { x: 10, y: 20 }, data: { label: 'Before' }, selected: false, type: 'task' },
    ];
    const lastCommittedPositions = new Map([['node-1', '10:20']]);

    const nodes = syncLocalNodesWithSnapshot(
      currentNodes,
      [
        {
          id: 'node-1',
          position: { x: 10, y: 20 },
          data: { label: 'After' },
          selected: true,
          type: 'task',
        },
      ],
      lastCommittedPositions,
    );

    expect(nodes[0]?.position).toEqual({ x: 10, y: 20 });
    expect(nodes[0]?.data).toEqual({ label: 'After' });
    expect(nodes[0]?.selected).toBe(true);
    expect(lastCommittedPositions.size).toBe(0);
  });

  it('preserves live measured dimensions across snapshot merges (plan 475 Phase 2)', () => {
    const currentNodes: Node[] = [
      {
        id: 'node-1',
        position: { x: 10, y: 20 },
        data: { label: 'Live' },
        selected: false,
        type: 'task',
        measured: { width: 180, height: 60 },
      },
    ];
    const lastCommittedPositions = new Map([['node-1', '10:20']]);

    const nodes = syncLocalNodesWithSnapshot(
      currentNodes,
      [
        {
          id: 'node-1',
          position: { x: 10, y: 20 },
          data: { label: 'Snapshot' },
          selected: false,
          type: 'task',
          measured: { width: 220, height: 80 },
        },
      ],
      lastCommittedPositions,
    );

    expect(nodes[0]?.measured).toEqual({ width: 180, height: 60 });
  });
});

// bugs/11 回归（plan 475 Phase 2）：拖拽初始化的 error#015 面由「预填（createXyflowNodes）+
// 保全（sync 合并）」双路径共同封死——生产管线（预填 → RF 实测 → 快照同步合并）任意时点
// 交付给 RF 的节点都必须恒带 measured 双维，拖拽不会命中 "not initialized"。
describe('bugs/11 drag initialization regression', () => {
  const liveMeasured = { width: 180, height: 60 };

  function expectInitialized(nodes: Node[]) {
    for (const node of nodes) {
      expect(node.measured?.width).toBeDefined();
      expect(node.measured?.height).toBeDefined();
    }
  }

  function createPipelineSnapshotNode(id: string, label: string): Node {
    const nodes = createXyflowNodes({
      doc: {
        id: 'doc-bugs11',
        kind: 'flow',
        name: 'Bugs 11',
        version: '1.0.0',
        nodes: [{ id, type: 'task', position: { x: 10, y: 20 }, data: { label } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      selection: {
        selectedNodeIds: [],
        selectedEdgeIds: [],
        activeNodeId: null,
        activeEdgeId: null,
        activeBranchId: null,
      },
      activeNode: null,
      activeEdge: null,
      activeBranch: null,
      canUndo: false,
      canRedo: false,
      isDirty: false,
      readonly: false,
      gridEnabled: true,
      paletteCollapsed: false,
      inspectorCollapsed: false,
      paletteWidth: 240,
      inspectorWidth: 352,
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    const node = nodes[0];
    if (!node) {
      throw new Error('createXyflowNodes produced no node');
    }
    return node;
  }

  it('keeps nodes initialized when structure changes replace them mid-drag', () => {
    const currentNodes: Node[] = [
      { ...createPipelineSnapshotNode('node-1', 'Live'), measured: liveMeasured },
      createPipelineSnapshotNode('node-2', 'Stays'),
    ];

    const nodes = syncLocalNodesWithSnapshot(
      currentNodes,
      [
        createPipelineSnapshotNode('node-1', 'Live'),
        createPipelineSnapshotNode('node-2', 'Stays'),
        createPipelineSnapshotNode('node-3', 'Added'),
      ],
      new Map(),
    );

    expectInitialized(nodes);
    expect(nodes.find((node) => node.id === 'node-1')?.measured).toEqual(liveMeasured);
  });

  it('keeps nodes initialized through repeated merges with no committed positions', () => {
    let nodes: Node[] = [
      { ...createPipelineSnapshotNode('node-1', 'Live'), measured: liveMeasured },
    ];

    for (let round = 0; round < 3; round += 1) {
      nodes = syncLocalNodesWithSnapshot(
        nodes,
        [createPipelineSnapshotNode('node-1', `round-${round}`)],
        new Map(),
      );
      expectInitialized(nodes);
    }

    expect(nodes[0]?.measured).toEqual(liveMeasured);
  });
});
describe('useXyflowSync renderedEdges hover', () => {
  const EMPTY_NODES: Node[] = [];

  function edge(id: string): Edge {
    return { id, source: 'a', target: 'b', data: { label: id } };
  }

  it('rebuilds only the hovered edge object and clears the flag through fresh snapshots', () => {
    const snapshotEdges = [edge('e1'), edge('e2')];
    const { result, rerender } = renderHook(
      ({ edges, hovered }: { edges: Edge[]; hovered: string | null }) =>
        useXyflowSync({ snapshotNodes: EMPTY_NODES, snapshotEdges: edges, hoveredEdgeId: hovered }),
      { initialProps: { edges: snapshotEdges, hovered: null } },
    );
    expect(result.current.renderedEdges).toBe(snapshotEdges);

    rerender({ edges: snapshotEdges, hovered: 'e1' });
    const hoveredOnce = result.current.renderedEdges;
    expect(hoveredOnce[0]).not.toBe(snapshotEdges[0]);
    expect((hoveredOnce[0].data as Record<string, unknown>).__fdHovered).toBe(true);
    expect(hoveredOnce[1]).toBe(snapshotEdges[1]);

    rerender({ edges: snapshotEdges, hovered: 'e2' });
    const moved = result.current.renderedEdges;
    expect((moved[1].data as Record<string, unknown>).__fdHovered).toBe(true);
    expect(moved[0]).toBe(snapshotEdges[0]);
    expect((moved[0].data as Record<string, unknown>).__fdHovered).toBeUndefined();
  });
});

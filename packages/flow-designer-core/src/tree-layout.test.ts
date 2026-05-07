import { describe, it, expect } from 'vitest';
import type { GraphNode, GraphEdge, TreeConfig, TreeDocument } from './types';
import { layoutStructuredTree, layoutTreeWithElk, simpleTreeLayout } from './tree-layout';

function makeNodes(count: number): GraphNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: 'task',
    position: { x: 0, y: 0 },
    data: { label: `Node ${i}` },
  }));
}

function chainEdges(nodes: GraphNode[]): GraphEdge[] {
  return nodes.slice(0, -1).map((n, i) => ({
    id: `e-${i}`,
    type: 'default',
    source: n.id,
    target: nodes[i + 1].id,
    data: {},
  }));
}

function positionMap(nodes: GraphNode[]) {
  return new Map(nodes.map((node) => [node.id, node.position]));
}

const tbConfig: TreeConfig = {
  layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
  showGatewayNodes: false,
  showMergeNodes: false,
  autoLayout: true,
};

const lrConfig: TreeConfig = {
  layout: { direction: 'LR', nodeSpacing: 60, layerSpacing: 100 },
  showGatewayNodes: false,
  showMergeNodes: false,
  autoLayout: true,
};

describe('layoutTreeWithElk', () => {
  it('lays out nodes in TB direction with increasing y values', async () => {
    const nodes = makeNodes(4);
    const edges = chainEdges(nodes);
    const result = await layoutTreeWithElk(nodes, edges, tbConfig);

    expect(result).toHaveLength(4);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].position.y).toBeGreaterThanOrEqual(result[i - 1].position.y);
    }
    for (const node of result) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('lays out nodes in LR direction with increasing x values', async () => {
    const nodes = makeNodes(4);
    const edges = chainEdges(nodes);
    const result = await layoutTreeWithElk(nodes, edges, lrConfig);

    expect(result).toHaveLength(4);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].position.x).toBeGreaterThanOrEqual(result[i - 1].position.x);
    }
  });

  it('returns empty array for empty input', async () => {
    const result = await layoutTreeWithElk([], [], tbConfig);
    expect(result).toHaveLength(0);
  });

  it('handles single node', async () => {
    const nodes = makeNodes(1);
    const result = await layoutTreeWithElk(nodes, [], tbConfig);
    expect(result).toHaveLength(1);
    expect(result[0].position.x).toBeGreaterThanOrEqual(0);
  });

  it('simpleTreeLayout returns top-left positions that keep vertical chain centers aligned', () => {
    const nodes = makeNodes(3);
    const edges = chainEdges(nodes);

    const result = simpleTreeLayout(nodes, edges, tbConfig);

    expect(result).toHaveLength(3);

    const centerX = result[0].position.x + 110;
    for (const node of result) {
      expect(node.position.x + 110).toBe(centerX);
    }
    expect(result[1].position.y).toBeGreaterThan(result[0].position.y);
    expect(result[2].position.y).toBeGreaterThan(result[1].position.y);
  });

  it('keeps branch continuation below all branch leaves in tree mode', () => {
    const nodes: GraphNode[] = [
      { id: 'root', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Root' } },
      { id: 'gateway', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Gateway' } },
      { id: 'left-leaf', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Left' } },
      { id: 'right-leaf', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Right' } },
      { id: 'continuation', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Continue' } },
      { id: 'end', type: 'task', position: { x: 0, y: 0 }, data: { label: 'End' } },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', type: 'chain', source: 'root', target: 'gateway', data: {} },
      { id: 'e2', type: 'branch', source: 'gateway', target: 'left-leaf', data: {} },
      { id: 'e3', type: 'branch', source: 'gateway', target: 'right-leaf', data: {} },
      { id: 'e4', type: 'merge', source: 'left-leaf', target: 'continuation', data: {} },
      { id: 'e5', type: 'merge', source: 'right-leaf', target: 'continuation', data: {} },
      { id: 'e6', type: 'chain', source: 'continuation', target: 'end', data: {} },
    ];

    const result = simpleTreeLayout(nodes, edges, tbConfig);
    const nodeMap = new Map(result.map((node) => [node.id, node]));

    expect(nodeMap.get('gateway')!.position.y).toBeGreaterThan(nodeMap.get('root')!.position.y);
    expect(nodeMap.get('left-leaf')!.position.y).toBeGreaterThan(nodeMap.get('gateway')!.position.y);
    expect(nodeMap.get('right-leaf')!.position.y).toBe(nodeMap.get('left-leaf')!.position.y);
    expect(nodeMap.get('continuation')!.position.y).toBeGreaterThan(
      nodeMap.get('left-leaf')!.position.y,
    );
    expect(nodeMap.get('end')!.position.y).toBeGreaterThan(nodeMap.get('continuation')!.position.y);
  });

  it('keeps merge continuation centered under branch fan-out', () => {
    const nodes: GraphNode[] = [
      { id: 'gateway', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Gateway' } },
      { id: 'left-leaf', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Left' } },
      { id: 'right-leaf', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Right' } },
      { id: 'continuation', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Continue' } },
    ];
    const edges: GraphEdge[] = [
      { id: 'e1', type: 'branch', source: 'gateway', target: 'left-leaf', data: {} },
      { id: 'e2', type: 'branch', source: 'gateway', target: 'right-leaf', data: {} },
      { id: 'e3', type: 'merge', source: 'left-leaf', target: 'continuation', data: {} },
      { id: 'e4', type: 'merge', source: 'right-leaf', target: 'continuation', data: {} },
    ];

    const result = simpleTreeLayout(nodes, edges, tbConfig);
    const nodeMap = new Map(result.map((node) => [node.id, node]));
    const leftCenterX = nodeMap.get('left-leaf')!.position.x + 110;
    const rightCenterX = nodeMap.get('right-leaf')!.position.x + 110;
    const continuationCenterX = nodeMap.get('continuation')!.position.x + 110;

    expect(continuationCenterX).toBe(Math.round((leftCenterX + rightCenterX) / 2));
  });

  it('layouts condition branches as nested tree columns with continuation below the group', () => {
    const tree: TreeDocument = {
      id: 'condition-tree',
      kind: 'dingtalk-workflow',
      name: 'Condition Tree',
      version: '1.0.0',
      root: {
        id: 'start',
        type: 'task',
        data: { label: 'Start' },
        child: {
          id: 'condition',
          type: 'task',
          data: { label: 'Condition' },
          branches: [
            {
              id: 'b1',
              data: { label: 'A' },
              child: { id: 'left', type: 'task', data: { label: 'Left' } },
            },
            {
              id: 'b2',
              data: { label: 'B' },
              child: { id: 'right', type: 'task', data: { label: 'Right' } },
            },
          ],
          child: {
            id: 'after',
            type: 'task',
            data: { label: 'After' },
          },
        },
      },
    };
    const nodes: GraphNode[] = [
      { id: 'start', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'condition', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'left', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'right', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'after', type: 'task', position: { x: 0, y: 0 }, data: {} },
    ];

    const result = layoutStructuredTree(tree, nodes, tbConfig);
    const positions = positionMap(result);

    expect(positions.get('condition')!.y).toBeGreaterThan(positions.get('start')!.y);
    expect(positions.get('left')!.y).toBeGreaterThan(positions.get('condition')!.y);
    expect(positions.get('right')!.y).toBe(positions.get('left')!.y);
    expect(positions.get('left')!.x).toBeLessThan(positions.get('condition')!.x);
    expect(positions.get('right')!.x).toBeGreaterThan(positions.get('condition')!.x);
    expect(positions.get('after')!.y).toBeGreaterThan(positions.get('left')!.y);
  });

  it('keeps parallel branch subtree nested and centers continuation under widest fan-out', () => {
    const tree: TreeDocument = {
      id: 'parallel-tree',
      kind: 'dingtalk-workflow',
      name: 'Parallel Tree',
      version: '1.0.0',
      root: {
        id: 'parallel',
        type: 'task',
        data: { label: 'Parallel' },
        branches: [
          {
            id: 'b1',
            data: { label: 'One' },
            child: {
              id: 'branch-a1',
              type: 'task',
              data: { label: 'A1' },
              child: { id: 'branch-a2', type: 'task', data: { label: 'A2' } },
            },
          },
          {
            id: 'b2',
            data: { label: 'Two' },
            child: { id: 'branch-b1', type: 'task', data: { label: 'B1' } },
          },
        ],
        child: { id: 'after', type: 'task', data: { label: 'After' } },
      },
    };
    const nodes: GraphNode[] = [
      { id: 'parallel', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'branch-a1', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'branch-a2', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'branch-b1', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'after', type: 'task', position: { x: 0, y: 0 }, data: {} },
    ];

    const result = layoutStructuredTree(tree, nodes, tbConfig);
    const positions = positionMap(result);

    expect(positions.get('branch-a1')!.x).toBeLessThan(positions.get('parallel')!.x);
    expect(positions.get('branch-b1')!.x).toBeGreaterThan(positions.get('parallel')!.x);
    expect(positions.get('branch-a2')!.y).toBeGreaterThan(positions.get('branch-a1')!.y);
    expect(positions.get('after')!.y).toBeGreaterThan(positions.get('branch-a2')!.y);

    const branchCenter = Math.round((positions.get('branch-a1')!.x + positions.get('branch-b1')!.x) / 2);
    expect(positions.get('after')!.x).toBe(branchCenter);
  });

  it('keeps nested condition inside a branch under that branch column', () => {
    const tree: TreeDocument = {
      id: 'nested-tree',
      kind: 'action-flow',
      name: 'Nested Tree',
      version: '1.0.0',
      root: {
        id: 'root',
        type: 'task',
        data: { label: 'Root' },
        branches: [
          {
            id: 'left-branch',
            data: { label: 'Left' },
            child: { id: 'left-leaf', type: 'task', data: { label: 'Left Leaf' } },
          },
          {
            id: 'right-branch',
            data: { label: 'Right' },
            child: {
              id: 'inner-condition',
              type: 'task',
              data: { label: 'Inner' },
              branches: [
                {
                  id: 'inner-a',
                  data: { label: 'A' },
                  child: { id: 'inner-a-leaf', type: 'task', data: { label: 'A Leaf' } },
                },
                {
                  id: 'inner-b',
                  data: { label: 'B' },
                  child: { id: 'inner-b-leaf', type: 'task', data: { label: 'B Leaf' } },
                },
              ],
              child: { id: 'inner-after', type: 'task', data: { label: 'Inner After' } },
            },
          },
        ],
        child: { id: 'after', type: 'task', data: { label: 'After' } },
      },
    };
    const nodes: GraphNode[] = [
      { id: 'root', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'left-leaf', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'inner-condition', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'inner-a-leaf', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'inner-b-leaf', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'inner-after', type: 'task', position: { x: 0, y: 0 }, data: {} },
      { id: 'after', type: 'task', position: { x: 0, y: 0 }, data: {} },
    ];

    const result = layoutStructuredTree(tree, nodes, tbConfig);
    const positions = positionMap(result);

    expect(positions.get('inner-condition')!.x).toBeGreaterThan(positions.get('root')!.x);
    expect(positions.get('inner-a-leaf')!.x).toBeLessThan(positions.get('inner-condition')!.x);
    expect(positions.get('inner-b-leaf')!.x).toBeGreaterThan(positions.get('inner-condition')!.x);
    expect(positions.get('inner-after')!.y).toBeGreaterThan(positions.get('inner-a-leaf')!.y);
    expect(positions.get('after')!.y).toBeGreaterThan(positions.get('inner-after')!.y);
  });
});

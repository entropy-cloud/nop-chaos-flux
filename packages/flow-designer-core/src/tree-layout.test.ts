import { describe, it, expect } from 'vitest';
import type { GraphNode, GraphEdge, TreeConfig } from './types';
import { layoutTreeWithElk, simpleTreeLayout } from './tree-layout';

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
});

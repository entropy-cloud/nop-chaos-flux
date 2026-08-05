import { describe, expect, it } from 'vitest';
import {
  computeGraphLayout,
  computeHierarchyPositions,
  sanitizeGraphData,
  LAYOUT_NODE_DEFAULT_HEIGHT,
  LAYOUT_NODE_DEFAULT_WIDTH,
} from './graph-layout.js';
import type { GraphNode } from './schemas.js';

const NODES: GraphNode[] = [
  { id: 'a', label: 'root', type: 'model_call' },
  { id: 'b', label: 'child-1', type: 'tool_call' },
  { id: 'c', label: 'child-2', type: 'model_call' },
  { id: 'd', label: 'leaf', type: 'output' },
];

describe('computeHierarchyPositions', () => {
  it('LR projection assigns distinct coordinates for every node', () => {
    const positions = computeHierarchyPositions(NODES, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'c', target: 'd' },
    ], 'LR');
    expect(positions.size).toBe(NODES.length);
    const xs = new Set([...positions.values()].map((p) => p.x));
    // dagre 分层：root 与 leaf 不应同层（LR 下 x 随 rank 递增）
    expect(positions.get('a')!.x).toBeLessThan(positions.get('d')!.x);
    expect(xs.size).toBeGreaterThan(1);
  });

  it('TB projection produces distinct rows (y varies by rank)', () => {
    const positions = computeHierarchyPositions(NODES, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'c', target: 'd' },
    ], 'TB');
    expect(positions.get('a')!.y).toBeLessThan(positions.get('d')!.y);
  });

  it('empty nodes/edges does not throw and returns empty projection', () => {
    const positions = computeHierarchyPositions([], [], 'LR');
    expect(positions.size).toBe(0);
  });

  it('coordinates are top-left aligned with default node size', () => {
    const positions = computeHierarchyPositions([NODES[0], NODES[1]], [{ source: 'a', target: 'b' }], 'LR');
    const a = positions.get('a')!;
    expect(a.x).toBeTypeOf('number');
    expect(a.y).toBeTypeOf('number');
    expect(Math.abs(a.x)).toBeLessThan(LAYOUT_NODE_DEFAULT_WIDTH * 4);
    expect(Math.abs(a.y)).toBeLessThan(LAYOUT_NODE_DEFAULT_HEIGHT * 4);
  });
});

describe('sanitizeGraphData (畸形数据硬契约 design §6)', () => {
  it('skips edges referencing missing nodes and reports them', () => {
    const { edges, skippedEdges, nodes } = sanitizeGraphData(NODES, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' },
      { source: 'ghost', target: 'b' },
    ]);
    expect(edges).toHaveLength(1);
    expect(skippedEdges).toHaveLength(2);
    expect(nodes).toHaveLength(4);
  });

  it('keeps isolated nodes when edges are empty', () => {
    const { nodes, edges } = sanitizeGraphData(NODES, []);
    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(0);
  });

  it('both empty produces empty sanitized data', () => {
    const { nodes, edges, skippedEdges } = sanitizeGraphData([], []);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
    expect(skippedEdges).toHaveLength(0);
  });

  it('generates default edge id `${source}->${target}#${index}`', () => {
    const { edges } = sanitizeGraphData(NODES, [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'd' },
    ]);
    expect(edges[0].id).toBe('a->b#0');
    expect(edges[1].id).toBe('b->d#1');
  });

  it('drops nodes without a valid id along with their edges', () => {
    const { nodes, skippedEdges, edges } = sanitizeGraphData(
      [{ id: 'ok' }, { id: '' }, {} as GraphNode],
      [{ source: 'ok', target: 'missing-id' }],
    );
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
    expect(skippedEdges).toHaveLength(1);
  });
});

describe('computeGraphLayout', () => {
  it('flow mode returns empty positions and keeps sanitized edges', () => {
    const projection = computeGraphLayout(NODES, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' },
    ], 'flow', 'LR');
    expect(projection.positions.size).toBe(0);
    expect(projection.layoutedEdges).toHaveLength(1);
  });

  it('hierarchy mode projects positions and filters dangling edges', () => {
    const projection = computeGraphLayout(NODES, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' },
    ], 'hierarchy', 'LR');
    expect(projection.positions.size).toBe(4);
    expect(projection.layoutedEdges).toHaveLength(1);
  });

  it('surfaces skipped dangling edges for the dev warning (design §6)', () => {
    const projection = computeGraphLayout(NODES, [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'ghost' },
    ], 'flow', 'LR');
    expect(projection.skippedEdges).toEqual([{ source: 'a', target: 'ghost' }]);
  });
});

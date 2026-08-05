import { describe, expect, it } from 'vitest';
import type { DesignerConfig, NormalizedDesignerConfig, TreeDocument, GraphNode } from './types.js';
import { projectAndLayoutTree } from './tree-projection.js';
import { migrateTreeConfig } from './core/config-migration.js';
import { normalizeConfig } from './core/config.js';

function createConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      { id: 'task', label: 'Task', appearance: { minWidth: 220, minHeight: 80 } },
      { id: 'condition', label: 'Condition', appearance: { minWidth: 220, minHeight: 80 } },
      { id: 'end', label: 'End', appearance: { minWidth: 220, minHeight: 80 } },
    ],
    edgeTypes: [
      { id: 'chain', label: 'Chain', appearance: { stroke: '#000', strokeWidth: 2 } },
      { id: 'branch', label: 'Branch', appearance: { stroke: '#000', strokeWidth: 2 } },
      { id: 'merge', label: 'Merge', appearance: { stroke: '#000', strokeWidth: 2 } },
      { id: 'default', label: 'Default' },
    ],
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      chainEdgeType: 'chain',
      branchEdgeType: 'branch',
      mergeEdgeType: 'merge',
    },
  };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function toRects(document: { nodes: GraphNode[] }): Map<string, Rect> {
  const rects = new Map<string, Rect>();
  for (const node of document.nodes) {
    rects.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      width: 220,
      height: 80,
    });
  }
  return rects;
}

function rectanglesOverlap(left: Rect, right: Rect): boolean {
  // Half-open intervals [start, end): boundary contact is not positive-area overlap.
  const overlapX = left.x < right.x + right.width && right.x < left.x + left.width;
  const overlapY = left.y < right.y + right.height && right.y < left.y + left.height;
  return overlapX && overlapY;
}

function describeIntersections(rects: Map<string, Rect>): string[] {
  const problems: string[] = [];
  const ids = [...rects.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const left = rects.get(ids[i])!;
      const right = rects.get(ids[j])!;
      if (rectanglesOverlap(left, right)) {
        problems.push(`${ids[i]} overlaps ${ids[j]}`);
      }
    }
  }
  return problems;
}

function createNestedAsymmetricTree(emptyBranchSlot: 'none' | 'mixed' | 'all'): TreeDocument {
  const branches =
    emptyBranchSlot === 'all'
      ? [{ id: 'b1', data: { label: 'A' } }, { id: 'b2', data: { label: 'B' } }]
      : emptyBranchSlot === 'mixed'
        ? [
            {
              id: 'b1',
              data: { label: 'A' },
              child: {
                id: 'leaf-a1',
                type: 'task',
                data: { label: 'A1' },
                child: {
                  id: 'leaf-a2',
                  type: 'task',
                  data: { label: 'A2' },
                  child: {
                    id: 'nested-cond',
                    type: 'condition',
                    data: { label: 'Nested' },
                    branches: [
                      { id: 'nb1', data: { label: 'N1' }, child: { id: 'nleaf-1', type: 'task', data: {} } },
                      { id: 'nb2', data: { label: 'N2' } },
                    ],
                    child: { id: 'nested-after', type: 'task', data: { label: 'NA' } },
                  },
                },
              },
            },
            { id: 'b2', data: { label: 'B' } },
          ]
        : [
            {
              id: 'b1',
              data: { label: 'A' },
              child: {
                id: 'leaf-a1',
                type: 'task',
                data: { label: 'A1' },
                child: {
                  id: 'leaf-a2',
                  type: 'task',
                  data: { label: 'A2' },
                  child: {
                    id: 'nested-cond',
                    type: 'condition',
                    data: { label: 'Nested' },
                    branches: [
                      { id: 'nb1', data: { label: 'N1' }, child: { id: 'nleaf-1', type: 'task', data: {} } },
                      { id: 'nb2', data: { label: 'N2' }, child: { id: 'nleaf-2', type: 'task', data: {} } },
                    ],
                    child: { id: 'nested-after', type: 'task', data: { label: 'NA' } },
                  },
                },
              },
            },
            {
              id: 'b2',
              data: { label: 'B' },
              child: { id: 'leaf-b1', type: 'task', data: { label: 'B1' } },
            },
          ];

  return {
    id: 'nested',
    kind: 'flow',
    name: 'Nested',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'task',
      data: { label: 'Root' },
      child: {
        id: 'outer-cond',
        type: 'condition',
        data: { label: 'Outer' },
        branches,
        child: { id: 'outer-after', type: 'task', data: { label: 'OA' } },
      },
    },
  };
}

function project(tree: TreeDocument, config: DesignerConfig) {
  const migration = migrateTreeConfig(config);
  if (!migration.ok) throw new Error('config migration failed');
  const normalized: NormalizedDesignerConfig = normalizeConfig(migration.config);
  return projectAndLayoutTree(tree, normalized);
}

describe('geometry oracle - node rectangle invariants', () => {
  const scenarios: Array<[string, () => TreeDocument]> = [
    ['chain', () => ({
      id: 'c',
      kind: 'flow',
      name: 'Chain',
      version: '1.0.0',
      root: { id: 'r', type: 'task', data: {}, child: { id: 'a', type: 'task', data: {}, child: { id: 'b', type: 'end', data: {} } } },
    })],
    ['branch', () => ({
      id: 'b',
      kind: 'flow',
      name: 'Branch',
      version: '1.0.0',
      root: {
        id: 'r',
        type: 'task',
        data: {},
        child: {
          id: 'cond',
          type: 'condition',
          data: {},
          branches: [
            { id: 'b1', data: {}, child: { id: 'l1', type: 'task', data: {} } },
            { id: 'b2', data: {}, child: { id: 'l2', type: 'task', data: {} } },
          ],
          child: { id: 'after', type: 'end', data: {} },
        },
      },
    })],
    ['nested-asymmetric', () => createNestedAsymmetricTree('none')],
    ['mixed-empty-slots', () => createNestedAsymmetricTree('mixed')],
    ['all-empty-slots', () => createNestedAsymmetricTree('all')],
  ];

  for (const [name, makeTree] of scenarios) {
    for (const direction of ['TB', 'LR'] as const) {
      for (const nodeSpacing of [0, 60]) {
        for (const layerSpacing of [0, 80, 200]) {
          it(`zero node-rectangle positive-area intersections (${name}, ${direction}, nodeSpacing=${nodeSpacing}, layerSpacing=${layerSpacing})`, () => {
            const config = createConfig();
            config.treeConfig!.layout.direction = direction;
            config.treeConfig!.layout.nodeSpacing = nodeSpacing;
            config.treeConfig!.layout.layerSpacing = layerSpacing;
            const result = project(makeTree(), config);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            const problems = describeIntersections(toRects(result.view.document));
            expect(problems).toEqual([]);
          });
        }
      }
    }
  }
});

describe('geometry oracle - subtree containment after rounding', () => {
  it('keeps descendant rectangles within their branch column bounds', () => {
    const config = createConfig();
    const result = project(createNestedAsymmetricTree('none'), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rects = toRects(result.view.document);
    const root = rects.get('root')!;
    const outerCond = rects.get('outer-cond')!;
    const leafA1 = rects.get('leaf-a1')!;
    const leafA2 = rects.get('leaf-a2')!;
    const leafB1 = rects.get('leaf-b1')!;

    expect(outerCond.y).toBeGreaterThanOrEqual(root.y + root.height);
    expect(leafA1.y).toBeGreaterThanOrEqual(outerCond.y + outerCond.height);
    expect(leafA2.y).toBeGreaterThanOrEqual(leafA1.y + leafA1.height);
    expect(leafB1.y).toBe(leafA1.y);
    expect(leafA1.x + leafA1.width).toBeLessThanOrEqual(leafB1.x);
  });
});

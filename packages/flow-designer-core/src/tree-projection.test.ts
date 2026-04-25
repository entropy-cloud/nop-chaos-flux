import { describe, it, expect, beforeEach } from 'vitest';
import type { TreeDocument, DesignerConfig } from './types';
import type { NormalizedDesignerConfig } from './types';
import { projectTree, resetProjectionState } from './tree-projection';
import { normalizeConfig } from './core/config';

function makeConfig(overrides?: Partial<DesignerConfig>): NormalizedDesignerConfig {
  return normalizeConfig({
    version: '1.0',
    kind: 'test',
    nodeTypes: [],
    ...overrides,
  });
}

function makeChainTree(): TreeDocument {
  return {
    id: 'chain-test',
    kind: 'test',
    name: 'Chain Test',
    version: '1.0',
    root: {
      id: 'root',
      type: 'start',
      data: { label: 'Root' },
      child: {
        id: 'a',
        type: 'task',
        data: { label: 'A' },
        child: {
          id: 'b',
          type: 'task',
          data: { label: 'B' },
          child: {
            id: 'end',
            type: 'end',
            data: { label: 'End' },
          },
        },
      },
    },
  };
}

describe('projectTree', () => {
  beforeEach(() => {
    resetProjectionState();
  });

  it('projects a simple chain tree (root → A → B → end)', () => {
    const tree = makeChainTree();
    const config = makeConfig();
    const { nodes, edges } = projectTree(tree, config);

    expect(nodes).toHaveLength(4);
    expect(nodes.map((n) => n.id)).toEqual(['root', 'a', 'b', 'end']);

    expect(edges).toHaveLength(3);
    expect(edges[0].source).toBe('root');
    expect(edges[0].target).toBe('a');
    expect(edges[1].source).toBe('a');
    expect(edges[1].target).toBe('b');
    expect(edges[2].source).toBe('b');
    expect(edges[2].target).toBe('end');
  });

  it('projects a tree with branches', () => {
    const tree: TreeDocument = {
      id: 'branch-test',
      kind: 'test',
      name: 'Branch Test',
      version: '1.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'gateway',
          type: 'condition',
          data: { label: 'Gateway' },
          branches: [
            {
              id: 'b1',
              data: { label: 'Branch 1' },
              child: {
                id: 'task1',
                type: 'task',
                data: { label: 'Task 1' },
              },
            },
            {
              id: 'b2',
              data: { label: 'Branch 2' },
              child: {
                id: 'task2',
                type: 'task',
                data: { label: 'Task 2' },
              },
            },
          ],
          child: {
            id: 'end',
            type: 'end',
            data: { label: 'End' },
          },
        },
      },
    };
    const config = makeConfig();
    const { nodes, edges } = projectTree(tree, config);

    expect(nodes).toHaveLength(5);
    expect(nodes.map((n) => n.id)).toContain('start');
    expect(nodes.map((n) => n.id)).toContain('gateway');
    expect(nodes.map((n) => n.id)).toContain('task1');
    expect(nodes.map((n) => n.id)).toContain('task2');
    expect(nodes.map((n) => n.id)).toContain('end');

    expect(edges).toHaveLength(5);

    const chainEdges = edges.filter((e) => e.source === 'start');
    expect(chainEdges).toHaveLength(1);
    expect(chainEdges[0].target).toBe('gateway');

    const branchEdges = edges.filter((e) => e.source === 'gateway');
    expect(branchEdges).toHaveLength(2);
    expect(branchEdges.map((e) => e.target).sort()).toEqual(['task1', 'task2']);

    const mergeEdges = edges.filter((e) => e.target === 'end');
    expect(mergeEdges).toHaveLength(2);
    expect(mergeEdges.map((e) => e.source).sort()).toEqual(['task1', 'task2']);
  });

  it('projects a tree with branches but no child (no merge)', () => {
    const tree: TreeDocument = {
      id: 'no-merge-test',
      kind: 'test',
      name: 'No Merge',
      version: '1.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'gateway',
          type: 'condition',
          data: { label: 'Gateway' },
          branches: [
            {
              id: 'b1',
              data: { label: 'Branch 1' },
              child: { id: 'task1', type: 'task', data: { label: 'T1' } },
            },
            {
              id: 'b2',
              data: { label: 'Branch 2' },
              child: { id: 'task2', type: 'task', data: { label: 'T2' } },
            },
          ],
        },
      },
    };
    const config = makeConfig();
    const { nodes, edges } = projectTree(tree, config);

    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(3);
  });

  it('projects a tree with only root node', () => {
    const tree: TreeDocument = {
      id: 'root-only',
      kind: 'test',
      name: 'Root Only',
      version: '1.0',
      root: {
        id: 'root',
        type: 'start',
        data: { label: 'Root' },
      },
    };
    const config = makeConfig();
    const { nodes, edges } = projectTree(tree, config);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('root');
    expect(edges).toHaveLength(0);
  });

  it('projects nested branches correctly', () => {
    const tree: TreeDocument = {
      id: 'nested',
      kind: 'test',
      name: 'Nested',
      version: '1.0',
      root: {
        id: 'start',
        type: 'start',
        data: {},
        child: {
          id: 'gw1',
          type: 'condition',
          data: {},
          branches: [
            {
              id: 'b1',
              data: {},
              child: {
                id: 'gw2',
                type: 'condition',
                data: {},
                branches: [
                  { id: 'b1a', data: {}, child: { id: 'task1a', type: 'task', data: {} } },
                  { id: 'b1b', data: {}, child: { id: 'task1b', type: 'task', data: {} } },
                ],
                child: { id: 'merge2', type: 'task', data: {} },
              },
            },
            {
              id: 'b2',
              data: {},
              child: { id: 'task2', type: 'task', data: {} },
            },
          ],
          child: { id: 'end', type: 'end', data: {} },
        },
      },
    };
    const config = makeConfig();
    const { nodes, edges } = projectTree(tree, config);

    expect(nodes).toHaveLength(8);

    const edgesToEnd = edges.filter((e) => e.target === 'end');
    expect(edgesToEnd.length).toBeGreaterThanOrEqual(2);
  });

  it('resolves edge type from treeConfig', () => {
    const tree = makeChainTree();
    const config = makeConfig({
      treeConfig: {
        layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
        showGatewayNodes: false,
        showMergeNodes: false,
        autoLayout: true,
        chainEdgeType: 'chain-edge',
        branchEdgeType: 'branch-edge',
        mergeEdgeType: 'merge-edge',
      },
      edgeTypes: [
        { id: 'chain-edge', appearance: { stroke: '#000' } },
        { id: 'branch-edge', appearance: { stroke: '#00f' } },
        { id: 'merge-edge', appearance: { stroke: '#999' } },
      ],
    });
    const { edges } = projectTree(tree, config);

    for (const edge of edges) {
      expect(edge.type).toBe('chain-edge');
    }
  });

  it('preserves node data through projection', () => {
    const tree: TreeDocument = {
      id: 'data-test',
      kind: 'test',
      name: 'Data Test',
      version: '1.0',
      root: {
        id: 'root',
        type: 'start',
        data: { label: 'Hello', extra: 42 },
      },
    };
    const config = makeConfig();
    const { nodes } = projectTree(tree, config);

    expect(nodes[0].data).toEqual({ label: 'Hello', extra: 42 });
  });

  it('preserves branch data on branch edges', () => {
    const tree: TreeDocument = {
      id: 'branch-data',
      kind: 'test',
      name: 'Branch Data',
      version: '1.0',
      root: {
        id: 'gw',
        type: 'condition',
        data: {},
        branches: [
          { id: 'b1', data: { branchType: 'then', label: 'Success' }, child: { id: 't1', type: 'task', data: {} } },
          { id: 'b2', data: { branchType: 'onError', label: 'Failure' }, child: { id: 't2', type: 'task', data: {} } },
        ],
        child: { id: 'end', type: 'end', data: {} },
      },
    };
    const config = makeConfig();
    const { edges } = projectTree(tree, config);

    const branchEdges = edges.filter((e) => e.source === 'gw');
    expect(branchEdges).toHaveLength(2);
    expect(branchEdges[0].data.branchType).toBe('then');
    expect(branchEdges[1].data.branchType).toBe('onError');
  });

  it('exposes branch header summaries on branch-owner node data', () => {
    const tree: TreeDocument = {
      id: 'branch-summary',
      kind: 'test',
      name: 'Branch Summary',
      version: '1.0',
      root: {
        id: 'gw',
        type: 'condition',
        data: { label: 'Gateway' },
        branches: [
          { id: 'b1', data: { label: 'Branch 1', priority: 1 }, child: { id: 't1', type: 'task', data: {} } },
          { id: 'b2', data: { label: 'Branch 2', priority: 2 }, child: { id: 't2', type: 'task', data: {} } },
        ],
        child: { id: 'end', type: 'end', data: {} },
      },
    };
    const config = makeConfig();
    const { nodes } = projectTree(tree, config);

    const owner = nodes.find((node) => node.id === 'gw');
    expect(owner?.data.branches).toEqual([
      { id: 'b1', data: { label: 'Branch 1', priority: 1 }, childId: 't1', childType: 'task', childLabel: undefined },
      { id: 'b2', data: { label: 'Branch 2', priority: 2 }, childId: 't2', childType: 'task', childLabel: undefined },
    ]);
  });

  it('resolves edge type from TreeNodeTypeConfig.branchEdgeType', () => {
    const tree: TreeDocument = {
      id: 'node-type-edge',
      kind: 'test',
      name: 'NodeType Edge',
      version: '1.0',
      root: {
        id: 'gw',
        type: 'special-gateway',
        data: {},
        branches: [
          { id: 'b1', data: {}, child: { id: 't1', type: 'task', data: {} } },
          { id: 'b2', data: {}, child: { id: 't2', type: 'task', data: {} } },
        ],
        child: { id: 'end', type: 'end', data: {} },
      },
    };
    const config = makeConfig({
      nodeTypes: [
        {
          id: 'special-gateway',
          label: 'Special',
          body: { type: 'text' },
          tree: { branchEdgeType: 'custom-branch' },
        },
      ],
      edgeTypes: [
        { id: 'custom-branch', appearance: { stroke: '#f00' } },
      ],
      treeConfig: {
        layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
        showGatewayNodes: false,
        showMergeNodes: false,
        autoLayout: true,
        branchEdgeType: 'config-branch',
      },
    });
    const { edges } = projectTree(tree, config);

    const branchEdges = edges.filter((e) => e.source === 'gw');
    expect(branchEdges).toHaveLength(2);
    for (const edge of branchEdges) {
      expect(edge.type).toBe('custom-branch');
    }
  });
});

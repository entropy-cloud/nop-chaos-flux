import { describe, expect, it } from 'vitest';
import type {
  DesignerConfig,
  NormalizedDesignerConfig,
  TreeDocument,
  TreeProjectionResult,
  TreeEdgeRuntimeGeometry,
} from './types.js';
import {
  projectAndLayoutTree,
  MIN_CHAIN_GAP,
  MIN_SPLIT_GAP_TB,
  MIN_SPLIT_GAP_LR,
  MIN_MERGE_GAP,
  SPLIT_HALF_GAP_MIN_TB,
  SPLIT_HALF_GAP_MIN_LR,
  MERGE_HALF_GAP_MIN,
  TREE_EMPTY_SLOT_NODE_TYPE,
  TREE_VIRTUAL_DATA_KEY,
} from './tree-projection.js';
import { migrateTreeConfig } from './core/config-migration.js';
import { normalizeConfig } from './core/config.js';

function createTreeConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      { id: 'task', label: 'Task', appearance: { minWidth: 220, minHeight: 80 } },
      { id: 'condition', label: 'Condition', appearance: { minWidth: 220, minHeight: 80 } },
      { id: 'end', label: 'End', appearance: { minWidth: 220, minHeight: 80 } },
    ],
    edgeTypes: [
      {
        id: 'chain',
        label: 'Chain',
        appearance: { stroke: '#000', strokeWidth: 2, strokeStyle: 'solid' },
      },
      {
        id: 'branch',
        label: 'Branch',
        appearance: { stroke: '#000', strokeWidth: 2, strokeStyle: 'solid' },
      },
      {
        id: 'merge',
        label: 'Merge',
        appearance: { stroke: '#000', strokeWidth: 2, strokeStyle: 'solid' },
      },
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

function projectTree(tree: TreeDocument, config: DesignerConfig): TreeProjectionResult {
  const migration = migrateTreeConfig(config);
  if (!migration.ok) {
    return { ok: false, error: migration.error };
  }
  const normalized: NormalizedDesignerConfig = normalizeConfig(migration.config);
  return projectAndLayoutTree(tree, normalized);
}

function createChainTree(): TreeDocument {
  return {
    id: 'chain-tree',
    kind: 'flow',
    name: 'Chain',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'task',
      data: { label: 'Root' },
      child: {
        id: 'a',
        type: 'task',
        data: { label: 'A' },
        child: {
          id: 'b',
          type: 'task',
          data: { label: 'B' },
          child: { id: 'end', type: 'end', data: { label: 'End' } },
        },
      },
    },
  };
}

function createBranchTree(): TreeDocument {
  return {
    id: 'branch-tree',
    kind: 'flow',
    name: 'Branch',
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
          { id: 'b2', data: { label: 'B' }, child: { id: 'leaf-b', type: 'task', data: { label: 'B' } } },
        ],
        child: { id: 'after', type: 'task', data: { label: 'After' } },
      },
    },
  };
}

function getTreeGeometry(edge: { data: Record<string, unknown> }): TreeEdgeRuntimeGeometry | undefined {
  return edge.data.__fdTree as TreeEdgeRuntimeGeometry | undefined;
}

describe('projectAndLayoutTree - structured projection', () => {
  it('projects a simple chain with chain geometry on every edge', () => {
    const result = projectTree(createChainTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    expect(document.nodes.map((node) => node.id)).toEqual(['root', 'a', 'b', 'end']);
    expect(document.edges).toHaveLength(3);
    for (const edge of document.edges) {
      const geometry = getTreeGeometry(edge);
      expect(geometry?.kind).toBe('chain');
      expect(geometry?.direction).toBe('TB');
      expect(geometry?.ownerId).toBe(edge.source);
      expect(geometry?.continuationId).toBe(edge.target);
    }
  });

  it('keeps chain main-axis positions strictly increasing with min chain gap', () => {
    const result = projectTree(createChainTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const root = document.nodes.find((node) => node.id === 'root')!;
    const a = document.nodes.find((node) => node.id === 'a')!;
    expect(a.position.y - (root.position.y + 80)).toBeGreaterThanOrEqual(MIN_CHAIN_GAP);
    expect(a.position.x).toBe(root.position.x);
  });

  it('projects split and merge edges with shared split/merge lines', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const splitEdges = document.edges.filter((edge) => getTreeGeometry(edge)?.kind === 'split');
    const mergeEdges = document.edges.filter((edge) => getTreeGeometry(edge)?.kind === 'merge');

    expect(splitEdges).toHaveLength(2);
    expect(mergeEdges).toHaveLength(2);

    const splitLines = new Set(splitEdges.map((edge) => getTreeGeometry(edge)?.lineMain));
    expect(splitLines.size).toBe(1);
    const mergeLines = new Set(mergeEdges.map((edge) => getTreeGeometry(edge)?.lineMain));
    expect(mergeLines.size).toBe(1);
    expect([...splitLines][0]).not.toBe([...mergeLines][0]);

    for (const edge of splitEdges) {
      const geometry = getTreeGeometry(edge)!;
      expect(geometry.ownerId).toBe('cond');
      expect(geometry.branchId).toBeTruthy();
    }
    for (const edge of mergeEdges) {
      const geometry = getTreeGeometry(edge)!;
      expect(geometry.continuationId).toBe('after');
      expect(geometry.ownerId).toBe('cond');
    }
  });

  it('enforces the minimum TB split gap of 134 when layerSpacing is lower', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const cond = document.nodes.find((node) => node.id === 'cond')!;
    const leafA = document.nodes.find((node) => node.id === 'leaf-a')!;
    const gap = leafA.position.y - (cond.position.y + 80);
    expect(gap).toBeGreaterThanOrEqual(MIN_SPLIT_GAP_TB);
    expect(gap).toBeGreaterThanOrEqual(SPLIT_HALF_GAP_MIN_TB * 2);
  });

  it('honors configured layerSpacing above the minimum split gap', () => {
    const config = createTreeConfig();
    config.treeConfig!.layout.layerSpacing = 300;
    const result = projectTree(createBranchTree(), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const cond = document.nodes.find((node) => node.id === 'cond')!;
    const leafA = document.nodes.find((node) => node.id === 'leaf-a')!;
    expect(leafA.position.y - (cond.position.y + 80)).toBeGreaterThanOrEqual(300);
  });

  it('places merge line below the branch group and above the continuation', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const leafA = document.nodes.find((node) => node.id === 'leaf-a')!;
    const leafB = document.nodes.find((node) => node.id === 'leaf-b')!;
    const after = document.nodes.find((node) => node.id === 'after')!;
    const mergeMain = getTreeGeometry(document.edges.find((edge) => getTreeGeometry(edge)?.kind === 'merge')!)!
      .lineMain!;

    const leafMaxEnd = Math.max(leafA.position.y + 80, leafB.position.y + 80);
    expect(mergeMain).toBeGreaterThanOrEqual(leafMaxEnd + MERGE_HALF_GAP_MIN);
    expect(after.position.y).toBeGreaterThanOrEqual(mergeMain + MERGE_HALF_GAP_MIN);
    expect(after.position.y - leafMaxEnd).toBeGreaterThanOrEqual(MIN_MERGE_GAP);
  });

  it('centers fanout and continuation under the branch group', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const leafA = document.nodes.find((node) => node.id === 'leaf-a')!;
    const leafB = document.nodes.find((node) => node.id === 'leaf-b')!;
    const after = document.nodes.find((node) => node.id === 'after')!;
    const cond = document.nodes.find((node) => node.id === 'cond')!;

    const groupCenter = Math.round((leafA.position.x + leafB.position.x) / 2);
    expect(after.position.x + 110).toBe(groupCenter + 110);
    expect(cond.position.x + 110).toBe(groupCenter + 110);
  });

  it('rounds all coordinates to integers', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    for (const node of document.nodes) {
      expect(Number.isInteger(node.position.x)).toBe(true);
      expect(Number.isInteger(node.position.y)).toBe(true);
    }
  });

  it('rejects duplicate node ids', () => {
    const tree = createChainTree();
    tree.root.child!.id = 'root';
    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('duplicate-id');
  });

  it('rejects reserved internal ids', () => {
    const tree = createChainTree();
    tree.root.id = '__fd_internal__/root';
    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('reserved-id');
  });

  it('rejects unknown node types', () => {
    const tree = createChainTree();
    tree.root.type = 'unknown-type';
    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unknown-node-type');
  });

  it('rejects cyclic tree structures', () => {
    const tree = createChainTree();
    (tree.root.child as { child?: unknown }).child = tree.root;
    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['cyclic-tree', 'invalid-tree-payload']).toContain(result.error.code);
  });

  it('rejects non-JSON-safe payload values', () => {
    const tree = createChainTree();
    tree.root.data = { label: 'Root', bad: () => 1 } as unknown as Record<string, unknown>;
    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-tree-payload');
  });

  it('rejects missing treeConfig in tree mode', () => {
    const config = createTreeConfig();
    delete config.treeConfig;
    const result = projectTree(createChainTree(), config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-tree-config');
  });

  it('rejects invalid layout sizes', () => {
    const config = createTreeConfig();
    config.nodeTypes[0].tree = { layoutSize: { width: -1, height: 80 } };
    const result = projectTree(createChainTree(), config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-layout-size');
  });

  it('rejects unsupported tree edge decorations', () => {
    const config = createTreeConfig();
    config.edgeTypes[0].appearance = {
      stroke: '#000',
      strokeWidth: 2,
      animated: true,
    };
    const result = projectTree(createChainTree(), config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unsupported-tree-edge-decoration');
  });

  it('rejects markerEnd on tree edges', () => {
    const config = createTreeConfig();
    config.edgeTypes[0].appearance = {
      stroke: '#000',
      strokeWidth: 2,
      markerEnd: 'arrow',
    };
    const result = projectTree(createChainTree(), config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unsupported-tree-edge-decoration');
  });

  it('allows legal TreeNodeBranch.data.label on split edges', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const splitEdge = document.edges.find((edge) => getTreeGeometry(edge)?.kind === 'split')!;
    expect(splitEdge.data.label).toBeTruthy();
  });
});

describe('projectAndLayoutTree - virtual empty branch slots', () => {
  it('projects an empty branch as a virtual slot with split/merge edges', () => {
    const tree = createBranchTree();
    const cond = tree.root.child!;
    delete cond.branches![1].child;

    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const slot = document.nodes.find((node) => node.type === TREE_EMPTY_SLOT_NODE_TYPE);
    expect(slot).toBeTruthy();
    expect(slot!.data[TREE_VIRTUAL_DATA_KEY]).toBe('empty-branch');
    expect(slot!.data.ownerId).toBe('cond');
    expect(slot!.data.branchId).toBe('b2');

    const splitEdges = document.edges.filter((edge) => getTreeGeometry(edge)?.kind === 'split');
    const mergeEdges = document.edges.filter((edge) => getTreeGeometry(edge)?.kind === 'merge');
    expect(splitEdges.some((edge) => edge.target === slot!.id)).toBe(true);
    expect(mergeEdges.some((edge) => edge.source === slot!.id)).toBe(true);
  });

  it('keeps the continuation connected when all branches are empty', () => {
    const tree: TreeDocument = {
      id: 'all-empty',
      kind: 'flow',
      name: 'All Empty',
      version: '1.0.0',
      root: {
        id: 'cond',
        type: 'condition',
        data: { label: 'Condition' },
        branches: [
          { id: 'b1', data: { label: 'A' } },
          { id: 'b2', data: { label: 'B' } },
        ],
        child: { id: 'after', type: 'task', data: { label: 'After' } },
      },
    };

    const result = projectTree(tree, createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const slots = document.nodes.filter((node) => node.type === TREE_EMPTY_SLOT_NODE_TYPE);
    expect(slots).toHaveLength(2);
    const after = document.nodes.find((node) => node.id === 'after')!;
    expect(after).toBeTruthy();
    const mergeEdges = document.edges.filter((edge) => getTreeGeometry(edge)?.kind === 'merge');
    expect(mergeEdges).toHaveLength(2);
    for (const edge of mergeEdges) {
      expect(edge.target).toBe('after');
      expect(edge.source.startsWith('__fd_internal__/slot/')).toBe(true);
    }
  });

  it('uses configured emptyBranchSize for slot placement', () => {
    const config = createTreeConfig();
    config.treeConfig!.emptyBranchSize = { width: 300, height: 60 };
    const tree = createBranchTree();
    delete tree.root.child!.branches![1].child;

    const result = projectTree(tree, config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const slot = document.nodes.find((node) => node.type === TREE_EMPTY_SLOT_NODE_TYPE)!;
    expect(slot.position.x).toBeGreaterThan(100);
  });

  it('rejects emptyBranchSize below the TB minimum', () => {
    const config = createTreeConfig();
    config.treeConfig!.emptyBranchSize = { width: 100, height: 40 };
    const result = projectTree(createBranchTree(), config);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-layout-size');
  });
});

describe('projectAndLayoutTree - LR direction', () => {
  it('maps main to x and cross to y for LR', () => {
    const config = createTreeConfig();
    config.treeConfig!.layout.direction = 'LR';
    config.treeConfig!.layout.layerSpacing = 0;
    const result = projectTree(createChainTree(), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const root = document.nodes.find((node) => node.id === 'root')!;
    const a = document.nodes.find((node) => node.id === 'a')!;
    expect(a.position.x).toBe(root.position.x + 220 + MIN_CHAIN_GAP);
    expect(a.position.y).toBe(root.position.y);

    const geometry = getTreeGeometry(document.edges[0])!;
    expect(geometry.direction).toBe('LR');
  });

  it('enforces the LR split minimum of 204', () => {
    const config = createTreeConfig();
    config.treeConfig!.layout.direction = 'LR';
    const result = projectTree(createBranchTree(), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { document } = result.view;
    const cond = document.nodes.find((node) => node.id === 'cond')!;
    const leafA = document.nodes.find((node) => node.id === 'leaf-a')!;
    expect(leafA.position.x - (cond.position.x + 220)).toBeGreaterThanOrEqual(MIN_SPLIT_GAP_LR);
    expect(leafA.position.x - (cond.position.x + 220)).toBeGreaterThanOrEqual(SPLIT_HALF_GAP_MIN_LR * 2);
  });
});

describe('projectAndLayoutTree - immutable runtime projection', () => {
  it('keeps runtime __fdTree geometry out of the exported tree', () => {
    const result = projectTree(createBranchTree(), createTreeConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const exported = JSON.stringify(result.view.tree);
    expect(exported).not.toContain('__fdTree');
    expect(exported).not.toContain('__fd_internal__');
  });

  it('does not mutate the input tree document', () => {
    const tree = createBranchTree();
    const snapshot = JSON.stringify(tree);
    projectTree(tree, createTreeConfig());
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});

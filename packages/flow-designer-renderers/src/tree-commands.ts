import { normalizeConfig, projectTree, simpleTreeLayout } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument, NormalizedDesignerConfig, TreeDocument, TreeNode, TreeNodeBranch } from '@nop-chaos/flow-designer-core';

function cloneTree<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isNormalizedDesignerConfig(config: DesignerConfig | NormalizedDesignerConfig): config is NormalizedDesignerConfig {
  return config.nodeTypes instanceof Map;
}

function createTreeNodeId(seed: string): string {
  return `${seed}:${Math.random().toString(36).slice(2, 8)}`;
}

function buildProjectedDocument(tree: TreeDocument, config: DesignerConfig | NormalizedDesignerConfig): GraphDocument {
  const normalizedConfig = isNormalizedDesignerConfig(config) ? config : normalizeConfig(config);
  const projected = projectTree(tree, normalizedConfig);
  const treeConfig = normalizedConfig.treeConfig;
  const nodes = treeConfig
    ? simpleTreeLayout(projected.nodes, projected.edges, treeConfig, normalizedConfig.nodeTypes)
    : projected.nodes;

  return {
    id: tree.id,
    kind: tree.kind,
    name: tree.name,
    version: tree.version,
    meta: tree.meta,
    nodes,
    edges: projected.edges,
  };
}

function findNodeById(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) {
    return root;
  }

  if (root.child) {
    const hit = findNodeById(root.child, nodeId);
    if (hit) return hit;
  }

  for (const branch of root.branches ?? []) {
    if (branch.child) {
      const hit = findNodeById(branch.child, nodeId);
      if (hit) return hit;
    }
  }

  return null;
}

function findBranchParentByContinuation(root: TreeNode, continuationId: string): TreeNode | null {
  if (root.child?.id === continuationId && Array.isArray(root.branches) && root.branches.length > 0) {
    return root;
  }

  if (root.child) {
    const hit = findBranchParentByContinuation(root.child, continuationId);
    if (hit) return hit;
  }

  for (const branch of root.branches ?? []) {
    if (branch.child) {
      const hit = findBranchParentByContinuation(branch.child, continuationId);
      if (hit) return hit;
    }
  }

  return null;
}

function createNode(type: string, data?: Record<string, unknown>): TreeNode {
  return {
    id: createTreeNodeId(type),
    type,
    data: { ...(data ?? {}) },
  };
}

export function insertChainNodeInTreeDocument(
  tree: TreeDocument,
  sourceId: string,
  nodeType: string,
  data?: Record<string, unknown>
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const source = findNodeById(nextTree.root, sourceId);
  if (!source) {
    return null;
  }

  const inserted = createNode(nodeType, data);
  inserted.child = source.child;
  source.child = inserted;
  return nextTree;
}

export function insertChainNodeAtMergeInTreeDocument(
  tree: TreeDocument,
  targetId: string,
  nodeType: string,
  data?: Record<string, unknown>
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const branchOwner = findBranchParentByContinuation(nextTree.root, targetId);
  if (!branchOwner?.child) {
    return null;
  }

  const inserted = createNode(nodeType, data);
  inserted.child = branchOwner.child;
  branchOwner.child = inserted;
  return nextTree;
}

export function insertBranchPairInTreeDocument(
  tree: TreeDocument,
  sourceId: string,
  condNodeType: string,
  condData?: Record<string, unknown>
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const source = findNodeById(nextTree.root, sourceId);
  if (!source) {
    return null;
  }

  const downstream = source.child;
  const branches: TreeNodeBranch[] = [
    {
      id: createTreeNodeId('branch'),
      data: { ...(condData ?? {}), priority: 1 },
      child: createNode(condNodeType, { ...(condData ?? {}), priority: 1 }),
    },
    {
      id: createTreeNodeId('branch'),
      data: { ...(condData ?? {}), priority: 2 },
      child: createNode(condNodeType, { ...(condData ?? {}), priority: 2 }),
    },
  ];

  source.branches = branches;
  source.child = downstream;
  return nextTree;
}

export function projectTreeDocumentToGraph(tree: TreeDocument, config: DesignerConfig | NormalizedDesignerConfig): GraphDocument {
  return buildProjectedDocument(tree, config);
}

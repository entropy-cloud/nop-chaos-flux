import { layoutStructuredTree, normalizeConfig, projectTree } from '@nop-chaos/flow-designer-core';
import type {
  DesignerConfig,
  GraphDocument,
  NormalizedDesignerConfig,
  TreeDocument,
  TreeNode,
  TreeNodeBranch,
} from '@nop-chaos/flow-designer-core';

function cloneTreeValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneTreeValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      cloneTreeValue(entryValue),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function cloneTreeNode(node: TreeNode): TreeNode {
  return {
    ...node,
    data: cloneTreeValue(node.data),
    child: node.child ? cloneTreeNode(node.child) : undefined,
    branches: node.branches?.map((branch) => ({
      ...branch,
      data: cloneTreeValue(branch.data),
      child: branch.child ? cloneTreeNode(branch.child) : undefined,
    })),
  };
}

function cloneTree(tree: TreeDocument): TreeDocument {
  return {
    ...tree,
    meta: tree.meta ? cloneTreeValue(tree.meta) : undefined,
    root: cloneTreeNode(tree.root),
  };
}

function isNormalizedDesignerConfig(
  config: DesignerConfig | NormalizedDesignerConfig,
): config is NormalizedDesignerConfig {
  return config.nodeTypes instanceof Map;
}

function createTreeNodeId(seed: string): string {
  return `${seed}:${Math.random().toString(36).slice(2, 8)}`;
}

function buildProjectedDocument(
  tree: TreeDocument,
  config: DesignerConfig | NormalizedDesignerConfig,
): GraphDocument {
  const normalizedConfig = isNormalizedDesignerConfig(config) ? config : normalizeConfig(config);
  const projected = projectTree(tree, normalizedConfig);
  const treeConfig = normalizedConfig.treeConfig;
  const nodes = treeConfig
    ? layoutStructuredTree(tree, projected.nodes, treeConfig, normalizedConfig.nodeTypes)
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
  if (
    root.child?.id === continuationId &&
    Array.isArray(root.branches) &&
    root.branches.length > 0
  ) {
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

function findBranchOwner(node: TreeNode, nodeId: string): TreeNode | null {
  if (node.id === nodeId && Array.isArray(node.branches) && node.branches.length > 0) {
    return node;
  }

  if (node.child) {
    const hit = findBranchOwner(node.child, nodeId);
    if (hit) return hit;
  }

  for (const branch of node.branches ?? []) {
    if (branch.child) {
      const hit = findBranchOwner(branch.child, nodeId);
      if (hit) return hit;
    }
  }

  return null;
}

function updateNodeDataRecursive(
  node: TreeNode,
  nodeId: string,
  data: Record<string, unknown>,
): boolean {
  if (node.id === nodeId) {
    node.data = { ...node.data, ...data };
    return true;
  }

  if (node.child && updateNodeDataRecursive(node.child, nodeId, data)) {
    return true;
  }

  for (const branch of node.branches ?? []) {
    if (branch.child && updateNodeDataRecursive(branch.child, nodeId, data)) {
      return true;
    }
  }

  return false;
}

function deleteNodeRecursive(parent: TreeNode, nodeId: string): boolean {
  if (parent.child?.id === nodeId) {
    const deleting = parent.child;
    parent.child = deleting.child;
    return true;
  }

  if (parent.child && deleteNodeRecursive(parent.child, nodeId)) {
    return true;
  }

  for (const branch of parent.branches ?? []) {
    if (branch.child?.id === nodeId) {
      const deleting = branch.child;
      branch.child = deleting.child;
      return true;
    }

    if (branch.child && deleteNodeRecursive(branch.child, nodeId)) {
      return true;
    }
  }

  return false;
}

export function insertChainNodeInTreeDocument(
  tree: TreeDocument,
  sourceId: string,
  nodeType: string,
  data?: Record<string, unknown>,
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
  data?: Record<string, unknown>,
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
  condData?: Record<string, unknown>,
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

export function updateNodeDataInTreeDocument(
  tree: TreeDocument,
  nodeId: string,
  data: Record<string, unknown>,
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const updated = updateNodeDataRecursive(nextTree.root, nodeId, data);
  return updated ? nextTree : null;
}

export function deleteNodeInTreeDocument(tree: TreeDocument, nodeId: string): TreeDocument | null {
  if (tree.root.id === nodeId) {
    return null;
  }

  const nextTree = cloneTree(tree);
  const deleted = deleteNodeRecursive(nextTree.root, nodeId);
  return deleted ? nextTree : null;
}

export function addBranchInTreeDocument(
  tree: TreeDocument,
  nodeId: string,
  branchData?: Record<string, unknown>,
  childType?: string,
  childData?: Record<string, unknown>,
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches) {
    return null;
  }

  const nextPriority = owner.branches.length + 1;
  owner.branches.push({
    id: createTreeNodeId('branch'),
    data: { ...(branchData ?? {}), priority: nextPriority },
    child: childType ? createNode(childType, childData) : undefined,
  });
  return nextTree;
}

export function deleteBranchInTreeDocument(
  tree: TreeDocument,
  nodeId: string,
  branchId: string,
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches || owner.branches.length <= 2) {
    return null;
  }

  const nextBranches = owner.branches.filter((branch) => branch.id !== branchId);
  if (nextBranches.length === owner.branches.length) {
    return null;
  }

  owner.branches = nextBranches.map((branch, index) => ({
    ...branch,
    data: { ...branch.data, priority: index + 1 },
  }));
  return nextTree;
}

export function moveBranchInTreeDocument(
  tree: TreeDocument,
  nodeId: string,
  branchId: string,
  direction: 'left' | 'right',
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches) {
    return null;
  }

  const index = owner.branches.findIndex((branch) => branch.id === branchId);
  if (index < 0) {
    return null;
  }

  const targetIndex = direction === 'left' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= owner.branches.length) {
    return null;
  }

  const nextBranches = owner.branches.slice();
  const temp = nextBranches[index];
  nextBranches[index] = nextBranches[targetIndex];
  nextBranches[targetIndex] = temp;
  owner.branches = nextBranches.map((branch, branchIndex) => ({
    ...branch,
    data: { ...branch.data, priority: branchIndex + 1 },
  }));
  return nextTree;
}

export function updateBranchDataInTreeDocument(
  tree: TreeDocument,
  nodeId: string,
  branchId: string,
  data: Record<string, unknown>,
): TreeDocument | null {
  const nextTree = cloneTree(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches) {
    return null;
  }

  const branch = owner.branches.find((item) => item.id === branchId);
  if (!branch) {
    return null;
  }

  branch.data = { ...branch.data, ...data };
  return nextTree;
}

export function projectTreeDocumentToGraph(
  tree: TreeDocument,
  config: DesignerConfig | NormalizedDesignerConfig,
): GraphDocument {
  return buildProjectedDocument(tree, config);
}

import type { TreeDocument, TreeNode, TreeNodeBranch } from './types.js';

export type TreeStructureFailureReason =
  | 'missing-node'
  | 'unknown-node-type'
  | 'constraint'
  | 'unavailable';

export type TreeStructureResult =
  | { ok: true; tree: TreeDocument }
  | { ok: false; reason: TreeStructureFailureReason };

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

export function cloneTreeNode(node: TreeNode): TreeNode {
  const next: TreeNode = {
    ...node,
    data: cloneTreeValue(node.data),
  };
  if (node.child) {
    next.child = cloneTreeNode(node.child);
  }
  if (node.branches) {
    next.branches = node.branches.map((branch) => {
      const nextBranch: TreeNodeBranch = {
        ...branch,
        data: cloneTreeValue(branch.data),
      };
      if (branch.child) {
        nextBranch.child = cloneTreeNode(branch.child);
      }
      return nextBranch;
    });
  }
  return next;
}

export function cloneTreeDocument(tree: TreeDocument): TreeDocument {
  const next: TreeDocument = {
    id: tree.id,
    kind: tree.kind,
    name: tree.name,
    version: tree.version,
    root: cloneTreeNode(tree.root),
  };
  if (tree.meta) {
    next.meta = cloneTreeValue(tree.meta);
  }
  return next;
}

export function createTreeNodeId(seed: string): string {
  return `${seed}:${Math.random().toString(36).slice(2, 8)}`;
}

export function findNodeById(root: TreeNode, nodeId: string): TreeNode | null {
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

export function findBranchParentByContinuation(
  root: TreeNode,
  continuationId: string,
): TreeNode | null {
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

export function findBranchOwner(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId && Array.isArray(root.branches) && root.branches.length > 0) {
    return root;
  }
  if (root.child) {
    const hit = findBranchOwner(root.child, nodeId);
    if (hit) return hit;
  }
  for (const branch of root.branches ?? []) {
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

/**
 * Deletes a business node following the documented rewrite matrix:
 * - root is always rejected;
 * - ordinary chain node: its child replaces it in the parent reference;
 * - branch-subtree node: spliced within its branch/parent; deleting the branch
 *   head with no child turns the branch into an empty slot;
 * - branch owner is always rejected;
 * - continuation node (owner.child) with no branches follows chain splice;
 * - virtual empty slots are not business TreeNodes and are rejected.
 */
function deleteNodeRecursive(parent: TreeNode, nodeId: string): boolean {
  if (parent.child?.id === nodeId) {
    if (Array.isArray(parent.child.branches) && parent.child.branches.length > 0) {
      return false;
    }
    const nextChild = parent.child.child;
    if (nextChild) {
      parent.child = nextChild;
    } else {
      delete parent.child;
    }
    return true;
  }
  if (parent.child && deleteNodeRecursive(parent.child, nodeId)) {
    return true;
  }
  for (const branch of parent.branches ?? []) {
    if (branch.child?.id === nodeId) {
      if (Array.isArray(branch.child.branches) && branch.child.branches.length > 0) {
        return false;
      }
      const nextChild = branch.child.child;
      if (nextChild) {
        branch.child = nextChild;
      } else {
        delete branch.child;
      }
      return true;
    }
    if (branch.child && deleteNodeRecursive(branch.child, nodeId)) {
      return true;
    }
  }
  return false;
}

export function insertChainNodeInTree(
  tree: TreeDocument,
  sourceId: string,
  nodeType: string,
  data?: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const source = findNodeById(nextTree.root, sourceId);
  if (!source) {
    return { ok: false, reason: 'missing-node' };
  }
  const inserted = createNode(nodeType, data);
  if (source.child) {
    inserted.child = source.child;
  }
  source.child = inserted;
  return { ok: true, tree: nextTree };
}

export function insertChainNodeAtMergeInTree(
  tree: TreeDocument,
  targetId: string,
  nodeType: string,
  data?: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const branchOwner = findBranchParentByContinuation(nextTree.root, targetId);
  if (!branchOwner?.child) {
    return { ok: false, reason: 'missing-node' };
  }
  const inserted = createNode(nodeType, data);
  if (branchOwner.child) {
    inserted.child = branchOwner.child;
  }
  branchOwner.child = inserted;
  return { ok: true, tree: nextTree };
}

export function insertBranchPairInTree(
  tree: TreeDocument,
  sourceId: string,
  condNodeType: string,
  condData?: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const source = findNodeById(nextTree.root, sourceId);
  if (!source) {
    return { ok: false, reason: 'missing-node' };
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
  return { ok: true, tree: nextTree };
}

export function updateNodeDataInTree(
  tree: TreeDocument,
  nodeId: string,
  data: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const updated = updateNodeDataRecursive(nextTree.root, nodeId, data);
  return updated ? { ok: true, tree: nextTree } : { ok: false, reason: 'missing-node' };
}

export function deleteNodeInTree(tree: TreeDocument, nodeId: string): TreeStructureResult {
  if (tree.root.id === nodeId) {
    return { ok: false, reason: 'constraint' };
  }
  const owner = findBranchOwner(tree.root, nodeId);
  if (owner) {
    return { ok: false, reason: 'constraint' };
  }
  const nextTree = cloneTreeDocument(tree);
  const deleted = deleteNodeRecursive(nextTree.root, nodeId);
  return deleted ? { ok: true, tree: nextTree } : { ok: false, reason: 'missing-node' };
}

export function addBranchInTree(
  tree: TreeDocument,
  nodeId: string,
  branchData?: Record<string, unknown>,
  childType?: string,
  childData?: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches) {
    return { ok: false, reason: 'missing-node' };
  }
  const nextPriority = owner.branches.length + 1;
  owner.branches.push({
    id: createTreeNodeId('branch'),
    data: { ...(branchData ?? {}), priority: nextPriority },
    child: childType ? createNode(childType, childData) : undefined,
  });
  return { ok: true, tree: nextTree };
}

export function deleteBranchInTree(
  tree: TreeDocument,
  nodeId: string,
  branchId: string,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches || owner.branches.length <= 2) {
    return { ok: false, reason: 'missing-node' };
  }
  const nextBranches = owner.branches.filter((branch) => branch.id !== branchId);
  if (nextBranches.length === owner.branches.length) {
    return { ok: false, reason: 'missing-node' };
  }
  owner.branches = nextBranches.map((branch, index) => ({
    ...branch,
    data: { ...branch.data, priority: index + 1 },
  }));
  return { ok: true, tree: nextTree };
}

export function moveBranchInTree(
  tree: TreeDocument,
  nodeId: string,
  branchId: string,
  direction: 'left' | 'right',
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches) {
    return { ok: false, reason: 'missing-node' };
  }
  const index = owner.branches.findIndex((branch) => branch.id === branchId);
  if (index < 0) {
    return { ok: false, reason: 'missing-node' };
  }
  const targetIndex = direction === 'left' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= owner.branches.length) {
    return { ok: false, reason: 'constraint' };
  }
  const nextBranches = owner.branches.slice();
  const temp = nextBranches[index];
  nextBranches[index] = nextBranches[targetIndex];
  nextBranches[targetIndex] = temp;
  owner.branches = nextBranches.map((branch, branchIndex) => ({
    ...branch,
    data: { ...branch.data, priority: branchIndex + 1 },
  }));
  return { ok: true, tree: nextTree };
}

export function updateBranchDataInTree(
  tree: TreeDocument,
  nodeId: string,
  branchId: string,
  data: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const owner = findBranchOwner(nextTree.root, nodeId);
  if (!owner?.branches) {
    return { ok: false, reason: 'missing-node' };
  }
  const branch = owner.branches.find((item) => item.id === branchId);
  if (!branch) {
    return { ok: false, reason: 'missing-node' };
  }
  branch.data = { ...branch.data, ...data };
  return { ok: true, tree: nextTree };
}

export function insertBranchChildInTree(
  tree: TreeDocument,
  ownerId: string,
  branchId: string,
  nodeType: string,
  data?: Record<string, unknown>,
): TreeStructureResult {
  const nextTree = cloneTreeDocument(tree);
  const owner = findBranchOwner(nextTree.root, ownerId);
  if (!owner?.branches) {
    return { ok: false, reason: 'missing-node' };
  }
  const branch = owner.branches.find((item) => item.id === branchId);
  if (!branch) {
    return { ok: false, reason: 'missing-node' };
  }
  if (branch.child !== undefined) {
    return { ok: false, reason: 'constraint' };
  }
  branch.child = createNode(nodeType, data);
  return { ok: true, tree: nextTree };
}

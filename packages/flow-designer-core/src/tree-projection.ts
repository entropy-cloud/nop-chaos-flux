import type {
  TreeDocument,
  TreeNode,
  NormalizedDesignerConfig,
  GraphNode,
  GraphEdge,
  TreeNodeTypeConfig,
} from './types';

let edgeCounter = 0;

function nextEdgeId(): string {
  return `te-${++edgeCounter}`;
}

export function resetProjectionState(): void {
  edgeCounter = 0;
}

function resolveEdgeType(
  parentNodeType: string | undefined,
  connectionKind: 'chain' | 'branch' | 'merge',
  config: NormalizedDesignerConfig,
): string {
  if (parentNodeType) {
    const nt = config.nodeTypes.get(parentNodeType);
    if (nt && 'tree' in nt) {
      const treeConf = (nt as TreeNodeTypeConfig).tree;
      if (treeConf?.branchEdgeType && connectionKind !== 'chain') {
        return treeConf.branchEdgeType;
      }
    }
  }

  if (config.treeConfig) {
    if (connectionKind === 'chain' && config.treeConfig.chainEdgeType) {
      return config.treeConfig.chainEdgeType;
    }
    if (connectionKind === 'branch' && config.treeConfig.branchEdgeType) {
      return config.treeConfig.branchEdgeType;
    }
    if (connectionKind === 'merge' && config.treeConfig.mergeEdgeType) {
      return config.treeConfig.mergeEdgeType;
    }
  }

  return config.rules.defaultEdgeType ?? 'default';
}

export interface ProjectionResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function projectTree(
  tree: TreeDocument,
  config: NormalizedDesignerConfig,
): ProjectionResult {
  resetProjectionState();

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  function visit(node: TreeNode, parentIds: string[], parentType?: string): string[] {
    const nodeData =
      node.branches && node.branches.length > 0
        ? {
            ...node.data,
            branches: node.branches.map((branch) => ({
              id: branch.id,
              data: branch.data,
              childId: branch.child?.id,
              childType: branch.child?.type,
              childLabel: branch.child?.data?.label,
            })),
          }
        : node.data;

    nodes.push({
      id: node.id,
      type: node.type,
      position: { x: 0, y: 0 },
      data: nodeData,
    });

    for (const pid of parentIds) {
      const edgeType = resolveEdgeType(parentType, 'chain', config);
      edges.push({
        id: nextEdgeId(),
        type: edgeType,
        source: pid,
        target: node.id,
        data: {},
      });
    }

    if (node.branches && node.branches.length > 0) {
      const allLeafIds: string[] = [];

      for (const branch of node.branches) {
        if (branch.child) {
          const branchEdgeType = resolveEdgeType(node.type, 'branch', config);
          edges.push({
            id: nextEdgeId(),
            type: branchEdgeType,
            source: node.id,
            target: branch.child.id,
            data: { ...branch.data, leg: 'near-target' as const },
          });

          const leafIds = visit(branch.child, [], node.type);
          allLeafIds.push(...leafIds);
        } else {
          allLeafIds.push(node.id);
        }
      }

      if (node.child) {
        const mergeEdgeType = resolveEdgeType(node.type, 'merge', config);
        for (const leafId of allLeafIds) {
          edges.push({
            id: nextEdgeId(),
            type: mergeEdgeType,
            source: leafId,
            target: node.child!.id,
            data: { leg: 'near-source' as const },
          });
        }
        return visit(node.child, [], node.type);
      }

      return allLeafIds.length > 0 ? allLeafIds : [node.id];
    } else if (node.child) {
      return visit(node.child, [node.id], node.type);
    }

    return [node.id];
  }

  visit(tree.root, []);

  return { nodes, edges };
}

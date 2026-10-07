// plan 544 seed 1 / Phase 4: projection document node assembly plus runtime
// decoration, extracted from tree-projection.ts to keep that file under the
// 700-line gate. The decoration data (__fdChainGap gap-derived plus-button
// anchoring, __fdBranchGroupOwner split-source flag) is written into a CLONED
// data object — tree node data is shared by reference (placeSubtree pushes the
// same object into the projection document) and must never be mutated in place.

import type { GraphEdge, GraphNode, TreeEdgeRuntimeGeometry } from './types.js';

interface PlacedProjectionNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  crossStart: number;
  mainStart: number;
  crossSize: number;
  mainSize: number;
}

export function buildProjectionNodes(
  placedNodes: PlacedProjectionNode[],
  edges: GraphEdge[],
  direction: 'TB' | 'LR',
  placedNodeMap: Map<string, PlacedProjectionNode>,
): GraphNode[] {
  const chainGapByNodeId = new Map<string, number>();
  const splitOwnerIds = new Set<string>();
  for (const edge of edges) {
    const geometry = edge.data?.__fdTree as TreeEdgeRuntimeGeometry | undefined;
    if (!geometry) continue;
    if (geometry.kind === 'split') {
      splitOwnerIds.add(edge.source);
      continue;
    }
    if (geometry.kind !== 'chain') continue;
    const source = placedNodeMap.get(edge.source);
    const target = placedNodeMap.get(edge.target);
    if (!source || !target) continue;
    const gap = target.mainStart - (source.mainStart + source.mainSize);
    const previous = chainGapByNodeId.get(edge.source);
    if (previous === undefined || gap < previous) {
      chainGapByNodeId.set(edge.source, gap);
    }
  }

  return placedNodes.map((node) => {
    const position =
      direction === 'TB'
        ? { x: Math.round(node.crossStart), y: Math.round(node.mainStart) }
        : { x: Math.round(node.mainStart), y: Math.round(node.crossStart) };
    const chainGap = chainGapByNodeId.get(node.id);
    const isSplitOwner = splitOwnerIds.has(node.id);
    if (chainGap === undefined && !isSplitOwner) {
      return { id: node.id, type: node.type, position, data: node.data };
    }
    return {
      id: node.id,
      type: node.type,
      position,
      data: {
        ...node.data,
        ...(chainGap === undefined ? {} : { __fdChainGap: Math.round(chainGap) }),
        ...(isSplitOwner ? { __fdBranchGroupOwner: true } : {}),
      },
    };
  });
}

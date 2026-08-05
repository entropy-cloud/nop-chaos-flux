import type { GraphNode, GraphEdge, TreeEdgeRuntimeGeometry } from '@nop-chaos/flow-designer-core';

import { BTN_DIST, OVERLAY_MAIN_TB, OVERLAY_MAIN_LR } from './dingflow-constants.js';
import type { DingFlowOverlay } from './dingflow-constants.js';

function getTreeGeometry(edge: GraphEdge): TreeEdgeRuntimeGeometry | undefined {
  const data = edge.data as Record<string, unknown> | undefined;
  return data?.__fdTree as TreeEdgeRuntimeGeometry | undefined;
}

function isVirtualNodeId(id: string): boolean {
  return id.startsWith('__fd_internal__/');
}

function getNodeSize(node: GraphNode): { width: number; height: number } {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const size = (data.size ?? {}) as Record<string, unknown>;
  const width =
    (typeof data.width === 'number' ? data.width : undefined) ??
    (typeof size.width === 'number' ? size.width : undefined) ??
    220;
  const height =
    (typeof data.height === 'number' ? data.height : undefined) ??
    (typeof size.height === 'number' ? size.height : undefined) ??
    80;
  return { width, height };
}

/**
 * Computes DingFlow overlays exclusively from projected `__fdTree` geometry.
 * No endpoint guessing (`outs[0]`/`ins[0]`) and no fixed short-leg constants.
 * Virtual slots and their incident edges never produce overlays.
 */
export function computeDingFlowOverlays(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeSizeMap?: Map<string, { minWidth?: number; minHeight?: number }>,
): DingFlowOverlay[] {
  const result: DingFlowOverlay[] = [];
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    if (isVirtualNodeId(node.id)) {
      continue;
    }
    nodeMap.set(node.id, node);
  }

  function getSize(node: GraphNode): { width: number; height: number } {
    const fromMap = nodeSizeMap?.get(node.type);
    if (fromMap) {
      return {
        width: fromMap.minWidth ?? getNodeSize(node).width,
        height: fromMap.minHeight ?? getNodeSize(node).height,
      };
    }
    return getNodeSize(node);
  }

  const splitGroups = new Map<string, GraphEdge[]>();
  const mergeGroups = new Map<string, { continuationId: string; edges: GraphEdge[] }>();
  for (const edge of edges) {
    const geometry = getTreeGeometry(edge);
    if (!geometry) {
      continue;
    }
    if (geometry.kind === 'split') {
      const list = splitGroups.get(edge.source) ?? [];
      list.push(edge);
      splitGroups.set(edge.source, list);
    } else if (geometry.kind === 'merge' && geometry.continuationId) {
      const entry = mergeGroups.get(geometry.continuationId) ?? {
        continuationId: geometry.continuationId,
        edges: [],
      };
      entry.edges.push(edge);
      mergeGroups.set(geometry.continuationId, entry);
    }
  }

  for (const [ownerId, splitEdges] of splitGroups) {
    const owner = nodeMap.get(ownerId);
    if (!owner || splitEdges.length === 0) {
      continue;
    }
    const firstGeometry = getTreeGeometry(splitEdges[0]);
    if (!firstGeometry?.lineMain) {
      continue;
    }
    const ownerSize = getSize(owner);
    const isTB = firstGeometry.direction !== 'LR';
    const ownerCenterX = Math.round(owner.position.x + ownerSize.width / 2);
    const ownerCenterY = Math.round(owner.position.y + ownerSize.height / 2);

    const x = isTB
      ? ownerCenterX
      : Math.round(firstGeometry.lineMain);
    const y = isTB
      ? Math.round(firstGeometry.lineMain)
      : ownerCenterY;
    result.push({
      id: `overlay-addcond-${ownerId}`,
      x,
      y,
      kind: 'addCondition',
      sourceId: ownerId,
    });
  }

  for (const [continuationId, entry] of mergeGroups) {
    const continuation = nodeMap.get(continuationId);
    if (!continuation || entry.edges.length === 0) {
      continue;
    }
    const firstGeometry = getTreeGeometry(entry.edges[0]);
    if (!firstGeometry?.lineMain) {
      continue;
    }
    const continuationSize = getSize(continuation);
    const isTB = firstGeometry.direction !== 'LR';
    const continuationCenterX = Math.round(
      continuation.position.x + continuationSize.width / 2,
    );
    const continuationCenterY = Math.round(
      continuation.position.y + continuationSize.height / 2,
    );

    const mergeMain = Math.round(firstGeometry.lineMain);
    const x = isTB
      ? continuationCenterX
      : mergeMain;
    const y = isTB
      ? mergeMain
      : continuationCenterY;
    const overlayMain = isTB ? OVERLAY_MAIN_TB : OVERLAY_MAIN_LR;
    const mainOffset = BTN_DIST + overlayMain / 2;
    const crossOffset = 0;

    const xWithOffset = isTB ? x + crossOffset : x + mainOffset;
    const yWithOffset = isTB ? y + mainOffset : y + crossOffset;

    result.push({
      id: `overlay-merge-${continuationId}`,
      x: Math.round(xWithOffset),
      y: Math.round(yWithOffset),
      kind: 'mergeAdd',
      sourceId: `merge:${continuationId}`,
    });
  }

  return result;
}

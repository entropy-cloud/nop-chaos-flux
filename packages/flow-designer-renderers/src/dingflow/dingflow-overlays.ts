import type { GraphNode, GraphEdge } from '@nop-chaos/flow-designer-core';

import {
  CARD_W,
  CARD_H,
  BRANCH_SHORT_LEG,
  MERGE_SHORT_LEG,
  BTN_DIST,
} from './dingflow-constants';
import type { DingFlowOverlay } from './dingflow-constants';

export function computeDingFlowOverlays(
  nodes: GraphNode[],
  edges: GraphEdge[],
): DingFlowOverlay[] {
  const result: DingFlowOverlay[] = [];

  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const sourceGroups = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const arr = sourceGroups.get(e.source) ?? [];
    arr.push(e);
    sourceGroups.set(e.source, arr);
  }

  const targetGroups = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const arr = targetGroups.get(e.target) ?? [];
    arr.push(e);
    targetGroups.set(e.target, arr);
  }

  for (const [sourceId, outs] of sourceGroups) {
    if (outs.length < 2) continue;
    const sourceNode = nodeMap.get(sourceId);
    if (!sourceNode) continue;
    const firstTarget = nodeMap.get(outs[0].target);
    if (!firstTarget) continue;
    const cx = Math.round(sourceNode.position.x + CARD_W / 2);
    const branchLineY = Math.round(
      firstTarget.position.y - BRANCH_SHORT_LEG,
    );
    result.push({
      id: `overlay-addcond-${sourceId}`,
      x: cx,
      y: branchLineY,
      kind: 'addCondition',
      sourceId,
    });
  }

  for (const [targetId, ins] of targetGroups) {
    if (ins.length < 2) continue;
    const targetNode = nodeMap.get(targetId);
    if (!targetNode) continue;
    const firstSource = nodeMap.get(ins[0].source);
    if (!firstSource) continue;
    const cx = Math.round(targetNode.position.x + CARD_W / 2);
    const mergeLineY = Math.round(
      firstSource.position.y + CARD_H + MERGE_SHORT_LEG,
    );
    result.push({
      id: `overlay-merge-${targetId}`,
      x: cx,
      y: Math.round(mergeLineY + BTN_DIST),
      kind: 'mergeAdd',
      sourceId: `merge:${targetId}`,
    });
  }

  return result;
}

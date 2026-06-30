import type { DesignerSnapshot, GraphNode, GraphEdge } from '@nop-chaos/flow-designer-core';

export interface NodeSummary {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  selected: boolean;
  active: boolean;
}

export interface EdgeSummary {
  id: string;
  type: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  data: Record<string, unknown>;
  selected: boolean;
  active: boolean;
}

function isSelectedNode(snapshot: DesignerSnapshot, nodeId: string): boolean {
  return snapshot.selection.selectedNodeIds.includes(nodeId);
}

function isActiveNode(snapshot: DesignerSnapshot, nodeId: string): boolean {
  return snapshot.selection.activeNodeId === nodeId;
}

function isSelectedEdge(snapshot: DesignerSnapshot, edgeId: string): boolean {
  return snapshot.selection.selectedEdgeIds.includes(edgeId);
}

function isActiveEdge(snapshot: DesignerSnapshot, edgeId: string): boolean {
  return snapshot.selection.activeEdgeId === edgeId;
}

export function resolveNodeSummary(
  snapshot: DesignerSnapshot,
  nodeId: string | undefined,
): NodeSummary | undefined {
  if (!nodeId) {
    return undefined;
  }
  const node = snapshot.doc.nodes.find((entry: GraphNode) => entry.id === nodeId);
  if (!node) {
    return undefined;
  }
  return {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: node.data,
    selected: isSelectedNode(snapshot, node.id),
    active: isActiveNode(snapshot, node.id),
  };
}

export function resolveEdgeSummary(
  snapshot: DesignerSnapshot,
  edgeId: string | undefined,
): EdgeSummary | undefined {
  if (!edgeId) {
    return undefined;
  }
  const edge = snapshot.doc.edges.find((entry: GraphEdge) => entry.id === edgeId);
  if (!edge) {
    return undefined;
  }
  return {
    id: edge.id,
    type: edge.type,
    source: edge.source,
    target: edge.target,
    sourcePort: edge.sourcePort,
    targetPort: edge.targetPort,
    data: edge.data,
    selected: isSelectedEdge(snapshot, edge.id),
    active: isActiveEdge(snapshot, edge.id),
  };
}

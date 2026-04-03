import type { GraphDocument, NormalizedDesignerConfig, NodeConstraintConfig } from '../types';

export const EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.';
export const EDGE_MISSING_NODE_ERROR = 'Edges must connect existing nodes.';
export const EDGE_DUPLICATE_ERROR = 'Duplicate edges are not supported in the playground example.';

export function countNodesOfType(doc: GraphDocument, type: string): number {
  return doc.nodes.filter((node) => node.type === type).length;
}

export function countIncomingEdges(doc: GraphDocument, nodeId: string): number {
  return doc.edges.filter((edge) => edge.target === nodeId).length;
}

export function countOutgoingEdges(doc: GraphDocument, nodeId: string): number {
  return doc.edges.filter((edge) => edge.source === nodeId).length;
}

export function checkMaxInstances(doc: GraphDocument, constraints: NodeConstraintConfig | undefined, type: string): boolean {
  if (!constraints?.maxInstances || constraints.maxInstances === 'unlimited') {
    return true;
  }
  return countNodesOfType(doc, type) < constraints.maxInstances;
}

export function checkMinInstances(doc: GraphDocument, constraints: NodeConstraintConfig | undefined, type: string): boolean {
  if (constraints?.minInstances === undefined) {
    return true;
  }
  return countNodesOfType(doc, type) > constraints.minInstances;
}

export function hasEdgeConnection(doc: GraphDocument, source: string, target: string, ignoreEdgeId?: string): boolean {
  return doc.edges.some((edge) => edge.id !== ignoreEdgeId && edge.source === source && edge.target === target);
}

export function validateEdgeConnection(
  doc: GraphDocument,
  normalizedConfig: NormalizedDesignerConfig,
  source: string,
  target: string,
  ignoreEdgeId?: string,
): string | undefined {
  const sourceNode = doc.nodes.find((node) => node.id === source);
  const targetNode = doc.nodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode) {
    return EDGE_MISSING_NODE_ERROR;
  }
  if (!normalizedConfig.rules.allowSelfLoop && source === target) {
    return EDGE_SELF_LOOP_ERROR;
  }
  if (!normalizedConfig.rules.allowMultiEdge && hasEdgeConnection(doc, source, target, ignoreEdgeId)) {
    return EDGE_DUPLICATE_ERROR;
  }

  return undefined;
}

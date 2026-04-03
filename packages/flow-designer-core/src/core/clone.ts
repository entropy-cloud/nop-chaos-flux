import type { GraphDocument, GraphNode, GraphEdge } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneNode(node: GraphNode): GraphNode {
  return {
    ...node,
    position: { ...node.position },
    data: { ...node.data },
  };
}

export function cloneEdge(edge: GraphEdge): GraphEdge {
  return {
    ...edge,
    data: { ...edge.data },
  };
}

export function cloneDocument(doc: GraphDocument): GraphDocument {
  return {
    ...doc,
    viewport: doc.viewport ? { ...doc.viewport } : undefined,
    nodes: doc.nodes.map(cloneNode),
    edges: doc.edges.map(cloneEdge),
  };
}

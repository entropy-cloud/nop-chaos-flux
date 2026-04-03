import type { GraphDocument, GraphEdge } from '../types';

export function addEdgeToDocument(
  doc: GraphDocument,
  edge: GraphEdge,
): GraphDocument {
  return {
    ...doc,
    edges: [...doc.edges, edge],
  };
}

export function updateEdgeDataInDocument(
  doc: GraphDocument,
  edgeId: string,
  data: Record<string, unknown>,
): GraphEdge | null {
  const edge = doc.edges.find((entry) => entry.id === edgeId);
  if (!edge) {
    return null;
  }

  return {
    ...edge,
    data: { ...edge.data, ...data },
  };
}

export function replaceEdgeInDocument(
  doc: GraphDocument,
  edgeId: string,
  nextEdge: GraphEdge,
): GraphDocument {
  const edgeIndex = doc.edges.findIndex((entry) => entry.id === edgeId);
  if (edgeIndex === -1) {
    return doc;
  }

  const nextEdges = [...doc.edges];
  nextEdges[edgeIndex] = nextEdge;
  return {
    ...doc,
    edges: nextEdges,
  };
}

export function removeEdgeFromDocument(
  doc: GraphDocument,
  edgeId: string,
): GraphDocument {
  return {
    ...doc,
    edges: doc.edges.filter((edge) => edge.id !== edgeId),
  };
}

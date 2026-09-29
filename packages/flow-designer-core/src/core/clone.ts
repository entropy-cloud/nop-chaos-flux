import type { GraphDocument, GraphNode, GraphEdge, TreeDocument } from '../types.js';

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneNode(node: GraphNode): GraphNode {
  return {
    ...node,
    position: { ...node.position },
    data: cloneValue(node.data ?? {}),
  };
}

export function cloneEdge(edge: GraphEdge): GraphEdge {
  return {
    ...edge,
    data: cloneValue(edge.data ?? {}),
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

export function cloneTreeDocument(tree: TreeDocument | undefined): TreeDocument | undefined {
  if (!tree) return undefined;
  if (typeof structuredClone === 'function') {
    return structuredClone(tree);
  }
  return JSON.parse(JSON.stringify(tree)) as TreeDocument;
}

/** Structural equality for the relayout no-op check — replaces the
 *  whole-document double JSON.stringify (plan 2026-09-29-4 R2-P14). Node/edge
 *  payloads fall back to per-node data stringify only when references differ
 *  and shapes are equal. */
export function documentsEquivalent(a: GraphDocument, b: GraphDocument): boolean {
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) {
    return false;
  }
  for (let i = 0; i < a.nodes.length; i++) {
    const na = a.nodes[i]!;
    const nb = b.nodes[i]!;
    if (na.id !== nb.id || na.position.x !== nb.position.x || na.position.y !== nb.position.y) {
      return false;
    }
    if (na.data !== nb.data && JSON.stringify(na.data ?? null) !== JSON.stringify(nb.data ?? null)) {
      return false;
    }
  }
  for (let i = 0; i < a.edges.length; i++) {
    const ea = a.edges[i]!;
    const eb = b.edges[i]!;
    if (ea.id !== eb.id || ea.source !== eb.source || ea.target !== eb.target) {
      return false;
    }
  }
  return true;
}

import type {
  GraphDocument,
  GraphNode,
  NormalizedDesignerConfig,
} from '../types';

export function addNodeToDocument(
  doc: GraphDocument,
  node: GraphNode,
): GraphDocument {
  return {
    ...doc,
    nodes: [...doc.nodes, node],
  };
}

export function updateNodeDataInDocument(
  doc: GraphDocument,
  nodeId: string,
  data: Record<string, unknown>,
): GraphNode | null {
  const node = doc.nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    return null;
  }

  return {
    ...node,
    data: { ...node.data, ...data },
  };
}

export function replaceNodeInDocument(
  doc: GraphDocument,
  nodeId: string,
  nextNode: GraphNode,
): GraphDocument {
  const nodeIndex = doc.nodes.findIndex((entry) => entry.id === nodeId);
  if (nodeIndex === -1) {
    return doc;
  }

  const nextNodes = [...doc.nodes];
  nextNodes[nodeIndex] = nextNode;
  return {
    ...doc,
    nodes: nextNodes,
  };
}

export function removeNodeFromDocument(
  doc: GraphDocument,
  nodeId: string,
): GraphDocument {
  return {
    ...doc,
    nodes: doc.nodes.filter((node) => node.id !== nodeId),
    edges: doc.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  };
}

export function moveNodesInDocument(
  doc: GraphDocument,
  deltas: Record<string, { dx: number; dy: number }>,
  normalizedConfig: NormalizedDesignerConfig,
): GraphDocument | null {
  const nextNodes = doc.nodes.map((node) => {
    const delta = deltas[node.id];
    if (!delta) {
      return node;
    }

    const nodeType = normalizedConfig.nodeTypes.get(node.type);
    if (nodeType?.constraints?.allowMove === false) {
      return node;
    }

    const nextPosition = {
      x: node.position.x + delta.dx,
      y: node.position.y + delta.dy,
    };
    if (node.position.x === nextPosition.x && node.position.y === nextPosition.y) {
      return node;
    }

    return {
      ...node,
      position: nextPosition,
    };
  });

  if (!nextNodes.some((node, index) => node !== doc.nodes[index])) {
    return null;
  }

  return {
    ...doc,
    nodes: nextNodes,
  };
}

export function updateMultipleNodesInDocument(
  doc: GraphDocument,
  updates: Array<{ nodeId: string; data: Partial<GraphNode> }>,
): GraphDocument | null {
  const updatesById = new Map(updates.map((entry) => [entry.nodeId, entry.data]));
  const nextNodes = doc.nodes.map((node) => {
    const patch = updatesById.get(node.id);
    if (!patch) {
      return node;
    }

    return {
      ...node,
      ...patch,
      position: patch.position ? { ...patch.position } : node.position,
      data: patch.data ? { ...node.data, ...patch.data } : node.data,
    };
  });

  if (!nextNodes.some((node, index) => node !== doc.nodes[index])) {
    return null;
  }

  return {
    ...doc,
    nodes: nextNodes,
  };
}

export function layoutNodesInDocument(
  doc: GraphDocument,
  positions: Map<string, { x: number; y: number }>,
): GraphDocument | null {
  const nextNodes = doc.nodes.map((node) => {
    const nextPosition = positions.get(node.id);
    if (!nextPosition) {
      return node;
    }
    if (node.position.x === nextPosition.x && node.position.y === nextPosition.y) {
      return node;
    }
    return {
      ...node,
      position: { ...nextPosition },
    };
  });

  if (!nextNodes.some((node, index) => node !== doc.nodes[index])) {
    return null;
  }

  return {
    ...doc,
    nodes: nextNodes,
  };
}

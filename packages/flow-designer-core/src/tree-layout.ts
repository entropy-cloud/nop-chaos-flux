import type { GraphNode, GraphEdge, TreeConfig, NodeTypeConfig } from './types';
import { layoutWithElk } from './elk-layout';

export function simpleTreeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  treeConfig: TreeConfig,
  nodeTypes?: Map<string, NodeTypeConfig>
): GraphNode[] {
  if (nodes.length === 0) return nodes;

  const nodeSpacing = treeConfig.layout.nodeSpacing ?? 60;
  const layerSpacing = treeConfig.layout.layerSpacing ?? 120;
  const isVertical = treeConfig.layout.direction !== 'LR';

  const nodeWidths = new Map(nodes.map((n) => {
    const nt = nodeTypes?.get(n.type);
    return [n.id, nt?.appearance?.minWidth ?? 220];
  }));
  const nodeHeights = new Map(nodes.map((n) => {
    const nt = nodeTypes?.get(n.type);
    return [n.id, nt?.appearance?.minHeight ?? 80];
  }));

  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  for (const edge of edges) {
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(edge.target);
    parentOf.set(edge.target, edge.source);
  }

  const roots = nodes.filter((n) => !parentOf.has(n.id));
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const layers: string[][] = [];
  const visited = new Set<string>();

  let currentLayer = roots.map((r) => r.id);
  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    for (const id of currentLayer) visited.add(id);
    const nextLayer: string[] = [];
    for (const id of currentLayer) {
      const children = childrenOf.get(id) ?? [];
      for (const child of children) {
        if (!visited.has(child)) {
          nextLayer.push(child);
        }
      }
    }
    currentLayer = nextLayer;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const lastLayer = layers[layers.length - 1];
      if (lastLayer) {
        lastLayer.push(node.id);
      } else {
        layers.push([node.id]);
      }
    }
  }

  const DW = 220;
  const DH = 80;

  const positions = new Map<string, { x: number; y: number }>();
  let offset = 0;

  if (isVertical) {
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const totalSpan = layer.reduce((sum, id) => sum + (nodeWidths.get(id) ?? DW) + nodeSpacing, -nodeSpacing);
      let cursor = 0;
      for (const id of layer) {
        const w = nodeWidths.get(id) ?? DW;
        positions.set(id, { x: -totalSpan / 2 + cursor + w / 2, y: offset });
        cursor += w + nodeSpacing;
      }
      const layerMaxHeight = layer.reduce((max, id) => Math.max(max, nodeHeights.get(id) ?? DH), 0);
      offset += layerMaxHeight + layerSpacing;
    }
  } else {
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const totalSpan = layer.reduce((sum, id) => sum + (nodeHeights.get(id) ?? DH) + nodeSpacing, -nodeSpacing);
      let cursor = 0;
      for (const id of layer) {
        const h = nodeHeights.get(id) ?? DH;
        positions.set(id, { x: offset, y: -totalSpan / 2 + cursor + h / 2 });
        cursor += h + nodeSpacing;
      }
      const layerMaxWidth = layer.reduce((max, id) => Math.max(max, nodeWidths.get(id) ?? DW), 0);
      offset += layerMaxWidth + layerSpacing;
    }
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

export async function layoutTreeWithElk(
  nodes: GraphNode[],
  edges: GraphEdge[],
  treeConfig: TreeConfig,
  nodeTypes?: Map<string, NodeTypeConfig>
): Promise<GraphNode[]> {
  if (nodes.length === 0) return nodes;

  const direction = treeConfig.layout.direction === 'TB' ? 'DOWN' : 'RIGHT';

  const positions = await layoutWithElk(nodes, edges, nodeTypes, {
    direction,
    nodeSpacing: treeConfig.layout.nodeSpacing,
    layerSpacing: treeConfig.layout.layerSpacing,
  });

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

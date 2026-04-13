import type { GraphNode, GraphEdge, TreeConfig, NodeTypeConfig } from './types';
import { layoutWithElk } from './elk-layout';

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

import ELK from 'elkjs/lib/elk.bundled.js';
import type { GraphNode, GraphEdge, NodeTypeConfig } from './types';

const elk = new ELK();

export interface ElkLayoutOptions {
  direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  nodeSpacing?: number;
  layerSpacing?: number;
}

export async function layoutWithElk(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodeTypes?: Map<string, NodeTypeConfig>,
  options?: ElkLayoutOptions
): Promise<Map<string, { x: number; y: number }>> {
  const direction = options?.direction ?? 'RIGHT';
  const nodeSpacing = options?.nodeSpacing ?? 60;
  const layerSpacing = options?.layerSpacing ?? 120;

  const elkNodes = nodes.map((node) => {
    const nodeType = nodeTypes?.get(node.type);
    const width = nodeType?.appearance?.minWidth ?? 220;
    const height = nodeType?.appearance?.minHeight ?? 80;
    return {
      id: node.id,
      width,
      height,
    };
  });

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.edgeRouting': 'SPLINES',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  const layouted = await elk.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();

  if (layouted.children) {
    for (const child of layouted.children) {
      if (child.x !== undefined && child.y !== undefined) {
        positions.set(child.id, { x: child.x, y: child.y });
      }
    }
  }

  return positions;
}

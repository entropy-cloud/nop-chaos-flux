import type { GraphNode, GraphEdge, TreeConfig, NodeTypeConfig, TreeDocument, TreeNode } from './types.js';
import { layoutWithElk } from './elk-layout.js';
import type { ElkLayoutOwner } from './elk-layout.js';

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 80;

interface AxisSize {
  cross: number;
  main: number;
}

interface StructuredTreeMeasurement {
  cross: number;
  main: number;
}

function getNodeSize(nodeType: string, nodeTypes?: Map<string, NodeTypeConfig>): { width: number; height: number } {
  const appearance = nodeTypes?.get(nodeType)?.appearance;
  return {
    width: appearance?.minWidth ?? DEFAULT_NODE_WIDTH,
    height: appearance?.minHeight ?? DEFAULT_NODE_HEIGHT,
  };
}

function toAxisSize(
  nodeType: string,
  isVertical: boolean,
  nodeTypes?: Map<string, NodeTypeConfig>,
): AxisSize {
  const size = getNodeSize(nodeType, nodeTypes);
  return isVertical
    ? { cross: size.width, main: size.height }
    : { cross: size.height, main: size.width };
}

function measureStructuredTree(
  node: TreeNode,
  isVertical: boolean,
  nodeSpacing: number,
  layerSpacing: number,
  nodeTypes: Map<string, NodeTypeConfig> | undefined,
  cache: Map<string, StructuredTreeMeasurement>,
): StructuredTreeMeasurement {
  const cached = cache.get(node.id);
  if (cached) {
    return cached;
  }

  const nodeSize = toAxisSize(node.type, isVertical, nodeTypes);
  const branches = node.branches ?? [];

  let result: StructuredTreeMeasurement;
  if (branches.length === 0) {
    const childMeasure = node.child
      ? measureStructuredTree(node.child, isVertical, nodeSpacing, layerSpacing, nodeTypes, cache)
      : null;
    result = {
      cross: Math.max(nodeSize.cross, childMeasure?.cross ?? 0),
      main: nodeSize.main + (childMeasure ? layerSpacing + childMeasure.main : 0),
    };
  } else {
    const branchMeasures = branches.map((branch) =>
      branch.child
        ? measureStructuredTree(branch.child, isVertical, nodeSpacing, layerSpacing, nodeTypes, cache)
        : { cross: nodeSize.cross, main: 0 },
    );
    const branchesCross = branchMeasures.reduce((sum, branchMeasure) => sum + branchMeasure.cross, 0);
    const spacedBranchesCross =
      branchMeasures.length > 0
        ? branchesCross + nodeSpacing * Math.max(0, branchMeasures.length - 1)
        : nodeSize.cross;
    const branchesMain = branchMeasures.reduce((max, branchMeasure) => Math.max(max, branchMeasure.main), 0);
    const childMeasure = node.child
      ? measureStructuredTree(node.child, isVertical, nodeSpacing, layerSpacing, nodeTypes, cache)
      : null;
    const bodyCross = Math.max(nodeSize.cross, spacedBranchesCross);
    result = {
      cross: Math.max(bodyCross, childMeasure?.cross ?? 0),
      main:
        nodeSize.main +
        layerSpacing +
        branchesMain +
        (childMeasure ? layerSpacing + childMeasure.main : 0),
    };
  }

  cache.set(node.id, result);
  return result;
}

function setStructuredNodePosition(
  positions: Map<string, { x: number; y: number }>,
  node: TreeNode,
  crossStart: number,
  mainStart: number,
  allocatedCross: number,
  isVertical: boolean,
  nodeTypes?: Map<string, NodeTypeConfig>,
): AxisSize {
  const nodeSize = getNodeSize(node.type, nodeTypes);
  const axisSize = toAxisSize(node.type, isVertical, nodeTypes);
  const crossOffset = crossStart + (allocatedCross - axisSize.cross) / 2;
  positions.set(
    node.id,
    isVertical
      ? { x: Math.round(crossOffset), y: Math.round(mainStart) }
      : { x: Math.round(mainStart), y: Math.round(crossOffset) },
  );

  return { cross: nodeSize.width, main: nodeSize.height };
}

function layoutStructuredTreeRecursive(
  node: TreeNode,
  crossStart: number,
  mainStart: number,
  allocatedCross: number,
  isVertical: boolean,
  nodeSpacing: number,
  layerSpacing: number,
  nodeTypes: Map<string, NodeTypeConfig> | undefined,
  measurements: Map<string, StructuredTreeMeasurement>,
  positions: Map<string, { x: number; y: number }>,
): void {
  const axisSize = toAxisSize(node.type, isVertical, nodeTypes);
  setStructuredNodePosition(positions, node, crossStart, mainStart, allocatedCross, isVertical, nodeTypes);

  const branches = node.branches ?? [];
  if (branches.length === 0) {
    if (!node.child) {
      return;
    }

    const childMeasure = measurements.get(node.child.id);
    if (!childMeasure) {
      return;
    }

    layoutStructuredTreeRecursive(
      node.child,
      crossStart + (allocatedCross - childMeasure.cross) / 2,
      mainStart + axisSize.main + layerSpacing,
      childMeasure.cross,
      isVertical,
      nodeSpacing,
      layerSpacing,
      nodeTypes,
      measurements,
      positions,
    );
    return;
  }

  const branchMeasures = branches.map((branch) =>
    branch.child ? measurements.get(branch.child.id) ?? null : null,
  );
  const branchesCross = branchMeasures.reduce((sum, measure) => sum + (measure?.cross ?? axisSize.cross), 0);
  const spacedBranchesCross =
    branchMeasures.length > 0
      ? branchesCross + nodeSpacing * Math.max(0, branchMeasures.length - 1)
      : axisSize.cross;
  const branchTopMain = mainStart + axisSize.main + layerSpacing;
  let branchCrossCursor = crossStart + (allocatedCross - spacedBranchesCross) / 2;
  let branchBottomMain = branchTopMain;

  for (let index = 0; index < branches.length; index += 1) {
    const branch = branches[index];
    const branchMeasure = branchMeasures[index];
    const branchCross = branchMeasure?.cross ?? axisSize.cross;
    const branchMain = branchMeasure?.main ?? 0;

    if (branch.child && branchMeasure) {
      layoutStructuredTreeRecursive(
        branch.child,
        branchCrossCursor,
        branchTopMain,
        branchMeasure.cross,
        isVertical,
        nodeSpacing,
        layerSpacing,
        nodeTypes,
        measurements,
        positions,
      );
      branchBottomMain = Math.max(branchBottomMain, branchTopMain + branchMeasure.main);
    } else {
      branchBottomMain = Math.max(branchBottomMain, branchTopMain + branchMain);
    }

    branchCrossCursor += branchCross + nodeSpacing;
  }

  if (!node.child) {
    return;
  }

  const childMeasure = measurements.get(node.child.id);
  if (!childMeasure) {
    return;
  }

  layoutStructuredTreeRecursive(
    node.child,
    crossStart + (allocatedCross - childMeasure.cross) / 2,
    branchBottomMain + layerSpacing,
    childMeasure.cross,
    isVertical,
    nodeSpacing,
    layerSpacing,
    nodeTypes,
    measurements,
    positions,
  );
}

export function layoutStructuredTree(
  tree: TreeDocument,
  nodes: GraphNode[],
  treeConfig: TreeConfig,
  nodeTypes?: Map<string, NodeTypeConfig>,
): GraphNode[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const isVertical = treeConfig.layout.direction !== 'LR';
  const nodeSpacing = treeConfig.layout.nodeSpacing ?? 60;
  const layerSpacing = treeConfig.layout.layerSpacing ?? 120;
  const measurements = new Map<string, StructuredTreeMeasurement>();
  const rootMeasure = measureStructuredTree(
    tree.root,
    isVertical,
    nodeSpacing,
    layerSpacing,
    nodeTypes,
    measurements,
  );
  const positions = new Map<string, { x: number; y: number }>();

  layoutStructuredTreeRecursive(
    tree.root,
    0,
    0,
    rootMeasure.cross,
    isVertical,
    nodeSpacing,
    layerSpacing,
    nodeTypes,
    measurements,
    positions,
  );

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}

export function simpleTreeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  treeConfig: TreeConfig,
  nodeTypes?: Map<string, NodeTypeConfig>,
): GraphNode[] {
  if (nodes.length === 0) return nodes;

  const nodeSpacing = treeConfig.layout.nodeSpacing ?? 60;
  const layerSpacing = treeConfig.layout.layerSpacing ?? 120;
  const isVertical = treeConfig.layout.direction !== 'LR';

  const nodeWidths = new Map(
    nodes.map((n) => {
      return [n.id, getNodeSize(n.type, nodeTypes).width];
    }),
  );
  const nodeHeights = new Map(
    nodes.map((n) => {
      return [n.id, getNodeSize(n.type, nodeTypes).height];
    }),
  );

  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();
  const incomingByTarget = new Map<string, GraphEdge[]>();
  const outgoingBySource = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    const incoming = incomingByTarget.get(edge.target);
    if (incoming) {
      incoming.push(edge);
    } else {
      incomingByTarget.set(edge.target, [edge]);
    }

    const outgoing = outgoingBySource.get(edge.source);
    if (outgoing) {
      outgoing.push(edge);
    } else {
      outgoingBySource.set(edge.source, [edge]);
    }
  }

  const structuralEdges = edges.filter((edge) => {
    const targetIncoming = incomingCount.get(edge.target) ?? 0;
    const sourceOutgoing = outgoingCount.get(edge.source) ?? 0;
    return !(targetIncoming > 1 && sourceOutgoing === 1);
  });

  const childrenOf = new Map<string, string[]>();
  for (const edge of structuralEdges) {
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(edge.target);
  }

  const roots = nodes.filter((n) => (incomingCount.get(n.id) ?? 0) === 0);
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const orderedNodeIds: string[] = [];
  const visited = new Set<string>();

  const queue = roots.map((root) => root.id);
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const id = queue[queueIndex];
    if (!id || visited.has(id)) {
      continue;
    }

    visited.add(id);
    orderedNodeIds.push(id);
    for (const child of childrenOf.get(id) ?? []) {
      if (!visited.has(child)) {
        queue.push(child);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      orderedNodeIds.push(node.id);
    }
  }

  const DW = DEFAULT_NODE_WIDTH;
  const DH = DEFAULT_NODE_HEIGHT;

  const depthOf = new Map(nodes.map((node) => [node.id, 0]));
  for (const root of roots) {
    depthOf.set(root.id, 0);
  }

  for (const id of orderedNodeIds) {
    const baseDepth = depthOf.get(id) ?? 0;
    for (const edge of outgoingBySource.get(id) ?? []) {
      const nextDepth = baseDepth + 1;
      if (nextDepth > (depthOf.get(edge.target) ?? 0)) {
        depthOf.set(edge.target, nextDepth);
      }
    }
  }

  const layers: string[][] = [];
  for (const id of orderedNodeIds) {
    const depth = depthOf.get(id) ?? 0;
    while (layers.length <= depth) {
      layers.push([]);
    }
    layers[depth].push(id);
  }

  const mergeTargets = new Set(
    edges
      .filter((edge) => {
        const targetIncoming = incomingCount.get(edge.target) ?? 0;
        const sourceOutgoing = outgoingCount.get(edge.source) ?? 0;
        return targetIncoming > 1 && sourceOutgoing === 1;
      })
      .map((edge) => edge.target),
  );

  const positions = new Map<string, { x: number; y: number }>();
  let offset = 0;

  if (isVertical) {
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const totalSpan = layer.reduce(
        (sum, id) => sum + (nodeWidths.get(id) ?? DW) + nodeSpacing,
        -nodeSpacing,
      );
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
      const totalSpan = layer.reduce(
        (sum, id) => sum + (nodeHeights.get(id) ?? DH) + nodeSpacing,
        -nodeSpacing,
      );
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

  for (const targetId of mergeTargets) {
    const incomingEdges = incomingByTarget.get(targetId) ?? [];
    if (incomingEdges.length === 0) {
      continue;
    }

    const sourceCenters = incomingEdges
      .map((edge) => {
        const sourcePos = positions.get(edge.source);
        if (!sourcePos) {
          return null;
        }

        return isVertical
          ? sourcePos.x
          : sourcePos.y;
      })
      .filter((value): value is number => value !== null);

    if (sourceCenters.length === 0) {
      continue;
    }

    const averageCenter = Math.round(
      sourceCenters.reduce((sum, value) => sum + value, 0) / sourceCenters.length,
    );
    const current = positions.get(targetId);
    if (!current) {
      continue;
    }

    positions.set(
      targetId,
      isVertical ? { x: averageCenter, y: current.y } : { x: current.x, y: averageCenter },
    );
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) {
      return node;
    }

    const width = nodeWidths.get(node.id) ?? DW;
    const height = nodeHeights.get(node.id) ?? DH;

    // React Flow expects node.position to be the top-left corner.
    return {
      ...node,
      position: {
        x: Math.round(pos.x - width / 2),
        y: Math.round(pos.y - height / 2),
      },
    };
  });
}

export async function layoutTreeWithElk(
  nodes: GraphNode[],
  edges: GraphEdge[],
  treeConfig: TreeConfig,
  nodeTypes?: Map<string, NodeTypeConfig>,
  owner?: ElkLayoutOwner,
): Promise<GraphNode[]> {
  if (nodes.length === 0) return nodes;

  const direction = treeConfig.layout.direction === 'TB' ? 'DOWN' : 'RIGHT';

  const positions = await layoutWithElk(
    nodes,
    edges,
    nodeTypes,
    {
      direction,
      nodeSpacing: treeConfig.layout.nodeSpacing,
      layerSpacing: treeConfig.layout.layerSpacing,
    },
    owner,
  );

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

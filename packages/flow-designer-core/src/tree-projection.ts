import {
  resolveTreeNodeFootprint,
  resolveEmptyBranchSize,
  validateTreeDocument,
  validateTreeConfig,
  validateTreeEdgeDecorations,
  TREE_EMPTY_SLOT_NODE_TYPE,
  TREE_VIRTUAL_DATA_KEY,
} from './tree-validation.js';
export {
  isJsonSafeTreePayload,
  canonicalizeJsonValue,
  canonicalizeTreeDocument,
  resolveTreeNodeFootprint,
  validateTreeDocument,
  TREE_INTERNAL_ID_PREFIX,
  TREE_EMPTY_SLOT_NODE_TYPE,
  TREE_VIRTUAL_DATA_KEY,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_EMPTY_BRANCH_SIZE,
} from './tree-validation.js';
export { validateTreeConfig, validateTreeEdgeDecorations, resolveEmptyBranchSize } from './tree-validation.js';

import type {
  TreeDocument,
  TreeNode,
  TreeNodeBranch,
  NormalizedDesignerConfig,
  GraphNode,
  GraphEdge,
  TreeProjectionResult,
  TreeProjectionView,
  TreeEdgeRuntimeGeometry,
} from './types.js';

const BTN_CENTER_DIST = 36;
const BTN_DIAMETER = 28;
const HANDLE_SIZE = 12;
const CONTROL_CLEARANCE = 4;
const CONNECTOR_CLEARANCE = 8;
const FOCUSED_STROKE_WIDTH = 3;
export const MIN_CHAIN_GAP = BTN_CENTER_DIST + BTN_DIAMETER / 2 + HANDLE_SIZE / 2 + CONTROL_CLEARANCE;
export const SPLIT_HALF_GAP_MIN_TB =
  BTN_CENTER_DIST + BTN_DIAMETER / 2 + 26 / 2 + CONTROL_CLEARANCE;
export const SPLIT_HALF_GAP_MIN_LR =
  BTN_CENTER_DIST + BTN_DIAMETER / 2 + 96 / 2 + CONTROL_CLEARANCE;
export const MIN_SPLIT_GAP_TB = 2 * SPLIT_HALF_GAP_MIN_TB;
export const MIN_SPLIT_GAP_LR = 2 * SPLIT_HALF_GAP_MIN_LR;
export const MERGE_HALF_GAP_MIN =
  BTN_CENTER_DIST + BTN_DIAMETER / 2 + CONNECTOR_CLEARANCE + Math.ceil(FOCUSED_STROKE_WIDTH / 2);
export const MIN_MERGE_GAP = 2 * MERGE_HALF_GAP_MIN;

interface AxisSize {
  cross: number;
  main: number;
}

interface SubtreeMeasurement {
  crossSize: number;
  mainSize: number;
}

interface BranchColumnPlacement {
  branchId: string;
  crossStart: number;
  crossSize: number;
  mainSize: number;
  isSlot: boolean;
}

interface BranchGroupGeometry {
  ownerId: string;
  continuationId?: string;
  splitMain: number;
  mergeMain?: number;
  fanoutCross: number;
  columns: BranchColumnPlacement[];
}

function resolveEdgeType(
  parentNodeType: string | undefined,
  connectionKind: 'chain' | 'branch' | 'merge',
  config: NormalizedDesignerConfig,
): string {
  if (parentNodeType) {
    const nt = config.nodeTypes.get(parentNodeType);
    if (nt?.tree?.branchEdgeType && connectionKind !== 'chain') {
      return nt.tree.branchEdgeType;
    }
  }
  if (config.treeConfig) {
    if (connectionKind === 'chain' && config.treeConfig.chainEdgeType) {
      return config.treeConfig.chainEdgeType;
    }
    if (connectionKind === 'branch' && config.treeConfig.branchEdgeType) {
      return config.treeConfig.branchEdgeType;
    }
    if (connectionKind === 'merge' && config.treeConfig.mergeEdgeType) {
      return config.treeConfig.mergeEdgeType;
    }
  }
  return config.rules.defaultEdgeType ?? 'default';
}

function toAxisSize(size: { width: number; height: number }, direction: 'TB' | 'LR'): AxisSize {
  return direction === 'TB'
    ? { cross: size.width, main: size.height }
    : { cross: size.height, main: size.width };
}

function measureSubtree(
  node: TreeNode,
  config: NormalizedDesignerConfig,
  direction: 'TB' | 'LR',
  nodeSpacing: number,
  chainGap: number,
  splitGap: number,
  mergeGap: number,
  cache: Map<string, SubtreeMeasurement>,
): SubtreeMeasurement {
  const cached = cache.get(node.id);
  if (cached) {
    return cached;
  }

  const nodeAxis = toAxisSize(resolveTreeNodeFootprint(node.type, config), direction);
  const branches = node.branches ?? [];

  let result: SubtreeMeasurement;
  if (branches.length === 0) {
    const childMeasure = node.child
      ? measureSubtree(node.child, config, direction, nodeSpacing, chainGap, splitGap, mergeGap, cache)
      : null;
    result = {
      crossSize: Math.max(nodeAxis.cross, childMeasure?.crossSize ?? 0),
      mainSize: nodeAxis.main + (childMeasure ? chainGap + childMeasure.mainSize : 0),
    };
  } else {
    const emptyBranchSize = resolveEmptyBranchSize(config);
    const emptyAxis = toAxisSize(emptyBranchSize, direction);
    const branchMeasures = branches.map((branch) =>
      branch.child
        ? measureSubtree(branch.child, config, direction, nodeSpacing, chainGap, splitGap, mergeGap, cache)
        : { crossSize: emptyAxis.cross, mainSize: emptyAxis.main },
    );
    const branchesCross = branchMeasures.reduce((sum, measure) => sum + measure.crossSize, 0);
    const spacedBranchesCross =
      branchMeasures.length > 0
        ? branchesCross + nodeSpacing * Math.max(0, branchMeasures.length - 1)
        : nodeAxis.cross;
    const branchesMain = branchMeasures.reduce((max, measure) => Math.max(max, measure.mainSize), 0);
    const childMeasure = node.child
      ? measureSubtree(node.child, config, direction, nodeSpacing, chainGap, splitGap, mergeGap, cache)
      : null;
    result = {
      crossSize: Math.max(nodeAxis.cross, spacedBranchesCross, childMeasure?.crossSize ?? 0),
      mainSize:
        nodeAxis.main +
        splitGap +
        branchesMain +
        (childMeasure ? mergeGap + childMeasure.mainSize : 0),
    };
  }

  cache.set(node.id, result);
  return result;
}

interface PlacedNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  crossStart: number;
  mainStart: number;
  crossSize: number;
  mainSize: number;
}

interface PlacedSlot {
  id: string;
  ownerId: string;
  branchId: string;
  crossStart: number;
  mainStart: number;
  crossSize: number;
  mainSize: number;
}

interface PlaceState {
  nodes: PlacedNode[];
  slots: PlacedSlot[];
  groups: BranchGroupGeometry[];
}

function placeSubtree(
  node: TreeNode,
  crossStart: number,
  mainStart: number,
  allocatedCross: number,
  config: NormalizedDesignerConfig,
  direction: 'TB' | 'LR',
  nodeSpacing: number,
  chainGap: number,
  splitGap: number,
  mergeGap: number,
  measurements: Map<string, SubtreeMeasurement>,
  state: PlaceState,
): void {
  const nodeAxis = toAxisSize(resolveTreeNodeFootprint(node.type, config), direction);
  const nodeCrossStart = crossStart + (allocatedCross - nodeAxis.cross) / 2;

  const branches = node.branches ?? [];
  const branchMeasures = branches.map((branch) => measurements.get(branch.child?.id ?? '') ?? null);
  const emptyBranchSize = resolveEmptyBranchSize(config);
  const emptyAxis = toAxisSize(emptyBranchSize, direction);

  const branchesCross = branchMeasures.reduce(
    (sum, measure) => sum + (measure?.crossSize ?? emptyAxis.cross),
    0,
  );
  const spacedBranchesCross =
    branchMeasures.length > 0
      ? branchesCross + nodeSpacing * Math.max(0, branchMeasures.length - 1)
      : nodeAxis.cross;

  state.nodes.push({
    id: node.id,
    type: node.type,
    data: node.data,
    crossStart: nodeCrossStart,
    mainStart,
    crossSize: nodeAxis.cross,
    mainSize: nodeAxis.main,
  });

  if (branches.length === 0) {
    if (!node.child) {
      return;
    }
    const childMeasure = measurements.get(node.child.id);
    if (!childMeasure) {
      return;
    }
    placeSubtree(
      node.child,
      crossStart + (allocatedCross - childMeasure.crossSize) / 2,
      mainStart + nodeAxis.main + chainGap,
      childMeasure.crossSize,
      config,
      direction,
      nodeSpacing,
      chainGap,
      splitGap,
      mergeGap,
      measurements,
      state,
    );
    return;
  }

  const branchGroupCrossStart = crossStart + (allocatedCross - spacedBranchesCross) / 2;
  const branchTopMain = mainStart + nodeAxis.main + splitGap;
  const columns: BranchColumnPlacement[] = [];
  let branchCrossCursor = branchGroupCrossStart;
  let branchGroupMainEnd = branchTopMain;

  for (let index = 0; index < branches.length; index += 1) {
    const branch = branches[index];
    const measure = branchMeasures[index];
    const branchCrossSize = measure?.crossSize ?? emptyAxis.cross;
    const branchMainSize = measure?.mainSize ?? emptyAxis.main;

    if (branch.child && measure) {
      placeSubtree(
        branch.child,
        branchCrossCursor,
        branchTopMain,
        branchCrossSize,
        config,
        direction,
        nodeSpacing,
        chainGap,
        splitGap,
        mergeGap,
        measurements,
        state,
      );
    } else {
      const slotId = `__fd_internal__/slot/${encodeURIComponent(node.id)}/${encodeURIComponent(branch.id)}`;
      state.slots.push({
        id: slotId,
        ownerId: node.id,
        branchId: branch.id,
        crossStart: branchCrossCursor + (branchCrossSize - emptyAxis.cross) / 2,
        mainStart: branchTopMain,
        crossSize: emptyAxis.cross,
        mainSize: emptyAxis.main,
      });
    }

    columns.push({
      branchId: branch.id,
      crossStart: branchCrossCursor,
      crossSize: branchCrossSize,
      mainSize: branchMainSize,
      isSlot: !branch.child,
    });
    branchGroupMainEnd = Math.max(branchGroupMainEnd, branchTopMain + branchMainSize);
    branchCrossCursor += branchCrossSize + nodeSpacing;
  }

  const group: BranchGroupGeometry = {
    ownerId: node.id,
    splitMain: Math.round(mainStart + nodeAxis.main + splitGap / 2),
    fanoutCross: Math.round(branchGroupCrossStart + spacedBranchesCross / 2),
    columns,
  };

  if (node.child) {
    const childMeasure = measurements.get(node.child.id);
    if (childMeasure) {
      const continuationMainStart = branchGroupMainEnd + mergeGap;
      const splitLower = Math.ceil(mainStart + nodeAxis.main + SPLIT_HALF_GAP_MIN_TB);
      const splitUpper = Math.floor(branchTopMain - SPLIT_HALF_GAP_MIN_TB);
      const splitMain =
        splitUpper >= splitLower ? Math.round((splitLower + splitUpper) / 2) : branchTopMain - splitGap / 2;
      group.splitMain = Math.round(splitMain);

      const mergeLower = Math.ceil(branchGroupMainEnd + MERGE_HALF_GAP_MIN);
      const mergeUpper = Math.floor(continuationMainStart - MERGE_HALF_GAP_MIN);
      const mergeMain =
        mergeUpper >= mergeLower ? Math.round((mergeLower + mergeUpper) / 2) : branchGroupMainEnd + mergeGap / 2;
      group.mergeMain = Math.round(mergeMain);
      group.continuationId = node.child.id;

      placeSubtree(
        node.child,
        branchGroupCrossStart + (spacedBranchesCross - childMeasure.crossSize) / 2,
        continuationMainStart,
        childMeasure.crossSize,
        config,
        direction,
        nodeSpacing,
        chainGap,
        splitGap,
        mergeGap,
        measurements,
        state,
      );
    }
  } else {
    group.mergeMain = undefined;
  }

  state.groups.push(group);
}

function buildRuntimeGeometry(
  kind: 'chain' | 'split' | 'merge',
  direction: 'TB' | 'LR',
  input: {
    ownerId?: string;
    branchId?: string;
    continuationId?: string;
    lineMain?: number;
    fanoutCross?: number;
  },
): TreeEdgeRuntimeGeometry {
  const geometry: TreeEdgeRuntimeGeometry = { kind, direction };
  if (input.ownerId !== undefined) geometry.ownerId = input.ownerId;
  if (input.branchId !== undefined) geometry.branchId = input.branchId;
  if (input.continuationId !== undefined) geometry.continuationId = input.continuationId;
  if (input.lineMain !== undefined) geometry.lineMain = input.lineMain;
  if (input.fanoutCross !== undefined) geometry.fanoutCross = input.fanoutCross;
  return geometry;
}

function projectEdges(
  node: TreeNode,
  config: NormalizedDesignerConfig,
  direction: 'TB' | 'LR',
  state: PlaceState,
  placedNodeMap: Map<string, PlacedNode>,
  groupMap: Map<string, BranchGroupGeometry>,
  edgeCounter: { value: number },
  edges: GraphEdge[],
): void {
  const branches = node.branches ?? [];
  if (branches.length > 0) {
    const group = groupMap.get(node.id);
    const branchEdges = new Set<string>();
    for (const branch of branches) {
      const branchEdgeType = resolveEdgeType(node.type, 'branch', config);
      branchEdges.add(branchEdgeType);
      const branchColumn = group?.columns.find((column) => column.branchId === branch.id);
      const fanoutCross = branchColumn ? Math.round(branchColumn.crossStart + branchColumn.crossSize / 2) : group?.fanoutCross;
      if (branch.child) {
        const splitGeometry = buildRuntimeGeometry('split', direction, {
          ownerId: node.id,
          branchId: branch.id,
          lineMain: group?.splitMain,
          fanoutCross,
        });
        edgeCounter.value += 1;
        edges.push({
          id: `te-${edgeCounter.value}`,
          type: branchEdgeType,
          source: node.id,
          target: branch.child.id,
          data: {
            ...(branch.data ?? {}),
            __fdTree: splitGeometry,
          },
        });
      } else {
        const slotId = `__fd_internal__/slot/${encodeURIComponent(node.id)}/${encodeURIComponent(branch.id)}`;
        const slotGeometry = buildRuntimeGeometry('split', direction, {
          ownerId: node.id,
          branchId: branch.id,
          lineMain: group?.splitMain,
          fanoutCross,
        });
        edgeCounter.value += 1;
        edges.push({
          id: `te-${edgeCounter.value}`,
          type: branchEdgeType,
          source: node.id,
          target: slotId,
          data: {
            ...(branch.data ?? {}),
            __fdTree: slotGeometry,
          },
        });
      }
    }

    if (node.child) {
      const mergeEdgeType = resolveEdgeType(node.type, 'merge', config);
      const continuationCenter = group?.fanoutCross;
      const pushMergeEdge = (leafId: string, branchId: string) => {
        if (!node.child) {
          return;
        }
        const leaf = placedNodeMap.get(leafId);
        const fanoutCross = leaf ? Math.round(leaf.crossStart + leaf.crossSize / 2) : continuationCenter;
        const mergeGeometry = buildRuntimeGeometry('merge', direction, {
          ownerId: node.id,
          branchId,
          continuationId: node.child?.id,
          lineMain: group?.mergeMain,
          fanoutCross,
        });
        edgeCounter.value += 1;
        edges.push({
          id: `te-${edgeCounter.value}`,
          type: mergeEdgeType,
          source: leafId,
          target: node.child.id,
          data: { __fdTree: mergeGeometry },
        });
      };

      const collectLeafIds = (branch: TreeNodeBranch): string[] => {
        if (!branch.child) {
          const slotId = `__fd_internal__/slot/${encodeURIComponent(node.id)}/${encodeURIComponent(branch.id)}`;
          return [slotId];
        }
        return collectSubtreeLeaves(branch.child);
      };

      for (const branch of branches) {
        for (const leafId of collectLeafIds(branch)) {
          pushMergeEdge(leafId, branch.id);
        }
      }
    }

    for (const branch of branches) {
      if (branch.child) {
        projectEdges(
          branch.child,
          config,
          direction,
          state,
          placedNodeMap,
          groupMap,
          edgeCounter,
          edges,
        );
      }
    }
    if (node.child) {
      projectEdges(
        node.child,
        config,
        direction,
        state,
        placedNodeMap,
        groupMap,
        edgeCounter,
        edges,
      );
    }
    return;
  }

  if (!node.child) {
    return;
  }

  const chainEdgeType = resolveEdgeType(node.type, 'chain', config);
  const sourceNode = placedNodeMap.get(node.id);
  const chainGeometry = buildRuntimeGeometry('chain', direction, {
    ownerId: node.id,
    continuationId: node.child.id,
    fanoutCross: sourceNode ? Math.round(sourceNode.crossStart + sourceNode.crossSize / 2) : undefined,
  });
  edgeCounter.value += 1;
  edges.push({
    id: `te-${edgeCounter.value}`,
    type: chainEdgeType,
    source: node.id,
    target: node.child.id,
    data: { __fdTree: chainGeometry },
  });

  projectEdges(
    node.child,
    config,
    direction,
    state,
    placedNodeMap,
    groupMap,
    edgeCounter,
    edges,
  );
}

function collectSubtreeLeaves(node: TreeNode): string[] {
  if ((node.branches?.length ?? 0) === 0) {
    if (!node.child) {
      return [node.id];
    }
    return collectSubtreeLeaves(node.child);
  }
  const leaves: string[] = [];
  for (const branch of node.branches ?? []) {
    if (branch.child) {
      leaves.push(...collectSubtreeLeaves(branch.child));
    }
  }
  if (node.child) {
    leaves.push(...collectSubtreeLeaves(node.child));
  }
  return leaves;
}

/**
 * Core-private sole tree projection + layout entry. Not exported from the
 * package root. One deterministic pass: validate → measure → place → project.
 */
export function projectAndLayoutTree(
  tree: TreeDocument,
  config: NormalizedDesignerConfig,
): TreeProjectionResult {
  const configError = validateTreeConfig(config);
  if (configError) {
    return { ok: false, error: configError };
  }

  const treeError = validateTreeDocument(tree, config);
  if (treeError) {
    return { ok: false, error: treeError };
  }

  const direction = config.treeConfig!.layout.direction;
  const nodeSpacing = config.treeConfig!.layout.nodeSpacing;
  const layerSpacing = config.treeConfig!.layout.layerSpacing;
  const chainGap = Math.max(layerSpacing, MIN_CHAIN_GAP);
  const splitGap = Math.max(layerSpacing, direction === 'TB' ? MIN_SPLIT_GAP_TB : MIN_SPLIT_GAP_LR);
  const mergeGap = Math.max(layerSpacing, MIN_MERGE_GAP);

  const measurements = new Map<string, SubtreeMeasurement>();
  const rootMeasure = measureSubtree(
    tree.root,
    config,
    direction,
    nodeSpacing,
    chainGap,
    splitGap,
    mergeGap,
    measurements,
  );

  const state: PlaceState = { nodes: [], slots: [], groups: [] };
  placeSubtree(
    tree.root,
    0,
    0,
    rootMeasure.crossSize,
    config,
    direction,
    nodeSpacing,
    chainGap,
    splitGap,
    mergeGap,
    measurements,
    state,
  );

  const placedNodeMap = new Map(state.nodes.map((node) => [node.id, node]));
  const groupMap = new Map(state.groups.map((group) => [group.ownerId, group]));

  const edgeCounter = { value: 0 };
  const edges: GraphEdge[] = [];
  projectEdges(
    tree.root,
    config,
    direction,
    state,
    placedNodeMap,
    groupMap,
    edgeCounter,
    edges,
  );

  const usedEdgeTypes = new Set(edges.map((edge) => edge.type));
  const decorationError = validateTreeEdgeDecorations(tree, config, usedEdgeTypes);
  if (decorationError) {
    return { ok: false, error: decorationError };
  }

  const nodes: GraphNode[] = state.nodes.map((node) => {
    const position =
      direction === 'TB'
        ? { x: Math.round(node.crossStart), y: Math.round(node.mainStart) }
        : { x: Math.round(node.mainStart), y: Math.round(node.crossStart) };
    return {
      id: node.id,
      type: node.type,
      position,
      data: node.data,
    };
  });

  for (const slot of state.slots) {
    const position =
      direction === 'TB'
        ? { x: Math.round(slot.crossStart), y: Math.round(slot.mainStart) }
        : { x: Math.round(slot.mainStart), y: Math.round(slot.crossStart) };
    nodes.push({
      id: slot.id,
      type: TREE_EMPTY_SLOT_NODE_TYPE,
      position,
      data: {
        [TREE_VIRTUAL_DATA_KEY]: 'empty-branch',
        ownerId: slot.ownerId,
        branchId: slot.branchId,
      },
    });
  }

  const document = {
    id: tree.id,
    kind: tree.kind,
    name: tree.name,
    version: tree.version,
    meta: tree.meta,
    nodes,
    edges,
  };

  return {
    ok: true,
    view: { tree, document },
  };
}

export type { TreeProjectionView };

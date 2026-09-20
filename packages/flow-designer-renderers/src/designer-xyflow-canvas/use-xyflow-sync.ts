import { useEffect, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Edge, Node, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { normalizePositionSignature } from './xyflow-utils.js';

function mergeSnapshotNode(localNode: Node, snapshotNode: Node): Node {
  return {
    ...snapshotNode,
    position: localNode.position,
    dragging: localNode.dragging,
    // plan 475 Phase 2：measured 是 RF 的实测值（真实 DOM 尺寸），快照上的只是预填估计——
    // 保留实测，否则每次快照同步都会把节点尺寸冲回假值（bugs/11 的持续化形态）。
    measured: localNode.measured ?? snapshotNode.measured,
  };
}

// 位置变化同步路径：位置/数据取文档值，dragging/measured 保留本地——文档位置变化
// （外部移动/自动布局）要生效，但 RF 已实测的尺寸不能被预填估计冲掉。
function adoptSnapshotPosition(localNode: Node, snapshotNode: Node): Node {
  return {
    ...snapshotNode,
    dragging: localNode.dragging,
    measured: localNode.measured ?? snapshotNode.measured,
  };
}

export function syncLocalNodesWithSnapshot(
  currentNodes: Node[],
  snapshotNodes: Node[],
  lastCommittedPositions: Map<string, string>,
): Node[] {
  const snapshotPositionMap = new Map(
    snapshotNodes.map((node) => [node.id, normalizePositionSignature(node.position)]),
  );

  if (currentNodes.length === 0) {
    return snapshotNodes;
  }

  const snapshotIdSet = new Set(snapshotNodes.map((n) => n.id));
  const localIdSet = new Set(currentNodes.map((n) => n.id));
  const structureChanged =
    snapshotIdSet.size !== localIdSet.size ||
    [...snapshotIdSet].some((id) => !localIdSet.has(id));

  if (structureChanged) {
    const currentNodeMap = new Map(currentNodes.map((node) => [node.id, node]));
    return snapshotNodes.map((snapshotNode) => {
      const localNode = currentNodeMap.get(snapshotNode.id);
      if (!localNode) return snapshotNode;
      const snapshotSignature = snapshotPositionMap.get(snapshotNode.id);
      const committedSignature = lastCommittedPositions.get(snapshotNode.id);
      if (committedSignature && snapshotSignature === committedSignature) {
        lastCommittedPositions.delete(snapshotNode.id);
        return mergeSnapshotNode(localNode, snapshotNode);
      }
      return adoptSnapshotPosition(localNode, snapshotNode);
    });
  }

  let changed = false;
  const snapshotNodeMap = new Map(snapshotNodes.map((n) => [n.id, n]));
  const merged = currentNodes.map((localNode) => {
    const snapNode = snapshotNodeMap.get(localNode.id);
    if (!snapNode) return localNode;
    const snapshotSignature = snapshotPositionMap.get(snapNode.id);
    const committedSignature = lastCommittedPositions.get(snapNode.id);
    if (committedSignature && snapshotSignature === committedSignature) {
      lastCommittedPositions.delete(snapNode.id);
      const mergedNode = mergeSnapshotNode(localNode, snapNode);
      if (mergedNode !== localNode) {
        changed = true;
      }
      return mergedNode;
    }
    changed = true;
    return adoptSnapshotPosition(localNode, snapNode);
  });
  return changed ? merged : currentNodes;
}

export interface UseXyflowSyncParams {
  snapshotNodes: Node[];
  snapshotEdges: Edge[];
  hoveredEdgeId: string | null;
  onSelectionPushed?(nodeIds: string[], edgeIds: string[]): void;
}

export interface UseXyflowSyncResult {
  localNodes: Node[];
  renderedEdges: Edge[];
  onNodesChangeInternal: OnNodesChange;
  onEdgesChangeInternal: OnEdgesChange;
  lastCommittedPositionsRef: React.MutableRefObject<Map<string, string>>;
}

function collectSelectedIds(items: { id: string; selected?: boolean }[]): string[] {
  return items.filter((item) => item.selected === true).map((item) => item.id);
}

export function useXyflowSync({
  snapshotNodes,
  snapshotEdges,
  hoveredEdgeId,
  onSelectionPushed,
}: UseXyflowSyncParams): UseXyflowSyncResult {
  const lastCommittedPositionsRef = useRef<Map<string, string>>(new Map());

  const [localNodes, setLocalNodes, onNodesChangeInternal] = useNodesState(snapshotNodes);
  const [, , onEdgesChangeInternal] = useEdgesState(snapshotEdges);

  useEffect(() => {
    setLocalNodes((currentNodes) => {
      return syncLocalNodesWithSnapshot(
        currentNodes,
        snapshotNodes,
        lastCommittedPositionsRef.current,
      );
    });
    // 本 hook 的推送结果恒等于快照的 selected 旗标（sync 各返回路径都取快照 selected），
    // 据此整写 RF 选择集镜像，供 select 类 change 增量上报使用。
    onSelectionPushed?.(collectSelectedIds(snapshotNodes), collectSelectedIds(snapshotEdges));
  }, [snapshotNodes, snapshotEdges, setLocalNodes, onSelectionPushed]);

  const renderedEdges = useMemo<Edge[]>(
    () =>
      snapshotEdges.map((edge) => ({
        ...edge,
        data: {
          ...((edge.data as Record<string, unknown> | undefined) ?? {}),
          __fdHovered: edge.id === hoveredEdgeId,
        },
      })),
    [snapshotEdges, hoveredEdgeId],
  );

  return {
    localNodes,
    renderedEdges,
    onNodesChangeInternal,
    onEdgesChangeInternal,
    lastCommittedPositionsRef,
  };
}

import { useEffect, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Edge, Node, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { normalizePositionSignature } from './xyflow-utils.js';

export interface UseXyflowSyncParams {
  snapshotNodes: Node[];
  snapshotEdges: Edge[];
  hoveredEdgeId: string | null;
}

export interface UseXyflowSyncResult {
  localNodes: Node[];
  renderedEdges: Edge[];
  onNodesChangeInternal: OnNodesChange;
  onEdgesChangeInternal: OnEdgesChange;
  lastCommittedPositionsRef: React.MutableRefObject<Map<string, string>>;
}

export function useXyflowSync({
  snapshotNodes,
  snapshotEdges,
  hoveredEdgeId,
}: UseXyflowSyncParams): UseXyflowSyncResult {
  const lastCommittedPositionsRef = useRef<Map<string, string>>(new Map());

  const [localNodes, setLocalNodes, onNodesChangeInternal] = useNodesState(snapshotNodes);
  const [localEdges, setLocalEdges, onEdgesChangeInternal] = useEdgesState(snapshotEdges);

  useEffect(() => {
    const snapshotPositionMap = new Map(
      snapshotNodes.map((node) => [node.id, normalizePositionSignature(node.position)]),
    );

    setLocalNodes((currentNodes) => {
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
        const lastCommitted = lastCommittedPositionsRef.current;
        return snapshotNodes.map((snapshotNode) => {
          const localNode = currentNodeMap.get(snapshotNode.id);
          if (!localNode) return snapshotNode;
          const snapshotSignature = snapshotPositionMap.get(snapshotNode.id);
          const committedSignature = lastCommitted.get(snapshotNode.id);
          if (committedSignature && snapshotSignature === committedSignature) return localNode;
          return snapshotNode;
        });
      }

      const lastCommitted = lastCommittedPositionsRef.current;
      let changed = false;
      const snapshotNodeMap = new Map(snapshotNodes.map((n) => [n.id, n]));
      const merged = currentNodes.map((localNode) => {
        const snapNode = snapshotNodeMap.get(localNode.id);
        if (!snapNode) return localNode;
        const snapshotSignature = snapshotPositionMap.get(snapNode.id);
        const committedSignature = lastCommitted.get(snapNode.id);
        if (committedSignature && snapshotSignature === committedSignature) return localNode;
        changed = true;
        return snapNode;
      });
      return changed ? merged : currentNodes;
    });
  }, [snapshotNodes, setLocalNodes]);

  useEffect(() => {
    setLocalEdges(snapshotEdges);
  }, [snapshotEdges, setLocalEdges]);

  const renderedEdges = useMemo<Edge[]>(
    () =>
      localEdges.map((edge) => ({
        ...edge,
        data: {
          ...((edge.data as Record<string, unknown> | undefined) ?? {}),
          __fdHovered: edge.id === hoveredEdgeId,
        },
      })),
    [localEdges, hoveredEdgeId],
  );

  return {
    localNodes,
    renderedEdges,
    onNodesChangeInternal,
    onEdgesChangeInternal,
    lastCommittedPositionsRef,
  };
}

import { useCallback, useEffect, useRef } from 'react';
import type {
  Connection,
  EdgeChange,
  NodeChange,
  OnReconnect,
} from '@xyflow/react';
import {
  normalizePositionSignature,
  normalizeViewportChange,
  viewportsEqual,
} from './xyflow-utils.js';
import type { DesignerXyflowControlledViewport, XyflowViewportChange } from './types.js';

export interface UseXyflowInteractionsParams {
  viewport: DesignerXyflowControlledViewport;
  onNodesChangeInternal: (changes: NodeChange[]) => void;
  onEdgesChangeInternal: (changes: EdgeChange[]) => void;
  lastCommittedPositionsRef: React.MutableRefObject<Map<string, string>>;
  onDeleteNode(nodeId: string, event?: React.MouseEvent): void;
  onMoveNode(nodeId: string, event?: React.MouseEvent, position?: { x: number; y: number }): void;
  onDeleteEdge(edgeId: string, event?: React.MouseEvent): void;
  onStartConnection(nodeId: string, event?: React.MouseEvent, sourcePort?: string): void;
  onCompleteConnection(
    nodeId: string,
    event?: React.MouseEvent,
    sourcePort?: string,
    targetPort?: string,
  ): void;
  onStartReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCompleteReconnect(
    edgeId: string,
    sourceId: string,
    targetId: string,
    event?: React.MouseEvent,
    sourcePort?: string,
    targetPort?: string,
  ): void;
  onViewportChange(
    viewport: { x: number; y: number; zoom: number },
    event?: React.MouseEvent,
  ): void;
}

export interface UseXyflowInteractionsResult {
  handleNodesChange(changes: NodeChange[]): void;
  handleEdgesChange(changes: EdgeChange[]): void;
  handleViewportChange(nextViewport: XyflowViewportChange): void;
  handleConnect(connection: Connection): void;
  handleReconnect: NonNullable<OnReconnect>;
}

export function useXyflowInteractions({
  viewport,
  onNodesChangeInternal,
  onEdgesChangeInternal,
  lastCommittedPositionsRef,
  onDeleteNode,
  onMoveNode,
  onDeleteEdge,
  onStartConnection,
  onCompleteConnection,
  onStartReconnect,
  onCompleteReconnect,
  onViewportChange,
}: UseXyflowInteractionsParams): UseXyflowInteractionsResult {
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);

      for (const change of changes) {
        if (change.type === 'remove') {
          onDeleteNode(change.id, undefined);
          lastCommittedPositionsRef.current.delete(change.id);
          continue;
        }

        if (change.type === 'position' && change.dragging === false && change.position) {
          if (!Number.isFinite(change.position.x) || !Number.isFinite(change.position.y)) {
            continue;
          }
          const position = {
            x: Math.max(-10000, Math.min(10000, Math.round(change.position.x))),
            y: Math.max(-10000, Math.min(10000, Math.round(change.position.y))),
          };
          const signature = normalizePositionSignature(position);
          lastCommittedPositionsRef.current.set(change.id, signature);
          onMoveNode(change.id, undefined, position);
        }
      }
    },
    [onNodesChangeInternal, onDeleteNode, onMoveNode, lastCommittedPositionsRef],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);

      for (const change of changes) {
        if (change.type === 'remove') {
          onDeleteEdge(change.id, undefined);
        }
      }
    },
    [onEdgesChangeInternal, onDeleteEdge],
  );

  function handleViewportChange(nextViewport: XyflowViewportChange) {
    const normalized = normalizeViewportChange(nextViewport);
    if (!normalized) {
      return;
    }

    if (!viewportsEqual(viewport, normalized)) {
      onViewportChange(normalized, undefined);
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    onStartConnection(connection.source, undefined, connection.sourceHandle ?? undefined);
    onCompleteConnection(
      connection.target,
      undefined,
      connection.sourceHandle ?? undefined,
      connection.targetHandle ?? undefined,
    );
  }

  const handleReconnect = useCallback<NonNullable<OnReconnect>>(
    (oldEdge, newConnection) => {
      if (
        !oldEdge.id ||
        !newConnection.source ||
        !newConnection.target ||
        newConnection.source === newConnection.target
      ) {
        return;
      }

      onStartReconnect(oldEdge.id, undefined);
      onCompleteReconnect(
        oldEdge.id,
        newConnection.source,
        newConnection.target,
        undefined,
        newConnection.sourceHandle ?? undefined,
        newConnection.targetHandle ?? undefined,
      );
    },
    [onStartReconnect, onCompleteReconnect],
  );

  return {
    handleNodesChange,
    handleEdgesChange,
    handleViewportChange,
    handleConnect,
    handleReconnect,
  };
}

export interface SelectionToggle {
  id: string;
  selected: boolean;
}

/**
 * plan 475 Phase 1（M-3 单一写入方）：画布选择只由 RF 的用户交互（select 类 change）
 * 上报回 core；core → RF 方向经 sync 推送 selected 旗标。不用 onSelectionChange 做上报
 * ——它的参数是上一提交周期的滞后回声，与 core 互相覆盖会形成乒乓（designer-summary
 * selectNode 的 Maximum update depth 根因）。
 *
 * 镜像 ref 由本 hook 内部创建：sync 推送时整写（trackPushedSelection），用户 select
 * 变更时增量翻转（applyNodeToggles/applyEdgeToggles）后整报。
 */
export function useRfSelectionBridge(params: {
  onSelectionReport(nodeIds: string[], edgeIds: string[]): void;
}) {
  const rfSelectionRef = useRef<{ nodes: Set<string>; edges: Set<string> }>({
    nodes: new Set(),
    edges: new Set(),
  });
  const reportRef = useRef(params.onSelectionReport);
  useEffect(() => {
    reportRef.current = params.onSelectionReport;
  });

  const trackPushedSelection = useCallback((nodeIds: string[], edgeIds: string[]) => {
    rfSelectionRef.current = {
      nodes: new Set(nodeIds),
      edges: new Set(edgeIds),
    };
  }, []);

  const applyToggles = useCallback((toggles: SelectionToggle[], kind: 'nodes' | 'edges') => {
    if (toggles.length === 0) {
      return;
    }

    const next = {
      nodes: new Set(rfSelectionRef.current.nodes),
      edges: new Set(rfSelectionRef.current.edges),
    };
    for (const toggle of toggles) {
      if (toggle.selected) {
        next[kind].add(toggle.id);
      } else {
        next[kind].delete(toggle.id);
      }
    }
    rfSelectionRef.current = next;
    reportRef.current([...next.nodes], [...next.edges]);
  }, []);

  return { trackPushedSelection, applyToggles };
}

export function collectSelectToggles(changes: (NodeChange | EdgeChange)[]): SelectionToggle[] {
  const toggles: SelectionToggle[] = [];
  for (const change of changes) {
    if (change.type === 'select') {
      toggles.push({ id: change.id, selected: change.selected });
    }
  }
  return toggles;
}

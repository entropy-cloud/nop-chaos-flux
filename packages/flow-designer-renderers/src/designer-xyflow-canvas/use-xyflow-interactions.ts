import { useCallback, useRef } from 'react';
import type {
  Connection,
  EdgeChange,
  NodeChange,
  OnReconnect,
  OnSelectionChangeParams,
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
  onNodeSelect(nodeId: string, event?: React.MouseEvent): void;
  onEdgeSelect(edgeId: string, event?: React.MouseEvent): void;
  onPaneClick(): void;
}

export interface UseXyflowInteractionsResult {
  handleNodesChange(changes: NodeChange[]): void;
  handleEdgesChange(changes: EdgeChange[]): void;
  handleViewportChange(nextViewport: XyflowViewportChange): void;
  handleConnect(connection: Connection): void;
  handleReconnect: NonNullable<OnReconnect>;
  handleSelectionChange(selection: OnSelectionChangeParams): void;
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
  onNodeSelect,
  onEdgeSelect,
  onPaneClick,
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
          const position = {
            x: Math.round(change.position.x),
            y: Math.round(change.position.y),
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

  const lastSelectionRef = useRef<{ nodeId: string | null; edgeId: string | null }>({
    nodeId: null,
    edgeId: null,
  });

  function handleSelectionChange(selection: OnSelectionChangeParams) {
    if (selection.nodes.length > 0) {
      const nodeId = selection.nodes[0].id;
      if (lastSelectionRef.current.nodeId !== nodeId) {
        lastSelectionRef.current = { nodeId, edgeId: null };
        onNodeSelect(nodeId, undefined);
      }
      return;
    }

    if (selection.edges.length > 0) {
      const edgeId = selection.edges[0].id;
      if (lastSelectionRef.current.edgeId !== edgeId) {
        lastSelectionRef.current = { nodeId: null, edgeId };
        onEdgeSelect(edgeId, undefined);
      }
      return;
    }

    if (lastSelectionRef.current.nodeId || lastSelectionRef.current.edgeId) {
      lastSelectionRef.current = { nodeId: null, edgeId: null };
      onPaneClick();
    }
  }

  return {
    handleNodesChange,
    handleEdgesChange,
    handleViewportChange,
    handleConnect,
    handleReconnect,
    handleSelectionChange,
  };
}

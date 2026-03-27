import React, { useCallback, useMemo, useState } from 'react';
import { renderDesignerCanvasBridge } from './canvas-bridge';
import { useDesignerContext } from './designer-context';

export function DesignerCanvasContent() {
  const { dispatch, snapshot, config } = useDesignerContext();
  const nodeTypeSizeMap = useMemo(() => {
    const map = new Map<string, { minWidth?: number; minHeight?: number }>();
    for (const nodeType of config.nodeTypes) {
      map.set(nodeType.id, {
        minWidth: nodeType.appearance?.minWidth,
        minHeight: nodeType.appearance?.minHeight
      });
    }
    return map;
  }, [config.nodeTypes]);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null);
  const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);

  const handlePaneClick = useCallback(() => {
    setPendingConnectionSourceId(null);
    setReconnectingEdgeId(null);
    dispatch({ type: 'clearSelection' });
  }, [dispatch]);

  const handleNodeClick = useCallback(
    (nodeId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch({ type: 'selectNode', nodeId });
    },
    [dispatch]
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch({ type: 'selectEdge', edgeId });
    },
    [dispatch]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'deleteNode', nodeId });
    },
    [dispatch]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'duplicateNode', nodeId });
    },
    [dispatch]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      dispatch({ type: 'deleteEdge', edgeId });
    },
    [dispatch]
  );

  return renderDesignerCanvasBridge('xyflow', {
    snapshot,
    canvasConfig: config.canvas,
    nodeTypeSizeMap,
    pendingConnectionSourceId,
    reconnectingEdgeId,
    onPaneClick: handlePaneClick,
    onNodeSelect: handleNodeClick,
    onEdgeSelect: handleEdgeClick,
    onStartConnection: (nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      setReconnectingEdgeId(null);
      setPendingConnectionSourceId(nodeId);
    },
    onCancelConnection: (nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (pendingConnectionSourceId === nodeId) {
        setPendingConnectionSourceId(null);
      }
    },
    onCompleteConnection: (nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (!pendingConnectionSourceId || pendingConnectionSourceId === nodeId) {
        return;
      }

      const result = dispatch({ type: 'addEdge', source: pendingConnectionSourceId, target: nodeId });
      if (result.ok) {
        setPendingConnectionSourceId(null);
      }
    },
    onStartReconnect: (edgeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      setPendingConnectionSourceId(null);
      setReconnectingEdgeId(edgeId);
    },
    onCancelReconnect: (edgeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (reconnectingEdgeId === edgeId) {
        setReconnectingEdgeId(null);
      }
    },
    onCompleteReconnect: (edgeId: string, sourceId: string, nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      const edge = snapshot.doc.edges.find((item) => item.id === edgeId);
      if (!edge || edge.target === nodeId) {
        return;
      }

      const result = dispatch({ type: 'reconnectEdge', edgeId, source: sourceId, target: nodeId });
      if (result.ok) {
        setReconnectingEdgeId(null);
      }
    },
    onDuplicateNode: (nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      handleDuplicateNode(nodeId);
    },
    onDeleteNode: (nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      handleDeleteNode(nodeId);
    },
    onDeleteEdge: (edgeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      handleDeleteEdge(edgeId);
    },
    onMoveNode: (nodeId: string, event?: React.MouseEvent, position?: { x: number; y: number }) => {
      event?.stopPropagation();
      const node = snapshot.doc.nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }
      dispatch({
        type: 'moveNode',
        nodeId,
        position: position ?? { x: node.position.x + 24, y: node.position.y + 24 }
      });
    },
    onViewportChange: (viewport: { x: number; y: number; zoom: number }, event?: React.MouseEvent) => {
      event?.stopPropagation();
      dispatch({ type: 'setViewport', viewport });
    },
    onDrop: (nodeTypeId: string, position: { x: number; y: number }) => {
      dispatch({ type: 'addNode', nodeType: nodeTypeId, position });
    }
  });
}

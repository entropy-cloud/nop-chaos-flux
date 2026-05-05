import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { renderDesignerCanvasBridge } from './canvas-bridge';
import { useDesignerContext, useDesignerFullSnapshot } from './designer-context';
import { DingFlowAddNodeMenu, type DingFlowMenuItem } from './dingflow';
import { createDingFlowMenuCommand } from './dingflow/dingflow-command-dispatch';
import { DesignerIcon } from './designer-icon';
import {
  compareTreeMenuNodeTypes,
  resolveNodeTypeAccent,
  resolveNodeTypeMeta,
  shouldIncludeInTreeAddMenu,
} from './designer-node-appearance';

const plusButtonHandlerHolder: {
  current:
    | ((
        sourceId: string,
        clientX: number,
        clientY: number,
        sourceKind?: 'node' | 'branch-group' | 'merge',
      ) => void)
    | null;
} = { current: null };

export { plusButtonHandlerHolder };

interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
  sourceKind: 'node' | 'branch-group' | 'merge';
}

export function DesignerCanvasContent(props: {
  rootProps?: {
    className?: string;
    'data-testid'?: string;
    'data-cid'?: string;
  };
} = {}) {
  const { dispatch, config } = useDesignerContext();
  const snapshot = useDesignerFullSnapshot();
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null);
  const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const handlePaneClick = useCallback(() => {
    setPendingConnectionSourceId(null);
    setReconnectingEdgeId(null);
    setPopover(null);
    dispatch({ type: 'clearSelection' });
  }, [dispatch]);

  const handlePlusButtonClick = useCallback(
    (
      sourceId: string,
      clientX: number,
      clientY: number,
      sourceKind: 'node' | 'branch-group' | 'merge' = 'node',
    ) => {
      setPopover({ sourceId, screenX: clientX, screenY: clientY, sourceKind });
    },
    [],
  );

  useEffect(() => {
    if (config.documentMode === 'tree') {
      plusButtonHandlerHolder.current = handlePlusButtonClick;
      return () => {
        plusButtonHandlerHolder.current = null;
      };
    }
  }, [config.documentMode, handlePlusButtonClick]);

  const menuItems = useMemo<DingFlowMenuItem[]>(
    () =>
      config.nodeTypes
        .filter(shouldIncludeInTreeAddMenu)
        .sort(compareTreeMenuNodeTypes)
        .map((nodeType) => {
          const meta = resolveNodeTypeMeta(nodeType.id, nodeType);
          return {
            type: nodeType.id,
            label: meta.label,
            icon: meta.icon ? (
              <DesignerIcon icon={meta.icon} size={20} />
            ) : (
              <span className="text-xs font-bold">+</span>
            ),
            color: resolveNodeTypeAccent(nodeType.id, nodeType) ?? 'var(--fd-primary, #3296fa)',
          };
        }),
    [config.nodeTypes],
  );

  const handleMenuSelect = useCallback(
    (type: string) => {
      if (!popover) return;
      const { sourceId, sourceKind } = popover;
      setPopover(null);

      dispatch(createDingFlowMenuCommand(sourceId, type, sourceKind));
    },
    [popover, dispatch],
  );

  const handleNodeClick = useCallback(
    (nodeId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch({ type: 'selectNode', nodeId });
    },
    [dispatch],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      dispatch({ type: 'selectEdge', edgeId });
    },
    [dispatch],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'deleteNode', nodeId });
    },
    [dispatch],
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: 'duplicateNode', nodeId });
    },
    [dispatch],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      dispatch({ type: 'deleteEdge', edgeId });
    },
    [dispatch],
  );

  const nodeTypeSizeMap = useMemo(() => {
    const map = new Map<string, { minWidth?: number; minHeight?: number }>();
    for (const nodeType of config.nodeTypes) {
      map.set(nodeType.id, {
        minWidth: nodeType.appearance?.minWidth,
        minHeight: nodeType.appearance?.minHeight,
      });
    }
    return map;
  }, [config.nodeTypes]);

  const canvas = renderDesignerCanvasBridge({
    snapshot,
    canvasConfig: config.canvas,
    nodeTypeSizeMap,
    pendingConnectionSourceId,
    reconnectingEdgeId,
    onPaneClick: handlePaneClick,
    onNodeSelect: handleNodeClick,
    onEdgeSelect: handleEdgeClick,
    onStartConnection: (nodeId: string, event?: React.MouseEvent) => {
      if (config.documentMode === 'tree') {
        return;
      }
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
    onCompleteConnection: (
      nodeId: string,
      event?: React.MouseEvent,
      sourcePort?: string,
      targetPort?: string,
    ) => {
      if (config.documentMode === 'tree') {
        return;
      }
      event?.stopPropagation();
      if (!pendingConnectionSourceId || pendingConnectionSourceId === nodeId) {
        return;
      }

      const result = dispatch({
        type: 'addEdge',
        source: pendingConnectionSourceId,
        target: nodeId,
        sourcePort,
        targetPort,
      });
      if (result.ok) {
        setPendingConnectionSourceId(null);
      }
    },
    onStartReconnect: (edgeId: string, event?: React.MouseEvent) => {
      if (config.documentMode === 'tree') {
        return;
      }
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
    onCompleteReconnect: (
      edgeId: string,
      sourceId: string,
      nodeId: string,
      event?: React.MouseEvent,
      sourcePort?: string,
      targetPort?: string,
    ) => {
      if (config.documentMode === 'tree') {
        return;
      }
      event?.stopPropagation();
      const edge = snapshot.doc.edges.find((item) => item.id === edgeId);
      if (
        !edge ||
        (edge.target === nodeId &&
          edge.source === sourceId &&
          edge.sourcePort === sourcePort &&
          edge.targetPort === targetPort)
      ) {
        return;
      }

      const result = dispatch({
        type: 'reconnectEdge',
        edgeId,
        source: sourceId,
        target: nodeId,
        sourcePort,
        targetPort,
      });
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
      if (config.documentMode === 'tree') {
        return;
      }
      event?.stopPropagation();
      const node = snapshot.doc.nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }
      dispatch({
        type: 'moveNode',
        nodeId,
        position: position ?? { x: node.position.x + 24, y: node.position.y + 24 },
      });
    },
    onViewportChange: (
      viewport: { x: number; y: number; zoom: number },
      event?: React.MouseEvent,
    ) => {
      event?.stopPropagation();
      dispatch({ type: 'setViewport', viewport });
    },
    onDrop: (nodeTypeId: string, position: { x: number; y: number }) => {
      dispatch({ type: 'addNode', nodeType: nodeTypeId, position });
    },
    documentMode: config.documentMode,
    onPlusButtonClick: config.documentMode === 'tree' ? handlePlusButtonClick : undefined,
  });

  return (
    <div
      className={props.rootProps?.className}
      data-testid={props.rootProps?.['data-testid']}
      data-cid={props.rootProps?.['data-cid']}
    >
      {canvas}
      {popover && (
        <DingFlowAddNodeMenu
          screenX={popover.screenX}
          screenY={popover.screenY}
          items={menuItems}
          onSelect={handleMenuSelect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}

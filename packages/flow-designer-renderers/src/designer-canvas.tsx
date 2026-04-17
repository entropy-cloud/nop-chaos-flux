import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCheck, Send } from 'lucide-react';
import { renderDesignerCanvasBridge } from './canvas-bridge';
import { useDesignerContext, useDesignerFullSnapshot } from './designer-context';
import { DingFlowAddNodeMenu, type DingFlowMenuItem } from './dingflow';

const plusButtonHandlerHolder: { current: ((sourceId: string, clientX: number, clientY: number) => void) | null } = { current: null };

export { plusButtonHandlerHolder };

const DINGFLOW_MENU_ITEMS: DingFlowMenuItem[] = [
  { type: 'dt-approval', color: '#ff943e', icon: <UserCheck size={20} />, label: 'Approver' },
  { type: 'dt-cc', color: '#3296fa', icon: <Send size={20} />, label: 'CC' },
  { type: 'dt-condition', color: '#15bc83', icon: <span className="text-xs font-bold">Cond</span>, label: 'Condition' },
];

interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

export function DesignerCanvasContent() {
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

  const handlePlusButtonClick = useCallback((sourceId: string, clientX: number, clientY: number) => {
    setPopover({ sourceId, screenX: clientX, screenY: clientY });
  }, []);

  useEffect(() => {
    if (config.documentMode === 'tree') {
      plusButtonHandlerHolder.current = handlePlusButtonClick;
      return () => { plusButtonHandlerHolder.current = null; };
    }
  }, [config.documentMode, handlePlusButtonClick]);

  const handleMenuSelect = useCallback((type: string) => {
    if (!popover) return;
    const { sourceId } = popover;
    const isMerge = sourceId.startsWith('merge:');
    const effectiveId = isMerge ? sourceId.slice('merge:'.length) : sourceId;
    setPopover(null);

    if (type === 'dt-condition') {
      dispatch({
        type: 'insertBranchPair',
        sourceId: effectiveId,
        condNodeType: type,
        condData: { title: 'Condition', desc: 'Please set' },
      });
    } else if (isMerge) {
      dispatch({
        type: 'insertChainNodeAtMerge',
        targetId: effectiveId,
        nodeType: type,
        data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
      });
    } else {
      dispatch({
        type: 'insertChainNode',
        sourceId: effectiveId,
        nodeType: type,
        data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
      });
    }
  }, [popover, dispatch]);

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
    },
    documentMode: config.documentMode,
    onPlusButtonClick: config.documentMode === 'tree' ? handlePlusButtonClick : undefined,
  });

  return (
    <>
      {canvas}
      {popover && (
        <DingFlowAddNodeMenu
          screenX={popover.screenX}
          screenY={popover.screenY}
          items={DINGFLOW_MENU_ITEMS}
          onSelect={handleMenuSelect}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  );
}

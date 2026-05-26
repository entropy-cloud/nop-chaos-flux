import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { renderDesignerCanvasBridge } from './canvas-bridge.js';
import { registerDesignerCanvasFocusHandler } from './designer-canvas-focus.js';
import { useDesignerContext, useDesignerSnapshotSelector } from './designer-context.js';
import { DingFlowAddNodeMenu, type DingFlowMenuItem } from './dingflow/index.js';
import { createDingFlowMenuCommand } from './dingflow/dingflow-command-dispatch.js';
import { DesignerIcon } from './designer-icon.js';
import {
  compareTreeMenuNodeTypes,
  resolveNodeTypeAccent,
  resolveNodeTypeMeta,
  shouldIncludeInTreeAddMenu,
} from './designer-node-appearance.js';

const plusButtonHandlers = new WeakMap<
  object,
  (
    sourceId: string,
    clientX: number,
    clientY: number,
    sourceKind?: 'node' | 'branch-group' | 'merge',
  ) => void
>();

export function registerDesignerPlusButtonHandler(
  owner: object,
  handler: (
    sourceId: string,
    clientX: number,
    clientY: number,
    sourceKind?: 'node' | 'branch-group' | 'merge',
  ) => void,
) {
  plusButtonHandlers.set(owner, handler);
  return () => {
    if (plusButtonHandlers.get(owner) === handler) {
      plusButtonHandlers.delete(owner);
    }
  };
}

export function invokeDesignerPlusButtonHandler(
  owner: object,
  sourceId: string,
  clientX: number,
  clientY: number,
  sourceKind?: 'node' | 'branch-group' | 'merge',
) {
  plusButtonHandlers.get(owner)?.(sourceId, clientX, clientY, sourceKind);
}

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
  const { core, dispatch, config } = useDesignerContext();
  const surfaceFocusRef = React.useRef<HTMLDivElement | null>(null);
  const snapshot = useDesignerSnapshotSelector(
    (state) => ({
      doc: state.doc,
      selection: state.selection,
      activeNode: state.activeNode,
      activeEdge: state.activeEdge,
      activeBranch: state.activeBranch,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      isDirty: state.isDirty,
      gridEnabled: state.gridEnabled,
      paletteCollapsed: state.paletteCollapsed,
      inspectorCollapsed: state.inspectorCollapsed,
      viewport: state.viewport,
    }),
    (left, right) =>
      left.doc === right.doc &&
      left.selection === right.selection &&
      left.activeNode === right.activeNode &&
      left.activeEdge === right.activeEdge &&
      left.activeBranch === right.activeBranch &&
      left.canUndo === right.canUndo &&
      left.canRedo === right.canRedo &&
      left.isDirty === right.isDirty &&
      left.gridEnabled === right.gridEnabled &&
      left.paletteCollapsed === right.paletteCollapsed &&
      left.inspectorCollapsed === right.inspectorCollapsed &&
      left.viewport === right.viewport,
  );
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<string | null>(null);
  const [pendingConnectionSourcePortId, setPendingConnectionSourcePortId] = useState<string | null>(null);
  const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const handlePaneClick = useCallback(() => {
    setPendingConnectionSourceId(null);
    setPendingConnectionSourcePortId(null);
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

  useEffect(() => registerDesignerPlusButtonHandler(core, handlePlusButtonClick), [core, handlePlusButtonClick]);
  useEffect(
    () =>
      registerDesignerCanvasFocusHandler(core, () => {
        window.setTimeout(() => {
          surfaceFocusRef.current?.focus();
        }, 0);
      }),
    [core],
  );
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleTestStartReconnect = (event: Event) => {
      if (config.documentMode === 'tree') {
        return;
      }

      const detail = (event as CustomEvent<{ edgeId?: string }>).detail;
      if (!detail?.edgeId) {
        return;
      }

      setPendingConnectionSourceId(null);
      setPendingConnectionSourcePortId(null);
      setReconnectingEdgeId(detail.edgeId);
      dispatch({ type: 'selectEdge', edgeId: detail.edgeId });
    };

    window.addEventListener(
      'nop-designer:test-start-reconnect',
      handleTestStartReconnect as EventListener,
    );
    return () => {
      window.removeEventListener(
        'nop-designer:test-start-reconnect',
        handleTestStartReconnect as EventListener,
      );
    };
  }, [config.documentMode, dispatch]);

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
    pendingConnectionSourcePortId,
    reconnectingEdgeId,
    onPaneClick: handlePaneClick,
    onNodeSelect: handleNodeClick,
    onEdgeSelect: handleEdgeClick,
    onStartConnection: (nodeId: string, event?: React.MouseEvent, sourcePort?: string) => {
      if (config.documentMode === 'tree') {
        return;
      }
      event?.stopPropagation();
      setReconnectingEdgeId(null);
      setPendingConnectionSourceId(nodeId);
      setPendingConnectionSourcePortId(sourcePort ?? null);
    },
    onCancelConnection: (nodeId: string, event?: React.MouseEvent) => {
      event?.stopPropagation();
      if (pendingConnectionSourceId === nodeId) {
        setPendingConnectionSourceId(null);
        setPendingConnectionSourcePortId(null);
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
        sourcePort: sourcePort ?? pendingConnectionSourcePortId ?? undefined,
        targetPort,
      });
      if (result.ok) {
        setPendingConnectionSourceId(null);
        setPendingConnectionSourcePortId(null);
      }
    },
    onStartReconnect: (edgeId: string, event?: React.MouseEvent) => {
      if (config.documentMode === 'tree') {
        return;
      }
      event?.stopPropagation();
      setPendingConnectionSourceId(null);
      setPendingConnectionSourcePortId(null);
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
      ref={surfaceFocusRef}
      role="region"
      tabIndex={0}
      aria-label="Flow designer canvas"
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

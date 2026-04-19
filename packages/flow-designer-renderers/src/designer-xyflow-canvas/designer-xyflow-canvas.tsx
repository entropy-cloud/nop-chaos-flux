import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  ReactFlowInstance,
  OnReconnect,
  OnSelectionChangeParams
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DesignerXyflowNode } from './designer-xyflow-node';
import { DesignerXyflowEdge } from './designer-xyflow-edge';
import { DingFlowEdge } from '../dingflow';
import { computeDingFlowOverlays, DingFlowAddConditionOverlay, DingFlowMergeOverlay } from '../dingflow';
import { createXyflowNodes, createXyflowEdges, normalizeControlledViewport, viewportsEqual, normalizeViewportChange, normalizePositionSignature } from './xyflow-utils';
import type { XyflowViewportChange } from './types';
import type { CanvasConfig, DesignerSnapshot } from '@nop-chaos/flow-designer-core';

export const DESIGNER_PALETTE_NODE_MIME = 'application/x-flow-designer-node-type';

export interface DesignerXyflowCanvasProps {
  snapshot: DesignerSnapshot;
  canvasConfig?: CanvasConfig;
  nodeTypeSizeMap?: Map<string, { minWidth?: number; minHeight?: number }>;
  pendingConnectionSourceId: string | null;
  reconnectingEdgeId: string | null;
  showMinimap?: boolean;
  showControls?: boolean;
  onPaneClick(): void;
  onNodeSelect(nodeId: string, event?: React.MouseEvent): void;
  onEdgeSelect(edgeId: string, event?: React.MouseEvent): void;
  onStartConnection(nodeId: string, event?: React.MouseEvent): void;
  onCancelConnection(nodeId: string, event?: React.MouseEvent): void;
  onCompleteConnection(nodeId: string, event?: React.MouseEvent): void;
  onStartReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCancelReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCompleteReconnect(edgeId: string, sourceId: string, targetId: string, event?: React.MouseEvent): void;
  onDuplicateNode(nodeId: string, event?: React.MouseEvent): void;
  onDeleteNode(nodeId: string, event?: React.MouseEvent): void;
  onDeleteEdge(edgeId: string, event?: React.MouseEvent): void;
  onMoveNode(nodeId: string, event?: React.MouseEvent, position?: { x: number; y: number }): void;
  onViewportChange(viewport: { x: number; y: number; zoom: number }, event?: React.MouseEvent): void;
  onNodeDoubleClick?(nodeId: string, event?: React.MouseEvent): void;
  onEdgeDoubleClick?(edgeId: string, event?: React.MouseEvent): void;
  onNodeHover?(nodeId: string | null, event?: React.MouseEvent): void;
  onEdgeHover?(edgeId: string | null, event?: React.MouseEvent): void;
  onDrop?(nodeTypeId: string, position: { x: number; y: number }): void;
  documentMode?: 'graph' | 'tree';
  onPlusButtonClick?: (sourceId: string, clientX: number, clientY: number) => void;
}

function TreeModeOverlays({ nodes, edges, onPlusButtonClick }: {
  nodes: import('@nop-chaos/flow-designer-core').GraphNode[];
  edges: import('@nop-chaos/flow-designer-core').GraphEdge[];
  onPlusButtonClick: (sourceId: string, clientX: number, clientY: number) => void;
}) {
  const overlays = useMemo(() => computeDingFlowOverlays(nodes, edges), [nodes, edges]);

  return (
    <ViewportPortal>
      {overlays.map((overlay) => (
        <div
          key={overlay.id}
          className="absolute z-[5] pointer-events-auto nopan nodrag"
          style={{
            transform: `translate(${overlay.x}px, ${overlay.y}px) translate(-50%, -50%)`,
          }}
        >
          {overlay.kind === 'addCondition' ? (
            <DingFlowAddConditionOverlay
              onClick={(e) => onPlusButtonClick(overlay.sourceId, e.clientX, e.clientY)}
            />
          ) : (
            <DingFlowMergeOverlay
              onClick={(e) => onPlusButtonClick(overlay.sourceId, e.clientX, e.clientY)}
            />
          )}
        </div>
      ))}
    </ViewportPortal>
  );
}

export function DesignerXyflowCanvas(props: DesignerXyflowCanvasProps) {
  const xyflowNodeTypes = useMemo(() => ({
    designerNode: DesignerXyflowNode
  }), []);
  const xyflowEdgeTypes = useMemo(() => ({
    designerEdge: DesignerXyflowEdge,
    dingflowEdge: DingFlowEdge
  }), []);

  const snapshotNodes = useMemo(
    () => createXyflowNodes(props.snapshot, props.nodeTypeSizeMap),
    [props.snapshot, props.nodeTypeSizeMap]
  );
  const snapshotEdges = useMemo(() => createXyflowEdges(props.snapshot, props.documentMode), [props.snapshot, props.documentMode]);
  const viewport = useMemo(
    () => normalizeControlledViewport(props.snapshot.doc.viewport ?? props.snapshot.viewport),
    [props.snapshot.doc.viewport, props.snapshot.viewport]
  );

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const lastCommittedPositionsRef = useRef<Map<string, string>>(new Map());
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  const [localNodes, setLocalNodes, onNodesChangeInternal] = useNodesState(snapshotNodes);
  const [localEdges, setLocalEdges, onEdgesChangeInternal] = useEdgesState(snapshotEdges);

  const showMinimap = props.showMinimap !== false;
  const showControls = props.showControls !== false;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const gridSize = props.canvasConfig?.gridSize ?? 24;
  const backgroundType = props.canvasConfig?.background ?? 'lines';
  const backgroundVariant = backgroundType === 'dots'
    ? BackgroundVariant.Dots
    : backgroundType === 'cross'
      ? BackgroundVariant.Cross
      : BackgroundVariant.Lines;
  const showBackground = props.snapshot.gridEnabled && backgroundType !== 'none';

  useEffect(() => {
    if (!showMinimap) return;

    const minimapSvg = surfaceRef.current?.querySelector('.react-flow__minimap svg');
    if (minimapSvg && minimapSvg.getAttribute('preserveAspectRatio') !== 'none') {
      minimapSvg.setAttribute('preserveAspectRatio', 'none');
    }
  }, [showMinimap]);

  useEffect(() => {
    const snapshotPositionMap = new Map(
      snapshotNodes.map((node) => [node.id, normalizePositionSignature(node.position)])
    );

    setLocalNodes((currentNodes) => {
      if (currentNodes.length === 0) {
        return snapshotNodes;
      }

      const snapshotIdSet = new Set(snapshotNodes.map((n) => n.id));
      const localIdSet = new Set(currentNodes.map((n) => n.id));
      const structureChanged = snapshotIdSet.size !== localIdSet.size ||
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

  const renderedEdges = useMemo<Edge[]>(() => (
    localEdges.map((edge) => ({
      ...edge,
      data: {
        ...((edge.data as Record<string, unknown> | undefined) ?? {}),
        __fdHovered: edge.id === hoveredEdgeId
      }
    }))
  ), [localEdges, hoveredEdgeId]);

  const { onDeleteNode, onMoveNode, onDeleteEdge, onStartReconnect, onCompleteReconnect } = props;

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
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
          y: Math.round(change.position.y)
        };
        const signature = normalizePositionSignature(position);
        lastCommittedPositionsRef.current.set(change.id, signature);
        onMoveNode(change.id, undefined, position);
      }
    }
  }, [onNodesChangeInternal, onDeleteNode, onMoveNode]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChangeInternal(changes);

    for (const change of changes) {
      if (change.type === 'remove') {
        onDeleteEdge(change.id, undefined);
      }
    }
  }, [onEdgesChangeInternal, onDeleteEdge]);

  function handleViewportChange(nextViewport: XyflowViewportChange) {
    const normalized = normalizeViewportChange(nextViewport);
    if (!normalized) {
      return;
    }

    if (!viewportsEqual(viewport, normalized)) {
      props.onViewportChange(normalized, undefined);
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    props.onStartConnection(connection.source, undefined);
    props.onCompleteConnection(connection.target, undefined);
  }

  const handleReconnect = useCallback<NonNullable<OnReconnect>>(
    (oldEdge, newConnection) => {
      if (!oldEdge.id || !newConnection.source || !newConnection.target || newConnection.source === newConnection.target) {
        return;
      }

      onStartReconnect(oldEdge.id, undefined);
      onCompleteReconnect(oldEdge.id, newConnection.source, newConnection.target, undefined);
    },
    [onStartReconnect, onCompleteReconnect]
  );

  const lastSelectionRef = useRef<{ nodeId: string | null; edgeId: string | null }>({
    nodeId: null,
    edgeId: null
  });

  function handleSelectionChange(selection: OnSelectionChangeParams) {
    if (selection.nodes.length > 0) {
      const nodeId = selection.nodes[0].id;
      if (lastSelectionRef.current.nodeId !== nodeId) {
        lastSelectionRef.current = { nodeId, edgeId: null };
        props.onNodeSelect(nodeId, undefined);
      }
      return;
    }

    if (selection.edges.length > 0) {
      const edgeId = selection.edges[0].id;
      if (lastSelectionRef.current.edgeId !== edgeId) {
        lastSelectionRef.current = { nodeId: null, edgeId };
        props.onEdgeSelect(edgeId, undefined);
      }
      return;
    }

    if (lastSelectionRef.current.nodeId || lastSelectionRef.current.edgeId) {
      lastSelectionRef.current = { nodeId: null, edgeId: null };
      props.onPaneClick();
    }
  }

  return (
    <ReactFlowProvider>
      <div
        className="absolute inset-0 fd-xyflow-surface rounded-xl overflow-hidden"
        ref={surfaceRef}
      >
        <ReactFlow
            nodes={localNodes}
            edges={renderedEdges}
            nodeTypes={xyflowNodeTypes}
            edgeTypes={xyflowEdgeTypes}
            onInit={(instance) => setReactFlowInstance(instance)}
          viewport={viewport}
            fitView
            nodesConnectable
            elementsSelectable
            nodesDraggable
            onMoveEnd={(_event, nextViewport) => handleViewportChange(nextViewport as XyflowViewportChange)}
            onPaneClick={() => {
              props.onPaneClick();
            }}
            onConnect={handleConnect}
            onReconnect={handleReconnect}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onSelectionChange={handleSelectionChange}
            onNodeClick={(_event, node) => props.onNodeSelect(node.id, undefined)}
            onEdgeClick={(_event, edge) => props.onEdgeSelect(edge.id, undefined)}
            proOptions={{ hideAttribution: true }}
            onNodeMouseEnter={(_e, node) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              props.onNodeHover?.(node.id, undefined);
            }}
            onNodeMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                props.onNodeHover?.(null, undefined);
              }, 160);
            }}
            onEdgeMouseEnter={(_e, edge) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              setHoveredEdgeId(edge.id);
              props.onEdgeHover?.(edge.id, undefined);
            }}
            onEdgeMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredEdgeId(null);
                props.onEdgeHover?.(null, undefined);
              }, 160);
            }}
            onNodeDoubleClick={(_event, node) => {
              props.onNodeDoubleClick?.(node.id, undefined);
            }}
            onEdgeDoubleClick={(_event, edge) => {
              props.onEdgeDoubleClick?.(edge.id, undefined);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const nodeTypeId = event.dataTransfer.getData(DESIGNER_PALETTE_NODE_MIME);
              if (!nodeTypeId || !props.onDrop) return;
              const position = reactFlowInstance
                ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
                : { x: event.clientX, y: event.clientY };

              props.onDrop(nodeTypeId, position);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
          >
            {showBackground && (
               <Background gap={gridSize} size={1} variant={backgroundVariant} color="var(--fd-grid-color)" />
             )}
             {showMinimap && (
               <MiniMap
                 className="fd-xyflow-minimap !rounded-2xl !border !border-border"
                 pannable
                 zoomable
                 bgColor="var(--fd-minimap-bg)"
                 offsetScale={0}
                 nodeColor={() => 'var(--fd-minimap-node)'}
                 nodeStrokeColor={() => 'var(--fd-edge-stroke)'}
                 nodeBorderRadius={4}
                 maskColor="var(--fd-minimap-mask)"
               />
             )}
            {showControls && <Controls className="fd-xyflow-controls" showInteractive={false} />}
            {props.documentMode === 'tree' && props.onPlusButtonClick && (
              <TreeModeOverlays
                nodes={props.snapshot.doc.nodes}
                edges={props.snapshot.doc.edges}
                onPlusButtonClick={props.onPlusButtonClick}
              />
            )}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

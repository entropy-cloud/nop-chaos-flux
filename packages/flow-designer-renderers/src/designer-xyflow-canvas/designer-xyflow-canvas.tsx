import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
} from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DesignerXyflowNode } from './designer-xyflow-node.js';
import { DesignerXyflowEdge } from './designer-xyflow-edge.js';
import { DingFlowEdge } from '../dingflow/index.js';
import {
  computeDingFlowOverlays,
  DingFlowAddBranchOverlay,
  DingFlowMergeOverlay,
} from '../dingflow/index.js';
import { createXyflowNodes, createXyflowEdges, normalizeControlledViewport } from './xyflow-utils.js';
import type { XyflowViewportChange } from './types.js';
import type { CanvasConfig, DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { useMinimapNavigation } from './use-minimap-navigation.js';
import { useXyflowSync } from './use-xyflow-sync.js';
import { useXyflowInteractions } from './use-xyflow-interactions.js';

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
  onCompleteConnection(
    nodeId: string,
    event?: React.MouseEvent,
    sourcePort?: string,
    targetPort?: string,
  ): void;
  onStartReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCancelReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCompleteReconnect(
    edgeId: string,
    sourceId: string,
    targetId: string,
    event?: React.MouseEvent,
    sourcePort?: string,
    targetPort?: string,
  ): void;
  onDuplicateNode(nodeId: string, event?: React.MouseEvent): void;
  onDeleteNode(nodeId: string, event?: React.MouseEvent): void;
  onDeleteEdge(edgeId: string, event?: React.MouseEvent): void;
  onMoveNode(nodeId: string, event?: React.MouseEvent, position?: { x: number; y: number }): void;
  onViewportChange(
    viewport: { x: number; y: number; zoom: number },
    event?: React.MouseEvent,
  ): void;
  onNodeDoubleClick?(nodeId: string, event?: React.MouseEvent): void;
  onEdgeDoubleClick?(edgeId: string, event?: React.MouseEvent): void;
  onNodeHover?(nodeId: string | null, event?: React.MouseEvent): void;
  onEdgeHover?(edgeId: string | null, event?: React.MouseEvent): void;
  onDrop?(nodeTypeId: string, position: { x: number; y: number }): void;
  documentMode?: 'graph' | 'tree';
  onPlusButtonClick?: (
    sourceId: string,
    clientX: number,
    clientY: number,
    sourceKind?: 'node' | 'branch-group' | 'merge',
  ) => void;
}

function TreeModeOverlays({
  nodes,
  edges,
  nodeTypeSizeMap,
  onPlusButtonClick,
}: {
  nodes: import('@nop-chaos/flow-designer-core').GraphNode[];
  edges: import('@nop-chaos/flow-designer-core').GraphEdge[];
  nodeTypeSizeMap?: Map<string, { minWidth?: number; minHeight?: number }>;
  onPlusButtonClick: (
    sourceId: string,
    clientX: number,
    clientY: number,
    sourceKind?: 'node' | 'branch-group' | 'merge',
  ) => void;
}) {
  const overlays = useMemo(
    () => computeDingFlowOverlays(nodes, edges, nodeTypeSizeMap),
    [nodes, edges, nodeTypeSizeMap],
  );

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
            <DingFlowAddBranchOverlay
              onClick={(e) =>
                onPlusButtonClick(overlay.sourceId, e.clientX, e.clientY, 'branch-group')
              }
            />
          ) : (
            <DingFlowMergeOverlay
              onClick={(e) => onPlusButtonClick(overlay.sourceId, e.clientX, e.clientY, 'merge')}
            />
          )}
        </div>
      ))}
    </ViewportPortal>
  );
}

export function DesignerXyflowCanvas(props: DesignerXyflowCanvasProps) {
  const xyflowNodeTypes = useMemo(
    () => ({
      designerNode: DesignerXyflowNode,
    }),
    [],
  );
  const xyflowEdgeTypes = useMemo(
    () => ({
      designerEdge: DesignerXyflowEdge,
      dingflowEdge: DingFlowEdge,
    }),
    [],
  );

  const snapshotNodes = useMemo(
    () => createXyflowNodes(props.snapshot, props.nodeTypeSizeMap, props.documentMode),
    [props.snapshot, props.nodeTypeSizeMap, props.documentMode],
  );
  const snapshotEdges = useMemo(
    () => createXyflowEdges(props.snapshot, props.documentMode),
    [props.snapshot, props.documentMode],
  );
  const viewport = useMemo(
    () => normalizeControlledViewport(props.snapshot.doc.viewport ?? props.snapshot.viewport),
    [props.snapshot.doc.viewport, props.snapshot.viewport],
  );

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  const showMinimap = props.showMinimap !== false;
  const showControls = props.showControls !== false;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const isTreeMode = props.documentMode === 'tree';
  const gridSize = props.canvasConfig?.gridSize ?? 24;
  const minZoom = props.canvasConfig?.minZoom ?? 0.1;
  const maxZoom = props.canvasConfig?.maxZoom ?? 4;
  const pannable = props.canvasConfig?.pannable !== false;
  const zoomable = props.canvasConfig?.zoomable !== false;
  const snapToGrid = props.canvasConfig?.snapToGrid === true;
  const backgroundType = props.canvasConfig?.background ?? 'lines';
  const backgroundVariant =
    backgroundType === 'dots'
      ? BackgroundVariant.Dots
      : backgroundType === 'cross'
        ? BackgroundVariant.Cross
        : BackgroundVariant.Lines;
  const showBackground = props.snapshot.gridEnabled && backgroundType !== 'none';
  const onViewportChange = props.onViewportChange;

  useMinimapNavigation({ surfaceRef, viewport, showMinimap, onViewportChange });

  const { localNodes, renderedEdges, onNodesChangeInternal, onEdgesChangeInternal, lastCommittedPositionsRef } =
    useXyflowSync({ snapshotNodes, snapshotEdges, hoveredEdgeId });

  const {
    handleNodesChange,
    handleEdgesChange,
    handleViewportChange,
    handleConnect,
    handleReconnect,
    handleSelectionChange,
  } = useXyflowInteractions({
    viewport,
    onNodesChangeInternal,
    onEdgesChangeInternal,
    lastCommittedPositionsRef,
    onDeleteNode: props.onDeleteNode,
    onMoveNode: props.onMoveNode,
    onDeleteEdge: props.onDeleteEdge,
    onStartConnection: props.onStartConnection,
    onCompleteConnection: props.onCompleteConnection,
    onStartReconnect: props.onStartReconnect,
    onCompleteReconnect: props.onCompleteReconnect,
    onViewportChange,
    onNodeSelect: props.onNodeSelect,
    onEdgeSelect: props.onEdgeSelect,
    onPaneClick: props.onPaneClick,
  });

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
          nodesConnectable={!isTreeMode}
          elementsSelectable
          nodesDraggable={!isTreeMode}
          panOnDrag={pannable}
          panOnScroll={pannable}
          zoomOnScroll={zoomable}
          zoomOnPinch={zoomable}
          zoomOnDoubleClick={zoomable}
          minZoom={minZoom}
          maxZoom={maxZoom}
          snapToGrid={snapToGrid}
          snapGrid={[gridSize, gridSize]}
          onMove={(_event, nextViewport) =>
            handleViewportChange(nextViewport as XyflowViewportChange)
          }
          onMoveEnd={(_event, nextViewport) =>
            handleViewportChange(nextViewport as XyflowViewportChange)
          }
          onPaneClick={() => {
            props.onPaneClick();
          }}
          onConnect={isTreeMode ? undefined : handleConnect}
          onReconnect={isTreeMode ? undefined : handleReconnect}
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
            <Background
              gap={gridSize}
              size={1}
              variant={backgroundVariant}
              color="var(--fd-grid-color)"
            />
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
              nodeTypeSizeMap={props.nodeTypeSizeMap}
              onPlusButtonClick={props.onPlusButtonClick}
            />
          )}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

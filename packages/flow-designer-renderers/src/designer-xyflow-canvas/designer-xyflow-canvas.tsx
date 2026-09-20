import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  ViewportPortal,
} from '@xyflow/react';
import type { EdgeChange, NodeChange, ReactFlowInstance } from '@xyflow/react';
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
import { useXyflowInteractions, useRfSelectionBridge, collectSelectToggles } from './use-xyflow-interactions.js';
import { useAlignmentGuides } from './use-alignment-guides.js';
import { PortConnectionA11yContext } from './port-connection-a11y-context.js';

export const DESIGNER_PALETTE_NODE_MIME = 'application/x-flow-designer-node-type';

export interface DesignerXyflowCanvasProps {
  snapshot: DesignerSnapshot;
  canvasConfig?: CanvasConfig;
  features?: import('@nop-chaos/flow-designer-core').DesignerFeatures;
  nodeTypeSizeMap?: Map<string, { minWidth?: number; minHeight?: number }>;
  nodeTypeMap?: Map<string, import('@nop-chaos/flow-designer-core').NodeTypeConfig>;
  pendingConnectionSourceId: string | null;
  pendingConnectionSourcePortId: string | null;
  reconnectingEdgeId: string | null;
  showMinimap?: boolean;
  showControls?: boolean;
  onPaneClick(): void;
  onNodeSelect(nodeId: string, event?: React.MouseEvent): void;
  onEdgeSelect(edgeId: string, event?: React.MouseEvent): void;
  onSelectionReport(nodeIds: string[], edgeIds: string[]): void;
  onStartConnection(nodeId: string, event?: React.MouseEvent, sourcePort?: string): void;
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
    sourceKind?: 'node' | 'branch-group' | 'merge' | 'slot',
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
    sourceKind?: 'node' | 'branch-group' | 'merge' | 'slot',
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
  const {
    pendingConnectionSourceId,
    pendingConnectionSourcePortId,
    reconnectingEdgeId,
    snapshot,
    onStartConnection,
    onCancelConnection,
    onCompleteConnection,
    onStartReconnect,
    onCancelReconnect,
    onCompleteReconnect,
  } = props;
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
    () => createXyflowNodes(props.snapshot, props.nodeTypeSizeMap, props.documentMode, props.nodeTypeMap),
    [props.snapshot, props.nodeTypeSizeMap, props.documentMode, props.nodeTypeMap],
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
  // plan 475 Phase 1：multiSelect 死开关转真消费——驱动框选/修饰键多选接线（默认开）
  const multiSelectEnabled = props.features?.multiSelect !== false;

  useMinimapNavigation({ surfaceRef, viewport, showMinimap, onViewportChange });

  // plan 475 Phase 1（M-3 单一写入方）：RF 选择集镜像由 useRfSelectionBridge 内部持有——
  // core → RF 经 sync 推送（trackPushedSelection 整写镜像），RF → core 经 select 类
  // change 增量翻转镜像后整报。不用 onSelectionChange：其参数是滞后一个提交周期的
  // 回声，会造成 core/RF 互相覆盖的乒乓（designer-summary Maximum update depth 根因）。
  const rfSelectionBridge = useRfSelectionBridge({ onSelectionReport: props.onSelectionReport });

  const { localNodes, renderedEdges, onNodesChangeInternal, onEdgesChangeInternal, lastCommittedPositionsRef } =
    useXyflowSync({
      snapshotNodes,
      snapshotEdges,
      hoveredEdgeId,
      onSelectionPushed: rfSelectionBridge.trackPushedSelection,
    });

  const interactions = useXyflowInteractions({
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
  });

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      interactions.handleNodesChange(changes);
      rfSelectionBridge.applyToggles(collectSelectToggles(changes), 'nodes');
    },
    [interactions, rfSelectionBridge],
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      interactions.handleEdgesChange(changes);
      rfSelectionBridge.applyToggles(collectSelectToggles(changes), 'edges');
    },
    [interactions, rfSelectionBridge],
  );
  const { handleViewportChange, handleConnect, handleReconnect } = interactions;

  // plan 475 Phase 2：拖拽对齐辅助线——吸附位置经 position change（dragging 中）回写
  // 本地节点层，不触发 moveNode 提交；网格吸附共存时对齐线优先（对齐后位置覆盖网格舍入）。
  const alignment = useAlignmentGuides({
    getNodes: () => localNodes,
    applyPosition: (id, position) =>
      onNodesChangeInternal([{ id, type: 'position', position, dragging: true }]),
  });
  const portConnectionA11yValue = useMemo(
    () => ({
      pendingConnectionSourceId,
      pendingConnectionSourcePortId,
      reconnectingEdgeId,
      activeEdge: snapshot.activeEdge,
      onStartConnection: (nodeId: string, sourcePort?: string) => onStartConnection(nodeId, undefined, sourcePort),
      onCancelConnection: (nodeId: string) => onCancelConnection(nodeId, undefined),
      onCompleteConnection: (nodeId: string, sourcePort?: string, targetPort?: string) =>
        onCompleteConnection(nodeId, undefined, sourcePort, targetPort),
      onStartReconnect: (edgeId: string) => onStartReconnect(edgeId, undefined),
      onCancelReconnect: (edgeId: string) => onCancelReconnect(edgeId, undefined),
      onCompleteReconnect: (
        edgeId: string,
        sourceId: string,
        nodeId: string,
        sourcePort?: string,
        targetPort?: string,
      ) => onCompleteReconnect(edgeId, sourceId, nodeId, undefined, sourcePort, targetPort),
    }),
    [
      pendingConnectionSourceId,
      pendingConnectionSourcePortId,
      reconnectingEdgeId,
      snapshot.activeEdge,
      onStartConnection,
      onCancelConnection,
      onCompleteConnection,
      onStartReconnect,
      onCancelReconnect,
      onCompleteReconnect,
    ],
  );

  return (
    <PortConnectionA11yContext.Provider value={portConnectionA11yValue}>
      <ReactFlowProvider>
        <div
          className="absolute inset-0 fd-xyflow-surface rounded-xl overflow-hidden"
          ref={surfaceRef}
          role="region"
          tabIndex={0}
          aria-label="Flow designer canvas"
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
          // plan 475 m-4 树模式适用面：框选/修饰键多选仅 graph 模式——树模式保持
          // 左键平移 + 单选语义（§17.7 非目标：不把树暴露成多选 graph 编辑器）。
          selectionOnDrag={!isTreeMode && multiSelectEnabled}
          panOnDrag={!isTreeMode && multiSelectEnabled ? (pannable ? [1, 2] : false) : pannable}
          // 部分相交即入选，对齐常见流程设计器的框选手感（RF 默认 Full 要求完整包含）。
          selectionMode={SelectionMode.Partial}
          // 显式双键：RF 默认键位经 isMacOs()（UA 探测）取 Meta/Control 之一，
          // UA 被宿主/自动化覆盖时会落到不可用组合；designer 场景直接双键通吃。
          multiSelectionKeyCode={!isTreeMode && multiSelectEnabled ? ['Meta', 'Control'] : null}
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
          // Delete/Backspace 由 use-designer-shortcuts 统一路由到 deleteSelection
          // （多选单事务）；禁掉 RF 内建删除，避免其逐节点 remove 旁路事务粒度。
          deleteKeyCode={null}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeDrag={alignment.onNodeDrag}
          onNodeDragStop={alignment.onNodeDragStop}
          onNodeClick={(event, node) => {
            if (!isTreeMode && multiSelectEnabled && (event.ctrlKey || event.metaKey || event.shiftKey)) return;
            props.onNodeSelect(node.id, undefined);
          }}
          onEdgeClick={(event, edge) => {
            if (!isTreeMode && multiSelectEnabled && (event.ctrlKey || event.metaKey || event.shiftKey)) return;
            props.onEdgeSelect(edge.id, undefined);
          }}
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
                color="var(--fd-grid-color, rgba(148, 163, 184, 0.26))"
              />
            )}
          {showMinimap && (
            <MiniMap
              className="fd-xyflow-minimap !rounded-2xl !border !border-border"
              pannable
              zoomable
              bgColor="var(--fd-minimap-bg, rgba(219, 234, 254, 0.5))"
              offsetScale={0}
              nodeColor={() => 'var(--fd-minimap-node, rgba(15, 23, 42, 0.92))'}
              nodeStrokeColor={() => 'var(--fd-edge-stroke, hsl(var(--primary)))'}
              nodeBorderRadius={4}
              maskColor="var(--fd-minimap-mask, rgba(255, 255, 255, 0.55))"
            />
          )}
          {showControls && (
            <Controls className="fd-xyflow-controls" showInteractive={false} position="top-left" />
          )}
          {props.documentMode === 'tree' && props.onPlusButtonClick && (
            <TreeModeOverlays
              nodes={props.snapshot.doc.nodes}
              edges={props.snapshot.doc.edges}
              nodeTypeSizeMap={props.nodeTypeSizeMap}
              onPlusButtonClick={props.onPlusButtonClick}
            />
          )}
          {alignment.guides.vertical != null && (
            <ViewportPortal>
              <div
                data-testid="fd-alignment-guide-v"
                className="fd-alignment-guide fd-alignment-guide--v"
                style={{ transform: `translate(${alignment.guides.vertical}px, -10000px)`, height: 20000 }}
              />
            </ViewportPortal>
          )}
          {alignment.guides.horizontal != null && (
            <ViewportPortal>
              <div
                data-testid="fd-alignment-guide-h"
                className="fd-alignment-guide fd-alignment-guide--h"
                style={{ transform: `translate(-10000px, ${alignment.guides.horizontal}px)`, width: 20000 }}
              />
            </ViewportPortal>
          )}
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </PortConnectionA11yContext.Provider>
  );
}

import React, { memo, useCallback, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react';
import type { Edge, Node, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GraphNodeView, type GraphNodeViewData } from './graph-node.js';
import type { GraphViewport } from './graph-store.js';

export type GraphCanvasNode = Node<GraphNodeViewData, 'graphNode'>;

export type GraphCanvasEdge = Edge;

export interface XyflowCanvasProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  viewport: GraphViewport;
  onViewportChange(viewport: GraphViewport): void;
  fitView: boolean;
  zoomable: boolean;
  pannable: boolean;
  minZoom: number;
  maxZoom: number;
  onlyRenderVisibleElements?: boolean;
  onNodeClick(nodeId: string): void;
  onNodeDoubleClick(nodeId: string): void;
  onSelectionChange(nodeId: string | null): void;
  onPaneClick(): void;
  onInstanceReady(instance: ReactFlowInstance<GraphCanvasNode, GraphCanvasEdge> | null): void;
}

const NODE_TYPES = { graphNode: GraphNodeView } as const;

/**
 * @xyflow/react 只读适配层（参照 designer-xyflow-canvas 模式，design §2.1-1）。
 * 只读硬契约：禁用节点拖拽 / 连接手柄 / 多选 / 框选（nodesDraggable:false、
 * nodesConnectable:false、selectionOnDrag:false、multiSelectionKeyCode:null）。
 * 单选模型由 renderer store 经 nodes prop 受控下发——elementsSelectable 恒为 false，
 * 禁用 xyflow 内部选中状态机（其与受控 selected 互打会产生 setNodes 更新风暴）。
 * 视口受控（viewport + onViewportChange），单实例经由 onInstanceReady 暴露给句柄层。
 */
export const XyflowCanvas = memo(function XyflowCanvas(props: XyflowCanvasProps) {
  const {
    nodes,
    edges,
    viewport,
    onViewportChange,
    fitView,
    zoomable,
    pannable,
    minZoom,
    maxZoom,
    onlyRenderVisibleElements,
  } = props;

  const nodeTypes = useMemo(() => NODE_TYPES, []);
  const edgeTypes = useMemo(() => ({}), []);
  const { onNodeClick, onNodeDoubleClick, onSelectionChange, onPaneClick, onInstanceReady } = props;

  // ReactFlow 的 StoreUpdater/SelectionListener 依赖回调 identity：全部回调引用稳定，
  // 避免父级渲染引发 xyflow 内部更新风暴（Maximum update depth exceeded）。
  const handleMove = useCallback(
    (_event: unknown, nextViewport: { x: number; y: number; zoom: number }) => {
      onViewportChange({ x: nextViewport.x, y: nextViewport.y, zoom: nextViewport.zoom });
    },
    [onViewportChange],
  );
  const handleInit = useCallback(
    (instance: ReactFlowInstance<GraphCanvasNode, GraphCanvasEdge>) => {
      onInstanceReady(instance);
    },
    [onInstanceReady],
  );
  const handleNodeClick = useCallback(
    (_event: unknown, node: { id: string }) => {
      onNodeClick(node.id);
    },
    [onNodeClick],
  );
  const handleNodeDoubleClick = useCallback(
    (_event: unknown, node: { id: string }) => {
      onNodeDoubleClick(node.id);
    },
    [onNodeDoubleClick],
  );
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Array<{ id: string }> }) => {
      const first = selectedNodes[0];
      onSelectionChange(first ? first.id : null);
    },
    [onSelectionChange],
  );

  return (
    <div className="nop-graph-viewport" data-slot="graph-viewport">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          viewport={viewport}
          onMove={handleMove}
          onMoveEnd={handleMove}
          onInit={handleInit}
          fitView={fitView}
          minZoom={minZoom}
          maxZoom={maxZoom}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          selectionOnDrag={false}
          selectNodesOnDrag={false}
          multiSelectionKeyCode={null}
          deleteKeyCode={null}
          panOnDrag={pannable}
          panOnScroll={pannable}
          zoomOnScroll={zoomable}
          zoomOnPinch={zoomable}
          zoomOnDoubleClick={zoomable}
          onlyRenderVisibleElements={onlyRenderVisibleElements === true}
          proOptions={{ hideAttribution: true }}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onSelectionChange={handleSelectionChange}
          onPaneClick={onPaneClick}
        >
          <Background gap={24} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
});

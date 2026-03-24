import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect } from 'react';
import type { FlowCanvasStore } from './useFlowCanvasStore';
import { createFlowNodeTypes, createFlowEdgeTypes } from './flowNodeTypes';

export interface FlowCanvasProps {
  store: FlowCanvasStore;
  showMinimap?: boolean;
  showControls?: boolean;
  showGrid?: boolean;
}

function FlowCanvasInner({ store, showMinimap = true, showControls = true, showGrid = true }: FlowCanvasProps) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timeout = setTimeout(() => {
      fitView({ duration: 200, padding: 0.2 });
    }, 50);
    return () => clearTimeout(timeout);
  }, [fitView]);

  const nodeTypes = createFlowNodeTypes(store.selectNode);
  const edgeTypes = createFlowEdgeTypes();

  return (
    <div className="flow-canvas">
      <ReactFlow
        nodes={store.nodes}
        edges={store.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable
        nodesConnectable
        elementsSelectable
        snapToGrid={showGrid}
        snapGrid={[16, 16]}
        onNodesChange={store.onNodesChange}
        onEdgesChange={store.onEdgesChange}
        onConnect={store.onConnect}
        onPaneClick={() => {
          store.selectNode(null);
          store.selectEdge(null);
        }}
        onNodeClick={(_, node) => store.selectNode(node.id)}
        onEdgeClick={(_, edge) => store.selectEdge(edge.id)}
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && <Background gap={16} size={1} />}
        {showControls && <Controls showInteractive={false} />}
        {showMinimap && <MiniMap pannable zoomable style={{ background: 'rgba(255,255,255,0.9)' }} />}
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

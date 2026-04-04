// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { DesignerXyflowCanvasBridge, renderDesignerCanvasBridge } from './canvas-bridge';

let latestReactFlowProps: any = null;

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  Controls: () => null,
  Handle: ({ id, className, style }: any) => {
    return <div data-testid={`handle-${id}`} className={className} style={style}></div>;
  },
  MiniMap: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  BaseEdge: ({ children }: { children: React.ReactNode }) => children,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => children,
  NodeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible?: boolean }) =>
    isVisible ? children : null,
  applyNodeChanges: (_changes: any[], nodes: any[]) => nodes,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  ReactFlow: (props: any) => {
    latestReactFlowProps = props;
    return <div data-testid="react-flow">{props.nodes?.length ?? 0} nodes</div>;
  },
  useNodesState: (initialNodes: any[]) => [initialNodes, vi.fn(), vi.fn()],
  useEdgesState: (initialEdges: any[]) => [initialEdges, vi.fn(), vi.fn()],
  getSmoothStepPath: () => 'M0,0 C0,0 5,0 100',
  useReactFlow: () => ({
    fitView: vi.fn(),
    getNodes: () => [],
    getEdges: () => [],
    setNodes: vi.fn(),
    setEdges: vi.fn()
  }),
  useOnSelectionChange: () => {},
  useOnConnect: () => {}
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true
  });
}

vi.mock('@nop-chaos/flux-react', () => ({
  RenderNodes: ({ input }: { input: any }) => {
    return input ? (
      <div data-testid="rendered-body">{String(input?.type ?? 'unknown')}</div>
    ) : null;
  },
  useRendererRuntime: () => ({
    createChildScope: (parent: any, data: any) => ({
      store: { setSnapshot: vi.fn() },
      data
    })
  }),
  useRenderScope: () => ({})
}));

vi.mock('./designer-context', () => ({
  useDesignerContext: () => ({
    dispatch: vi.fn(),
    core: { getConfig: vi.fn() }
  }),
  useNodeTypeConfig: (typeId: string) => {
    if (typeId === 'task') {
      return {
        id: 'task',
        label: 'Task Node',
        body: { type: 'flex', items: [] },
        ports: [
          { id: 'in', direction: 'input', position: 'left' },
          { id: 'out', direction: 'output', position: 'right' }
        ],
        appearance: {
          className: 'task-node',
          borderRadius: 8
        }
      };
    }
    if (typeId === 'start') {
      return {
        id: 'start',
        label: 'Start Node',
        body: { type: 'text', body: 'Start' },
        ports: [{ id: 'out', direction: 'output', position: 'right' }]
      };
    }
    if (typeId === 'end') {
      return {
        id: 'end',
        label: 'End Node',
        body: { type: 'text', body: 'End' },
        ports: [{ id: 'in', direction: 'input', position: 'left' }]
      };
    }
    return undefined;
  },
  useEdgeTypeConfig: (typeId: string) => {
    if (typeId === 'default') {
      return {
        id: 'default',
        label: 'Default Edge',
        appearance: {
          stroke: '#666',
          strokeWidth: 2
        }
      };
    }
    return undefined;
  },
  useNormalizedConfig: () => ({
    nodeTypes: new Map([
      ['task', { id: 'task', label: 'Task', body: { type: 'text' } }],
      ['start', { id: 'start', label: 'Start', body: { type: 'text' } }],
      ['end', { id: 'end', label: 'End', body: { type: 'text' } }]
    ]),
    edgeTypes: new Map([['default', { id: 'default', label: 'Default' }]])
  })
}));

beforeEach(() => {
  latestReactFlowProps = null;
});

function createSnapshot(): DesignerSnapshot {
  return {
    doc: {
      id: 'doc-1',
      kind: 'flow',
      name: 'Test Flow',
      version: '1.0.0',
      nodes: [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 20, y: 40 },
          data: { label: 'Task 1', description: 'Primary task' }
        },
        {
          id: 'node-2',
          type: 'end',
          position: { x: 220, y: 40 },
          data: { label: 'End Node' }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'node-1',
          target: 'node-2',
          data: { label: 'Edge 1' }
        }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    selection: {
      selectedNodeIds: ['node-1'],
      selectedEdgeIds: ['edge-1'],
      activeNodeId: 'node-1',
      activeEdgeId: 'edge-1'
    },
    activeNode: {
      id: 'node-1',
      type: 'task',
      position: { x: 20, y: 40 },
      data: { label: 'Task 1', description: 'Primary task' }
    },
    activeEdge: {
      id: 'edge-1',
      type: 'default',
      source: 'node-1',
      target: 'node-2',
      data: { label: 'Edge 1' }
    },
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: { x: 0, y: 0, zoom: 1 }
  };
}

describe('DesignerXyflowCanvasBridge', () => {
  it('renders the xyflow canvas shell', () => {
    render(
      <DesignerXyflowCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        reconnectingEdgeId={null}
        onPaneClick={vi.fn()}
        onNodeSelect={vi.fn()}
        onEdgeSelect={vi.fn()}
        onStartConnection={vi.fn()}
        onCancelConnection={vi.fn()}
        onCompleteConnection={vi.fn()}
        onStartReconnect={vi.fn()}
        onCancelReconnect={vi.fn()}
        onCompleteReconnect={vi.fn()}
        onDuplicateNode={vi.fn()}
        onDeleteNode={vi.fn()}
        onDeleteEdge={vi.fn()}
        onMoveNode={vi.fn()}
        onViewportChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('react-flow')).toBeTruthy();
    expect(latestReactFlowProps).toBeTruthy();
  });

  it('translates xyflow callbacks into the bridge contract', () => {
    const onPaneClick = vi.fn();
    const onNodeSelect = vi.fn();
    const onStartConnection = vi.fn();
    const onCompleteConnection = vi.fn();
    const onStartReconnect = vi.fn();
    const onCompleteReconnect = vi.fn();
    const onDeleteNode = vi.fn();
    const onMoveNode = vi.fn();
    const onViewportChange = vi.fn();

    render(
      <DesignerXyflowCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        reconnectingEdgeId={null}
        onPaneClick={onPaneClick}
        onNodeSelect={onNodeSelect}
        onEdgeSelect={vi.fn()}
        onStartConnection={onStartConnection}
        onCancelConnection={vi.fn()}
        onCompleteConnection={onCompleteConnection}
        onStartReconnect={onStartReconnect}
        onCancelReconnect={vi.fn()}
        onCompleteReconnect={onCompleteReconnect}
        onDuplicateNode={vi.fn()}
        onDeleteNode={onDeleteNode}
        onDeleteEdge={vi.fn()}
        onMoveNode={onMoveNode}
        onViewportChange={onViewportChange}
      />
    );

    expect(latestReactFlowProps.onConnect).toBeTruthy();
    expect(latestReactFlowProps.onReconnect).toBeTruthy();
    expect(latestReactFlowProps.onNodesChange).toBeTruthy();
    expect(latestReactFlowProps.onEdgesChange).toBeTruthy();
    expect(latestReactFlowProps.onMove).toBeTruthy();
    expect(latestReactFlowProps.onSelectionChange).toBeTruthy();

    const mockConnection = { source: 'node-1', target: 'node-2' };
    expect(() => latestReactFlowProps.onConnect(mockConnection)).not.toThrow();
    expect(onStartConnection).toHaveBeenCalledWith('node-1', undefined);
    expect(onCompleteConnection).toHaveBeenCalledWith('node-2', undefined);

    const mockEdge = { id: 'edge-1' };
    expect(() => latestReactFlowProps.onReconnect(mockEdge, mockConnection)).not.toThrow();
    expect(onStartReconnect).toHaveBeenCalledWith('edge-1', undefined);
    expect(onCompleteReconnect).toHaveBeenCalledWith('edge-1', 'node-1', 'node-2', undefined);

    const mockNodeChanges = [{ id: 'node-1', type: 'position', position: { x: 50, y: 50 }, dragging: false }];
    expect(() => latestReactFlowProps.onNodesChange(mockNodeChanges)).not.toThrow();
    expect(onMoveNode).toHaveBeenCalledWith('node-1', undefined, { x: 50, y: 50 });
  });
});

describe('renderDesignerCanvasBridge', () => {
  it('renders xyflow bridge by default', () => {
    const result = renderDesignerCanvasBridge({
      snapshot: createSnapshot(),
      pendingConnectionSourceId: null,
      reconnectingEdgeId: null,
      onPaneClick: vi.fn(),
      onNodeSelect: vi.fn(),
      onEdgeSelect: vi.fn(),
      onStartConnection: vi.fn(),
      onCancelConnection: vi.fn(),
      onCompleteConnection: vi.fn(),
      onStartReconnect: vi.fn(),
      onCancelReconnect: vi.fn(),
      onCompleteReconnect: vi.fn(),
      onDuplicateNode: vi.fn(),
      onDeleteNode: vi.fn(),
      onDeleteEdge: vi.fn(),
      onMoveNode: vi.fn(),
      onViewportChange: vi.fn()
    });
    expect(result).toBeTruthy();
  });
});

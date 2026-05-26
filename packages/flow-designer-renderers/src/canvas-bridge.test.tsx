// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { DesignerXyflowCanvasBridge, renderDesignerCanvasBridge } from './canvas-bridge.js';
import { DesignerXyflowNode } from './designer-xyflow-canvas/index.js';
import { DesignerContext } from './designer-context.js';
import { registerDesignerCanvasFocusHandler } from './designer-canvas-focus.js';
import { PortConnectionA11yContext } from './designer-xyflow-canvas/port-connection-a11y-context.js';

const mockState: { latestReactFlowProps: any } = {
  latestReactFlowProps: null,
};

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  Controls: () => null,
  Handle: ({ id, className, style, ...props }: any) => {
    return <div data-testid={`handle-${id}`} className={className} style={style} {...props}></div>;
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
    mockState.latestReactFlowProps = props;
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
    setEdges: vi.fn(),
  }),
  useOnSelectionChange: () => {},
  useOnConnect: () => {},
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
    configurable: true,
  });
}

vi.mock('@nop-chaos/flux-react', () => ({
  ClassAliasesContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  RenderNodes: ({ input }: { input: any }) => {
    return input ? <div data-testid="rendered-body">{String(input?.type ?? 'unknown')}</div> : null;
  },
  useRendererRuntime: () => ({
    createChildScope: (parent: any, data: any) => ({
      store: { setSnapshot: vi.fn() },
      data,
    }),
  }),
  useRenderScope: () => ({}),
}));

vi.mock('@nop-chaos/flux-react/unstable', () => ({
  ClassAliasesContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  RenderNodes: ({ input }: { input: any }) => {
    return input ? <div data-testid="rendered-body">{String(input?.type ?? 'unknown')}</div> : null;
  },
}));

vi.mock('./designer-context', async () => {
  const React = await import('react');
  const DesignerContext = React.createContext<any>(null);
  return {
    DesignerContext,
    useDesignerContext: () => React.useContext(DesignerContext) ?? {
      config: { classAliases: undefined },
      dispatch: vi.fn(),
      core: { getConfig: vi.fn() },
    },
    useNodeTypeConfig: (typeId: string) => {
      if (typeId === 'task') {
        return {
          id: 'task',
        label: 'Task Node',
        body: { type: 'flex', items: [] },
        ports: [
          {
            id: 'in',
            direction: 'input',
            position: 'left',
            appearance: { className: 'task-port-in' },
          },
          { id: 'out', direction: 'output', position: 'right' },
        ],
        appearance: {
          className: 'task-node',
          borderRadius: 8,
        },
      };
    }
    if (typeId === 'start') {
      return {
        id: 'start',
        label: 'Start Node',
        body: { type: 'text', body: 'Start' },
        ports: [{ id: 'out', direction: 'output', position: 'right' }],
      };
    }
    if (typeId === 'end') {
      return {
        id: 'end',
        label: 'End Node',
        body: { type: 'text', body: 'End' },
        ports: [{ id: 'in', direction: 'input', position: 'left' }],
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
          strokeWidth: 2,
        },
      };
    }
    return undefined;
    },
    useNormalizedConfig: () => ({
      nodeTypes: new Map([
        ['task', { id: 'task', label: 'Task', body: { type: 'text' } }],
        ['start', { id: 'start', label: 'Start', body: { type: 'text' } }],
        ['end', { id: 'end', label: 'End', body: { type: 'text' } }],
      ]),
      edgeTypes: new Map([['default', { id: 'default', label: 'Default' }]]),
    }),
  };
});

beforeEach(async () => {
  mockState.latestReactFlowProps = null;
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
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
          data: { label: 'Task 1', description: 'Primary task' },
        },
        {
          id: 'node-2',
          type: 'end',
          position: { x: 220, y: 40 },
          data: { label: 'End Node' },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'node-1',
          target: 'node-2',
          data: { label: 'Edge 1' },
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    selection: {
      selectedNodeIds: ['node-1'],
      selectedEdgeIds: ['edge-1'],
      activeNodeId: 'node-1',
      activeEdgeId: 'edge-1',
      activeBranchId: null,
    },
    activeNode: {
      id: 'node-1',
      type: 'task',
      position: { x: 20, y: 40 },
      data: { label: 'Task 1', description: 'Primary task' },
    },
    activeEdge: {
      id: 'edge-1',
      type: 'default',
      source: 'node-1',
      target: 'node-2',
      data: { label: 'Edge 1' },
    },
    activeBranch: null,
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('DesignerXyflowCanvasBridge', () => {
  it('renders the xyflow canvas shell', () => {
    const view = render(
      <DesignerXyflowCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        pendingConnectionSourcePortId={null}
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
      />,
    );
    expect(screen.getByTestId('react-flow')).toBeTruthy();
    expect(mockState.latestReactFlowProps).toBeTruthy();

    render(
      <DesignerXyflowNode
        id="node-1"
        selected={true}
        data={{ typeId: 'task', label: 'Task 1', typeLabel: 'Task' }}
        xPos={20}
        yPos={40}
        dragging={false}
        zIndex={1}
        isConnectable={true}
        type="task"
      />,
      { container: view.container },
    );

    expect(screen.getByTestId('designer-handle-target-in').className).toContain('task-port-in');
    expect(screen.getByTestId('designer-handle-target-in').className).toContain('!w-3');
    expect(screen.getByTestId('designer-handle-source-out').className).toContain('!w-3');
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
        pendingConnectionSourcePortId={null}
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
      />,
    );

    expect(mockState.latestReactFlowProps.onConnect).toBeTruthy();
    expect(mockState.latestReactFlowProps.onReconnect).toBeTruthy();
    expect(mockState.latestReactFlowProps.onNodesChange).toBeTruthy();
    expect(mockState.latestReactFlowProps.onEdgesChange).toBeTruthy();
    expect(mockState.latestReactFlowProps.onMoveEnd).toBeTruthy();
    expect(mockState.latestReactFlowProps.onSelectionChange).toBeTruthy();

    const mockConnection = {
      source: 'node-1',
      target: 'node-2',
      sourceHandle: 'out-primary',
      targetHandle: 'in-primary',
    };
    expect(() => mockState.latestReactFlowProps.onConnect(mockConnection)).not.toThrow();
    expect(onStartConnection).toHaveBeenCalledWith('node-1', undefined, 'out-primary');
    expect(onCompleteConnection).toHaveBeenCalledWith(
      'node-2',
      undefined,
      'out-primary',
      'in-primary',
    );

    const mockEdge = { id: 'edge-1' };
    expect(() =>
      mockState.latestReactFlowProps.onReconnect(mockEdge, mockConnection),
    ).not.toThrow();
    expect(onStartReconnect).toHaveBeenCalledWith('edge-1', undefined);
    expect(onCompleteReconnect).toHaveBeenCalledWith(
      'edge-1',
      'node-1',
      'node-2',
      undefined,
      'out-primary',
      'in-primary',
    );

    const mockNodeChanges = [
      { id: 'node-1', type: 'position', position: { x: 50, y: 50 }, dragging: false },
    ];
    expect(() => mockState.latestReactFlowProps.onNodesChange(mockNodeChanges)).not.toThrow();
    expect(onMoveNode).toHaveBeenCalledWith('node-1', undefined, { x: 50, y: 50 });
  });

  it('disables free connect and node dragging in tree mode', () => {
    render(
      <DesignerXyflowCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        pendingConnectionSourcePortId={null}
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
        documentMode="tree"
      />,
    );

    expect(mockState.latestReactFlowProps.nodesConnectable).toBe(false);
    expect(mockState.latestReactFlowProps.nodesDraggable).toBe(false);
    expect(mockState.latestReactFlowProps.onConnect).toBeUndefined();
    expect(mockState.latestReactFlowProps.onReconnect).toBeUndefined();
  });

  it('publishes stable accessible node name and selected state', () => {
    document.body.innerHTML = '';
    render(
      <DesignerXyflowNode
        id="node-1"
        selected={true}
        data={{ typeId: 'task', label: 'Task 1', typeLabel: 'Task' }}
        xPos={20}
        yPos={40}
        dragging={false}
        zIndex={1}
        isConnectable={true}
        type="task"
      />,
    );

    const nodes = screen.getAllByRole('button', { name: 'Selected Node Task 1' });
    expect(nodes.at(-1)?.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the default quick toolbar visible for a selected node without hover', () => {
    document.body.innerHTML = '';
    render(
      <DesignerXyflowNode
        id="node-1"
        selected={true}
        data={{ typeId: 'task', label: 'Task 1', typeLabel: 'Task' }}
        xPos={20}
        yPos={40}
        dragging={false}
        zIndex={1}
        isConnectable={true}
        type="task"
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit node' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Duplicate node' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete node' })).toBeTruthy();
  });

  it('supports keyboard connection controls on rendered ports', () => {
    document.body.innerHTML = '';
    const onStartConnection = vi.fn();
    const onCancelConnection = vi.fn();
    const onCompleteConnection = vi.fn();
    const onStartReconnect = vi.fn();
    const onCancelReconnect = vi.fn();
    const onCompleteReconnect = vi.fn();

    const view = render(
      <PortConnectionA11yContext.Provider
        value={{
          pendingConnectionSourceId: null,
          pendingConnectionSourcePortId: null,
          reconnectingEdgeId: 'edge-1',
          activeEdge: {
            id: 'edge-1',
            type: 'default',
            source: 'node-1',
            target: 'node-2',
            sourcePort: 'out',
            targetPort: 'in',
            data: { label: 'Edge 1' },
          },
          onStartConnection,
          onCancelConnection,
          onCompleteConnection,
          onStartReconnect,
          onCancelReconnect,
          onCompleteReconnect,
        }}
      >
        <DesignerXyflowNode
          id="node-1"
          selected={true}
          data={{ typeId: 'task', label: 'Task 1', typeLabel: 'Task' }}
          xPos={20}
          yPos={40}
          dragging={false}
          zIndex={1}
          isConnectable={true}
          type="task"
        />
      </PortConnectionA11yContext.Provider>,
    );

    const reconnectPort = screen.getByRole('button', {
      name: 'Cancel reconnect from output port out on node Task 1',
    });
    fireEvent.keyDown(reconnectPort, { key: 'Enter' });
    expect(onCancelReconnect).toHaveBeenCalledWith('edge-1');

    view.rerender(
      <PortConnectionA11yContext.Provider
        value={{
          pendingConnectionSourceId: 'node-1',
          pendingConnectionSourcePortId: 'out',
          reconnectingEdgeId: null,
          activeEdge: null,
          onStartConnection,
          onCancelConnection,
          onCompleteConnection,
          onStartReconnect,
          onCancelReconnect,
          onCompleteReconnect,
        }}
      >
        <DesignerXyflowNode
          id="node-2"
          selected={false}
          data={{ typeId: 'end', label: 'End Node', typeLabel: 'End' }}
          xPos={220}
          yPos={40}
          dragging={false}
          zIndex={1}
          isConnectable={true}
          type="end"
        />
      </PortConnectionA11yContext.Provider>,
    );

    const completePort = screen.getByRole('button', {
      name: 'Complete connection to input port in on node End Node',
    });
    fireEvent.keyDown(completePort, { key: 'Enter' });
    expect(onCompleteConnection).toHaveBeenCalledWith('node-2', 'out', 'in');
  });

  it('restores focus to the canvas after deleting a node from the toolbar', async () => {
    document.body.innerHTML = '';
    const dispatch = vi.fn();
    const core = { getConfig: vi.fn() } as any;
    const canvas = document.createElement('div');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'region');
    canvas.setAttribute('aria-label', 'Flow designer canvas');
    document.body.appendChild(canvas);
    const unregister = registerDesignerCanvasFocusHandler(core, () => canvas.focus());

    render(
      <DesignerContext.Provider
        value={{
          core,
          commandAdapter: { dispatch } as any,
          dispatch,
          config: { classAliases: undefined },
        }}
      >
        <DesignerXyflowNode
          id="node-1"
          selected={true}
          data={{ typeId: 'task', label: 'Task 1', typeLabel: 'Task' }}
          xPos={20}
          yPos={40}
          dragging={false}
          zIndex={1}
          isConnectable={true}
          type="task"
        />
      </DesignerContext.Provider>,
    );

    fireEvent.click(screen.getByTestId('designer-node-delete'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'deleteNode', nodeId: 'node-1' });
    await waitFor(() => {
      expect(document.activeElement).toBe(canvas);
    });

    unregister();
    canvas.remove();
  });
});

describe('renderDesignerCanvasBridge', () => {
  it('renders xyflow bridge by default', () => {
    const result = renderDesignerCanvasBridge({
      snapshot: createSnapshot(),
      pendingConnectionSourceId: null,
      pendingConnectionSourcePortId: null,
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
      onViewportChange: vi.fn(),
    });
    expect(result).toBeTruthy();
  });
});

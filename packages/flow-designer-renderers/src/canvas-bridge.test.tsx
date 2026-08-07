import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createSnapshot,
  installCanvasBridgeTestHooks,
  mockState,
} from './canvas-bridge-test-support.js';
import { DesignerXyflowCanvasBridge, renderDesignerCanvasBridge } from './canvas-bridge.js';
import { DesignerXyflowNode } from './designer-xyflow-canvas/index.js';
import { DesignerContext } from './designer-context.js';
import { registerDesignerCanvasFocusHandler } from './designer-canvas-focus.js';
import { PortConnectionA11yContext } from './designer-xyflow-canvas/port-connection-a11y-context.js';

installCanvasBridgeTestHooks();

function bridgeProps(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function renderBridge(overrides: Record<string, unknown> = {}) {
  return render(<DesignerXyflowCanvasBridge {...bridgeProps(overrides)} />);
}

function renderTaskNode() {
  return render(
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
}

describe('DesignerXyflowCanvasBridge', () => {
  it('renders the xyflow canvas shell', () => {
    const view = renderBridge();

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
        {...bridgeProps({
          onPaneClick,
          onNodeSelect,
          onStartConnection,
          onCompleteConnection,
          onStartReconnect,
          onCompleteReconnect,
          onDeleteNode,
          onMoveNode,
          onViewportChange,
        })}
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
    renderBridge({ documentMode: 'tree' });

    expect(mockState.latestReactFlowProps.nodesConnectable).toBe(false);
    expect(mockState.latestReactFlowProps.nodesDraggable).toBe(false);
    expect(mockState.latestReactFlowProps.onConnect).toBeUndefined();
    expect(mockState.latestReactFlowProps.onReconnect).toBeUndefined();
  });

  it('publishes stable accessible node name and selected state', () => {
    document.body.innerHTML = '';
    renderTaskNode();

    const nodes = screen.getAllByRole('button', { name: 'Selected Node Task 1' });
    expect(nodes.at(-1)?.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the default quick toolbar visible for a selected node without hover', () => {
    document.body.innerHTML = '';
    renderTaskNode();

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
    const core = {
      getConfig: () => ({ treeConfig: { layout: { direction: 'TB' } } }),
    } as any;
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
    const result = renderDesignerCanvasBridge(bridgeProps());
    expect(result).toBeTruthy();
  });
});

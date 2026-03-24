// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesignerSnapshot } from '../../flow-designer-core/src/index';
import { DesignerCardCanvasBridge, DesignerXyflowCanvasBridge, DesignerXyflowPreviewBridge } from './canvas-bridge';

let latestReactFlowProps: any = null;

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MiniMap: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
  applyNodeChanges: (_changes: any[], nodes: any[]) => nodes,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  ReactFlow: (props: any) => {
    latestReactFlowProps = props;
    return null;
  }
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

beforeEach(() => {
  latestReactFlowProps = null;
});

function createSnapshot(): DesignerSnapshot {
  return {
    doc: {
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
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
          data: { label: 'Task 2', description: 'Target task' }
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
    viewport: { x: 0, y: 0, zoom: 1 }
  };
}

describe('DesignerCardCanvasBridge', () => {
  it('routes node, edge, and pane interactions through the bridge callbacks', () => {
    const onPaneClick = vi.fn();
    const onNodeSelect = vi.fn();
    const onEdgeSelect = vi.fn();
    const onStartConnection = vi.fn();
    const onCancelConnection = vi.fn();
    const onCompleteConnection = vi.fn();
    const onStartReconnect = vi.fn();
    const onCancelReconnect = vi.fn();
    const onCompleteReconnect = vi.fn();
    const onDuplicateNode = vi.fn();
    const onDeleteNode = vi.fn();
    const onDeleteEdge = vi.fn();
    const onMoveNode = vi.fn();
    const onViewportChange = vi.fn();

    render(
      <DesignerCardCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        reconnectingEdgeId={null}
        onPaneClick={onPaneClick}
        onNodeSelect={onNodeSelect}
        onEdgeSelect={onEdgeSelect}
        onStartConnection={onStartConnection}
        onCancelConnection={onCancelConnection}
        onCompleteConnection={onCompleteConnection}
        onStartReconnect={onStartReconnect}
        onCancelReconnect={onCancelReconnect}
        onCompleteReconnect={onCompleteReconnect}
        onDuplicateNode={onDuplicateNode}
        onDeleteNode={onDeleteNode}
        onDeleteEdge={onDeleteEdge}
        onMoveNode={onMoveNode}
        onViewportChange={onViewportChange}
      />
    );

    fireEvent.click(screen.getByText('Task 1'));
    expect(onNodeSelect).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: 'D' }));
    expect(onDuplicateNode).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getAllByRole('button', { name: 'C' })[0]);
    expect(onStartConnection).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: 'M' }));
    expect(onMoveNode).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: 'X' }));
    expect(onDeleteNode).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(onViewportChange).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 1.1 }, expect.any(Object));

    fireEvent.click(screen.getByText('Edge 1'));
    expect(onEdgeSelect).toHaveBeenCalledWith('edge-1', expect.any(Object));

    fireEvent.click(screen.getByText('R'));
    expect(onStartReconnect).toHaveBeenCalledWith('edge-1', expect.any(Object));

    fireEvent.click(screen.getByText('Nodes: 2 | Edges: 1'));
    expect(onPaneClick).toHaveBeenCalled();
    expect(onDeleteEdge).not.toHaveBeenCalled();
    expect(onCancelConnection).not.toHaveBeenCalled();
    expect(onCompleteConnection).not.toHaveBeenCalled();
    expect(onCancelReconnect).not.toHaveBeenCalled();
    expect(onCompleteReconnect).not.toHaveBeenCalled();
  });

  it('shows connection and reconnect follow-up actions when bridge state is active', () => {
    render(
      <DesignerCardCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId="node-1"
        reconnectingEdgeId="edge-1"
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

    expect(screen.getByText('Cancel connection')).toBeTruthy();
    expect(screen.getByText('Connect here')).toBeTruthy();
    expect(screen.getByText('Reconnect here')).toBeTruthy();
  });
});

describe('DesignerXyflowPreviewBridge', () => {
  it('routes preview actions through the shared callback contract', () => {
    const onPaneClick = vi.fn();
    const onNodeSelect = vi.fn();
    const onEdgeSelect = vi.fn();
    const onStartConnection = vi.fn();
    const onCancelConnection = vi.fn();
    const onCompleteConnection = vi.fn();
    const onStartReconnect = vi.fn();
    const onCancelReconnect = vi.fn();
    const onCompleteReconnect = vi.fn();
    const onDuplicateNode = vi.fn();
    const onDeleteNode = vi.fn();
    const onDeleteEdge = vi.fn();
    const onMoveNode = vi.fn();
    const onViewportChange = vi.fn();

    render(
      <DesignerXyflowPreviewBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        reconnectingEdgeId={null}
        onPaneClick={onPaneClick}
        onNodeSelect={onNodeSelect}
        onEdgeSelect={onEdgeSelect}
        onStartConnection={onStartConnection}
        onCancelConnection={onCancelConnection}
        onCompleteConnection={onCompleteConnection}
        onStartReconnect={onStartReconnect}
        onCancelReconnect={onCancelReconnect}
        onCompleteReconnect={onCompleteReconnect}
        onDuplicateNode={onDuplicateNode}
        onDeleteNode={onDeleteNode}
        onDeleteEdge={onDeleteEdge}
        onMoveNode={onMoveNode}
        onViewportChange={onViewportChange}
      />
    );

    fireEvent.click(screen.getByText('Select Task 1'));
    expect(onNodeSelect).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByText('Select Edge 1'));
    expect(onEdgeSelect).toHaveBeenCalledWith('edge-1', expect.any(Object));

    fireEvent.click(screen.getByText('Start from Task 1'));
    expect(onStartConnection).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByText('Start reconnect for Edge 1'));
    expect(onStartReconnect).toHaveBeenCalledWith('edge-1', expect.any(Object));

    fireEvent.click(screen.getByText('Nudge Task 1'));
    expect(onMoveNode).toHaveBeenCalledWith('node-1', expect.any(Object));

    fireEvent.click(screen.getByText('Simulate viewport sync'));
    expect(onViewportChange).toHaveBeenCalledWith({ x: 12, y: 8, zoom: 1.1 }, expect.any(Object));

    fireEvent.click(screen.getByText('Simulate pane click'));
    expect(onPaneClick).toHaveBeenCalled();
    expect(onCancelConnection).not.toHaveBeenCalled();
    expect(onCompleteConnection).not.toHaveBeenCalled();
    expect(onCancelReconnect).not.toHaveBeenCalled();
    expect(onCompleteReconnect).not.toHaveBeenCalled();
    expect(onDuplicateNode).not.toHaveBeenCalled();
    expect(onDeleteNode).not.toHaveBeenCalled();
    expect(onDeleteEdge).not.toHaveBeenCalled();
  });

  it('shows connect and reconnect completion actions when preview state is active', () => {
    render(
      <DesignerXyflowPreviewBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId="node-1"
        reconnectingEdgeId="edge-1"
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

    expect(screen.getByText('Connect to Task 2')).toBeTruthy();
    expect(screen.getByText('Cancel connect preview')).toBeTruthy();
    expect(screen.getByText('Reconnect to Task 1')).toBeTruthy();
    expect(screen.getByText('Cancel reconnect preview')).toBeTruthy();
  });
});

describe('DesignerXyflowCanvasBridge', () => {
  it('renders the live xyflow canvas shell', () => {
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

    expect(screen.getByText('React Flow canvas')).toBeTruthy();
    expect(latestReactFlowProps).toBeTruthy();
  });

  it('translates live xyflow callbacks into the shared bridge contract', () => {
    const onPaneClick = vi.fn();
    const onNodeSelect = vi.fn();
    const onEdgeSelect = vi.fn();
    const onStartConnection = vi.fn();
    const onCancelConnection = vi.fn();
    const onCompleteConnection = vi.fn();
    const onStartReconnect = vi.fn();
    const onCancelReconnect = vi.fn();
    const onCompleteReconnect = vi.fn();
    const onDuplicateNode = vi.fn();
    const onDeleteNode = vi.fn();
    const onDeleteEdge = vi.fn();
    const onMoveNode = vi.fn();
    const onViewportChange = vi.fn();

    render(
      <DesignerXyflowCanvasBridge
        snapshot={createSnapshot()}
        pendingConnectionSourceId={null}
        reconnectingEdgeId={null}
        onPaneClick={onPaneClick}
        onNodeSelect={onNodeSelect}
        onEdgeSelect={onEdgeSelect}
        onStartConnection={onStartConnection}
        onCancelConnection={onCancelConnection}
        onCompleteConnection={onCompleteConnection}
        onStartReconnect={onStartReconnect}
        onCancelReconnect={onCancelReconnect}
        onCompleteReconnect={onCompleteReconnect}
        onDuplicateNode={onDuplicateNode}
        onDeleteNode={onDeleteNode}
        onDeleteEdge={onDeleteEdge}
        onMoveNode={onMoveNode}
        onViewportChange={onViewportChange}
      />
    );

    latestReactFlowProps.onConnect({ source: 'node-1', target: 'node-2' });
    expect(onStartConnection).toHaveBeenCalledWith('node-1', undefined);
    expect(onCompleteConnection).toHaveBeenCalledWith('node-2', undefined);

    latestReactFlowProps.onReconnect({ id: 'edge-1' }, { source: 'node-1', target: 'node-2' });
    expect(onStartReconnect).toHaveBeenCalledWith('edge-1', undefined);
    expect(onCompleteReconnect).toHaveBeenCalledWith('edge-1', 'node-1', 'node-2', undefined);

    latestReactFlowProps.onSelectionChange({ nodes: [{ id: 'node-2' }], edges: [] });
    expect(onNodeSelect).toHaveBeenCalledWith('node-2', undefined);

    latestReactFlowProps.onSelectionChange({ nodes: [], edges: [{ id: 'edge-1' }] });
    expect(onEdgeSelect).toHaveBeenCalledWith('edge-1', undefined);

    latestReactFlowProps.onSelectionChange({ nodes: [], edges: [] });
    expect(onPaneClick).toHaveBeenCalled();

    latestReactFlowProps.onNodesChange([
      { id: 'node-1', type: 'position', position: { x: 63.6, y: 84.2 }, dragging: false },
      { id: 'node-2', type: 'remove' }
    ]);
    expect(onDeleteNode).toHaveBeenCalledWith('node-2', undefined);

    latestReactFlowProps.onEdgesChange([{ id: 'edge-1', type: 'remove' }]);
    expect(onDeleteEdge).toHaveBeenCalledWith('edge-1', undefined);

    latestReactFlowProps.onMove(null, { x: 10.2, y: 20.7, zoom: 1.26 });
    expect(onViewportChange).toHaveBeenCalledWith({ x: 10, y: 21, zoom: 1.3 }, undefined);
  });
});

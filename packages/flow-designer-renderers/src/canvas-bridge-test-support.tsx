import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';

export const mockState: { latestReactFlowProps: any } = {
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

export function createSnapshot(): DesignerSnapshot {
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
    readonly: false,
    gridEnabled: true,
    paletteCollapsed: false,
    inspectorCollapsed: false,
    paletteWidth: 240,
    inspectorWidth: 352,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

vi.mock('./designer-context', async () => {
  const ReactMock = await import('react');
  const DesignerContext = ReactMock.createContext<any>(null);
  return {
    DesignerContext,
    useDesignerContext: () => ReactMock.useContext(DesignerContext) ?? {
      config: { classAliases: undefined },
      dispatch: vi.fn(),
      core: {
        getConfig: () => ({ treeConfig: { layout: { direction: 'TB' } } }),
      },
    },
    useDesignerSnapshotSelector: (selector: (snapshot: DesignerSnapshot) => unknown) =>
      selector(createSnapshot()),
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

export function installCanvasBridgeTestHooks() {
  beforeEach(async () => {
    mockState.latestReactFlowProps = null;
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
  });

  afterEach(() => {
    resetFluxI18n();
  });
}

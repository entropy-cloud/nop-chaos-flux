// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import type { DesignerConfig } from '../../flow-designer-core/src/index';
import { createDesignerActionProvider, flowDesignerRendererDefinitions } from './index';
import { createFormulaCompiler } from '../../flux-formula/src/index';
import { createSchemaRenderer } from '../../flux-react/src/index';
import { basicRendererDefinitions } from '../../flux-renderers-basic/src/index';
import { render, within } from '@testing-library/react';

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

function createTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'task',
        label: 'Task',
        body: { type: 'text', text: 'Task' },
        defaults: { label: 'Task' }
      },
      {
        id: 'end',
        label: 'End',
        body: { type: 'text', text: 'End' },
        defaults: { label: 'End' }
      }
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task', 'end'] }]
    }
  };
}

function createRendererEnv(notify = vi.fn()) {
  return {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify
  };
}

describe('createDesignerActionProvider', () => {
  it('maps designer namespace methods to core commands', async () => {
    const core = {
      getSnapshot: () => ({
        doc: { id: 'doc-1', kind: 'flow', name: 'Example', version: '1.0.0', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        selection: { selectedNodeIds: [], selectedEdgeIds: [], activeNodeId: null, activeEdgeId: null },
        activeNode: null,
        activeEdge: null,
        canUndo: false,
        canRedo: false,
        isDirty: false,
        gridEnabled: true,
        viewport: { x: 0, y: 0, zoom: 1 }
      }),
      getDocument: () => ({ id: 'doc-1', kind: 'flow', name: 'Example', version: '1.0.0', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }),
      getConfig: () => ({
        nodeTypes: new Map([['task', { id: 'task', label: 'Task' }]]),
        rules: { allowSelfLoop: false, allowMultiEdge: true },
        edgeTypes: new Map(),
        features: {},
        canvas: {}
      }),
      addNode: (type: string, position: { x: number; y: number }, data?: Record<string, unknown>) => ({ id: 'n1', type, position, data }),
      clearSelection: () => undefined,
      selectNode: () => undefined,
      selectEdge: () => undefined,
      deleteNode: () => undefined,
      deleteEdge: () => undefined,
      duplicateNode: () => ({ id: 'n2' }),
      updateNode: () => undefined,
      updateEdge: () => undefined,
      exportDocument: () => '{"ok":true}',
      undo: () => undefined,
      redo: () => undefined,
      toggleGrid: () => undefined,
      save: () => undefined,
      restore: () => undefined
    } as any;

    const provider = createDesignerActionProvider(core);
    const addResult = await provider.invoke('addNode', { nodeType: 'task', position: { x: 1, y: 2 } }, {} as any);
    const exportResult = await provider.invoke('export', undefined, {} as any);

    expect(addResult).toMatchObject({ ok: true, data: expect.objectContaining({ type: 'task' }) });
    expect(exportResult).toMatchObject({ ok: true, data: '{"ok":true}' });
  });

  it('routes validation failures through warning notify while returning a failed action result', async () => {
    const notify = vi.fn();
    const core = {
      getSnapshot: () => ({
        doc: {
          id: 'doc-1',
          kind: 'flow',
          name: 'Example',
          version: '1.0.0',
          nodes: [
            { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: {} }
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        selection: { selectedNodeIds: [], selectedEdgeIds: [], activeNodeId: null, activeEdgeId: null },
        activeNode: null,
        activeEdge: null,
        canUndo: false,
        canRedo: false,
        isDirty: false,
        gridEnabled: true,
        viewport: { x: 0, y: 0, zoom: 1 }
      }),
      getDocument: () => ({
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }),
      getConfig: () => ({
        nodeTypes: new Map([['task', { id: 'task', label: 'Task' }]]),
        rules: { allowSelfLoop: false, allowMultiEdge: true },
        edgeTypes: new Map(),
        features: {},
        canvas: {}
      }),
      addEdge: () => null
    } as any;

    const provider = createDesignerActionProvider(core);
    const result = await provider.invoke(
      'addEdge',
      { source: 'node-1', target: 'missing-node' },
      { runtime: { env: { notify } } } as any
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Edges must connect existing nodes.');
    expect(notify).toHaveBeenCalledWith('warning', 'Edges must connect existing nodes.');
  });

  it('returns normalized viewport data from provider setViewport calls', async () => {
    let viewport = { x: 0, y: 0, zoom: 1 };
    const core = {
      getSnapshot: () => ({
        doc: { id: 'doc-1', kind: 'flow', name: 'Example', version: '1.0.0', nodes: [], edges: [], viewport },
        selection: { selectedNodeIds: [], selectedEdgeIds: [], activeNodeId: null, activeEdgeId: null },
        activeNode: null,
        activeEdge: null,
        canUndo: true,
        canRedo: false,
        isDirty: true,
        gridEnabled: true,
        viewport
      }),
      getDocument: () => ({ id: 'doc-1', kind: 'flow', name: 'Example', version: '1.0.0', nodes: [], edges: [], viewport }),
      getConfig: () => ({
        nodeTypes: new Map(),
        rules: { allowSelfLoop: false, allowMultiEdge: true },
        edgeTypes: new Map(),
        features: {},
        canvas: {}
      }),
      setViewport: (nextViewport: { x: number; y: number; zoom: number }) => {
        viewport = { x: Math.round(nextViewport.x), y: Math.round(nextViewport.y), zoom: Math.max(0.1, Math.min(4, Number(nextViewport.zoom.toFixed(1)))) };
      }
    } as any;

    const provider = createDesignerActionProvider(core);
    const result = await provider.invoke('setViewport', { viewport: { x: 12.4, y: 24.6, zoom: 1.26 } }, {} as any);

    expect(result).toMatchObject({ ok: true, data: { x: 12, y: 25, zoom: 1.3 } });
  });

  it('routes moveNode through the provider command surface', async () => {
    let position = { x: 10, y: 20 };
    const core = {
      getSnapshot: () => ({
        doc: {
          id: 'doc-1',
          kind: 'flow',
          name: 'Example',
          version: '1.0.0',
          nodes: [{ id: 'node-1', type: 'task', position, data: {} }],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        selection: { selectedNodeIds: [], selectedEdgeIds: [], activeNodeId: null, activeEdgeId: null },
        activeNode: null,
        activeEdge: null,
        canUndo: true,
        canRedo: false,
        isDirty: true,
        gridEnabled: true,
        viewport: { x: 0, y: 0, zoom: 1 }
      }),
      getDocument: () => ({
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [{ id: 'node-1', type: 'task', position, data: {} }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }),
      getConfig: () => ({
        nodeTypes: new Map([['task', { id: 'task', label: 'Task' }]]),
        rules: { allowSelfLoop: false, allowMultiEdge: true },
        edgeTypes: new Map(),
        features: {},
        canvas: {}
      }),
      moveNode: (nodeId: string, nextPosition: { x: number; y: number }) => {
        if (nodeId === 'node-1') {
          position = nextPosition;
        }
      }
    } as any;

    const provider = createDesignerActionProvider(core);
    const result = await provider.invoke('moveNode', { nodeId: 'node-1', position: { x: 30, y: 50 } }, {} as any);

    expect(result).toMatchObject({ ok: true, data: expect.objectContaining({ id: 'node-1', position: { x: 30, y: 50 } }) });
  });
});

describe('flowDesignerRendererDefinitions', () => {
  it('includes designer-page renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map(d => d.type);
    expect(rendererTypes).toContain('designer-page');
  });

  it('includes designer-canvas renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map(d => d.type);
    expect(rendererTypes).toContain('designer-canvas');
  });

  it('includes designer-palette renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map(d => d.type);
    expect(rendererTypes).toContain('designer-palette');
  });
});

describe('DesignerPageRenderer basic rendering', () => {
  it('renders the designer page with xyflow canvas', () => {
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
              { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } }
            ],
            edges: [{ id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Edge 1' } }],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: createTestConfig()
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const canvas = within(view.container);
    expect(canvas.getByRole('application')).toBeTruthy();
    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(2);
  });

  it('renders a fallback when document or config is missing', () => {
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schema={{ type: 'designer-page' } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(view.getByText('Designer requires document and config props')).toBeTruthy();
  });
});

// @vitest-environment jsdom

import { createFormulaCompiler } from '../../flux-formula/src/index';
import { createSchemaRenderer } from '../../flux-react/src/index';
import { basicRendererDefinitions } from '../../flux-renderers-basic/src/index';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DesignerConfig, GraphDocument } from '../../flow-designer-core/src/index';
import { createDesignerActionProvider, flowDesignerRendererDefinitions } from './index';

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
        defaults: { label: 'Task' }
      },
      {
        id: 'end',
        label: 'End',
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

function renderDesignerPage(document: GraphDocument, notify = vi.fn()) {
  const SchemaRenderer = createSchemaRenderer(flowDesignerRendererDefinitions);

  const view = render(
    <SchemaRenderer
      schema={{ type: 'designer-page', document, config: createTestConfig(), canvasAdapter: 'card' } as any}
      env={createRendererEnv(notify)}
      formulaCompiler={createFormulaCompiler()}
    />
  );

  return { notify, ...view };
}

function renderDesignerPageWithDefaultAdapter(document: GraphDocument, notify = vi.fn()) {
  const SchemaRenderer = createSchemaRenderer(flowDesignerRendererDefinitions);

  const view = render(
    <SchemaRenderer
      schema={{ type: 'designer-page', document, config: createTestConfig() } as any}
      env={createRendererEnv(notify)}
      formulaCompiler={createFormulaCompiler()}
    />
  );

  return { notify, ...view };
}

function renderDesignerPageWithSchemaRegions(schema: Record<string, unknown>, notify = vi.fn()) {
  const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...flowDesignerRendererDefinitions]);

  const view = render(
    <SchemaRenderer
      schema={schema as any}
      env={createRendererEnv(notify)}
      formulaCompiler={createFormulaCompiler()}
    />
  );

  return { notify, ...view };
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
        permissions: {},
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
        permissions: {},
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
        permissions: {},
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
        permissions: {},
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

  it('surfaces host warnings when bridge connection completion hits a duplicate edge constraint', async () => {
    const view = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
        { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } }
      ],
      edges: [{ id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Existing edge' } }],
      viewport: { x: 0, y: 0, zoom: 1 }
    });
    const canvas = within(view.container);

    fireEvent.click(canvas.getByText('Task 1'));
    fireEvent.click(canvas.getByRole('button', { name: 'C' }));
    fireEvent.click(canvas.getByText('Connect here'));

    await waitFor(() => {
      expect(view.notify).toHaveBeenCalledWith('warning', 'Duplicate edges are not supported in the playground example.');
    });

    expect(canvas.getByText('Connect here')).toBeTruthy();
  });

  it('surfaces host warnings when bridge reconnect completion hits a duplicate edge constraint', async () => {
    const view = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
        { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } },
        { id: 'node-3', type: 'end', position: { x: 420, y: 40 }, data: { label: 'Task 3' } }
      ],
      edges: [
        { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Primary edge' } },
        { id: 'edge-2', type: 'default', source: 'node-1', target: 'node-3', data: { label: 'Reconnect edge' } }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    });
    const canvas = within(view.container);

    fireEvent.click(canvas.getByText('Reconnect edge'));
    fireEvent.click(canvas.getByText('R'));
    const targetNode = canvas.getAllByText('Task 2')[0]?.closest('.fd-node');
    expect(targetNode).toBeTruthy();
    fireEvent.click(within(targetNode as HTMLElement).getByText('Reconnect here'));

    await waitFor(() => {
      expect(view.notify).toHaveBeenCalledWith('warning', 'Duplicate edges are not supported in the playground example.');
    });

    expect(within(targetNode as HTMLElement).getByText('Reconnect here')).toBeTruthy();
  });

  it('lets schema toolbar regions dispatch designer actions through injected designer scope', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      toolbar: {
        type: 'button',
        label: 'Add task from schema',
        onClick: {
          action: 'designer:addNode',
          nodeType: 'task',
          position: { x: 160, y: 120 }
        }
      }
    });

    const button = within(view.container).getByRole('button', { name: 'Add task from schema' });
    expect(view.container.querySelectorAll('.fd-node')).toHaveLength(0);

    fireEvent.click(button);

    await waitFor(() => {
      expect(view.container.querySelectorAll('.fd-node')).toHaveLength(1);
    });
  });

  it('injects designer snapshot fields into schema expression scope for toolbar fragments', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [
          { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      toolbar: {
        type: 'text',
        text: 'Selected node: ${activeNode.data.label}'
      }
    });

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Task 1'));

    await waitFor(() => {
      expect(view.container.textContent ?? '').toContain('Selected node: Task 1');
    });
  });

  it('lets schema inspector regions dispatch designer actions through the same action scope boundary', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [
          { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      inspector: {
        type: 'button',
        label: 'Remove selected node',
        onClick: {
          action: 'designer:deleteNode',
          nodeId: '${activeNode.id}'
        }
      }
    });

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Task 1'));

    const button = canvas.getByRole('button', { name: 'Remove selected node' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(view.container.querySelectorAll('.fd-node')).toHaveLength(0);
    });
  });

  it('injects designer snapshot fields into inspector region expression scope', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [
          { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      inspector: {
        type: 'text',
        text: 'Inspector active node: ${activeNode.data.label}'
      }
    });

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Task 1'));

    await waitFor(() => {
      expect(view.container.textContent ?? '').toContain('Inspector active node: Task 1');
    });
  });

  it('keeps designer namespace actions available inside dialogs opened from schema regions', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      toolbar: {
        type: 'button',
        label: 'Open add dialog',
        onClick: {
          action: 'dialog',
          dialog: {
            title: 'Add node dialog',
            body: [
              {
                type: 'button',
                label: 'Add task from dialog',
                onClick: {
                  action: 'designer:addNode',
                  nodeType: 'task',
                  position: { x: 240, y: 140 }
                }
              }
            ]
          }
        }
      }
    });

    const canvas = within(view.container);
    fireEvent.click(canvas.getByRole('button', { name: 'Open add dialog' }));

    expect(await canvas.findByText('Add node dialog')).toBeTruthy();

    fireEvent.click(canvas.getByRole('button', { name: 'Add task from dialog' }));

    await waitFor(() => {
      expect(view.container.querySelectorAll('.fd-node')).toHaveLength(1);
    });
  });

  it('renders dialogs region content when designer-page declares a dialogs fragment', () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      dialogs: {
        type: 'text',
        text: 'Mounted dialogs region content'
      }
    });

    expect(view.container.textContent ?? '').toContain('Mounted dialogs region content');
  });

  it('lets dialogs region fragments dispatch designer actions through the injected action scope', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      dialogs: {
        type: 'button',
        label: 'Add task from dialogs region',
        onClick: {
          action: 'designer:addNode',
          nodeType: 'task',
          position: { x: 320, y: 160 }
        }
      }
    });

    const button = within(view.container).getByRole('button', { name: 'Add task from dialogs region' });
    expect(view.container.querySelectorAll('.fd-node')).toHaveLength(0);

    fireEvent.click(button);

    await waitFor(() => {
      expect(view.container.querySelectorAll('.fd-node')).toHaveLength(1);
    });
  });

  it('injects designer snapshot fields into dialogs region expression scope', async () => {
    const view = renderDesignerPageWithSchemaRegions({
      type: 'designer-page',
      canvasAdapter: 'card',
      document: {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [
          { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } }
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      config: createTestConfig(),
      dialogs: {
        type: 'text',
        text: 'Dialogs active node: ${activeNode.data.label}'
      }
    });

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Task 1'));

    await waitFor(() => {
      expect(view.container.textContent ?? '').toContain('Dialogs active node: Task 1');
    });
  });

  it('renders the xyflow preview bridge when designer-page selects that adapter', () => {
    const SchemaRenderer = createSchemaRenderer(flowDesignerRendererDefinitions);

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          canvasAdapter: 'xyflow-preview',
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
    expect(canvas.getByText('Xyflow preview bridge')).toBeTruthy();

    fireEvent.click(canvas.getByText('Start from Task 1'));
    expect(canvas.getByText('Connect to Task 2')).toBeTruthy();

    fireEvent.click(canvas.getByText('Select Edge 1'));
    fireEvent.click(canvas.getByText('Start reconnect for Edge 1'));
    expect(canvas.getByText('Reconnect to Task 1')).toBeTruthy();
  });

  it('keeps xyflow preview connection intent active after duplicate-edge failures', async () => {
    const SchemaRenderer = createSchemaRenderer(flowDesignerRendererDefinitions);

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          canvasAdapter: 'xyflow-preview',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
              { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } }
            ],
            edges: [{ id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Existing edge' } }],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: createTestConfig()
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Start from Task 1'));
    fireEvent.click(canvas.getByText('Connect to Task 2'));

    await waitFor(() => {
      expect(canvas.getByText('Connect to Task 2')).toBeTruthy();
    });
  });

  it('keeps xyflow preview reconnect intent active after duplicate-edge failures', async () => {
    const SchemaRenderer = createSchemaRenderer(flowDesignerRendererDefinitions);

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          canvasAdapter: 'xyflow-preview',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
              { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } },
              { id: 'node-3', type: 'end', position: { x: 420, y: 40 }, data: { label: 'Task 3' } }
            ],
            edges: [
              { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Primary edge' } },
              { id: 'edge-2', type: 'default', source: 'node-1', target: 'node-3', data: { label: 'Reconnect edge' } }
            ],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: createTestConfig()
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Select Reconnect edge'));
    fireEvent.click(canvas.getByText('Start reconnect for Reconnect edge'));
    fireEvent.click(canvas.getByText('Reconnect to Task 2'));

    await waitFor(() => {
      expect(canvas.getByText('Reconnect to Task 2')).toBeTruthy();
    });
  });

  it('renders the live xyflow bridge when designer-page selects that adapter', () => {
    const SchemaRenderer = createSchemaRenderer(flowDesignerRendererDefinitions);

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          canvasAdapter: 'xyflow',
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
    expect(canvas.getByText('React Flow canvas')).toBeTruthy();
  });

  it('uses the live xyflow bridge by default when canvasAdapter is omitted', () => {
    const view = renderDesignerPageWithDefaultAdapter({
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
    });

    const canvas = within(view.container);
    expect(canvas.getByText('React Flow canvas')).toBeTruthy();
  });
});

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import { createDesignerActionProvider, flowDesignerRendererDefinitions } from './index';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { DesignerIcon } from './designer-icon';

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body']
};

const basicTestRendererDefinitions: RendererDefinition[] = [pageRenderer, textRenderer];

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

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

describe('designer-page status publication', () => {
  it('publishes designer host status through statusPath', async () => {
    function StatusProbe() {
      const status = useScopeSelector((data: any) => data.designerStatus);
      return <span data-testid="designer-status">{status ? `${status.kind}:${status.selectionKind}:${status.selectionCount}` : ''}</span>;
    }

    const statusProbeRenderer = {
      type: 'designer-status-probe',
      component: StatusProbe
    } as any;
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions, statusProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/index-status"
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              document: { id: 'doc-1', kind: 'flow', name: 'Example', version: '1.0.0', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
              config: createTestConfig(),
              statusPath: 'designerStatus'
            },
            {
              type: 'designer-status-probe'
            }
          ]
        } as any}
        env={createRendererEnv() as any}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="designer-status"]')?.textContent).toBe('designer:none:0');
    });
  });
});

describe('DesignerIcon markers', () => {
  it('uses data-icon for icon identity without modifier marker classes', () => {
    render(<DesignerIcon icon="arrow-left" className="text-white" />);

    const icon = document.querySelector('[data-icon="arrow-left"]');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    const className = icon?.getAttribute('class') ?? '';
    expect(className).toContain('nop-icon');
    expect(className).not.toContain('nop-icon--');
    expect(className).toContain('text-white');
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

  it('designer-page renderer includes hostContract metadata', () => {
    const designerPageDef = flowDesignerRendererDefinitions.find(d => d.type === 'designer-page');
    expect(designerPageDef).toBeTruthy();
    expect(designerPageDef?.hostContract).toBeTruthy();
    expect(designerPageDef?.rendererClass).toBe('domain-host-renderer');
    expect(designerPageDef?.rendererTraits).toEqual(expect.arrayContaining(['workbench-shell', 'builder-facing']));
    expect(designerPageDef?.propContracts?.config?.required).toBe(true);
    expect(designerPageDef?.scopeExportContracts?.$designer?.kind).toBe('object');
    expect(designerPageDef?.hostContract?.family).toBe('designer');
    expect(designerPageDef?.hostContract?.defaultVersion).toBe('1.0');
    expect(designerPageDef?.hostContract?.capabilityPublication).toMatchObject({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'inspector', 'dialogs'],
      transitiveInheritance: true
    });
  });
});

describe('flow-designer manifest', () => {
  it('exports FLOW_DESIGNER_MANIFEST_V1 with correct family and version', async () => {
    const { FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest');
    expect(FLOW_DESIGNER_MANIFEST_V1.family).toBe('designer');
    expect(FLOW_DESIGNER_MANIFEST_V1.version).toBe('1.0');
  });

  it('manifest projection includes expected fields', async () => {
    const { FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest');
    const fields = FLOW_DESIGNER_MANIFEST_V1.projection.fields;
    expect(fields.doc).toBeTruthy();
    expect(fields.selection).toBeTruthy();
    expect(fields.activeNode).toBeTruthy();
    expect(fields.activeEdge).toBeTruthy();
    expect(fields.runtime).toBeTruthy();
  });

  it('manifest capabilities includes all methods from action provider', async () => {
    const { FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest');
    const { createDesignerActionProvider } = await import('./designer-action-provider');

    const mockCore = {
      getSnapshot: () => ({ doc: {}, selection: {}, activeNode: null, activeEdge: null }),
      getDocument: () => ({ nodes: [], edges: [] }),
      getConfig: () => ({ nodeTypes: new Map(), rules: {}, edgeTypes: new Map(), features: {}, canvas: {} })
    } as any;

    const provider = createDesignerActionProvider(mockCore);
    const providerMethods = provider.listMethods?.() ?? [];
    const manifestMethods = Object.keys(FLOW_DESIGNER_MANIFEST_V1.capabilities.methods);

    for (const method of providerMethods) {
      expect(manifestMethods).toContain(method);
    }
  });

  it('resolveDesignerManifest resolves version selectors correctly', async () => {
    const { resolveDesignerManifest, FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest');
    expect(resolveDesignerManifest('1.0')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(resolveDesignerManifest('1')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(resolveDesignerManifest('latest')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(resolveDesignerManifest('2.0')).toBeUndefined();
  });

  it('designerHostContract.resolveManifest works as expected', async () => {
    const { designerHostContract, FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest');
    expect(designerHostContract.resolveManifest('1.0')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(designerHostContract.resolveManifest('unknown')).toBeUndefined();
  });
});

describe('DesignerPageRenderer basic rendering', () => {
  it('renders the designer page with xyflow canvas', () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-rendering"
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

  it('uses data-slot for the node quick toolbar instead of internal toolbar marker classes', async () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-toolbar"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
            ],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: {
            ...createTestConfig(),
            nodeTypes: [
              {
                id: 'task',
                label: 'Task',
                body: { type: 'text', text: 'Task' },
                defaults: { label: 'Task' },
                quickActions: { type: 'text', text: 'Quick actions' }
              },
              {
                id: 'end',
                label: 'End',
                body: { type: 'text', text: 'End' },
                defaults: { label: 'End' }
              }
            ]
          }
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const node = view.container.querySelector('.nop-designer-node') as HTMLElement;
    fireEvent.mouseEnter(node);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="designer-node-toolbar"]')).toBeTruthy();
      expect(document.querySelector('.nop-designer-node-toolbar')).toBeNull();
    });
  });

  it('renders a fallback when document or config is missing', () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-fallback"
        schema={{ type: 'designer-page' } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(view.getByText('Designer requires config prop')).toBeTruthy();
  });

  it('prefers nodeType inspector schema in the default inspector', async () => {
    const SchemaRenderer = createSchemaRenderer([...basicTestRendererDefinitions, ...flowDesignerRendererDefinitions]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/index-inspector-schema"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [
              { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1', custom: 'abc' } },
            ],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
          config: {
            ...createTestConfig(),
            nodeTypes: [
              {
                id: 'task',
                label: 'Task',
                body: { type: 'text', text: 'Task' },
                defaults: { label: 'Task' },
                inspector: {
                  body: {
                    type: 'text',
                    text: 'Inspector From Schema'
                  }
                }
              },
              {
                id: 'end',
                label: 'End',
                body: { type: 'text', text: 'End' },
                defaults: { label: 'End' }
              }
            ]
          }
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const node = view.container.querySelector('.react-flow__node');
    expect(node).toBeTruthy();
    fireEvent.click(node as Element);

    await waitFor(() => {
      expect(view.getByText('Inspector From Schema')).toBeTruthy();
    });
  });
});

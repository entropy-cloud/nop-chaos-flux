// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createDesignerActionProvider, flowDesignerRendererDefinitions } from './index';
import { DesignerIcon } from './designer-icon';
import { render } from '@testing-library/react';
import { installFlowDesignerTestHooks } from './index-test-support';

installFlowDesignerTestHooks();

describe('createDesignerActionProvider', () => {
  it('maps designer namespace methods to core commands', async () => {
    const core = {
      getSnapshot: () => ({
        doc: {
          id: 'doc-1',
          kind: 'flow',
          name: 'Example',
          version: '1.0.0',
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        selection: {
          selectedNodeIds: [],
          selectedEdgeIds: [],
          activeNodeId: null,
          activeEdgeId: null,
          activeBranchId: null,
        },
        activeNode: null,
        activeEdge: null,
        activeBranch: null,
        canUndo: false,
        canRedo: false,
        isDirty: false,
        gridEnabled: true,
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
      getDocument: () => ({
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
      getConfig: () => ({
        nodeTypes: new Map([['task', { id: 'task', label: 'Task' }]]),
        rules: { allowSelfLoop: false, allowMultiEdge: true },
        edgeTypes: new Map(),
        features: {},
        canvas: {},
      }),
      addNode: (
        type: string,
        position: { x: number; y: number },
        data?: Record<string, unknown>,
      ) => ({ id: 'n1', type, position, data }),
      clearSelection: () => undefined,
      selectNode: () => undefined,
      selectBranch: () => undefined,
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
      restore: () => undefined,
    } as any;

    const provider = createDesignerActionProvider(core);
    const addResult = await provider.invoke(
      'addNode',
      { nodeType: 'task', position: { x: 1, y: 2 } },
      {} as any,
    );
    const exportResult = await provider.invoke('export', undefined, {} as any);
    const branchResult = await provider.invoke(
      'selectBranch',
      { nodeId: 'gateway-1', branchId: 'b2' },
      {} as any,
    );

    expect(addResult).toMatchObject({ ok: true, data: expect.objectContaining({ type: 'task' }) });
    expect(exportResult).toMatchObject({ ok: true, data: '{"ok":true}' });
    expect(branchResult).toMatchObject({ ok: true });
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
          nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: {} }],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        selection: {
          selectedNodeIds: [],
          selectedEdgeIds: [],
          activeNodeId: null,
          activeEdgeId: null,
          activeBranchId: null,
        },
        activeNode: null,
        activeEdge: null,
        activeBranch: null,
        canUndo: false,
        canRedo: false,
        isDirty: false,
        gridEnabled: true,
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
      getDocument: () => ({
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
      getConfig: () => ({
        nodeTypes: new Map([['task', { id: 'task', label: 'Task' }]]),
        rules: { allowSelfLoop: false, allowMultiEdge: true },
        edgeTypes: new Map(),
        features: {},
        canvas: {},
      }),
      addEdge: () => null,
    } as any;

    const provider = createDesignerActionProvider(core);
    const result = await provider.invoke('addEdge', { source: 'node-1', target: 'missing-node' }, {
      runtime: { env: { notify } },
    } as any);

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Edges must connect existing nodes.');
    expect(notify).toHaveBeenCalledWith('warning', 'Edges must connect existing nodes.');
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
    const rendererTypes = flowDesignerRendererDefinitions.map((definition) => definition.type);
    expect(rendererTypes).toContain('designer-page');
  });

  it('includes designer-canvas renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map((definition) => definition.type);
    expect(rendererTypes).toContain('designer-canvas');
  });

  it('includes designer-palette renderer', () => {
    const rendererTypes = flowDesignerRendererDefinitions.map((definition) => definition.type);
    expect(rendererTypes).toContain('designer-palette');
  });

  it('designer-page renderer includes hostContract metadata', () => {
    const designerPageDef = flowDesignerRendererDefinitions.find(
      (definition) => definition.type === 'designer-page',
    );
    expect(designerPageDef).toBeTruthy();
    expect(designerPageDef?.hostContract).toBeTruthy();
    expect(designerPageDef?.rendererClass).toBe('domain-host-renderer');
    expect(designerPageDef?.rendererTraits).toEqual(
      expect.arrayContaining(['workbench-shell', 'builder-facing']),
    );
    expect(designerPageDef?.propContracts?.config?.required).toBe(true);
    expect(designerPageDef?.scopeExportContracts?.$designer?.kind).toBe('object');
    expect(designerPageDef?.hostContract?.family).toBe('designer');
    expect(designerPageDef?.hostContract?.defaultVersion).toBe('1.0');
    expect(designerPageDef?.hostContract?.capabilityPublication).toMatchObject({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'inspector', 'dialogs'],
      transitiveInheritance: true,
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
});

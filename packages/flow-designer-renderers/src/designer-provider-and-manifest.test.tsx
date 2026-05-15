// @vitest-environment happy-dom

import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { describe, expect, it, vi } from 'vitest';
import { createDesignerActionProvider, flowDesignerRendererDefinitions } from './index.js';
import { DesignerIcon } from './designer-icon.js';
import { render } from '@testing-library/react';
import { installFlowDesignerTestHooks } from './index-test-support.js';

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
          nodes: [
            { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: {} },
            { id: 'n2', type: 'task', position: { x: 120, y: 0 }, data: {} },
          ],
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
        nodes: [
          { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: {} },
          { id: 'n2', type: 'task', position: { x: 120, y: 0 }, data: {} },
        ],
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
      addEdge: (
        source: string,
        target: string,
        _data?: Record<string, unknown>,
        sourcePort?: string,
        targetPort?: string,
      ) => ({ id: 'e1', type: 'default', source, target, sourcePort, targetPort, data: {} }),
      reconnectEdge: (
        edgeId: string,
        source: string,
        target: string,
        sourcePort?: string,
        targetPort?: string,
      ) => ({
        ok: true,
        edge: { id: edgeId, type: 'default', source, target, sourcePort, targetPort, data: {} },
      }),
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
    const addEdgeResult = await provider.invoke(
      'addEdge',
      { source: 'n1', target: 'n2', sourcePort: 'out-1', targetPort: 'in-1' },
      {} as any,
    );

    expect(addResult).toMatchObject({ ok: true, data: expect.objectContaining({ type: 'task' }) });
    expect(exportResult).toMatchObject({ ok: true, data: '{"ok":true}' });
    expect(branchResult).toMatchObject({ ok: true });
    expect(addEdgeResult).toMatchObject({
      ok: true,
      data: expect.objectContaining({ sourcePort: 'out-1', targetPort: 'in-1' }),
    });
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

  it('exposes deleteSelection and removes the selected set through the action provider', async () => {
    const core = createDesignerCore(
      {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [
          { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: {} },
          { id: 'n2', type: 'task', position: { x: 120, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', type: 'default', source: 'n1', target: 'n2', data: {} }],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      {
        version: '1.0.0',
        kind: 'flow',
        nodeTypes: [{ id: 'task', label: 'Task', defaults: {} }],
        edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
        palette: { groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task'] }] },
      },
    );
    core.setSelection(['n1', 'n2'], []);

    const provider = createDesignerActionProvider(core);

    expect(provider.listMethods()).toContain('deleteSelection');

    const result = await provider.invoke('deleteSelection', undefined, {} as any);

    expect(result).toMatchObject({ ok: true });
    expect(core.getSnapshot().doc.nodes).toEqual([]);
    expect(core.getSnapshot().doc.edges).toEqual([]);
    expect(core.getSnapshot().selection.selectedNodeIds).toEqual([]);
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

  it('designer-canvas and designer-palette remain live registered renderer wrappers', () => {
    const canvasDef = flowDesignerRendererDefinitions.find((definition) => definition.type === 'designer-canvas');
    const paletteDef = flowDesignerRendererDefinitions.find((definition) => definition.type === 'designer-palette');

    expect(canvasDef?.component).toBeTruthy();
    expect(paletteDef?.component).toBeTruthy();
    expect(canvasDef?.fields).toEqual([]);
    expect(paletteDef?.fields).toEqual([]);
    expect(canvasDef?.component?.name).toBe('DesignerCanvasRenderer');
    expect(paletteDef?.component?.name).toBe('DesignerPaletteRenderer');
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
    expect(designerPageDef?.scopeExportContracts?.$designer?.fields).toMatchObject({
      kind: { kind: 'literal', value: 'designer' },
      dirty: { kind: 'boolean' },
      canUndo: { kind: 'boolean' },
      canRedo: { kind: 'boolean' },
      selectionKind: { kind: 'union' },
      selectionCount: { kind: 'number' },
    });
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
    const { FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest.js');
    expect(FLOW_DESIGNER_MANIFEST_V1.family).toBe('designer');
    expect(FLOW_DESIGNER_MANIFEST_V1.version).toBe('1.0');
  });

  it('manifest projection includes expected fields', async () => {
    const { FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest.js');
    const fields = FLOW_DESIGNER_MANIFEST_V1.projection.fields;
    expect(fields.doc).toBeTruthy();
    expect(fields.selection).toBeTruthy();
    expect(fields.activeNode).toBeTruthy();
    expect(fields.activeEdge).toBeTruthy();
    expect(fields.runtime).toBeTruthy();
    const activeEdgeFields = (fields.activeEdge.schema as any).anyOf[1].fields;
    expect(activeEdgeFields.sourcePort).toBeTruthy();
    expect(activeEdgeFields.targetPort).toBeTruthy();
    expect((fields.runtime.schema as any).fields.gridEnabled).toBeTruthy();
    expect((fields.runtime.schema as any).fields.gridVisible).toBeUndefined();
  });
});

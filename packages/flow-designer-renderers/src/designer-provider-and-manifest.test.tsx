// @vitest-environment happy-dom

import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { describe, expect, it, vi } from 'vitest';
import { createDesignerActionProvider, flowDesignerRendererDefinitions } from './index.js';
import { DesignerIcon } from './designer-icon.js';
import { render } from '@testing-library/react';
import { installFlowDesignerTestHooks } from './index-test-support.js';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';

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
      subscribe: () => () => {},
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
      commitTransaction: () => ({ ok: true, transactionId: 'tx-1' }),
      rollbackTransaction: () => ({ ok: true, transactionId: 'tx-2' }),
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
    const commitResult = await provider.invoke('commitTransaction', { transactionId: 'tx-1' }, {} as any);
    const rollbackResult = await provider.invoke('rollbackTransaction', { transactionId: 'tx-2' }, {} as any);

    expect(addResult).toMatchObject({ ok: true, data: { nodeId: 'n1' } });
    expect(exportResult).toMatchObject({ ok: true, data: '{"ok":true}' });
    expect(branchResult).toMatchObject({ ok: true });
    expect(addEdgeResult).toMatchObject({ ok: true, data: { edgeId: 'e1' } });
    expect(commitResult).toEqual({ ok: true, transactionId: 'tx-1' });
    expect(rollbackResult).toEqual({ ok: true, transactionId: 'tx-2' });
  });

  it('returns structured non-success result for missing transaction ids', async () => {
    const provider = createDesignerActionProvider({
      commitTransaction: () => ({ ok: false, reason: 'missing-transaction' }),
      rollbackTransaction: () => ({ ok: false, reason: 'unavailable' }),
    } as any);

    const commitResult = await provider.invoke('commitTransaction', { transactionId: 'missing' }, {} as any);
    const rollbackResult = await provider.invoke('rollbackTransaction', undefined, {} as any);

    expect(commitResult).toMatchObject({
      ok: false,
      cause: {
        reason: 'missing-transaction',
        result: { ok: false, reason: 'missing-transaction' },
      },
      reason: 'missing-transaction',
    });
    expect(rollbackResult).toMatchObject({
      ok: false,
      cause: {
        reason: 'unavailable',
        result: { ok: false, reason: 'unavailable' },
      },
      reason: 'unavailable',
    });
  });

  it('returns structured failures for missing selection and batch-update targets', async () => {
    const provider = createDesignerActionProvider({
      getSnapshot: () => ({
        doc: {
          id: 'doc-1',
          kind: 'flow',
          name: 'Example',
          version: '1.0.0',
          nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: {} }],
          edges: [{ id: 'edge-1', type: 'default', source: 'node-1', target: 'node-1', data: {} }],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      }),
      toggleNodeSelection: () => ({ ok: false, reason: 'missing-node' }),
      toggleEdgeSelection: () => ({ ok: false, reason: 'missing-edge' }),
      setSelection: vi.fn(),
      moveNodes: vi.fn(),
      updateMultipleNodes: vi.fn(),
    } as any);

    const toggleNodeResult = await provider.invoke(
      'toggleNodeSelection',
      { nodeId: 'missing-node' },
      {} as any,
    );
    const toggleEdgeResult = await provider.invoke(
      'toggleEdgeSelection',
      { edgeId: 'missing-edge' },
      {} as any,
    );
    const setSelectionResult = await provider.invoke(
      'setSelection',
      { nodeIds: ['node-1'], edgeIds: ['missing-edge'] },
      {} as any,
    );
    const moveNodesResult = await provider.invoke(
      'moveNodes',
      { deltas: { 'missing-node': { dx: 1, dy: 2 } } },
      {} as any,
    );
    const updateNodesResult = await provider.invoke(
      'updateMultipleNodes',
      { updates: [{ nodeId: 'missing-node', data: { label: 'x' } }] },
      {} as any,
    );

    expect(toggleNodeResult).toMatchObject({
      ok: false,
      cause: { reason: 'missing-node' },
      reason: 'missing-node',
    });
    expect(toggleEdgeResult).toMatchObject({
      ok: false,
      cause: { reason: 'missing-edge' },
      reason: 'missing-edge',
    });
    expect(setSelectionResult).toMatchObject({
      ok: false,
      cause: { reason: 'missing-selection-target' },
      reason: 'missing-selection-target',
    });
    expect(moveNodesResult).toMatchObject({
      ok: false,
      cause: { reason: 'missing-node' },
      reason: 'missing-node',
    });
    expect(updateNodesResult).toMatchObject({
      ok: false,
      cause: { reason: 'missing-node' },
      reason: 'missing-node',
    });
  });

  it('uses ActionResult-shaped causes for direct core tail-method failures', async () => {
    const provider = createDesignerActionProvider({
      commitTransaction: () => ({ ok: false, reason: 'missing-transaction' }),
      rollbackTransaction: () => ({ ok: false, reason: 'unavailable' }),
      toggleNodeSelection: () => ({ ok: false, reason: 'missing-node' }),
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
      }),
    } as any);

    const commitResult = await provider.invoke('commitTransaction', { transactionId: 'missing' }, {} as any);
    const rollbackResult = await provider.invoke('rollbackTransaction', undefined, {} as any);
    const toggleNodeResult = await provider.invoke('toggleNodeSelection', { nodeId: 'missing-node' }, {} as any);

    expect(commitResult).toMatchObject({
      ok: false,
      error: undefined,
      cause: {
        reason: 'missing-transaction',
        result: { ok: false, reason: 'missing-transaction' },
      },
      reason: 'missing-transaction',
    });
    expect(rollbackResult).toMatchObject({
      ok: false,
      error: undefined,
      cause: {
        reason: 'unavailable',
        result: { ok: false, reason: 'unavailable' },
      },
      reason: 'unavailable',
    });
    expect(toggleNodeResult).toMatchObject({
      ok: false,
      error: undefined,
      cause: {
        reason: 'missing-node',
        result: { ok: false, reason: 'missing-node' },
      },
      reason: 'missing-node',
    });
  });

  it('rejects payloads that do not match the published manifest args contract', async () => {
    const provider = createDesignerActionProvider(createDesignerCore(
      {
        id: 'doc-1',
        kind: 'flow',
        name: 'Example',
        version: '1.0.0',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      {
        version: '1.0.0',
        kind: 'flow',
        nodeTypes: [{ id: 'task', label: 'Task', defaults: {} }],
      },
    ));

    const addNodeResult = await provider.invoke('addNode', { position: { x: 1, y: 2 } }, {} as any);
    const toggleResult = await provider.invoke('toggleNodeSelection', { edgeId: 'e1' }, {} as any);
    const moveBranchResult = await provider.invoke(
      'moveBranch',
      { nodeId: 'node-1', branchId: 'branch-1', direction: 'up' },
      {} as any,
    );
    const moveNodesResult = await provider.invoke(
      'moveNodes',
      { deltas: { 'node-1': { dx: 1, dy: 'bad' } } },
      {} as any,
    );

    expect(addNodeResult).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: 'designer:addNode payload does not match the published host args contract.',
      }),
    });
    expect(toggleResult).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: 'designer:toggleNodeSelection payload does not match the published host args contract.',
      }),
    });
    expect(moveBranchResult).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: 'designer:moveBranch payload does not match the published host args contract.',
      }),
    });
    expect(moveNodesResult).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: 'designer:moveNodes payload does not match the published host args contract.',
      }),
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
      subscribe: () => () => {},
      addEdge: () => null,
    } as any;

    const provider = createDesignerActionProvider(core);
    const result = await provider.invoke('addEdge', { source: 'node-1', target: 'missing-node' }, {
      runtime: { env: { notify } },
    } as any);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Edges must connect existing nodes.');
    expect(result.cause).toEqual(
      expect.objectContaining({
        reason: 'missing-node',
        result: expect.objectContaining({
          ok: false,
          reason: 'missing-node',
          error: 'Edges must connect existing nodes.',
        }),
      }),
    );
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
    expect(designerPageDef?.propContracts?.statusPath).toBeTruthy();
    expect(designerPageDef?.scopeExportContracts).toBeUndefined();
    expect(designerPageDef?.hostContract?.family).toBe('designer');
    expect(designerPageDef?.hostContract?.defaultVersion).toBe('1.0');
    expect(designerPageDef?.hostContract?.capabilityPublication).toMatchObject({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'inspector', 'dialogs'],
      transitiveInheritance: true,
    });
  });

  it('publishes document prerequisites through schema validation', () => {
    const registry = createRendererRegistry(flowDesignerRendererDefinitions);
    const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

    const graphDiagnostics = validateSchema({
      schema: { type: 'designer-page', config: { nodeTypes: [], edgeTypes: [] } } as any,
      registry,
      expressionCompiler,
    });
    const treeDiagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        config: { documentMode: 'tree', nodeTypes: [], edgeTypes: [] },
      } as any,
      registry,
      expressionCompiler,
    });
    const validTreeDiagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        treeDocument: { id: 'tree-1', kind: 'tree', name: 'Tree', version: '1.0.0', nodes: [] },
        config: { documentMode: 'tree', nodeTypes: [], edgeTypes: [] },
      } as any,
      registry,
      expressionCompiler,
    });

    expect(graphDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-required-field',
          path: '/document',
        }),
      ]),
    );
    expect(treeDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-required-field',
          path: '/treeDocument',
        }),
      ]),
    );
    expect(validTreeDiagnostics).toEqual([]);
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
    expect((fields.runtime.schema as any).fields.viewport).toBeTruthy();
    expect((fields.doc.schema as any).fields.nodeCount).toBeTruthy();
    expect((fields.doc.schema as any).fields.nodes).toBeTruthy();
    expect((fields.doc.schema as any).fields.edges).toBeTruthy();
    expect(fields.activeBranch).toBeTruthy();
    expect(FLOW_DESIGNER_MANIFEST_V1.capabilities.methods.copySelection).toBeTruthy();
    expect(FLOW_DESIGNER_MANIFEST_V1.capabilities.methods.pasteClipboard).toBeTruthy();
    expect(FLOW_DESIGNER_MANIFEST_V1.capabilities.methods['navigate-back']).toBeUndefined();
  });

  it('buildDesignerScopeData stays aligned with the published manifest projection', async () => {
    const { buildDesignerScopeData } = await import('./designer-context.js');
    const { FLOW_DESIGNER_MANIFEST_V1 } = await import('./designer-manifest.js');
    const scopeData = buildDesignerScopeData({
      snapshot: {
        doc: {
          id: 'doc-1',
          kind: 'flow',
          name: 'Example',
          version: '1.0.0',
          nodes: [{ id: 'n1', type: 'task', position: { x: 0, y: 0 } }],
          edges: [{ id: 'e1' }],
          viewport: { x: 10, y: 20, zoom: 1.25 },
        },
        selection: {
          selectedNodeIds: ['n1'],
          selectedEdgeIds: [],
          activeNodeId: 'n1',
          activeEdgeId: null,
          activeBranchId: 'b1',
        },
        activeNode: { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: {} },
        activeEdge: null,
        activeBranch: { id: 'b1', childId: 'n2', label: 'Yes' },
        canUndo: true,
        canRedo: false,
        isDirty: true,
        gridEnabled: true,
        viewport: { x: 10, y: 20, zoom: 1.25 },
      } as any,
    });

    expect(Object.keys(FLOW_DESIGNER_MANIFEST_V1.projection.fields).sort()).toEqual(
      ['activeBranch', 'activeEdge', 'activeNode', 'doc', 'runtime', 'selection'],
    );
    expect(scopeData.doc).toEqual({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      viewport: { x: 10, y: 20, zoom: 1.25 },
      nodeCount: 1,
      edgeCount: 1,
      nodes: [{ id: 'n1', type: 'task', position: { x: 0, y: 0 } }],
      edges: [{ id: 'e1', source: undefined, target: undefined, sourcePort: undefined, taskflowEdgeKind: undefined }],
    });
    expect(scopeData.selection).toMatchObject({
      kind: 'branch',
      count: 1,
      selectedNodeIds: ['n1'],
      activeBranchId: 'b1',
    });
    expect(scopeData.runtime).toEqual({
      canUndo: true,
      canRedo: false,
      dirty: true,
      gridEnabled: true,
      zoom: 1.25,
      viewport: { x: 10, y: 20, zoom: 1.25 },
    });
    expect(scopeData).not.toHaveProperty('busy');
  });
});

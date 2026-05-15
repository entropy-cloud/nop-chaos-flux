import { describe, expect, it, vi } from 'vitest';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';

function createTestDesignerConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start' },
        constraints: { maxInstances: 1 },
      },
      {
        id: 'task',
        label: 'Task',
        defaults: { label: 'Task' },
      },
      {
        id: 'end',
        label: 'End',
        defaults: { label: 'End' },
      },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['start', 'task', 'end'] }],
    },
  };
}

function createDocumentWithEdgeChain(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'flow',
    name: 'Example',
    version: '1.0.0',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'task-1', type: 'task', position: { x: 100, y: 0 }, data: { label: 'Task' } },
      { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'edge-1', type: 'default', source: 'start-1', target: 'task-1', data: {} },
      { id: 'edge-2', type: 'default', source: 'task-1', target: 'end-1', data: {} },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('createDesignerCommandAdapter', () => {
  it('normalizes shared command results for reconnect success and rejection', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const success = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-1',
      source: 'start-1',
      target: 'end-1',
    });

    expect(success).toMatchObject({
      ok: true,
      data: expect.objectContaining({ id: 'edge-1', target: 'end-1' }),
    });
    expect(success.snapshot.doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'end-1',
    });

    const failure = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-2',
      source: 'start-1',
      target: 'end-1',
    });

    expect(failure).toMatchObject({
      ok: false,
      reason: 'duplicate-edge',
      error: 'Duplicate edges are not supported in the playground example.',
    });
  });

  it('preserves port ids when adding and reconnecting edges', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const added = adapter.execute({
      type: 'addEdge',
      source: 'start-1',
      target: 'end-1',
      sourcePort: 'out-1',
      targetPort: 'in-1',
    });

    expect(added).toMatchObject({
      ok: true,
      data: expect.objectContaining({ sourcePort: 'out-1', targetPort: 'in-1' }),
    });

    const reconnect = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-1',
      source: 'start-1',
      target: 'task-1',
      sourcePort: 'out-2',
      targetPort: 'in-2',
    });

    expect(reconnect).toMatchObject({
      ok: true,
      data: expect.objectContaining({ sourcePort: 'out-2', targetPort: 'in-2' }),
    });
  });

  it('marks unchanged viewport updates without creating a failure result', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({
      type: 'setViewport',
      viewport: { x: 0.004, y: 0.004, zoom: 1.0004 },
    });

    expect(result).toMatchObject({ ok: true, reason: 'unchanged' });
    expect(result.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('moves nodes through the shared adapter result surface', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const moved = adapter.execute({
      type: 'moveNode',
      nodeId: 'task-1',
      position: { x: 144, y: 24 },
    });

    expect(moved).toMatchObject({
      ok: true,
      data: expect.objectContaining({ id: 'task-1', position: { x: 144, y: 24 } }),
    });

    const unchanged = adapter.execute({
      type: 'moveNode',
      nodeId: 'task-1',
      position: { x: 144, y: 24 },
    });

    expect(unchanged).toMatchObject({ ok: true, reason: 'unchanged' });
  });

  it('toggles palette collapsed state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({ type: 'togglePalette' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.paletteCollapsed).toBe(true);
    expect(result.snapshot.inspectorCollapsed).toBe(false);
  });

  it('toggles palette back to expanded state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    adapter.execute({ type: 'togglePalette' });
    const result = adapter.execute({ type: 'togglePalette' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.paletteCollapsed).toBe(false);
    expect(result.snapshot.inspectorCollapsed).toBe(false);
  });

  it('toggles inspector collapsed state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({ type: 'toggleInspector' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.inspectorCollapsed).toBe(true);
    expect(result.snapshot.paletteCollapsed).toBe(false);
  });

  it('toggles inspector back to expanded state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    adapter.execute({ type: 'toggleInspector' });
    const result = adapter.execute({ type: 'toggleInspector' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.inspectorCollapsed).toBe(false);
    expect(result.snapshot.paletteCollapsed).toBe(false);
  });

  it('palette toggle does not affect inspector state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const paletteResult = adapter.execute({ type: 'togglePalette' });

    expect(paletteResult).toMatchObject({ ok: true });
    expect(paletteResult.snapshot.paletteCollapsed).toBe(true);
    expect(paletteResult.snapshot.inspectorCollapsed).toBe(false);

    const inspectorResult = adapter.execute({ type: 'toggleInspector' });

    expect(inspectorResult).toMatchObject({ ok: true });
    expect(inspectorResult.snapshot.paletteCollapsed).toBe(true);
    expect(inspectorResult.snapshot.inspectorCollapsed).toBe(true);
  });

  it('toggle commands return fresh snapshot', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const firstResult = adapter.execute({ type: 'togglePalette' });
    const secondResult = adapter.execute({ type: 'toggleInspector' });

    expect(firstResult.snapshot.paletteCollapsed).toBe(true);
    expect(firstResult.snapshot.inspectorCollapsed).toBe(false);
    expect(secondResult.snapshot.paletteCollapsed).toBe(true);
    expect(secondResult.snapshot.inspectorCollapsed).toBe(true);
  });

  it('rewires edges in one replace when inserting a chain node', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);
    const replaceSpy = vi.spyOn(core, 'replaceDocument');

    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'task-1',
      nodeType: 'task',
      data: { label: 'Inserted' },
    });

    expect(result.ok).toBe(true);
    expect(replaceSpy).toHaveBeenCalledTimes(1);

    const replacedDoc = replaceSpy.mock.calls[0]?.[0];
    expect(replacedDoc.edges.filter((edge) => edge.source === 'task-1')).toHaveLength(1);
    expect(replacedDoc.edges.filter((edge) => edge.target === 'end-1')).toHaveLength(1);
  });

  it('rewires incoming edges in one replace when inserting at a merge target', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);
    const replaceSpy = vi.spyOn(core, 'replaceDocument');

    const result = adapter.execute({
      type: 'insertChainNodeAtMerge',
      targetId: 'end-1',
      nodeType: 'task',
      data: { label: 'Merge insert' },
    });

    expect(result.ok).toBe(true);
    expect(replaceSpy).toHaveBeenCalledTimes(1);

    const replacedDoc = replaceSpy.mock.calls[0]?.[0];
    expect(replacedDoc.edges.filter((edge) => edge.target === 'end-1')).toHaveLength(1);
    expect(replacedDoc.edges.filter((edge) => edge.source === 'task-1')).toHaveLength(1);
  });

  it('rewires outgoing branch edges in one replace when inserting a branch pair', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);
    const replaceSpy = vi.spyOn(core, 'replaceDocument');

    const result = adapter.execute({
      type: 'insertBranchPair',
      sourceId: 'task-1',
      condNodeType: 'task',
      condData: { label: 'Condition' },
    });

    expect(result.ok).toBe(true);
    expect(replaceSpy).toHaveBeenCalledTimes(1);

    const replacedDoc = replaceSpy.mock.calls[0]?.[0];
    expect(replacedDoc.edges.filter((edge) => edge.source === 'task-1')).toHaveLength(2);
    expect(replacedDoc.edges.filter((edge) => edge.target === 'end-1')).toHaveLength(2);
  });

  it('deleteSelection removes the selected node and edge set in one transaction', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);
    const beginSpy = vi.spyOn(core, 'beginTransaction');
    const commitSpy = vi.spyOn(core, 'commitTransaction');

    core.setSelection(['start-1', 'task-1'], ['edge-2']);

    const result = adapter.execute({ type: 'deleteSelection' });

    expect(result).toMatchObject({ ok: true });
    expect(beginSpy).toHaveBeenCalledWith('delete-selection');
    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(result.snapshot.doc.nodes.map((node) => node.id)).toEqual(['end-1']);
    expect(result.snapshot.doc.edges).toEqual([]);
    expect(result.snapshot.selection.selectedNodeIds).toEqual([]);
    expect(result.snapshot.selection.selectedEdgeIds).toEqual([]);
  });

  it('deleteSelection falls back to unchanged when nothing is selected or active', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({ type: 'deleteSelection' });

    expect(result).toMatchObject({ ok: true, reason: 'unchanged' });
    expect(result.snapshot.doc.nodes).toHaveLength(3);
    expect(result.snapshot.doc.edges).toHaveLength(2);
  });
});

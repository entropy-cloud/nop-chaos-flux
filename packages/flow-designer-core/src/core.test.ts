import { describe, expect, it } from 'vitest';
import { createDesignerCore } from './core';
import type { DesignerConfig, GraphDocument } from './types';

function createTestDesignerConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start', description: '', config: '{}' },
        constraints: { maxInstances: 1 }
      },
      {
        id: 'task',
        label: 'Task',
        defaults: { label: 'Task', description: '', config: '{}' }
      },
      {
        id: 'end',
        label: 'End',
        defaults: { label: 'End', description: '', config: '{}' }
      }
    ],
    edgeTypes: [
      {
        id: 'default',
        label: 'Flow',
        defaults: { label: 'Flow', condition: '', lineStyle: 'solid' }
      }
    ],
    palette: {
      groups: [
        {
          id: 'basic',
          label: 'Basic',
          nodeTypes: ['start', 'task', 'end']
        }
      ]
    }
  };
}

function createTestDesignerConfigNoMultiEdge(): DesignerConfig {
  return {
    ...createTestDesignerConfig(),
    rules: {
      allowMultiEdge: false
    }
  };
}

function createBasicDocument(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'flow',
    name: 'Example',
    version: '1.0.0',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 10, y: 20 },
        data: { label: 'Start', description: 'Entry', config: '{}' }
      },
      {
        id: 'task-1',
        type: 'task',
        position: { x: 120, y: 60 },
        data: { label: 'Task', description: 'Do work', config: '{}' }
      }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  };
}

function createDocumentWithEdgeChain(): GraphDocument {
  return {
    ...createBasicDocument(),
    nodes: [
      ...createBasicDocument().nodes,
      {
        id: 'end-1',
        type: 'end',
        position: { x: 240, y: 120 },
        data: { label: 'End', description: 'Exit', config: '{}' }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        type: 'default',
        source: 'start-1',
        target: 'task-1',
        data: { label: 'Flow A', condition: '', lineStyle: 'solid' }
      },
      {
        id: 'edge-2',
        type: 'default',
        source: 'task-1',
        target: 'end-1',
        data: { label: 'Flow B', condition: '', lineStyle: 'solid' }
      }
    ]
  };
}

describe('createDesignerCore', () => {
  it('adds, updates, and deletes nodes through shared core state', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const added = core.addNode('end', { x: 200, y: 140 });
    expect(added).toMatchObject({ type: 'end', position: { x: 200, y: 140 } });
    expect(core.getSnapshot().doc.nodes).toHaveLength(3);

    core.updateNode('task-1', { label: 'Task Updated' });
    expect(core.getSnapshot().doc.nodes.find((node) => node.id === 'task-1')?.data.label).toBe('Task Updated');

    expect(added?.id).toBeTruthy();
    core.deleteNode(added!.id);
    expect(core.getSnapshot().doc.nodes).toHaveLength(2);
    expect(core.getSnapshot().doc.nodes.some((node) => node.id === added!.id)).toBe(false);
  });

  it('adds edges and supports undo/redo through the core history', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const added = core.addEdge('start-1', 'task-1');
    expect(added).toMatchObject({ source: 'start-1', target: 'task-1' });
    expect(core.getSnapshot().doc.edges).toHaveLength(1);
    expect(core.getSnapshot().canUndo).toBe(true);

    core.undo();
    expect(core.getSnapshot().doc.edges).toHaveLength(0);
    expect(core.getSnapshot().canRedo).toBe(true);

    core.redo();
    expect(core.getSnapshot().doc.edges).toHaveLength(1);
    expect(core.getSnapshot().doc.edges[0]).toMatchObject({ source: 'start-1', target: 'task-1' });
  });

  it('tracks dirty state, save, restore, and export through document state', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    expect(core.getSnapshot().isDirty).toBe(false);

    core.save();
    expect(core.getSnapshot().isDirty).toBe(false);

    core.addNode('end', { x: 220, y: 120 });
    expect(core.getSnapshot().isDirty).toBe(true);

    core.save();
    expect(core.getSnapshot().isDirty).toBe(false);

    core.updateNode('task-1', { label: 'Task Updated' });
    expect(core.getSnapshot().isDirty).toBe(true);

    core.restore();
    expect(core.getSnapshot().isDirty).toBe(false);
    expect(core.getSnapshot().doc.nodes.find((node) => node.id === 'task-1')?.data.label).toBe('Task');

    const exported = core.exportDocument();
    expect(exported).toContain('"name": "Example"');
    expect(exported).toContain('"nodes"');
  });

  it('rejects duplicate edges when allowMultiEdge is false', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfigNoMultiEdge());

    const duplicateEdge = core.addEdge('start-1', 'task-1');
    expect(duplicateEdge).toBeNull();
    expect(core.getSnapshot().doc.edges).toHaveLength(2);
  });

  it('allows duplicate edges when allowMultiEdge is true', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());

    const duplicateEdge = core.addEdge('start-1', 'task-1');
    expect(duplicateEdge).not.toBeNull();
    expect(core.getSnapshot().doc.edges).toHaveLength(3);
  });

  it('rejects self-loop edges when allowSelfLoop is false', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());

    const selfLoop = core.addEdge('task-1', 'task-1');
    expect(selfLoop).toBeNull();
    expect(core.getSnapshot().doc.edges).toHaveLength(2);
  });

  it('rejects edges that reference missing nodes', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const missingTarget = core.addEdge('task-1', 'missing-1');
    expect(missingTarget).toBeNull();
    expect(core.getSnapshot().doc.edges).toHaveLength(0);
  });

  it('supports reconnecting an edge through shared history and selection semantics', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig()) as typeof createDesignerCore extends (...args: any[]) => infer R ? R : never;

    core.selectEdge('edge-1');
    expect(typeof (core as any).reconnectEdge).toBe('function');

    const reconnected = (core as any).reconnectEdge('edge-1', 'start-1', 'end-1');
    expect(reconnected).toMatchObject({ ok: true });
    expect(core.getSnapshot().doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'end-1'
    });
    expect(core.getSnapshot().selection.activeEdgeId).toBe('edge-1');

    core.undo();
    expect(core.getSnapshot().doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'task-1'
    });

    core.redo();
    expect(core.getSnapshot().doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'end-1'
    });
  });

  it('treats unchanged reconnect as a no-op that preserves the selected edge', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig()) as typeof createDesignerCore extends (...args: any[]) => infer R ? R : never;

    core.selectEdge('edge-1');
    const before = core.getSnapshot();
    const reconnected = (core as any).reconnectEdge('edge-1', 'start-1', 'task-1');

    expect(reconnected).toMatchObject({ ok: true });
    expect(core.getSnapshot().selection.activeEdgeId).toBe('edge-1');
    expect(core.getSnapshot().doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'task-1'
    });
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
  });

  it('rejects invalid reconnect attempts without mutating edges', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfigNoMultiEdge()) as typeof createDesignerCore extends (...args: any[]) => infer R ? R : never;

    const unknown = (core as any).reconnectEdge('missing-edge', 'task-1', 'end-1');
    expect(unknown).toMatchObject({ ok: false });

    const duplicate = (core as any).reconnectEdge('edge-2', 'start-1', 'task-1');
    expect(duplicate).toMatchObject({ ok: false });

    const missingNode = (core as any).reconnectEdge('edge-1', 'start-1', 'missing-1');
    expect(missingNode).toMatchObject({ ok: false });

    const selfLoop = (core as any).reconnectEdge('edge-1', 'start-1', 'start-1');
    expect(selfLoop).toMatchObject({ ok: false });

    expect(core.getSnapshot().doc.edges.find((edge) => edge.id === 'edge-2')).toMatchObject({
      source: 'task-1',
      target: 'end-1'
    });
    expect(core.getSnapshot().doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'task-1'
    });
  });

  it('normalizes viewport updates and restores them through undo/redo', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.save();
    core.setViewport({ x: 12.6, y: 24.4, zoom: 1.26 });
    expect(core.getSnapshot().viewport).toEqual({ x: 13, y: 24, zoom: 1.3 });
    expect(core.getSnapshot().isDirty).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(true);

    core.undo();
    expect(core.getSnapshot().viewport).toEqual({ x: 0, y: 0, zoom: 1 });

    core.redo();
    expect(core.getSnapshot().viewport).toEqual({ x: 13, y: 24, zoom: 1.3 });
  });

  it('treats unchanged normalized viewport updates as a history no-op', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const before = core.getSnapshot();
    core.setViewport({ x: 0.2, y: 0.4, zoom: 1.04 });

    expect(core.getSnapshot().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
    expect(core.getSnapshot().canRedo).toBe(before.canRedo);
  });

  it('keeps viewport inside save and restore semantics', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.setViewport({ x: 15, y: 30, zoom: 1.2 });
    core.save();
    expect(core.getSnapshot().isDirty).toBe(false);

    core.setViewport({ x: 60, y: 90, zoom: 1.6 });
    expect(core.getSnapshot().viewport).toEqual({ x: 60, y: 90, zoom: 1.6 });
    expect(core.getSnapshot().isDirty).toBe(true);

    core.restore();
    expect(core.getSnapshot().viewport).toEqual({ x: 15, y: 30, zoom: 1.2 });
    expect(core.getSnapshot().isDirty).toBe(false);
  });

  it('updates multiple nodes immutably in a single pass', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());

    core.updateMultipleNodes([
      { nodeId: 'start-1', data: { position: { x: 25, y: 35 } } },
      { nodeId: 'task-1', data: { data: { label: 'Task Updated' } } }
    ]);

    const snapshot = core.getSnapshot();
    expect(snapshot.doc.nodes.find((node) => node.id === 'start-1')?.position).toEqual({ x: 25, y: 35 });
    expect(snapshot.doc.nodes.find((node) => node.id === 'task-1')?.data.label).toBe('Task Updated');
    expect(snapshot.isDirty).toBe(true);
  });

  it('moves multiple nodes while preserving non-movable constraints', () => {
    const core = createDesignerCore(createBasicDocument(), {
      ...createTestDesignerConfig(),
      nodeTypes: [
        {
          id: 'start',
          label: 'Start',
          defaults: { label: 'Start', description: '', config: '{}' },
          constraints: { allowMove: false }
        },
        {
          id: 'task',
          label: 'Task',
          defaults: { label: 'Task', description: '', config: '{}' }
        },
        {
          id: 'end',
          label: 'End',
          defaults: { label: 'End', description: '', config: '{}' }
        }
      ]
    });

    core.moveNodes({
      'start-1': { dx: 10, dy: 10 },
      'task-1': { dx: 15, dy: 20 }
    });

    const snapshot = core.getSnapshot();
    expect(snapshot.doc.nodes.find((node) => node.id === 'start-1')?.position).toEqual({ x: 10, y: 20 });
    expect(snapshot.doc.nodes.find((node) => node.id === 'task-1')?.position).toEqual({ x: 135, y: 80 });
  });
});

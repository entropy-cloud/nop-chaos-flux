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
});

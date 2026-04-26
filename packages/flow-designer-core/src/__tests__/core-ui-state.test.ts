import { describe, expect, it } from 'vitest';
import { createDesignerCore } from '../core';
import type { DesignerConfig, GraphDocument } from '../types';

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

describe('createDesignerCore - viewport and UI state', () => {
  it('normalizes viewport updates and restores them through undo/redo', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.save();
    core.setViewport({ x: 12.6, y: 24.4, zoom: 1.26 });
    expect(core.getSnapshot().viewport).toEqual({ x: 12.6, y: 24.4, zoom: 1.26 });
    expect(core.getSnapshot().isDirty).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(true);

    core.undo();
    expect(core.getSnapshot().viewport).toEqual({ x: 0, y: 0, zoom: 1 });

    core.redo();
    expect(core.getSnapshot().viewport).toEqual({ x: 12.6, y: 24.4, zoom: 1.26 });
  });

  it('treats unchanged normalized viewport updates as a history no-op', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const before = core.getSnapshot();
    core.setViewport({ x: 0.2, y: 0.4, zoom: 1.04 });

    expect(core.getSnapshot().viewport).toEqual({ x: 0.2, y: 0.4, zoom: 1.04 });
    expect(core.getSnapshot().canUndo).toBe(true);
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

  it('toggles palette collapsed state', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    expect(core.getSnapshot().paletteCollapsed).toBe(false);

    core.togglePalette();
    expect(core.getSnapshot().paletteCollapsed).toBe(true);

    core.togglePalette();
    expect(core.getSnapshot().paletteCollapsed).toBe(false);
  });

  it('toggles inspector collapsed state', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    expect(core.getSnapshot().inspectorCollapsed).toBe(false);

    core.toggleInspector();
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);

    core.toggleInspector();
    expect(core.getSnapshot().inspectorCollapsed).toBe(false);
  });

  it('sets palette collapsed with idempotent behavior', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const before = core.getSnapshot();
    core.setPaletteCollapsed(true);
    expect(core.getSnapshot().paletteCollapsed).toBe(true);

    core.setPaletteCollapsed(true);
    expect(core.getSnapshot().paletteCollapsed).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
    expect(core.getSnapshot().canRedo).toBe(before.canRedo);
  });

  it('sets inspector collapsed with idempotent behavior', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    const before = core.getSnapshot();
    core.setInspectorCollapsed(true);
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);

    core.setInspectorCollapsed(true);
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
    expect(core.getSnapshot().canRedo).toBe(before.canRedo);
  });

  it('restores palette when setting collapsed to false', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.setPaletteCollapsed(true);
    expect(core.getSnapshot().paletteCollapsed).toBe(true);

    core.setPaletteCollapsed(false);
    expect(core.getSnapshot().paletteCollapsed).toBe(false);

    core.setPaletteCollapsed(false);
    expect(core.getSnapshot().paletteCollapsed).toBe(false);
  });

  it('restores inspector when setting collapsed to false', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.setInspectorCollapsed(true);
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);

    core.setInspectorCollapsed(false);
    expect(core.getSnapshot().inspectorCollapsed).toBe(false);

    core.setInspectorCollapsed(false);
    expect(core.getSnapshot().inspectorCollapsed).toBe(false);
  });

  it('emits paletteCollapseChanged event with correct payload', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());
    const events: any[] = [];
    core.subscribe((e) => events.push(e));

    core.togglePalette();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('paletteCollapseChanged');
    expect(events[0].collapsed).toBe(true);

    events.length = 0;
    core.togglePalette();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('paletteCollapseChanged');
    expect(events[0].collapsed).toBe(false);
  });

  it('emits inspectorCollapseChanged event with correct payload', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());
    const events: any[] = [];
    core.subscribe((e) => events.push(e));

    core.toggleInspector();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('inspectorCollapseChanged');
    expect(events[0].collapsed).toBe(true);

    events.length = 0;
    core.toggleInspector();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('inspectorCollapseChanged');
    expect(events[0].collapsed).toBe(false);
  });

  it('collapse state does not affect undo/redo history', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.save();
    const before = core.getSnapshot();

    core.setPaletteCollapsed(true);
    expect(core.getSnapshot().paletteCollapsed).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
    expect(core.getSnapshot().canRedo).toBe(before.canRedo);
    expect(core.getSnapshot().isDirty).toBe(false);

    core.setInspectorCollapsed(true);
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
    expect(core.getSnapshot().canRedo).toBe(before.canRedo);
    expect(core.getSnapshot().isDirty).toBe(false);

    core.togglePalette();
    expect(core.getSnapshot().paletteCollapsed).toBe(false);
    expect(core.getSnapshot().canUndo).toBe(before.canUndo);
    expect(core.getSnapshot().canRedo).toBe(before.canRedo);
    expect(core.getSnapshot().isDirty).toBe(false);
  });

  it('toggles palette and inspector independently without affecting each other', () => {
    const core = createDesignerCore(createBasicDocument(), createTestDesignerConfig());

    core.togglePalette();
    expect(core.getSnapshot().paletteCollapsed).toBe(true);
    expect(core.getSnapshot().inspectorCollapsed).toBe(false);

    core.toggleInspector();
    expect(core.getSnapshot().paletteCollapsed).toBe(true);
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);

    core.setPaletteCollapsed(false);
    expect(core.getSnapshot().paletteCollapsed).toBe(false);
    expect(core.getSnapshot().inspectorCollapsed).toBe(true);

    core.setInspectorCollapsed(false);
    expect(core.getSnapshot().paletteCollapsed).toBe(false);
    expect(core.getSnapshot().inspectorCollapsed).toBe(false);
  });
});

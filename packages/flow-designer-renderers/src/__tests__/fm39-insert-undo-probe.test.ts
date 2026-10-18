import { describe, expect, it } from 'vitest';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from '../designer-command-adapter.js';

function createTestDesignerConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      { id: 'start', label: 'Start', defaults: { label: 'Start' }, constraints: { maxInstances: 1 } },
      { id: 'task', label: 'Task', defaults: { label: 'Task' } },
      { id: 'end', label: 'End', defaults: { label: 'End' }, constraints: { maxInstances: 1 } },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: { groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['start', 'task', 'end'] }] },
  };
}

function createDocument(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'flow',
    name: 'Example',
    version: '1.0.0',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'edge-1', type: 'default', source: 'start-1', target: 'end-1', data: {} },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  } as GraphDocument;
}

// FM-039 probe: palette insert ('addNode') must leave the core with a usable
// undo entry — the FM-1b walkthrough observed undoDisabled stuck at true after
// a palette insert while delete kept undo available.
describe('FM-039 palette insert undo probe', () => {
  it('palette addNode makes canUndo true', () => {
    const core = createDesignerCore(createDocument(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);
    expect(core.getSnapshot().canUndo).toBe(false);

    const result = adapter.execute({ type: 'addNode', nodeType: 'task', position: { x: 100, y: 0 } });
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().doc.nodes).toHaveLength(3);
    expect(core.getSnapshot().canUndo).toBe(true);
  });

  it('deleteNode makes canUndo true (walkthrough control)', () => {
    const core = createDesignerCore(createDocument(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({ type: 'deleteNode', nodeId: 'end-1' });
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().canUndo).toBe(true);
  });
});

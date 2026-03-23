import { describe, expect, it } from 'vitest';
import { createDesignerCore } from '../../flow-designer-core/src/index';
import type { DesignerConfig, GraphDocument } from '../../flow-designer-core/src/index';
import { createDesignerCommandAdapter } from './designer-command-adapter';

function createTestDesignerConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start' },
        constraints: { maxInstances: 1 }
      },
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
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['start', 'task', 'end'] }]
    }
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
      { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } }
    ],
    edges: [
      { id: 'edge-1', type: 'default', source: 'start-1', target: 'task-1', data: {} },
      { id: 'edge-2', type: 'default', source: 'task-1', target: 'end-1', data: {} }
    ],
    viewport: { x: 0, y: 0, zoom: 1 }
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
      target: 'end-1'
    });

    expect(success).toMatchObject({ ok: true, data: expect.objectContaining({ id: 'edge-1', target: 'end-1' }) });
    expect(success.snapshot.doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'end-1'
    });

    const failure = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-2',
      source: 'start-1',
      target: 'end-1'
    });

    expect(failure).toMatchObject({
      ok: false,
      reason: 'duplicate-edge',
      error: 'Duplicate edges are not supported in the playground example.'
    });
  });

  it('marks unchanged viewport updates without creating a failure result', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({
      type: 'setViewport',
      viewport: { x: 0.2, y: 0.4, zoom: 1.04 }
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
      position: { x: 144, y: 24 }
    });

    expect(moved).toMatchObject({ ok: true, data: expect.objectContaining({ id: 'task-1', position: { x: 144, y: 24 } }) });

    const unchanged = adapter.execute({
      type: 'moveNode',
      nodeId: 'task-1',
      position: { x: 144, y: 24 }
    });

    expect(unchanged).toMatchObject({ ok: true, reason: 'unchanged' });
  });
});

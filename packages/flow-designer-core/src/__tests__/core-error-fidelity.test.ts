import { describe, expect, it } from 'vitest';
import { createDesignerCore } from '../core.js';
import type { DesignerConfig, DesignerEvent, GraphDocument } from '../types.js';

function createTestDesignerConfig(overrides?: Partial<DesignerConfig>): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start' },
      },
      {
        id: 'task',
        label: 'Task',
        defaults: { label: 'Task' },
      },
    ],
    edgeTypes: [
      {
        id: 'default',
        label: 'Flow',
        defaults: {},
      },
    ],
    ...overrides,
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
        data: { label: 'Start' },
      },
      {
        id: 'task-1',
        type: 'task',
        position: { x: 120, y: 60 },
        data: { label: 'Task' },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function captureEvents(core: ReturnType<typeof createDesignerCore>) {
  const events: DesignerEvent[] = [];
  core.subscribe((event) => events.push(event));
  return events;
}

describe('createDesignerCore error fidelity', () => {
  it('preserves the original error thrown by beforeCreateNode hooks', () => {
    const originalError = new Error('node hook exploded');
    const core = createDesignerCore(
      createBasicDocument(),
      createTestDesignerConfig({
        hooks: {
          beforeCreateNode() {
            throw originalError;
          },
        },
      }),
    );
    const events = captureEvents(core);

    expect(core.addNode('task', { x: 20, y: 40 })).toBeNull();
    expect(events).toContainEqual({
      type: 'lifecycleHookError',
      hook: 'beforeCreateNode',
      error: originalError,
    });
  });

  it('preserves the original error thrown by beforeConnect hooks', () => {
    const originalError = new TypeError('edge hook exploded');
    const core = createDesignerCore(
      createBasicDocument(),
      createTestDesignerConfig({
        hooks: {
          beforeConnect() {
            throw originalError;
          },
        },
      }),
    );
    const events = captureEvents(core);

    expect(core.addEdge('start-1', 'task-1')).toBeNull();
    expect(events).toContainEqual({
      type: 'lifecycleHookError',
      hook: 'beforeConnect',
      error: originalError,
    });
  });

  it('preserves original delete-hook errors for both node and edge paths', () => {
    const originalError = new Error('delete hook exploded', { cause: { source: 'host' } });
    const doc = {
      ...createBasicDocument(),
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'start-1',
          target: 'task-1',
          data: {},
        },
      ],
    } satisfies GraphDocument;
    const core = createDesignerCore(
      doc,
      createTestDesignerConfig({
        hooks: {
          beforeDelete() {
            throw originalError;
          },
        },
      }),
    );
    const events = captureEvents(core);

    core.deleteNode('task-1');
    core.deleteEdge('edge-1');

    expect(
      events.filter((event) => event.type === 'lifecycleHookError').map((event) => event.error),
    ).toEqual([originalError, originalError]);
  });
});

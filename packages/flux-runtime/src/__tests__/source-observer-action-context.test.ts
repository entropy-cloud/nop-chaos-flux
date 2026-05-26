import { describe, expect, it, vi } from 'vitest';
import { createSourceObserver } from '../async-data/source-observer.js';

function createActionScope(id: string) {
  return {
    id,
    resolve: vi.fn(),
    registerNamespace: vi.fn(() => () => undefined),
    unregisterNamespace: vi.fn(),
    listNamespaces: vi.fn(() => []),
  };
}

function createComponentRegistry(id: string) {
  return {
    id,
    register: vi.fn(() => () => undefined),
    unregister: vi.fn(),
    resolve: vi.fn(),
  };
}

describe('source observer action context', () => {
  it('forwards caller action context while adding an abort signal', async () => {
    const executeSource = vi.fn().mockResolvedValue({ ok: true, data: 1 });
    const observer = createSourceObserver({ executeSource } as any);
    const scope = { id: 'scope-1', path: '$scope' } as any;
    const ctx = {
      actionScope: createActionScope('action-scope'),
      componentRegistry: createComponentRegistry('registry'),
      evaluationBindings: { source: 'renderer' },
    };

    observer.run({
      scope,
      ctx,
      entries: [{ key: 'value', source: { type: 'source', action: 'loadItems' } as never }],
    });

    await vi.waitFor(() => {
      expect(executeSource).toHaveBeenCalledWith({
        source: { type: 'source', action: 'loadItems' },
        scope,
        ctx: expect.objectContaining({
          actionScope: ctx.actionScope,
          componentRegistry: ctx.componentRegistry,
          evaluationBindings: ctx.evaluationBindings,
          signal: expect.any(AbortSignal),
        }),
      });
    });

    observer.dispose();
  });
});

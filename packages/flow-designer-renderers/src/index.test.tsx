import { describe, expect, it } from 'vitest';
import { createDesignerActionProvider } from './index';

describe('createDesignerActionProvider', () => {
  it('maps designer namespace methods to core commands', async () => {
    const core = {
      addNode: (type: string, position: { x: number; y: number }, data?: Record<string, unknown>) => ({ id: 'n1', type, position, data }),
      clearSelection: () => undefined,
      selectNode: () => undefined,
      selectEdge: () => undefined,
      deleteNode: () => undefined,
      deleteEdge: () => undefined,
      duplicateNode: () => ({ id: 'n2' }),
      updateNode: () => undefined,
      updateEdge: () => undefined,
      exportDocument: () => '{"ok":true}',
      undo: () => undefined,
      redo: () => undefined,
      toggleGrid: () => undefined,
      save: () => undefined,
      restore: () => undefined
    } as any;

    const provider = createDesignerActionProvider(core);
    const addResult = await provider.invoke('addNode', { nodeType: 'task', position: { x: 1, y: 2 } }, {} as any);
    const exportResult = await provider.invoke('export', undefined, {} as any);

    expect(addResult).toMatchObject({ ok: true, data: expect.objectContaining({ type: 'task' }) });
    expect(exportResult).toMatchObject({ ok: true, data: '{"ok":true}' });
  });
});

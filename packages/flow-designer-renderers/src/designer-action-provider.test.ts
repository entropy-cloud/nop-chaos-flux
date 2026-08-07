import { describe, expect, it, vi } from 'vitest';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerActionProvider } from './designer-action-provider.js';

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

function createDocument(): GraphDocument {
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
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function createHarness() {
  const core = createDesignerCore(createDocument(), createTestDesignerConfig());
  const provider = createDesignerActionProvider(core);
  return { core, provider };
}

describe('createDesignerActionProvider - setPanelWidths NaN rejection (15-2)', () => {
  it('rejects paletteWidth NaN with {ok:false, reason:"invalid-width"} and does not call setPaletteWidth', () => {
    const { core, provider } = createHarness();
    const setPaletteWidthSpy = vi.spyOn(core, 'setPaletteWidth');

    const result = provider.invoke(
      'setPanelWidths',
      { paletteWidth: NaN },
      { runtime: { env: { notify: vi.fn() } } } as never,
    );

    expect(result.ok).toBe(false);
    expect((result as { reason?: string }).reason).toBe('invalid-width');
    expect(setPaletteWidthSpy).not.toHaveBeenCalled();
    expect(core.getSnapshot().paletteWidth).toBe(240);
  });

  it('rejects inspectorWidth NaN with {ok:false, reason:"invalid-width"} and does not call setInspectorWidth', () => {
    const { core, provider } = createHarness();
    const setInspectorWidthSpy = vi.spyOn(core, 'setInspectorWidth');

    const result = provider.invoke(
      'setPanelWidths',
      { inspectorWidth: NaN },
      { runtime: { env: { notify: vi.fn() } } } as never,
    );

    expect(result.ok).toBe(false);
    expect((result as { reason?: string }).reason).toBe('invalid-width');
    expect(setInspectorWidthSpy).not.toHaveBeenCalled();
    expect(core.getSnapshot().inspectorWidth).toBe(352);
  });

  it('accepts finite widths and leaves partial updates intact', () => {
    const { core, provider } = createHarness();
    const result = provider.invoke(
      'setPanelWidths',
      { paletteWidth: 300 },
      { runtime: { env: { notify: vi.fn() } } } as never,
    );
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().paletteWidth).toBe(300);
  });
});

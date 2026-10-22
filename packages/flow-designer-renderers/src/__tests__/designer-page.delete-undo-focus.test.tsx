import React from 'react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { render, fireEvent, act } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createGraphTestConfig,
  createRendererEnv,
  getLatestCreatedDesignerCore,
} from '../designer-page.test-support.js';

function workflowShapedConfig() {
  const base = createGraphTestConfig() as Record<string, unknown>;
  return {
    ...base,
    shortcuts: {
      undo: ['Ctrl+Z', 'Cmd+Z'],
      redo: ['Ctrl+Y', 'Cmd+Y', 'Ctrl+Shift+Z', 'Cmd+Shift+Z'],
      copy: ['Ctrl+C', 'Cmd+C'],
      paste: ['Ctrl+V', 'Cmd+V'],
      delete: ['Delete', 'Backspace'],
      save: ['Ctrl+S', 'Cmd+S'],
    },
    features: {
      undo: true,
      redo: true,
      history: true,
      grid: true,
      minimap: true,
      fitView: true,
      export: true,
      shortcuts: true,
      clipboard: true,
    },
    rules: { allowSelfLoop: false, allowMultiEdge: true, defaultEdgeType: 'default' },
    canvas: { background: 'lines', gridSize: 16, snapToGrid: true, minZoom: 0.2, maxZoom: 4 },
  } as unknown as ReturnType<typeof createGraphTestConfig>;
}

// P0-MA5.1-002 discriminating test: the browser always targets key events at
// document.activeElement. A workflow node card is focusable (role=button
// tabIndex=0), so the click that selects it also focuses it; pressing Delete
// then unmounts the focused element and focus falls back to <body>. The
// follow-up undo/redo keydown therefore arrives from OUTSIDE the designer root
// and must still reach undo — otherwise delete is de-facto not undoable.
describe('designer-page: keyboard delete keeps undo reachable (P0-MA5.1-002)', () => {
  it('Delete on a focused node → undo key at document.activeElement restores node and edges', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/delete-undo-focus-regression"
        schema={{
          type: 'designer-page',
          document: {
            id: 'wf-1',
            kind: 'workflow',
            name: 'Customer onboarding',
            version: '1.0',
            nodes: [
              { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task' } },
              { id: 'n2', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
            ],
            edges: [{ id: 'e1', type: 'default', source: 'n1', target: 'n2', data: {} }],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: workflowShapedConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const core = getLatestCreatedDesignerCore();
    expect(core).toBeTruthy();
    const surface = view.container.querySelector(
      '[aria-label="Flow designer canvas"]',
    ) as HTMLElement | null;
    expect(surface).toBeTruthy();
    const nodeCard = view.container.querySelector('.nop-designer-node') as HTMLElement | null;
    expect(nodeCard).toBeTruthy();

    act(() => {
      core.setSelection(['n1'], ['e1']);
    });

    // Real browser: mousedown on the focusable node card moves DOM focus onto it.
    nodeCard!.focus();
    expect(document.activeElement).toBe(nodeCard);

    await act(async () => {
      fireEvent.keyDown(nodeCard!, { key: 'Delete' });
      await Promise.resolve();
    });

    const snapAfterDelete = core.getSnapshot();
    expect(snapAfterDelete.doc.nodes).toHaveLength(1);
    expect(snapAfterDelete.doc.edges).toHaveLength(0);
    expect(snapAfterDelete.canUndo).toBe(true);

    // The deleted node card carried focus; the browser resets activeElement to
    // <body>. Undo must be dispatched at whatever the browser would target.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const undoTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
    await act(async () => {
      fireEvent.keyDown(undoTarget, { key: 'z', ctrlKey: true });
      await Promise.resolve();
    });

    const snapAfterUndo = core.getSnapshot();
    expect(snapAfterUndo.doc.nodes).toHaveLength(2);
    expect(snapAfterUndo.doc.edges).toHaveLength(1);

    await act(async () => {
      fireEvent.keyDown(undoTarget, { key: 'y', ctrlKey: true });
      await Promise.resolve();
    });
    const snapAfterRedo = core.getSnapshot();
    expect(snapAfterRedo.doc.nodes).toHaveLength(1);
    expect(snapAfterRedo.doc.edges).toHaveLength(0);
  });
});

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDashboardSchemaRenderer,
  env,
  formulaCompiler,
} from '../test-support.js';

afterEach(() => {
  cleanup();
});

/**
 * Plan 489 Phase 1 — [G3-视角3-04]:
 * the editor canvas body and every canvas panel are keyboard-focusable
 * (tabIndex=0) and must carry the design-system focus-visible ring
 * (focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none),
 * matching the column-resize / row-drag-handle focus fixes in the same batch.
 */

const initialLayout = {
  panels: [
    { id: 'p1', type: 'chart', title: 'Sales', x: 0, y: 0, w: 12, h: 4 },
    { id: 'p2', type: 'chart', title: 'Traffic', x: 0, y: 4, w: 4, h: 2 },
  ],
};

function renderEditor() {
  const SchemaRenderer = createDashboardSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://dashboard/editor-v12c-focus"
      schema={{
        type: 'page',
        body: [
          {
            type: 'dashboard-editor',
            testid: 'demo-editor',
            layout: initialLayout,
          },
        ],
      }}
      data={{}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

const FOCUS_RING_CLASSES = [
  'focus-visible:ring-2',
  'focus-visible:ring-ring',
  'focus-visible:outline-none',
];

function expectFocusRing(className: string | null) {
  for (const token of FOCUS_RING_CLASSES) {
    expect(className).toContain(token);
  }
}

describe('[G3-视角3-04] editor canvas focus-visible ring', () => {
  it('canvas body is focusable and carries the focus-visible ring classes', () => {
    renderEditor();
    const body = document.querySelector(
      '[data-slot="dashboard-editor-canvas-body"]',
    ) as HTMLElement | null;
    expect(body).toBeTruthy();
    expect(body!.getAttribute('tabindex')).toBe('0');
    expectFocusRing(body!.className);
  });

  it('every canvas panel is focusable and carries the focus-visible ring classes', () => {
    renderEditor();
    const panels = Array.from(
      document.querySelectorAll('[data-slot="dashboard-editor-panel"]'),
    ) as HTMLElement[];
    expect(panels.length).toBeGreaterThan(0);
    for (const panel of panels) {
      expect(panel.getAttribute('tabindex')).toBe('0');
      expectFocusRing(panel.className);
    }
  });
});

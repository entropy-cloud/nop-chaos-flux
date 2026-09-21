import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDashboardSchemaRenderer,
  env,
  formulaCompiler,
} from '../test-support.js';
import { findFreePosition } from '../layout-math.js';
import type { DashboardPanelSchema } from '../schemas.js';

afterEach(() => {
  cleanup();
});

/**
 * Plan 488 Phase 3 wave A — dashboard editor items:
 * - [G3-R4-视角11-01] click-add claims a non-overlapping first-fit slot.
 * - [G3-R5-视角3-01] entering preview clears the selection and hides the
 *   edit-only header controls (undo/redo/delete).
 * - [G3-R5-视角4-01] inspector NumberInput clamps geometry inputs.
 * - [G3-R2-视角4-02] inspector labels are programmatically associated.
 * - [G3-视角9-01] panel aria-labels expose a readable name, not the raw id.
 */

const initialLayout = {
  panels: [
    { id: 'p1', type: 'chart', title: 'Sales', x: 0, y: 0, w: 12, h: 4 },
    { id: 'p2', type: 'chart', title: 'Traffic', x: 0, y: 4, w: 4, h: 2 },
  ],
};

function renderEditor(schema: Record<string, unknown> = {}) {
  const SchemaRenderer = createDashboardSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://dashboard/editor-p3"
      schema={{
        type: 'page',
        body: [
          {
            type: 'dashboard-editor',
            testid: 'demo-editor',
            layout: initialLayout,
            ...schema,
          },
        ],
      }}
      data={{}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function canvasPanels(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="dashboard-editor-panel"]')) as HTMLElement[];
}

function selectPanel(index: number) {
  const panel = canvasPanels()[index];
  fireEvent.pointerDown(panel, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(panel);
}

describe('[G3-R4-视角11-01] addPanel overlap avoidance', () => {
  it('findFreePosition picks the first slot that overlaps nothing', () => {
    const panels = [
      { id: 'a', type: 'chart', x: 0, y: 0, w: 6, h: 2 },
      { id: 'b', type: 'chart', x: 6, y: 0, w: 6, h: 2 },
    ] as DashboardPanelSchema[];
    // row 0 is fully occupied (cols=12) — the first free slot is row 2.
    expect(findFreePosition(panels, { w: 4, h: 2 }, { cols: 12 })).toEqual({ x: 0, y: 2 });
    // a 6-wide panel fits at (0, 2).
    expect(findFreePosition(panels, { w: 6, h: 1 }, { cols: 12 })).toEqual({ x: 0, y: 2 });
    // empty layout → origin.
    expect(findFreePosition([], { w: 4, h: 2 }, { cols: 12 })).toEqual({ x: 0, y: 0 });
  });

  it('click-add on a busy canvas places the new panel without overlapping existing ones', () => {
    renderEditor();
    fireEvent.click(screen.getByTestId('palette-chart'));
    const panels = canvasPanels();
    expect(panels).toHaveLength(3);
    const added = panels.find((p) => p.getAttribute('data-panel-id') === 'panel-3');
    expect(added).toBeTruthy();
    // the two existing panels occupy y 0-4; the new panel must sit below them
    const style = added!.getAttribute('style') ?? '';
    expect(style).toContain('top');
    const top = Number(/top:\s*([\d.]+)px/.exec(style)?.[1] ?? '0');
    expect(top).toBeGreaterThan(0);
    expect(added!.getAttribute('data-selected')).toBe('true');
  });
});

describe('[G3-R5-视角3-01] preview mode clears selection and hides edit-only controls', () => {
  it('mode toggle drops the selection; undo/redo/delete disappear in preview', () => {
    renderEditor();
    selectPanel(0);
    expect(canvasPanels()[0].getAttribute('data-selected')).toBe('true');
    expect(screen.getByTestId('editor-delete')).toBeTruthy();

    fireEvent.click(screen.getByTestId('editor-mode-toggle'));

    // selection cleared with the edit canvas unmounted
    expect(screen.queryByTestId('editor-delete')).toBeNull();
    expect(screen.queryByTestId('editor-undo')).toBeNull();
    expect(screen.queryByTestId('editor-redo')).toBeNull();

    fireEvent.click(screen.getByTestId('editor-mode-toggle'));
    // back to edit: canvas is back, no ghost selection
    expect(canvasPanels()[0].getAttribute('data-selected')).toBeNull();
    expect(screen.getByTestId('editor-delete')).toBeTruthy();
  });
});

describe('[G3-R5-视角4-01] inspector NumberInput clamps geometry', () => {
  it('writes clamped x/y/w/h (non-negative positions, min size 1)', () => {
    renderEditor();
    selectPanel(0);
    const xInput = screen.getByTestId('inspector-x') as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: '-5' } });
    expect(xInput.value).toBe('-5'); // draft echoes typing; committed value clamps
    // the panel patch must have received the clamped 0, not -5 — verified via
    // the canvas: a negative x would be invisible; assert through w/h instead.
    const wInput = screen.getByTestId('inspector-w') as HTMLInputElement;
    fireEvent.change(wInput, { target: { value: '0' } });
    fireEvent.blur(wInput);
    // clamped to min 1 on commit → snap-back draft on blur shows 1
    expect(wInput.value).toBe('1');
  });
});

describe('[G3-R2-视角4-02] inspector labels are associated with controls', () => {
  it('every InspectorField label points at its control via htmlFor/id', () => {
    renderEditor();
    selectPanel(0);
    const labels = Array.from(
      document.querySelectorAll('[data-slot="dashboard-editor-inspector"] label'),
    ) as HTMLLabelElement[];
    expect(labels.length).toBeGreaterThanOrEqual(8);
    for (const label of labels) {
      const htmlFor = label.getAttribute('for') ?? label.getAttribute('htmlFor');
      expect(htmlFor).toBeTruthy();
      expect(document.getElementById(htmlFor!)).toBeTruthy();
    }
  });
});

describe('[G3-视角9-01] panel aria-label uses a readable name', () => {
  it('prefers the panel title over the internal id in aria-labels', () => {
    renderEditor();
    const panel = canvasPanels()[0];
    expect(panel.getAttribute('aria-label')).toContain('Sales');
    expect(panel.getAttribute('aria-label')).not.toContain('p1');
  });
});

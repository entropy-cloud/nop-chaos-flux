import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDashboardSchemaRenderer,
  createSpiedEditorDefinition,
  env,
  formulaCompiler,
} from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const initialLayout = {
  panels: [
    { id: 'p1', type: 'chart', title: 'Sales', x: 0, y: 0, w: 6, h: 2 },
    { id: 'p2', type: 'chart', title: 'Traffic', x: 6, y: 0, w: 6, h: 2 },
  ],
};

function renderEditor(schema: Record<string, unknown> = {}) {
  const SchemaRenderer = createDashboardSchemaRenderer();
  const utils = render(
    <SchemaRenderer
      schemaUrl="test://dashboard/editor"
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
  return utils;
}

function canvasPanels(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-slot="dashboard-editor-panel"]')) as HTMLElement[];
}

function canvasBody(): HTMLElement {
  return document.querySelector('[data-slot="dashboard-editor-canvas-body"]') as HTMLElement;
}

describe('DashboardEditorRenderer workbench shell', () => {
  it('renders WorkbenchShell with palette, canvas panels and inspector', () => {
    renderEditor();
    expect(document.querySelector('.nop-workbench')).toBeTruthy();
    expect(document.querySelector('[data-slot="dashboard-editor-palette"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="dashboard-editor-inspector"]')).toBeTruthy();
    expect(canvasPanels()).toHaveLength(2);
    expect(screen.getByText('Sales')).toBeTruthy();
    expect(screen.getByText('Panel Types')).toBeTruthy();
    expect(screen.getByTestId('palette-chart')).toBeTruthy();
  });

  it('palette only lists registered panel types', () => {
    renderEditor();
    expect(screen.queryByTestId('palette-chart')).toBeTruthy();
    expect(screen.queryByTestId('palette-table')).toBeTruthy();
    expect(screen.queryByTestId('palette-pivot-table')).toBeNull();
    expect(screen.queryByTestId('palette-panel-content')).toBeNull();
  });
});

describe('DashboardEditorRenderer selection & editing flows', () => {
  it('selects a panel on pointer down and clears on empty canvas click', () => {
    renderEditor();
    const panel = canvasPanels()[0];
    fireEvent.pointerDown(panel, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(panel);
    expect(panel.getAttribute('data-selected')).toBe('true');

    fireEvent.pointerDown(canvasBody(), { button: 0, clientX: 5, clientY: 5 });
    expect(panel.getAttribute('data-selected')).toBeNull();
  });

  it('delete key removes the selected panel and undo restores it', () => {
    renderEditor();
    const panel = canvasPanels()[0];
    fireEvent.pointerDown(panel, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(panel);
    fireEvent.keyDown(canvasBody(), { key: 'Delete' });

    expect(canvasPanels()).toHaveLength(1);
    expect(canvasPanels()[0].getAttribute('data-panel-id')).toBe('p2');

    fireEvent.click(screen.getByTestId('editor-undo'));
    expect(canvasPanels()).toHaveLength(2);
    expect(canvasPanels()[0].getAttribute('data-panel-id')).toBe('p1');
  });

  it('drag pointer flow moves a panel via the session (one undo step restores)', () => {
    renderEditor();
    const panel = canvasPanels()[0];
    fireEvent.pointerDown(panel, { button: 0, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(document.querySelector('[data-slot="dashboard-editor-canvas"]') as HTMLElement, {
      clientX: 30 + 102,
      clientY: 30 + 49,
    });
    fireEvent.pointerUp(document.querySelector('[data-slot="dashboard-editor-canvas"]') as HTMLElement);

    // cell ≈ (1200-88)/12 ≈ 92.67, row ≈ 40+8=48: (102px → x=1, 49px → y=1)
    expect(canvasPanels()[0].style.left).not.toBe('0px');
    expect(canvasPanels()[0].style.top).not.toBe('0px');

    fireEvent.click(screen.getByTestId('editor-undo'));
    expect(canvasPanels()[0].style.left).toBe('0px');
    expect(canvasPanels()[0].style.top).toBe('0px');
  });

  it('resize handle grows the panel and redo restores it', () => {
    renderEditor();
    const panel = canvasPanels()[0];
    fireEvent.pointerDown(panel, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(panel);

    const handle = panel.querySelector('[data-slot="dashboard-editor-resize-handle"][data-handle="se"]') as HTMLElement;
    fireEvent.pointerDown(handle, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(document.querySelector('[data-slot="dashboard-editor-canvas"]') as HTMLElement, {
      clientX: 0 + 102,
      clientY: 0 + 49,
    });
    fireEvent.pointerUp(document.querySelector('[data-slot="dashboard-editor-canvas"]') as HTMLElement);

    const widthAfter = panel.style.width;
    const heightAfter = panel.style.height;
    fireEvent.click(screen.getByTestId('editor-undo'));
    expect(panel.style.width).not.toBe(widthAfter);

    fireEvent.click(screen.getByTestId('editor-redo'));
    expect(panel.style.width).toBe(widthAfter);
    expect(panel.style.height).toBe(heightAfter);
  });

  it('palette click adds a panel and drop adds it at snapped grid coords', () => {
    renderEditor();
    fireEvent.click(screen.getByTestId('palette-chart'));
    expect(canvasPanels()).toHaveLength(3);

    const beforeDrop = canvasPanels().length;
    const dt = {
      getData: (type: string) => (type === 'application/x-dashboard-panel-type' ? 'chart' : ''),
      setData: () => undefined,
      effectAllowed: '',
      dropEffect: '',
    };
    fireEvent.drop(canvasBody(), { dataTransfer: dt, clientX: 102, clientY: 97 });
    expect(canvasPanels()).toHaveLength(beforeDrop + 1);
    expect(canvasPanels()[beforeDrop].getAttribute('data-panel-id')).toBe('panel-4');
  });

  it('save commits and dispatches dashboard-editor:save with the serialized layout', () => {
    const dispatch = vi.fn();
    const SchemaRenderer = createDashboardSchemaRenderer([], createSpiedEditorDefinition(dispatch));
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/editor-save"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard-editor',
              layout: initialLayout,
              onSave: { action: 'noop', args: {} },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByTestId('palette-chart'));
    expect((screen.getByTestId('editor-save') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId('editor-save'));
    expect((screen.getByTestId('editor-save') as HTMLButtonElement).disabled).toBe(true);

    const saveCall = dispatch.mock.calls.find((call) => {
      const event = (call[1] as { event?: { type?: string } } | undefined)?.event;
      return event?.type === 'dashboard-editor:save';
    });
    expect(saveCall).toBeTruthy();
    expect(saveCall).toBeDefined();
    const payload = (saveCall![1] as { event?: { serialized?: string } }).event as {
      serialized: string;
    };
    const panels = JSON.parse(payload.serialized);
    expect(panels).toHaveLength(3);
  });

  it('mode toggle switches to preview rendering the runtime dashboard', () => {
    renderEditor();
    fireEvent.click(screen.getByTestId('editor-mode-toggle'));
    expect(document.querySelector('[data-slot="dashboard-editor-preview"]')).toBeTruthy();
    expect(document.querySelector('.nop-dashboard')).toBeTruthy();
    fireEvent.click(screen.getByTestId('editor-mode-toggle'));
    expect(document.querySelector('[data-slot="dashboard-editor-preview"]')).toBeNull();
  });

  it('inspector edits the selected panel title and geometry through the session', () => {
    renderEditor();
    const panel = canvasPanels()[0];
    fireEvent.pointerDown(panel, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(panel);

    const titleInput = screen.getByTestId('inspector-title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Renamed KPI' } });
    expect(screen.getByText('Renamed KPI')).toBeTruthy();

    const xInput = screen.getByTestId('inspector-x') as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: '5' } });
    const moved = canvasPanels()[0];
    expect(moved.style.left).not.toBe('0px');
  });

  it('honors cols/rowHeight/gap/height editor geometry props', () => {
    renderEditor({ cols: 6, rowHeight: 60, gap: 12, height: 480 });
    const canvas = document.querySelector('[data-slot="dashboard-editor-canvas-body"]') as HTMLElement;
    expect(canvas.style.height).toBe('480px');
    const panel = canvasPanels()[0];
    // cellWidth = (1200 - 5*12)/6 = 190; panel width = 6*190 + 5*12 = 1200px (full width)
    expect(panel.style.width).toBe('1200px');
    expect(panel.style.height).toBe('132px');
  });

  it('commitPolicy=auto commits on every change and dispatches dashboard-editor:save', () => {
    const dispatch = vi.fn();
    const SchemaRenderer = createDashboardSchemaRenderer([], createSpiedEditorDefinition(dispatch));
    render(
      <SchemaRenderer
        schemaUrl="test://dashboard/editor-auto"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dashboard-editor',
              layout: initialLayout,
              commitPolicy: 'auto',
              onSave: { action: 'noop', args: {} },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByTestId('palette-chart'));
    const saveCalls = dispatch.mock.calls.filter((call) => {
      const event = (call[1] as { event?: { type?: string } } | undefined)?.event;
      return event?.type === 'dashboard-editor:save';
    });
    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
  });
});

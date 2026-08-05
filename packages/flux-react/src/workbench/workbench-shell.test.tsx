import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WorkbenchShell } from './workbench-shell.js';

// jsdom does not implement Pointer Capture; stub the relevant Element methods
// so pointer-event-driven resize is testable.
beforeAll(() => {
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

describe('WorkbenchShell', () => {
  it('renders header, canvas, dialogs, and expanded panels', () => {
    render(
      <WorkbenchShell
        data-testid="wb"
        header={<div>Header</div>}
        leftPanel={<div>Left</div>}
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
        dialogs={<div>Dialogs</div>}
      />,
    );

    expect(screen.getByTestId('wb')).toBeTruthy();
    expect(screen.getByText('Header')).toBeTruthy();
    expect(screen.getByText('Canvas')).toBeTruthy();
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('Right')).toBeTruthy();
    expect(screen.getByText('Dialogs')).toBeTruthy();
    expect(screen.getByTestId('left-panel-expanded')).toBeTruthy();
    expect(screen.getByTestId('right-panel-expanded')).toBeTruthy();
  });

  it('expands collapsed rails from the whole rail surface', () => {
    const onLeftToggle = vi.fn();
    const onRightToggle = vi.fn();
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftCollapsed={true}
        onLeftToggle={onLeftToggle}
        leftLabel="Open left"
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
        rightCollapsed={true}
        onRightToggle={onRightToggle}
        rightLabel="Open right"
      />,
    );

    fireEvent.click(screen.getByTestId('left-panel-collapsed'));
    fireEvent.click(screen.getByTestId('right-panel-collapsed'));
    expect(onLeftToggle).toHaveBeenCalled();
    expect(onRightToggle).toHaveBeenCalled();
    expect(screen.getByTestId('left-panel-collapsed')).toBeTruthy();
    expect(screen.getByTestId('right-panel-collapsed')).toBeTruthy();
    expect(screen.getByLabelText('Open left')).toBeTruthy();
    expect(screen.getByLabelText('Open right')).toBeTruthy();
  });

  it('renders canvas-only layout without side panels', () => {
    render(<WorkbenchShell canvas={<div>Solo</div>} className="extra" />);
    expect(screen.getByText('Solo')).toBeTruthy();
    expect(screen.queryByTestId('left-panel-expanded')).toBeNull();
    expect(screen.queryByTestId('left-panel-collapsed')).toBeNull();
    expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
    expect(screen.queryByTestId('right-panel-collapsed')).toBeNull();
  });

  it('keeps the canvas primary on narrow viewports when both sides exist', () => {
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
      />,
    );

    const body = screen.getByTestId('workbench-body');
    expect(body.className).toContain('max-[1023px]:grid-cols-[15rem_minmax(0,1fr)]');
    expect(body.className).toContain('max-[1023px]:[&>*:nth-child(3)]:hidden');
    expect(body.className).toContain('max-[767px]:grid-cols-1');
    expect(body.className).toContain('max-[767px]:[&>*:first-child]:hidden');
  });
});

afterEach(() => {
  cleanup();
});

describe('WorkbenchShell resizable panels', () => {
  it('renders resize handles with the separator a11y contract when resizable', () => {
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftResizable
        leftWidth={240}
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
        rightResizable
        rightWidth={352}
      />,
    );

    const leftHandle = screen.getByTestId('left-resize-handle');
    expect(leftHandle.getAttribute('data-slot')).toBe('workbench-resize-handle');
    expect(leftHandle.getAttribute('role')).toBe('separator');
    expect(leftHandle.getAttribute('aria-orientation')).toBe('vertical');
    expect(leftHandle.getAttribute('aria-valuenow')).toBe('240');
    expect(leftHandle.getAttribute('aria-valuemin')).toBe('200');
    expect(leftHandle.getAttribute('aria-valuemax')).toBe('600');

    const rightHandle = screen.getByTestId('right-resize-handle');
    expect(rightHandle.getAttribute('data-slot')).toBe('workbench-resize-handle');
    expect(rightHandle.getAttribute('role')).toBe('separator');
    expect(rightHandle.getAttribute('aria-orientation')).toBe('vertical');
    expect(rightHandle.getAttribute('aria-valuenow')).toBe('352');
  });

  it('pointer drag widens the left panel and clamps to max', () => {
    const onLeftWidthChange = vi.fn();
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftResizable
        leftWidth={240}
        leftMinWidth={200}
        leftMaxWidth={300}
        onLeftWidthChange={onLeftWidthChange}
        canvas={<div>Canvas</div>}
      />,
    );

    const handle = screen.getByTestId('left-resize-handle');
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 250, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 250, pointerId: 1 });
    // 240 + 150 = 390 → clamped to max 300.
    expect(onLeftWidthChange).toHaveBeenLastCalledWith(300);
  });

  it('pointer drag clamps to min when dragging left', () => {
    const onLeftWidthChange = vi.fn();
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftResizable
        leftWidth={240}
        leftMinWidth={200}
        leftMaxWidth={300}
        onLeftWidthChange={onLeftWidthChange}
        canvas={<div>Canvas</div>}
      />,
    );

    const handle = screen.getByTestId('left-resize-handle');
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 0, pointerId: 1 });
    // 240 - 100 = 140 → clamped to min 200.
    expect(onLeftWidthChange).toHaveBeenLastCalledWith(200);
  });

  it('inverts drag direction for the right panel', () => {
    const onRightWidthChange = vi.fn();
    render(
      <WorkbenchShell
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
        rightResizable
        rightWidth={352}
        rightMinWidth={200}
        rightMaxWidth={500}
        onRightWidthChange={onRightWidthChange}
      />,
    );

    const handle = screen.getByTestId('right-resize-handle');
    // Dragging left (negative dx) on the right panel WIDENS it.
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 0, pointerId: 1 });
    expect(onRightWidthChange).toHaveBeenLastCalledWith(452);
  });

  it('reports intermediate widths on a single pointer drag', () => {
    const onLeftWidthChange = vi.fn();
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftResizable
        leftWidth={240}
        leftMinWidth={200}
        leftMaxWidth={600}
        onLeftWidthChange={onLeftWidthChange}
        canvas={<div>Canvas</div>}
      />,
    );

    const handle = screen.getByTestId('left-resize-handle');
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 }); // +50 → 290
    fireEvent.pointerMove(handle, { clientX: 180, pointerId: 1 }); // +80 → 320
    fireEvent.pointerUp(handle, { clientX: 180, pointerId: 1 });
    expect(onLeftWidthChange.mock.calls.map((call) => call[0])).toEqual([290, 320]);
  });

  it('resizes via keyboard arrows with step and clamp', () => {
    function Harness() {
      const [width, setWidth] = React.useState(240);
      return (
        <WorkbenchShell
          leftPanel={<div>Left</div>}
          leftResizable
          leftWidth={width}
          onLeftWidthChange={setWidth}
          leftMinWidth={200}
          leftMaxWidth={300}
          canvas={<div>Canvas</div>}
        />
      );
    }
    render(<Harness />);

    const handle = screen.getByTestId('left-resize-handle');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuenow')).toBe('256');

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle.getAttribute('aria-valuenow')).toBe('240');

    // 240 - 16*4 = 176 → clamped to min 200.
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle.getAttribute('aria-valuenow')).toBe('200');
  });

  it('does not render handles when panels are collapsed', () => {
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftResizable
        leftCollapsed
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
        rightResizable
        rightCollapsed
      />,
    );

    expect(screen.queryByTestId('left-resize-handle')).toBeNull();
    expect(screen.queryByTestId('right-resize-handle')).toBeNull();
  });

  it('renders no handles and keeps default grid classes without resize props', () => {
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
      />,
    );

    expect(screen.queryByTestId('left-resize-handle')).toBeNull();
    expect(screen.queryByTestId('right-resize-handle')).toBeNull();
    const body = screen.getByTestId('workbench-body');
    expect(body.className).toContain('grid-cols-[15rem_minmax(0,1fr)_22rem]');
    expect(body.style.gridTemplateColumns).toBe('');
  });

  it('uses internal local width state when width props are absent', () => {
    render(
      <WorkbenchShell
        leftPanel={<div>Left</div>}
        leftResizable
        leftMinWidth={200}
        leftMaxWidth={400}
        canvas={<div>Canvas</div>}
        rightPanel={<div>Right</div>}
        rightResizable
      />,
    );

    const body = screen.getByTestId('workbench-body');
    expect(body.style.gridTemplateColumns).toBe('240px minmax(0,1fr) 352px');

    const handle = screen.getByTestId('left-resize-handle');
    fireEvent.pointerDown(handle, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 200, pointerId: 1 });
    expect(body.style.gridTemplateColumns).toBe('340px minmax(0,1fr) 352px');
  });
});

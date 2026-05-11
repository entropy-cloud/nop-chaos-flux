// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WorkbenchShell } from './workbench-shell.js';

afterEach(() => {
  cleanup();
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

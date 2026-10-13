import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClipboardControls } from './clipboard-controls.js';

// CX-9 plan 587 (WA-ui-002, m2) characterization: the four isomorphic
// copy/cut/paste/clear blocks freeze as behavior pins before the
// conditional-block primitive consolidation.
describe('ClipboardControls (characterization)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all four blocks in fixed order when every handler is provided', () => {
    render(<ClipboardControls onCopy={() => {}} onCut={() => {}} onPaste={() => {}} onClear={() => {}} />);

    const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual(['Copy', 'Cut', 'Paste', 'Clear']);
  });

  it('omits the block entirely when its handler is undefined (×4 isomorphic conditionals)', () => {
    const labels = () =>
      screen.queryAllByRole('button').map((button) => button.getAttribute('aria-label'));

    const { unmount: unmount1 } = render(<ClipboardControls onCopy={() => {}} />);
    expect(labels()).toEqual(['Copy']);
    unmount1();

    const { unmount: unmount2 } = render(<ClipboardControls onCut={() => {}} />);
    expect(labels()).toEqual(['Cut']);
    unmount2();

    const { unmount: unmount3 } = render(<ClipboardControls onPaste={() => {}} />);
    expect(labels()).toEqual(['Paste']);
    unmount3();

    const { unmount: unmount4 } = render(<ClipboardControls onClear={() => {}} />);
    expect(labels()).toEqual(['Clear']);
    unmount4();

    render(<ClipboardControls />);
    expect(labels()).toEqual([]);
  });

  it('renders zero buttons when every handler is omitted', () => {
    render(<ClipboardControls />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('wraps the buttons in a flex row that consumes the className prop', () => {
    render(<ClipboardControls onCopy={() => {}} className="toolbar-tail" />);

    const wrapper = screen.getAllByRole('button')[0]!.parentElement;
    expect(wrapper?.className).toContain('flex items-center');
    expect(wrapper?.className).toContain('toolbar-tail');
  });

  it('uses the ghost/icon-xs button shape for every control', () => {
    render(<ClipboardControls onCopy={() => {}} onCut={() => {}} onPaste={() => {}} onClear={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('hover:bg-muted');
      expect(button.className).toContain('size-6');
    }
  });

  it('dispatches the matching handler on click', () => {
    const onCopy = vi.fn();
    const onCut = vi.fn();
    const onPaste = vi.fn();
    const onClear = vi.fn();
    render(
      <ClipboardControls onCopy={onCopy} onCut={onCut} onPaste={onPaste} onClear={onClear} />,
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[1]!);
    fireEvent.click(buttons[2]!);
    fireEvent.click(buttons[3]!);

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCut).toHaveBeenCalledTimes(1);
    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('propagates disabled to every rendered control', () => {
    render(<ClipboardControls onCopy={() => {}} onClear={() => {}} disabled />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });
});

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextFormatControls } from './text-format-controls.js';

// CX-9 plan 587 (WA-ui-002) characterization: twin of alignment-controls —
// freezes the exact current output shape (m3 handwritten pressed className
// kept verbatim) before the data-driven primitive consolidation.
describe('TextFormatControls (characterization)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders four icon buttons with the fixed label order bold/italic/underline/strikethrough', () => {
    render(<TextFormatControls onStyle={() => {}} />);

    const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual(['Bold', 'Italic', 'Underline', 'Strikethrough']);
  });

  it('wraps the buttons in a flex row that consumes the className prop', () => {
    render(<TextFormatControls onStyle={() => {}} className="toolbar-tail" />);

    const wrapper = screen.getAllByRole('button')[0]!.parentElement;
    expect(wrapper?.className).toContain('flex items-center');
    expect(wrapper?.className).toContain('toolbar-tail');
  });

  it('drives aria-pressed from getActive per tool', () => {
    render(
      <TextFormatControls onStyle={() => {}} getActive={(tool) => tool === 'bold' || tool === 'strikethrough'} />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[3]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('defaults to not pressed when getActive is omitted', () => {
    render(<TextFormatControls onStyle={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('marks the active buttons with the handwritten accent classes (m3 verbatim pin)', () => {
    render(<TextFormatControls onStyle={() => {}} getActive={(tool) => tool === 'italic'} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[1]!.className).toContain('bg-accent text-accent-foreground');
    expect(buttons[0]!.className).not.toContain('bg-accent');
    expect(buttons[0]!.className).not.toContain('text-accent-foreground');
  });

  it('uses the ghost/icon-xs button shape for every control', () => {
    render(<TextFormatControls onStyle={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('hover:bg-muted');
      expect(button.className).toContain('size-6');
    }
  });

  it('dispatches onStyle with the matching tool on click', () => {
    const onStyle = vi.fn();
    render(<TextFormatControls onStyle={onStyle} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[3]!);

    expect(onStyle).toHaveBeenCalledTimes(2);
    expect(onStyle).toHaveBeenNthCalledWith(1, 'bold');
    expect(onStyle).toHaveBeenNthCalledWith(2, 'strikethrough');
  });

  it('propagates disabled to every control', () => {
    render(<TextFormatControls onStyle={() => {}} disabled />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });
});

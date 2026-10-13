import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlignmentControls } from './alignment-controls.js';

// CX-9 plan 587 (WA-ui-002) characterization: the four toolbar controls had
// zero tests. These pins freeze the exact current output shape — including the
// handwritten pressed className (m3: kept verbatim, must NOT be normalized
// onto the Button ghost variant table in this batch) — before the data-driven
// primitive consolidation.
describe('AlignmentControls (characterization)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders three icon buttons with the fixed label order left/center/right', () => {
    render(<AlignmentControls onAlign={() => {}} />);

    const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual(['Align Left', 'Align Center', 'Align Right']);
  });

  it('wraps the buttons in a flex row that consumes the className prop', () => {
    render(<AlignmentControls onAlign={() => {}} className="toolbar-tail" />);

    const wrapper = screen.getAllByRole('button')[0]!.parentElement;
    expect(wrapper?.className).toContain('flex items-center');
    expect(wrapper?.className).toContain('toolbar-tail');
  });

  it('drives aria-pressed from getActive per key', () => {
    render(
      <AlignmentControls onAlign={() => {}} getActive={(align) => align === 'center'} />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('false');
  });

  it('defaults to not pressed when getActive is omitted', () => {
    render(<AlignmentControls onAlign={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('marks the active button with the handwritten accent classes (m3 verbatim pin)', () => {
    render(
      <AlignmentControls onAlign={() => {}} getActive={(align) => align === 'right'} />,
    );

    const buttons = screen.getAllByRole('button');
    // Verbatim handwritten pressed treatment — ghost variant table must not
    // substitute for it in this batch (plan 587 m3).
    expect(buttons[2]!.className).toContain('bg-accent text-accent-foreground');
    expect(buttons[0]!.className).not.toContain('bg-accent');
    expect(buttons[0]!.className).not.toContain('text-accent-foreground');
  });

  it('uses the ghost/icon-xs button shape for every control', () => {
    render(<AlignmentControls onAlign={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('hover:bg-muted');
      expect(button.className).toContain('size-6');
    }
  });

  it('dispatches onAlign with the matching key on click', () => {
    const onAlign = vi.fn();
    render(<AlignmentControls onAlign={onAlign} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]!);
    fireEvent.click(buttons[2]!);

    expect(onAlign).toHaveBeenCalledTimes(2);
    expect(onAlign).toHaveBeenNthCalledWith(1, 'left');
    expect(onAlign).toHaveBeenNthCalledWith(2, 'right');
  });

  it('propagates disabled to every control', () => {
    render(<AlignmentControls onAlign={() => {}} disabled />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });
});

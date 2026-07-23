import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarOverlay } from './calendar-overlay.js';

vi.mock('../../shared/hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));


describe('CalendarOverlay', () => {
  const baseProps = {
    onEscape: vi.fn(),
    onClick: vi.fn(),
    ariaLabel: 'test overlay',
    children: <div data-testid="child">content</div>,
  };

  it('renders dialog with aria label', () => {
    render(<CalendarOverlay {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-label')).toBe('test overlay');
  });

  it('renders children', () => {
    const { container } = render(<CalendarOverlay {...baseProps} />);
    const children = container.querySelectorAll('[data-testid="child"]');
    expect(children.length).toBeGreaterThanOrEqual(1);
  });

  it('has aria-modal true', () => {
    const { container } = render(<CalendarOverlay {...baseProps} />);
    const dialogs = container.querySelectorAll('[role="dialog"]');
    expect(dialogs.length).toBeGreaterThanOrEqual(1);
    expect(dialogs[0].getAttribute('aria-modal')).toBe('true');
  });
});

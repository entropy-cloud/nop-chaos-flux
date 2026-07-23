import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarConfirmDialog } from './calendar-confirm-dialog.js';

vi.mock('../hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));


describe('CalendarConfirmDialog', () => {
  const baseProps = {
    confirmDialog: {
      event: { id: 'e1', title: 'Test Event', start: '2026-07-21', end: '2026-07-21', type: 'shift' },
      targetDate: '2026-07-22',
      targetResource: 'r2',
    },
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  it('renders dialog with event title', () => {
    render(<CalendarConfirmDialog {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('renders confirm and cancel buttons', () => {
    const { container } = render(<CalendarConfirmDialog {...baseProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

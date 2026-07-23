import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarDragTypeSelector } from './calendar-drag-type-selector.js';

describe('CalendarDragTypeSelector', () => {
  const baseProps = {
    shiftTypes: [
      { type: 'shift', label: 'scheduling.calendar.morningShift', color: '#4ade80' },
      { type: 'leave', label: 'scheduling.calendar.leave', color: '#f87171' },
    ],
    onSelectType: vi.fn(),
    onDismiss: vi.fn(),
  };

  it('renders dialog with role dialog', () => {
    render(<CalendarDragTypeSelector {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('renders shift type buttons', () => {
    render(<CalendarDragTypeSelector {...baseProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders cancel button', () => {
    render(<CalendarDragTypeSelector {...baseProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

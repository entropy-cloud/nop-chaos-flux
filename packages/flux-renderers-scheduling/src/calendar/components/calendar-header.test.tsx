import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { CalendarHeader } from './calendar-header.js';

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

afterEach(cleanup);

describe('CalendarHeader', () => {
  const baseProps = {
    currentDate: new Date('2026-07-21'),
    activeView: 'month' as const,
    navigation: {
      goNext: vi.fn(),
      goPrev: vi.fn(),
      goToday: vi.fn(),
      goToDate: vi.fn(),
    },
    onViewChange: vi.fn(),
  };

  it('should render header with data-slot', () => {
    const { container } = render(<CalendarHeader {...baseProps} />);
    expect(container.querySelector('[data-slot="calendar-header"]')).toBeTruthy();
  });

  it('should render navigation buttons', () => {
    render(<CalendarHeader {...baseProps} />);
    expect(screen.getByLabelText('scheduling.previous')).toBeTruthy();
    expect(screen.getByLabelText('scheduling.next')).toBeTruthy();
  });

  it('should render today button', () => {
    const { container } = render(<CalendarHeader {...baseProps} />);
    const buttons = container.querySelectorAll('[data-slot="button"]');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should render view toggle buttons', () => {
    render(<CalendarHeader {...baseProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });

  it('should highlight active view button', () => {
    const { container } = render(<CalendarHeader {...baseProps} activeView="week" />);
    expect(container.querySelector('[data-slot="calendar-header"]')).toBeTruthy();
  });

  it('should accept className prop', () => {
    const { container } = render(<CalendarHeader {...baseProps} className="custom-class" />);
    const header = container.querySelector('[data-slot="calendar-header"]');
    expect(header?.className).toContain('custom-class');
  });
});

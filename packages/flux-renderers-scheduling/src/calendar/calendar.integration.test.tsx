import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Calendar } from './calendar.js';
import type { CalendarEvent, CalendarResource } from '../schemas.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
}));

const mockEvents: CalendarEvent[] = [
  { id: 'e1', title: 'Morning Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
  { id: 'e2', title: 'Sick Leave', start: '2026-07-22T00:00:00', end: '2026-07-22T23:59:00', type: 'leave', resourceId: 'r1' },
  { id: 'e3', title: 'Team Meeting', start: '2026-07-23T10:00:00', end: '2026-07-23T11:00:00', type: 'appointment', resourceId: 'r2' },
  { id: 'e4', title: 'Maintenance Window', start: '2026-07-24T02:00:00', end: '2026-07-24T06:00:00', type: 'maintenance', resourceId: 'r2' },
];

const mockResources: CalendarResource[] = [
  { id: 'r1', title: 'Team A' },
  { id: 'r2', title: 'Team B' },
];

const baseProps = {
  id: 'cal-integration',
  path: 'test',
  schema: { type: 'calendar' as const },
  templateNode: {} as any,
  node: {} as any,
  props: {
    events: mockEvents,
    resources: mockResources,
  } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Calendar Integration', () => {
  it('renders calendar container with events', () => {
    const { container } = render(React.createElement(Calendar, baseProps));
    expect(container.querySelector('.nop-calendar')).toBeTruthy();
    expect(container.querySelector('[data-view]')).toBeTruthy();
  });

  it('renders with data-view attribute set to month', () => {
    const { container } = render(React.createElement(Calendar, baseProps));
    const root = container.querySelector('[data-view]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-view')).toBe('month');
  });

  it('renders header with navigation controls', () => {
    render(React.createElement(Calendar, baseProps));
    const headerEl = document.querySelector('[data-slot="calendar-header"]');
    expect(headerEl).toBeTruthy();
  });

  it('renders with testid when provided', () => {
    const { container } = render(
      React.createElement(Calendar, {
        ...baseProps,
        meta: { visible: true, disabled: false, testid: 'my-calendar' } as any,
      }),
    );
    expect(container.querySelector('[data-testid="my-calendar"]')).toBeTruthy();
  });

  it('renders null when meta.visible is false', () => {
    const { container } = render(
      React.createElement(Calendar, {
        ...baseProps,
        meta: { visible: false, disabled: false } as any,
      }),
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders empty state when no events or resources', () => {
    const { container } = render(
      React.createElement(Calendar, {
        ...baseProps,
        props: { events: [], resources: [] } as any,
      }),
    );
    expect(container.querySelector('.nop-calendar')).toBeTruthy();
  });
});

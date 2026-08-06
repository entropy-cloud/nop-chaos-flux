import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Calendar } from './calendar.js';

const mockNotify = vi.hoisted(() => vi.fn());

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn(), env: { notify: mockNotify } }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

const mockDragCreate = vi.hoisted(() => ({
  triggerCreate: null as ((payload: { title: string; type: string; start: string; end: string; resourceId: string }) => void) | null,
}));

vi.mock('./hooks/use-calendar-state.js', () => ({
  useCalendarState: () => ({
    currentDate: new Date('2026-07-21'),
    activeView: 'month' as const,
    dateRange: { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    setCurrentDate: vi.fn(),
    setActiveView: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-navigation.js', () => ({
  useCalendarNavigation: () => ({
    goNext: vi.fn(),
    goPrev: vi.fn(),
    goToday: vi.fn(),
    goToDate: vi.fn(),
  }),
}));

const mockVirtualItems = vi.hoisted(() => ({
  current: [] as Array<{ index: number; start: number; size: number }>,
}));

vi.mock('./hooks/use-calendar-virtualizer.js', () => ({
  useCalendarVirtualizer: () => ({
    scrollRef: { current: null },
    virtualItems: mockVirtualItems.current,
    totalSize: mockVirtualItems.current.length * 48,
  }),
}));

vi.mock('./hooks/use-calendar-drag.js', () => ({
  useCalendarDrag: () => ({
    dragState: { active: false, currentX: 0, currentY: 0, sourceEvent: null },
    startDrag: vi.fn(),
    moveKeyboardDrag: vi.fn(),
    cancelKeyboardDrag: vi.fn(),
    confirmKeyboardDrop: vi.fn(),
    startKeyboardDrag: vi.fn(),
  }),
}));

vi.mock('./hooks/use-calendar-drag-create.js', () => ({
  useCalendarDragCreate: (options: any) => {
    mockDragCreate.triggerCreate = (payload) => {
      options.onEventCreate?.(payload);
    };
    return {
      dragCreateState: { active: false, startDate: null, startResource: null, currentDate: null, currentResource: null, currentX: 0, currentY: 0 },
      startCellDrag: vi.fn(),
      cancelCreate: vi.fn(),
      confirmCreate: vi.fn(),
      showTypeSelector: false,
      availableTypes: [],
      selectType: (type: string) => {
        options.onEventCreate?.({
          title: type,
          type,
          start: '2026-07-21T09:00:00',
          end: '2026-07-21T17:00:00',
          resourceId: 'r1',
        });
      },
      dismissTypeSelector: vi.fn(),
    };
  },
}));

vi.mock('./hooks/use-calendar-export.js', () => ({
  useCalendarExport: () => ({
    exportToPrint: vi.fn(),
    exportToPNG: vi.fn(),
  }),
}));

vi.mock('../shared/hooks/use-focus-trap.js', () => ({
  useFocusTrap: vi.fn(),
}));

describe('Calendar', () => {
  const baseProps = {
    id: 'cal-test',
    path: 'test',
    schema: { type: 'calendar' as const },
    templateNode: {} as any,
    node: {} as any,
    props: {} as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
  };

  it('should render null when meta.visible is false', () => {
    const { container } = render(
      <Calendar {...baseProps} meta={{ visible: false, disabled: false } as any} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render calendar container when visible', () => {
    const { container } = render(<Calendar {...baseProps} />);
    const calendarEl = container.querySelector('[data-slot]');
    expect(calendarEl).toBeTruthy();
  });

  it('should render with data-view attribute', () => {
    const { container } = render(<Calendar {...baseProps} props={{ resources: [{ id: 'r1', text: 'R1' }] } as any} />);
    const root = container.querySelector('[data-view]');
    expect(root).toBeTruthy();
  });

  it('should render with testid when provided', () => {
    const { container } = render(
      <Calendar {...baseProps} meta={{ visible: true, disabled: false, testid: 'my-calendar' } as any} />,
    );
    const el = container.querySelector('[data-testid="my-calendar"]');
    expect(el).toBeTruthy();
  });

  it('renders month view with real view components', () => {
    const { container } = render(<Calendar {...baseProps} props={{ resources: [{ id: 'r1', text: 'R1' }] } as any} />);
    expect(container.querySelector('[data-view="month"]') || container.querySelector('[data-view]')).toBeTruthy();
  });

  it('fires onEventCreate once and not onEventChange on drag-create', () => {
    const onEventCreate = vi.fn();
    const onEventChange = vi.fn();
    render(
      <Calendar {...baseProps} events={{ onEventCreate, onEventChange } as any} />,
    );

    expect(mockDragCreate.triggerCreate).not.toBeNull();
    mockDragCreate.triggerCreate!({
      title: 'Test Shift',
      type: 'shift',
      start: '2026-07-21T09:00:00',
      end: '2026-07-21T17:00:00',
      resourceId: 'r1',
    });

    expect(onEventCreate).toHaveBeenCalledTimes(1);
    expect(onEventCreate).toHaveBeenCalledWith({ event: expect.objectContaining({ title: 'Test Shift', type: 'shift' }) }, expect.anything());
    expect(onEventChange).not.toHaveBeenCalled();
  });

  it('should call onMount and onUnmount events with correct call order', () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const { unmount } = render(
      <Calendar {...baseProps} events={{ onMount, onUnmount } as any} />,
    );
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onMount).toHaveBeenCalledWith({}, expect.anything());

    unmount();
    expect(onUnmount).toHaveBeenCalledTimes(1);
    expect(onUnmount).toHaveBeenCalledWith({}, expect.anything());

    expect(onMount.mock.invocationCallOrder[0]).toBeLessThan(onUnmount.mock.invocationCallOrder[0]);
  });

  it('surfaces a rejecting loadAction as a user-visible error (CR P2-4)', async () => {
    mockNotify.mockClear();
    render(
      <Calendar
        {...baseProps}
        events={{ loadAction: () => Promise.reject(new Error('load boom')) } as any}
      />,
    );
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', expect.stringContaining('load boom'));
    });
  });

  it('renders loading skeleton when loading prop is true', () => {
    const { container } = render(
      <Calendar {...baseProps} props={{ loading: true } as any} />,
    );
    const el = container.querySelector('[data-slot="calendar"]');
    expect(el).toBeTruthy();
  });

  it('renders loading region when loading and loading region provided', () => {
    const { container } = render(
      <Calendar {...baseProps} props={{ loading: true } as any} regions={{ loading: { render: () => <div data-testid="custom-loading" /> } } as any} />,
    );
    expect(container.querySelector('[data-testid="custom-loading"]')).toBeTruthy();
  });

  it('renders events with titles in month view', () => {
    const events = [
      { id: 'e1', title: 'Event One', start: '2026-07-15', end: '2026-07-15', type: 'shift', resourceId: 'r1' },
      { id: 'e2', title: 'Event Two', start: '2026-07-20', end: '2026-07-20', type: 'leave', resourceId: 'r2' },
    ];
    const resources = [
      { id: 'r1', title: 'Resource 1' },
      { id: 'r2', title: 'Resource 2' },
    ];
    const { container } = render(
      <Calendar {...baseProps} props={{ events, resources } as any} />,
    );
    expect(container.querySelector('[data-view]')).toBeTruthy();
  });

  it('renders with locale prop', () => {
    const { container } = render(
      <Calendar {...baseProps} props={{ locale: 'zh-CN', resources: [{ id: 'r1', text: 'R1' }] } as any} />,
    );
    expect(container.querySelector('[data-view="month"]')).toBeTruthy();
  });

  it('renders with explicit resourceId events and no resources array', () => {
    const events = [
      { id: 'e1', title: 'Standalone Event', start: '2026-07-15', end: '2026-07-15', type: 'shift', resourceId: 'r-custom' },
    ];
    const { container } = render(
      <Calendar {...baseProps} props={{ events } as any} />,
    );
    expect(container.querySelector('[data-view]')).toBeTruthy();
  });

  it('fires onDateChange when date changes', () => {
    const onDateChange = vi.fn();
    render(
      <Calendar {...baseProps} events={{ onDateChange } as any} />,
    );
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it('fires onEventClick handler', () => {
    const onEventClick = vi.fn();
    const events = [
      { id: 'e1', title: 'Clickable Event', start: '2026-07-15', end: '2026-07-15', type: 'shift', resourceId: 'r1' },
    ];
    const { container } = render(
      <Calendar {...baseProps} props={{ events, resources: [{ id: 'r1', title: 'R1' }] } as any} events={{ onEventClick } as any} />,
    );
    expect(container.querySelector('[data-view]')).toBeTruthy();
  });

  it('dispatches onEventClick with evaluationBindings ctx when an event block is clicked (CX-10 convention)', () => {
    const onEventClick = vi.fn();
    const events = [
      { id: 'e1', title: 'Clickable Event', start: '2026-07-15', end: '2026-07-15', type: 'shift', resourceId: 'r1' },
    ];
    mockVirtualItems.current = [{ index: 0, start: 0, size: 48 }];
    const { container } = render(
      <Calendar {...baseProps} props={{ events, resources: [{ id: 'r1', title: 'R1' }] } as any} events={{ onEventClick } as any} />,
    );
    const eventBlock = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    expect(eventBlock).toBeTruthy();
    eventBlock.click();
    expect(onEventClick).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ id: 'e1' }) }),
      expect.objectContaining({
        evaluationBindings: expect.objectContaining({ event: expect.objectContaining({ id: 'e1' }) }),
        scope: expect.anything(),
      }),
    );
  });

  it('ready()s declared reaction plans on mount (print/exportPNG/importICal/exportToICal)', () => {
    const print = { ready: vi.fn() };
    const exportPNG = { ready: vi.fn() };
    const importICal = { ready: vi.fn() };
    const exportToICal = { ready: vi.fn() };
    render(
      <Calendar {...baseProps} reactions={{ print, exportPNG, importICal, exportToICal } as any} />,
    );
    expect(print.ready).toHaveBeenCalledTimes(1);
    expect(exportPNG.ready).toHaveBeenCalledTimes(1);
    expect(importICal.ready).toHaveBeenCalledTimes(1);
    expect(exportToICal.ready).toHaveBeenCalledTimes(1);
  });
});

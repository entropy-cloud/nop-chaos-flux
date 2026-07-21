import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CalendarEventBlock } from './calendar-event-block.js';

describe('CalendarEventBlock', () => {
  const baseEvent = {
    id: 'e1',
    title: 'Test Event',
    start: '2026-07-21',
    end: '2026-07-21',
    type: 'shift',
    resourceId: 'r1',
  };

  const basePositionedEvent = {
    event: baseEvent,
    eventId: 'e1',
    left: 10,
    width: 80,
    top: 0,
    height: 100,
    isSplit: false,
    concurrentIndex: 0,
    maxConcurrent: 1,
    overlap: false,
  };

  it('should render event block with title', () => {
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: basePositionedEvent,
      dateStr: '2026-07-21',
      onEventClick: vi.fn(),
    }));
    const el = container.querySelector('[data-slot="calendar-event"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('title')).toBe('Test Event');
  });

  it('should render with data-slot marker', () => {
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: basePositionedEvent,
      dateStr: '2026-07-21',
      onEventClick: vi.fn(),
    }));
    expect(container.querySelector('[data-slot="calendar-event"]')).toBeTruthy();
  });

  it('should show overlap indicator when overlap is true', () => {
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: { ...basePositionedEvent, overlap: true },
      dateStr: '2026-07-21',
      onEventClick: vi.fn(),
    }));
    const el = container.querySelector('[data-slot="calendar-event"]');
    expect(el?.getAttribute('data-overlap')).toBe('true');
  });

  it('should call onEventClick when clicked', () => {
    const onEventClick = vi.fn();
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: basePositionedEvent,
      dateStr: '2026-07-21',
      onEventClick,
    }));
    const el = container.querySelector('[data-slot="calendar-event"]')!;
    fireEvent.click(el);
    expect(onEventClick).toHaveBeenCalled();
  });

  it('should call onPointerDown on pointer down', () => {
    const onPointerDown = vi.fn();
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: basePositionedEvent,
      dateStr: '2026-07-21',
      onPointerDown,
      onEventClick: vi.fn(),
    }));
    const el = container.querySelector('[data-slot="calendar-event"]')!;
    fireEvent.pointerDown(el);
    expect(onPointerDown).toHaveBeenCalled();
  });

  it('should render with proper styling based on color', () => {
    const coloredEvent = {
      ...baseEvent,
      color: '#ff0000',
    };
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: { ...basePositionedEvent, event: coloredEvent },
      dateStr: '2026-07-21',
      onEventClick: vi.fn(),
    }));
    const el = container.querySelector('[data-slot="calendar-event"]') as HTMLElement;
    expect(el.style.backgroundColor).toBe('#ff0000');
  });

  it('should render with split indicator class', () => {
    const { container } = render(React.createElement(CalendarEventBlock, {
      positionedEvent: { ...basePositionedEvent, isSplit: true },
      dateStr: '2026-07-21',
      onEventClick: vi.fn(),
    }));
    const el = container.querySelector('.is-split');
    expect(el).toBeTruthy();
  });
});

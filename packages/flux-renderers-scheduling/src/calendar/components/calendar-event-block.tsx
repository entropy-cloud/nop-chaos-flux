import React from 'react';
import type { RenderRegionHandle } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import type { PositionedEvent } from '../calendar.types.js';

export interface CalendarEventBlockProps {
  positionedEvent: PositionedEvent;
  resource?: CalendarResource;
  dateStr: string;
  eventTemplate?: RenderRegionHandle;
  onEventClick?: (payload: { event: CalendarEvent; resource?: CalendarResource; date: string }) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent, event: CalendarEvent) => void;
  className?: string;
}

const TYPE_COLORS: Record<string, string> = {
  shift: 'var(--color-calendar-shift, #4ade80)',
  leave: 'var(--color-calendar-leave, #f87171)',
  appointment: 'var(--color-calendar-appointment, #60a5fa)',
  maintenance: 'var(--color-calendar-maintenance, #fbbf24)',
};

function resolveColor(event: CalendarEvent): string {
  if (event.color) return event.color;
  if (event.type && TYPE_COLORS[event.type]) return TYPE_COLORS[event.type];
  return 'var(--color-muted-foreground, #94a3b8)';
}

export function CalendarEventBlock({
  positionedEvent,
  resource,
  dateStr,
  eventTemplate,
  onEventClick,
  onPointerDown,
  onKeyDown,
  className: eventClassName,
}: CalendarEventBlockProps) {
  const { event, left, width, top, height, isSplit, concurrentIndex, maxConcurrent, overlap } = positionedEvent;
  const color = resolveColor(event);
  const eventTypeLabel = event.type ? TYPE_COLORS[event.type] ? event.type : null : null;

  const handleClick = () => {
    onEventClick?.({ event, resource, date: dateStr });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
    onKeyDown?.(e, event);
  };

  if (eventTemplate) {
    const templateContent = eventTemplate.render({
      bindings: {
        event,
        resource: resource ?? null,
        date: dateStr,
        concurrentIndex,
        maxConcurrent,
      },
    });
    if (templateContent) {
      return (
        <div
          data-slot="calendar-event"
          data-event-id={event.id}
          data-event-type={event.type}
          data-overlap={overlap ? 'true' : undefined}
          role="button"
          tabIndex={0}
          className="absolute inset-0 cursor-pointer"
          style={{ left: `${left}%`, width: `${width}%` }}
          onClick={handleClick}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown?.(e);
          }}
          onKeyDown={handleKeyDown}
          title={overlap ? t('scheduling.calendar.timeConflict') : undefined}
        >
          {overlap && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" aria-label={t('scheduling.calendar.timeConflict')} />
          )}
          {eventTypeLabel && (
            <span className="sr-only">{eventTypeLabel}</span>
          )}
          {templateContent as React.ReactNode}
        </div>
      );
    }
  }

  return (
    <div
      data-slot="calendar-event"
      data-event-id={event.id}
      data-event-type={event.type}
      data-overlap={overlap ? 'true' : undefined}
      role="button"
      tabIndex={0}
      className={cn(
        'absolute rounded px-1 text-xs truncate cursor-pointer border border-white/20',
        overlap && 'ring-2 ring-red-500',
        isSplit && 'is-split',
        eventClassName,
      )}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        top: top !== undefined ? `${top}%` : '2px',
        height: height !== undefined ? `${height}%` : 'calc(100% - 4px)',
        backgroundColor: color,
        color: '#fff',
      }}
      onClick={handleClick}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      onKeyDown={handleKeyDown}
      title={overlap ? t('scheduling.calendar.timeConflict') : event.title}
    >
      {overlap && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" aria-label={t('scheduling.calendar.timeConflict')} />
      )}
      {eventTypeLabel && (
        <span className="sr-only">{eventTypeLabel}</span>
      )}
      {event.title}
    </div>
  );
}

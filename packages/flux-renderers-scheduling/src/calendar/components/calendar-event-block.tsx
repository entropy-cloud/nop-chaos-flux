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

const KNOWN_EVENT_TYPES = new Set(['shift', 'leave', 'appointment', 'maintenance']);

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
  // N2/R2 双轨消解（plan 481）：默认路径的底色/文字色由 calendar.css 的
  // [data-event-type] 语义 token 规则与 :not([data-event-type]) fallback 规则
  // 提供（dark 自适应）；仅 event.color 显式覆盖仍走 inline 通道。
  const explicitColor = event.color;
  const eventTypeLabel = event.type && KNOWN_EVENT_TYPES.has(event.type) ? event.type : null;

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
            <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--color-destructive)] rounded-full border border-[var(--color-background)]" aria-label={t('scheduling.calendar.timeConflict')} />
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
        'absolute rounded px-1 text-xs truncate cursor-pointer border',
        isSplit && 'is-split',
        eventClassName,
      )}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        top: top !== undefined ? `${top}%` : '2px',
        height: height !== undefined ? `${height}%` : 'calc(100% - 4px)',
        ...(explicitColor ? { backgroundColor: explicitColor } : {}),
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
        <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--color-destructive)] rounded-full border border-[var(--color-background)]" aria-label={t('scheduling.calendar.timeConflict')} />
      )}
      {eventTypeLabel && (
        <span className="sr-only">{eventTypeLabel}</span>
      )}
      {event.title}
    </div>
  );
}

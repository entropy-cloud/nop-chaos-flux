import React from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-core';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import { allocateConcurrentWidths } from '../utils/calendar-time-utils.js';
import { toISODateString, isToday } from '../utils/calendar-date-utils.js';
import { CalendarEventBlock } from './calendar-event-block.js';

export interface CalendarDayViewProps {
  events: CalendarEvent[];
  resources: CalendarResource[];
  currentDate: Date;
  maxConcurrent: number;
  dayStartHour: number;
  dayEndHour: number;
  eventTemplate?: RenderRegionHandle;
  onEventClick?: (payload: { event: CalendarEvent; resource?: CalendarResource; date: string }) => void;
  onDragStart?: (event: CalendarEvent, pointerEvent: React.PointerEvent) => void;
  onEventKeyDown?: (e: React.KeyboardEvent, event: CalendarEvent) => void;
}

const HOUR_HEIGHT = 64;

export function CalendarDayView({
  events,
  resources,
  currentDate,
  maxConcurrent = 4,
  dayStartHour = 8,
  dayEndHour = 20,
  eventTemplate,
  onEventClick,
  onDragStart,
  onEventKeyDown,
}: CalendarDayViewProps) {
  const dateStr = toISODateString(currentDate);
  const today = isToday(currentDate);
  const totalHours = dayEndHour - dayStartHour;

  const hours = Array.from({ length: totalHours }, (_, i) => dayStartHour + i);

  const displayResources = resources.length === 0
    ? [{ id: '_default', text: '', title: '' }]
    : resources;

  const dayEventsByResource = (() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const resource of displayResources) {
      const filtered = events.filter((evt) => {
        const evtStart = evt.start.split('T')[0] ?? evt.start;
        const evtEnd = evt.end.split('T')[0] ?? evt.end;
        return dateStr >= evtStart && dateStr <= evtEnd && (evt.resourceId ?? '_default') === resource.id;
      });
      map.set(resource.id, filtered);
    }
    return map;
  })();

  return (
    <div data-slot="calendar-matrix" role="grid" aria-label="Calendar day view" className="flex flex-col overflow-auto">
      <div
        role="rowheader"
        data-slot="calendar-cell"
        data-date={dateStr}
        aria-current={today ? 'date' : undefined}
        className={cn(
          'sticky top-0 bg-background z-10 text-center text-sm font-medium py-2 border-b',
          today && 'bg-blue-50',
        )}
      >
        {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div className="flex">
        <div className="w-12 shrink-0 border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              role="rowheader"
              className="text-[10px] text-muted-foreground text-right pr-1"
              style={{ height: `${HOUR_HEIGHT}px`, lineHeight: `${HOUR_HEIGHT}px` }}
              aria-label={`${String(hour).padStart(2, '0')}:00`}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div role="rowgroup" className="flex-1">
          {displayResources.map((resource) => {
            const dayEvents = dayEventsByResource.get(resource.id) ?? [];
            const positioned = allocateConcurrentWidths(dayEvents, dayStartHour, dayEndHour, maxConcurrent);

            return (
              <div
                key={resource.id}
                role="row"
                data-slot="calendar-resource-row"
                data-resource-id={resource.id}
                aria-label={`${resource.title || resource.text} schedule for ${dateStr}`}
                className="relative border-b last:border-b-0"
                style={{ minHeight: `${totalHours * HOUR_HEIGHT}px` }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${String(hour).padStart(2, '0')}:00 for ${resource.title || resource.text}`}
                    className="border-b border-gray-50"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}
                {positioned.map((pe) => (
                  <CalendarEventBlock
                    key={pe.eventId}
                    positionedEvent={pe}
                    resource={resource}
                    dateStr={dateStr}
                    eventTemplate={eventTemplate}
                    onEventClick={onEventClick}
                    onPointerDown={(e) => onDragStart?.(pe.event, e)}
                    onKeyDown={onEventKeyDown}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {resources.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          {t('scheduling.noScheduleData')}
        </div>
      )}
    </div>
  );
}

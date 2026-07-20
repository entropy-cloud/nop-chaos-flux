import React, { useMemo } from 'react';
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
}: CalendarDayViewProps) {
  const dateStr = toISODateString(currentDate);
  const today = isToday(currentDate);
  const totalHours = dayEndHour - dayStartHour;

  const hours = useMemo(
    () => Array.from({ length: totalHours }, (_, i) => dayStartHour + i),
    [dayStartHour, totalHours],
  );

  const displayResources = resources.length === 0
    ? [{ id: '_default', text: '', title: '' }]
    : resources;

  return (
    <div data-slot="calendar-matrix" className="flex flex-col overflow-auto">
      <div
        data-slot="calendar-cell"
        data-date={dateStr}
        className={cn(
          'sticky top-0 bg-background z-10 text-center text-sm font-medium py-2 border-b',
          today && 'bg-blue-50',
        )}
      >
        {currentDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div className="flex">
        <div className="w-12 shrink-0 border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-[10px] text-muted-foreground text-right pr-1"
              style={{ height: `${HOUR_HEIGHT}px`, lineHeight: `${HOUR_HEIGHT}px` }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div className="flex-1">
          {displayResources.map((resource) => {
            const dayEvents = events.filter((evt) => {
              const evtDate = evt.start.split('T')[0] ?? evt.start;
              return evtDate === dateStr && (evt.resourceId ?? '') === resource.id;
            });
            const positioned = allocateConcurrentWidths(dayEvents, dayStartHour, dayEndHour, maxConcurrent);

            return (
              <div
                key={resource.id}
                data-slot="calendar-resource-row"
                data-resource-id={resource.id}
                className="relative border-b last:border-b-0"
                style={{ minHeight: `${totalHours * HOUR_HEIGHT}px` }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
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

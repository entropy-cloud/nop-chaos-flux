import React, { useMemo } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-core';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import { getWeekStartEnd, getDateRange, isToday, toISODateString } from '../utils/calendar-date-utils.js';
import { allocateConcurrentWidths } from '../utils/calendar-time-utils.js';
import { CalendarEventBlock } from './calendar-event-block.js';

export interface CalendarWeekViewProps {
  events: CalendarEvent[];
  resources: CalendarResource[];
  currentDate: Date;
  firstDayOfWeek: 0 | 1;
  showWeekends: boolean;
  maxConcurrent: number;
  dayStartHour: number;
  dayEndHour: number;
  eventTemplate?: RenderRegionHandle;
  onEventClick?: (payload: { event: CalendarEvent; resource?: CalendarResource; date: string }) => void;
  onDragStart?: (event: CalendarEvent, pointerEvent: React.PointerEvent) => void;
}

const HOUR_HEIGHT = 48;

export function CalendarWeekView({
  events,
  resources,
  currentDate,
  firstDayOfWeek = 0,
  showWeekends = true,
  maxConcurrent = 4,
  dayStartHour = 8,
  dayEndHour = 20,
  eventTemplate,
  onEventClick,
  onDragStart,
}: CalendarWeekViewProps) {
  const { start, end } = getWeekStartEnd(currentDate, firstDayOfWeek);
  const days = useMemo(() => getDateRange(start, end), [start, end]);

  const totalHours = dayEndHour - dayStartHour;

  const hours = useMemo(
    () => Array.from({ length: totalHours }, (_, i) => dayStartHour + i),
    [dayStartHour, totalHours],
  );

  const displayResources = useMemo(() => resources.length === 0
    ? [{ id: '_default', text: '', title: '' }]
    : resources, [resources]);

  const positionedByDay = useMemo(() => {
    const result = new Map<string, Map<string, ReturnType<typeof allocateConcurrentWidths>>>();
    for (const resource of displayResources) {
      const resourceMap = new Map<string, ReturnType<typeof allocateConcurrentWidths>>();
      for (const day of days) {
        const dateStr = toISODateString(day);
        const dayEvents = events.filter((evt) => {
          const evtDate = evt.start.split('T')[0] ?? evt.start;
          return evtDate === dateStr && (evt.resourceId ?? '_default') === (resource.id ?? '_default');
        });
        resourceMap.set(dateStr, allocateConcurrentWidths(dayEvents, dayStartHour, dayEndHour, maxConcurrent));
      }
      result.set(resource.id, resourceMap);
    }
    return result;
  }, [events, days, displayResources, dayStartHour, dayEndHour, maxConcurrent]);

  const displayDays = showWeekends ? days : days.filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);

  return (
    <div data-slot="calendar-matrix" className="flex flex-col overflow-auto">
      <div className="flex border-b sticky top-0 bg-background z-10">
        <div className="w-12 shrink-0" />
        {displayDays.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={toISODateString(day)}
              data-slot="calendar-cell"
              data-date={toISODateString(day)}
              className={cn(
                'flex-1 text-center text-xs font-medium py-1 border-r last:border-r-0',
                today && 'bg-blue-50 font-bold',
              )}
            >
              <div>{day.getUTCDate()}</div>
              <div className="text-muted-foreground">
                {['日', '一', '二', '三', '四', '五', '六'][day.getUTCDay()]}
              </div>
            </div>
          );
        })}
      </div>

      {displayResources.map((resource) => (
        <div key={resource.id} data-slot="calendar-resource-row" data-resource-id={resource.id}>
          <div className="flex" style={{ minHeight: `${totalHours * HOUR_HEIGHT}px` }}>
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

            {displayDays.map((day) => {
              const dateStr = toISODateString(day);
              const resourceMap = positionedByDay.get(resource.id);
              const positioned = resourceMap?.get(dateStr) ?? [];

              return (
                <div
                  key={dateStr}
                  data-slot="calendar-cell"
                  data-date={dateStr}
                  data-resource={resource.id}
                  className="flex-1 relative border-r last:border-r-0"
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-gray-100"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}
                  {positioned
                    .map((pe) => (
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
      ))}

      {resources.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          {t('scheduling.noScheduleData')}
        </div>
      )}
    </div>
  );
}

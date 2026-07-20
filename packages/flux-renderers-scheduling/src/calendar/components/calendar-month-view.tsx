import React, { useMemo } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-core';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import type { CalendarDateRange } from '../calendar.types.js';
import { getMonthDays, isToday, isWeekend, toISODateString } from '../utils/calendar-date-utils.js';
import { positionEventsInMonth, detectConflicts } from '../utils/calendar-layout-utils.js';
import { CalendarEventBlock } from './calendar-event-block.js';

export interface CalendarMonthViewProps {
  events: CalendarEvent[];
  resources: CalendarResource[];
  dateRange: CalendarDateRange;
  currentDate: Date;
  firstDayOfWeek: 0 | 1;
  showWeekends: boolean;
  maxConcurrent: number;
  eventTemplate?: RenderRegionHandle;
  onEventClick?: (payload: { event: CalendarEvent; resource?: CalendarResource; date: string }) => void;
  virtualItems?: readonly { index: number; start: number; size: number; key?: unknown }[];
  totalSize?: number;
}

const WEEKDAY_LABELS: Record<string, string[]> = {
  'zh-CN': ['日', '一', '二', '三', '四', '五', '六'],
};

function getWeekdayLabels(locale: string, firstDayOfWeek: 0 | 1): string[] {
  const labels = WEEKDAY_LABELS[locale] ?? WEEKDAY_LABELS['zh-CN']!;
  if (firstDayOfWeek === 1) {
    return [...labels.slice(1), labels[0]];
  }
  return labels;
}

export function CalendarMonthView({
  events,
  resources,
  dateRange,
  currentDate,
  firstDayOfWeek = 0,
  showWeekends = true,
  maxConcurrent = 4,
  eventTemplate,
  onEventClick,
  virtualItems,
  totalSize,
}: CalendarMonthViewProps) {
  const days = useMemo(
    () => getMonthDays(currentDate, firstDayOfWeek),
    [currentDate, firstDayOfWeek],
  );

  const positionedMap = useMemo(
    () => positionEventsInMonth({ events, resources, dateRange, maxConcurrent }),
    [events, resources, dateRange, maxConcurrent],
  );

  const conflictMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const resource of resources) {
      for (const day of days) {
        const dateStr = toISODateString(day);
        const conflict = detectConflicts({ events, resourceId: resource.id, date: dateStr });
        if (conflict) {
          const key = `${resource.id}:${dateStr}`;
          if (!map.has(key)) map.set(key, new Set());
          for (const evt of conflict.overlappingEvents) {
            map.get(key)!.add(evt.id);
          }
        }
      }
    }
    return map;
  }, [events, resources, days]);

  const weekdayLabels = getWeekdayLabels('zh-CN', firstDayOfWeek);

  const headerCells = days.slice(0, 7).map((day, i) => (
    <div
      key={weekdayLabels[i]}
      data-slot="calendar-cell"
      className="flex-1 text-center text-xs font-medium text-muted-foreground py-1 border-b"
    >
      {weekdayLabels[i]}
    </div>
  ));

  const displayResources = resources.length === 0
    ? [{ id: '_default', text: '', title: '' }]
    : resources;

  const resourceRows = (virtualItems ?? displayResources.map((_, i) => ({ index: i, start: i * 48, size: 48 }))).map(
    (vItem) => {
      const resourceIndex = vItem.index;
      if (resourceIndex >= displayResources.length) return null;

      const resource = displayResources[resourceIndex];

      return (
        <div
          key={resource.id}
          data-slot="calendar-resource-row"
          data-resource-id={resource.id}
          className="flex border-b"
          style={{ height: `${vItem.size}px`, transform: `translateY(${vItem.start}px)` }}
        >
          <div
            data-slot="calendar-resource-header"
            className="w-24 shrink-0 border-r flex items-center px-2"
          >
            <span className="text-sm truncate">{resource.title || resource.text}</span>
          </div>
          <div data-slot="calendar-cells" className="flex flex-1">
            {days.map((day) => {
              const dateStr = toISODateString(day);
              const dayEvents = positionedMap.get(resource.id)?.get(dateStr) ?? [];
              const isCurrentMonth = day.getUTCMonth() === currentDate.getUTCMonth();
              const weekend = isWeekend(day);
              const today = isToday(day);

              const conflictKey = `${resource.id}:${dateStr}`;
              const conflictedEventIds = conflictMap.get(conflictKey);

              if (!showWeekends && weekend) {
                return (
                  <div
                    key={dateStr}
                    data-slot="calendar-cell"
                    data-date={dateStr}
                    data-resource={resource.id}
                    data-empty="true"
                    className="flex-1 min-w-0 bg-gray-50"
                  />
                );
              }

              return (
                <div
                  key={dateStr}
                  data-slot="calendar-cell"
                  data-date={dateStr}
                  data-resource={resource.id}
                  data-empty={!isCurrentMonth ? 'true' : undefined}
                  className={cn(
                    'flex-1 min-w-0 relative border-r last:border-r-0',
                    today && 'bg-blue-50',
                    weekend && 'bg-gray-50/50',
                  )}
                >
                  {dayEvents.length === 0 ? (
                    <div className="text-[10px] text-gray-300 flex items-center justify-center h-full">
                      {!isCurrentMonth ? null : null}
                    </div>
                  ) : (
                    dayEvents.map((pe) => (
                      <CalendarEventBlock
                        key={`${pe.eventId}-${dateStr}`}
                        positionedEvent={{
                          ...pe,
                          overlap: conflictedEventIds?.has(pe.eventId),
                        }}
                        resource={resource}
                        dateStr={dateStr}
                        eventTemplate={eventTemplate}
                        onEventClick={onEventClick}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    },
  );

  return (
    <div data-slot="calendar-matrix" className="flex flex-col">
      <div className="flex">
        <div className="w-24 shrink-0 border-r" />
        <div className="flex flex-1">{headerCells}</div>
      </div>
      <div
        className="relative"
        style={totalSize ? { height: `${totalSize}px` } : undefined}
      >
        {resourceRows}
      </div>
      {resources.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          {t('scheduling.noScheduleData')}
        </div>
      )}
    </div>
  );
}

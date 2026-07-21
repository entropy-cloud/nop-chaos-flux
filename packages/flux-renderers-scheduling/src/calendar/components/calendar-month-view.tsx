import React, { useMemo } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-core';
import type { CalendarDateRange } from '../calendar.types.js';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import { getMonthDays, isToday, isWeekend, toISODateString } from '../utils/calendar-date-utils.js';
import { positionEventsInMonth, detectConflicts, splitMultiDayEvents } from '../utils/calendar-layout-utils.js';
import { computeCrossDayLines, createSVGPath, type CellPosition } from '../utils/calendar-cross-day-lines.js';
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
  onDragStart?: (event: CalendarEvent, pointerEvent: React.PointerEvent) => void;
  onCellDragStart?: (date: string, resourceId: string, pointerEvent: React.PointerEvent) => void;
  showCrossDayLines?: boolean;
  onEventKeyDown?: (e: React.KeyboardEvent, event: CalendarEvent) => void;
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
  onDragStart,
  onCellDragStart,
  showCrossDayLines = true,
  onEventKeyDown,
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

  const displayResources = useMemo(() => resources.length === 0
    ? [{ id: '_default', text: '', title: '' }]
    : resources, [resources]);

  const resourceRows = (virtualItems ?? displayResources.map((_, i) => ({ index: i, start: i * 48, size: 48 }))).map(
    (vItem) => {
      const resourceIndex = vItem.index;
      if (resourceIndex >= displayResources.length) return null;

      const resource = displayResources[resourceIndex];

      const handleEventPointerDown = (event: CalendarEvent, pe: React.PointerEvent) => {
        if (pe.button !== 0) return;
        pe.preventDefault();
        onDragStart?.(event, pe);
      };

      const handleCellPointerDown = (dateStr: string, resourceId: string, pe: React.PointerEvent) => {
        if (pe.button !== 0) return;
        onCellDragStart?.(dateStr, resourceId, pe);
      };

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

              const weekendIndicator = weekend && !today ? 'weekend' : '';
              const todayIndicator = today ? 'today' : '';

              return (
                <div
                  key={dateStr}
                  role="gridcell"
                  aria-label={`${day.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${today ? ', today' : ''}${weekend ? ', weekend' : ''}`}
                  aria-current={today ? 'date' : undefined}
                  data-slot="calendar-cell"
                  data-date={dateStr}
                  data-resource={resource.id}
                  data-empty={!isCurrentMonth ? 'true' : undefined}
                  data-weekend={weekendIndicator || undefined}
                  data-today={todayIndicator || undefined}
                  className={cn(
                    'flex-1 min-w-0 relative border-r last:border-r-0',
                    today && 'bg-blue-50 ring-2 ring-inset ring-blue-400 font-semibold',
                    weekend && 'bg-gray-50/50',
                  )}
                  onPointerDown={(pe) => handleCellPointerDown(dateStr, resource.id, pe)}
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
                        onPointerDown={(e) => handleEventPointerDown(pe.event, e)}
                        onKeyDown={onEventKeyDown}
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

  const splitEvents = useMemo(() => splitMultiDayEvents(events), [events]);

  const cellPositions = useMemo(() => {
    const positions = new Map<string, CellPosition>();
    const cellWidth = 100 / days.length;
    for (let ri = 0; ri < displayResources.length; ri++) {
      const resource = displayResources[ri];
      for (let di = 0; di < days.length; di++) {
        const dateStr = toISODateString(days[di]);
        const key = `${resource.id}:${dateStr}`;
        positions.set(key, {
          x: di * cellWidth,
          y: ri * 48,
          width: cellWidth,
          height: 48,
        });
      }
    }
    return positions;
  }, [days, displayResources]);

  const crossDayLines = useMemo(() => {
    if (!showCrossDayLines) return [];
    return computeCrossDayLines(splitEvents, cellPositions);
  }, [showCrossDayLines, splitEvents, cellPositions]);

  const totalHeight = totalSize ?? displayResources.length * 48;

  return (
    <div data-slot="calendar-matrix" role="grid" aria-label="Calendar month view" className="flex flex-col">
      <div role="row" className="flex">
        <div className="w-24 shrink-0 border-r" />
        <div className="flex flex-1">{headerCells}</div>
      </div>
      <div
        role="rowgroup"
        className="relative"
        style={{ height: `${totalHeight}px` }}
      >
        {resourceRows}
        {showCrossDayLines && crossDayLines.length > 0 && (
          <svg
            className="nop-calendar-cross-day-lines"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {crossDayLines.map((line) => (
              <path
                key={line.eventId}
                d={createSVGPath(line)}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeDasharray="4 2"
                opacity={0.6}
              />
            ))}
          </svg>
        )}
      </div>
      {resources.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          {t('scheduling.noScheduleData')}
        </div>
      )}
    </div>
  );
}

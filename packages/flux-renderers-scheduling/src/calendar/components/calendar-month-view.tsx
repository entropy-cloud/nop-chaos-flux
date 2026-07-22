import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RenderRegionHandle } from '@nop-chaos/flux-core';
import type { CalendarDateRange } from '../calendar.types.js';
import type { CalendarEvent, CalendarResource } from '../../schemas.js';
import { getDateRange, getMonthStartEnd, isToday, isWeekend, toISODateString } from '../utils/calendar-date-utils.js';
import { positionEventsInMonth, splitMultiDayEvents } from '../utils/calendar-layout-utils.js';
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
  eventClassName?: string;
}

const WEEKDAY_LABELS: Record<string, string[]> = {
  'zh-CN': ['日', '一', '二', '三', '四', '五', '六'],
  'en-US': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function getWeekdayLabels(locale: string, firstDayOfWeek: 0 | 1): string[] {
  const labels = WEEKDAY_LABELS[locale] ?? WEEKDAY_LABELS['en-US']!;
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
  eventClassName,
  locale = 'en-US',
}: CalendarMonthViewProps & { locale?: string }) {
  const days = useMemo(() => {
    const { start, end } = getMonthStartEnd(currentDate);
    return getDateRange(start, end);
  }, [currentDate]);

  const positionedMap = useMemo(
    () => positionEventsInMonth({ events, resources, dateRange, maxConcurrent }),
    [events, resources, dateRange, maxConcurrent],
  );

  const conflictMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [resourceId, dayMap] of positionedMap) {
      for (const [dateStr, dayEvents] of dayMap) {
        if (dayEvents.length <= 1) continue;
        const key = `${resourceId}:${dateStr}`;
        const ids = new Set<string>();
        for (const pe of dayEvents) {
          ids.add(pe.eventId);
        }
        if (ids.size > 1) {
          map.set(key, ids);
        }
      }
    }
    return map;
  }, [positionedMap]);

  const weekdayLabels = getWeekdayLabels(locale, firstDayOfWeek);
  const [focusedCell, setFocusedCell] = useState<{ resourceId: string; dateStr: string } | null>(null);

  const handleDateCellKeyDown = useCallback((e: React.KeyboardEvent, dateStr: string, resourceId: string) => {
    if (!showWeekends && isWeekend(new Date(dateStr))) return;
    const grid = e.currentTarget.closest('[role="grid"]');
    if (!grid) return;
    const cells = Array.from(grid.querySelectorAll('[data-slot="calendar-cell"]:not([data-empty])')) as HTMLElement[];
    const currentIdx = cells.indexOf(e.currentTarget as HTMLElement);
    let nextIdx = currentIdx;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIdx = Math.min(currentIdx + 1, cells.length - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIdx = Math.max(currentIdx - 1, 0);
        break;
      case 'ArrowDown': {
        e.preventDefault();
        const daysCount = days.slice(0, 7).length;
        nextIdx = Math.min(currentIdx + daysCount, cells.length - 1);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const daysCount = days.slice(0, 7).length;
        nextIdx = Math.max(currentIdx - daysCount, 0);
        break;
      }
      case 'Enter':
      case ' ':
        e.preventDefault();
        onCellDragStart?.(dateStr, resourceId, e as unknown as React.PointerEvent);
        return;
      default:
        return;
    }
    if (nextIdx !== currentIdx && nextIdx >= 0 && nextIdx < cells.length) {
      cells[nextIdx]?.focus();
      const nextDate = cells[nextIdx]?.getAttribute('data-date');
      const nextResource = cells[nextIdx]?.getAttribute('data-resource');
      if (nextDate && nextResource) {
        setFocusedCell({ resourceId: nextResource, dateStr: nextDate });
      }
    }
  }, [days, showWeekends, onCellDragStart]);

  const headerCells = days.slice(0, 7).map((day, i) => (
    <div
      key={weekdayLabels[i]}
      role="columnheader"
      data-slot="calendar-cell"
      className="flex-1 text-center text-xs font-medium text-muted-foreground py-1 border-b"
    >
      {weekdayLabels[i]}
    </div>
  ));

  const displayResources = useMemo(
    () => resources.length === 0
      ? [{ id: '_default', text: '', title: '' }]
      : resources,
    [resources],
  );

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
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: `${vItem.size}px`,
            transform: `translateY(${vItem.start}px)`,
          }}
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

              const weekendAttr = weekend && !today ? 'true' : undefined;
              const todayAttr = today ? 'true' : undefined;

              const isFirstResource = resourceIndex === 0;
              const isFirstDay = days.indexOf(day) === 0;
              const cellTabIndex = focusedCell
                ? (focusedCell.resourceId === resource.id && focusedCell.dateStr === dateStr ? 0 : -1)
                : (isFirstResource && isFirstDay ? 0 : -1);

              return (
                <div
                  key={dateStr}
                  role="gridcell"
                  tabIndex={cellTabIndex}
                  aria-label={`${day.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${today ? ', today' : ''}${weekend ? ', weekend' : ''}`}
                  aria-current={today ? 'date' : undefined}
                  data-slot="calendar-cell"
                  data-date={dateStr}
                  data-resource={resource.id}
                  data-empty={!isCurrentMonth ? 'true' : undefined}
                  data-weekend={weekendAttr}
                  data-today={todayAttr}
                  className={cn(
                    'flex-1 min-w-0 relative border-r last:border-r-0',
                    today && 'bg-blue-50 ring-2 ring-inset ring-blue-400 font-semibold',
                    weekend && 'bg-gray-50/50',
                  )}
                  onPointerDown={(pe) => handleCellPointerDown(dateStr, resource.id, pe)}
                  onKeyDown={(e) => handleDateCellKeyDown(e, dateStr, resource.id)}
                >
                  {dayEvents.length === 0 || (dayEvents.length === 1 && dayEvents[0].overflowCount) ? (
                    <div className="text-[10px] text-gray-300 flex items-center justify-center h-full">
                      {!isCurrentMonth ? null : null}
                    </div>
                  ) : (
                    <>
                      {dayEvents.filter(pe => !pe.overflowCount).map((pe) => (
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
                          className={eventClassName}
                        />
                      ))}
                      {dayEvents.filter(pe => pe.overflowCount).map((pe) => (
                        <div
                          key={`overflow-${dateStr}`}
                          data-slot="calendar-event-overflow"
                          className="absolute bottom-0 left-0 right-0 text-[10px] text-muted-foreground text-center cursor-pointer hover:underline"
                          style={{ bottom: 0 }}
                        >
                          +{pe.overflowCount} {t('scheduling.calendar.more')}
                        </div>
                      ))}
                    </>
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
  }, [displayResources, days]);

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

import React from 'react';
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
  /** [G4-R3-视角11-02] 长 按/键盘创建入口——与月视图同能力，三视图一致。 */
  onCellDragStart?: (date: string, resourceId: string, pointerEvent: React.PointerEvent) => void;
  onCellKeyboardCreate?: (date: string, resourceId: string) => void;
  onEventKeyDown?: (e: React.KeyboardEvent, event: CalendarEvent) => void;
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
  onCellDragStart,
  onCellKeyboardCreate,
  onEventKeyDown,
  locale = 'en-US',
}: CalendarWeekViewProps & { locale?: string }) {
  const { start, end } = getWeekStartEnd(currentDate, firstDayOfWeek);
  const days = getDateRange(start, end);

  const totalHours = dayEndHour - dayStartHour;

  const hours = Array.from({ length: totalHours }, (_, i) => dayStartHour + i);

  const displayResources = resources.length === 0
    ? [{ id: '_default', text: '', title: '' }]
    : resources;

  const positionedByDay = (() => {
    const result = new Map<string, Map<string, ReturnType<typeof allocateConcurrentWidths>>>();
    for (const resource of displayResources) {
      const resourceMap = new Map<string, ReturnType<typeof allocateConcurrentWidths>>();
      for (const day of days) {
        const dateStr = toISODateString(day);
        const dayEvents = events.filter((evt) => {
          const evtStart = evt.start.split('T')[0] ?? evt.start;
          const evtEnd = evt.end.split('T')[0] ?? evt.end;
          return dateStr >= evtStart && dateStr <= evtEnd && (evt.resourceId ?? '_default') === (resource.id ?? '_default');
        });
        resourceMap.set(dateStr, allocateConcurrentWidths(dayEvents, dayStartHour, dayEndHour, maxConcurrent));
      }
      result.set(resource.id, resourceMap);
    }
    return result;
  })();

  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2026, 0, 4 + i)));
  const displayDays = showWeekends ? days : days.filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);

  // [G4-R3-视角9-01] gridcell keyboard model (mirrors the month view): the
  // focusable cells previously had zero onKeyDown, so keyboard users could
  // reach a cell but never move between them. Left/Right walk days, Up/Down
  // walk resource rows.
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const grid = e.currentTarget.closest('[role="grid"]');
    if (!grid) return;
    const cells = Array.from(
      grid.querySelectorAll<HTMLElement>('[role="gridcell"][data-slot="calendar-cell"]'),
    );
    const currentIdx = cells.indexOf(e.currentTarget);
    if (currentIdx < 0) return;
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
      case 'ArrowDown':
        e.preventDefault();
        nextIdx = Math.min(currentIdx + displayDays.length, cells.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIdx = Math.max(currentIdx - displayDays.length, 0);
        break;
      case 'Enter':
      case ' ':
        // [G4-R3-视角11-02] 键盘创建直接进入创建会话，不经长按定时器。
        e.preventDefault();
        onCellKeyboardCreate?.(
          e.currentTarget.getAttribute('data-date') ?? '',
          e.currentTarget.getAttribute('data-resource') ?? '',
        );
        return;
      default:
        return;
    }
    if (nextIdx !== currentIdx) {
      cells[nextIdx]?.focus();
    }
  };

  return (
    <div data-slot="calendar-matrix" role="grid" aria-label={t('scheduling.calendar.weekViewLabel')} className="flex flex-col overflow-auto">
      <div role="row" className="flex border-b sticky top-0 bg-background z-10">
        <div className="w-12 shrink-0" />
        {displayDays.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={toISODateString(day)}
              role="columnheader"
              aria-label={day.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
              aria-current={today ? 'date' : undefined}
              data-slot="calendar-cell"
              data-date={toISODateString(day)}
              data-today={today ? 'true' : undefined}
              className={cn(
                'flex-1 text-center text-xs font-medium py-1 border-r last:border-r-0',
                today && 'font-bold',
              )}
            >
              <div>{day.getUTCDate()}</div>
              <div className="text-muted-foreground">
                {weekdayLabels[day.getUTCDay()]}
              </div>
            </div>
          );
        })}
      </div>

      <div role="rowgroup">
      {displayResources.map((resource) => (
        <div key={resource.id} role="row" data-slot="calendar-resource-row" data-resource-id={resource.id}>
          <div className="flex" style={{ minHeight: `${totalHours * HOUR_HEIGHT}px` }}>
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

            {displayDays.map((day) => {
              const dateStr = toISODateString(day);
              const resourceMap = positionedByDay.get(resource.id);
              const positioned = resourceMap?.get(dateStr) ?? [];

              return (
                <div
                  key={dateStr}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${dateStr} ${resource.title || resource.text}`}
                  data-slot="calendar-cell"
                  data-date={dateStr}
                  data-resource={resource.id}
                  className="flex-1 relative border-r last:border-r-0"
                  onPointerDown={(pe) => {
                    // [G4-R3-视角11-02] 空格长按创建入口（与月视图 onCellDragStart 同通道）。
                    if (pe.button !== 0) return;
                    onCellDragStart?.(dateStr, resource.id, pe);
                  }}
                  onKeyDown={handleCellKeyDown}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      aria-label={`${dateStr} ${String(hour).padStart(2, '0')}:00`}
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
                        onKeyDown={onEventKeyDown}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      </div>

    </div>
  );
}

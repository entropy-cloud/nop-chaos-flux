import React from 'react';
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
  /** [G4-R3-视角11-02] 长按/键盘创建入口——与月/周视图同能力。 */
  onCellDragStart?: (date: string, resourceId: string, pointerEvent: React.PointerEvent) => void;
  onCellKeyboardCreate?: (date: string, resourceId: string) => void;
  onEventKeyDown?: (e: React.KeyboardEvent, event: CalendarEvent) => void;
  locale?: string;
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
  onCellDragStart,
  onCellKeyboardCreate,
  onEventKeyDown,
  locale = 'en-US',
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

  // [G4-R3-视角9-01] focusable hour gridcells previously had zero onKeyDown.
  // Up/Down walk hours within a resource row; Left/Right walk resource rows.
  const handleHourCellKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const grid = e.currentTarget.closest('[role="grid"]');
    if (!grid) return;
    const cells = Array.from(grid.querySelectorAll<HTMLElement>('[role="gridcell"]'));
    const currentIdx = cells.indexOf(e.currentTarget);
    if (currentIdx < 0) return;
    let nextIdx = currentIdx;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIdx = Math.min(currentIdx + 1, cells.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIdx = Math.max(currentIdx - 1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextIdx = Math.min(currentIdx + totalHours, cells.length - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIdx = Math.max(currentIdx - totalHours, 0);
        break;
      default:
        return;
    }
    if (nextIdx !== currentIdx) {
      cells[nextIdx]?.focus();
    }
  };

  return (
    <div data-slot="calendar-matrix" role="grid" aria-label={t('scheduling.calendar.dayViewLabel')} className="flex flex-col overflow-auto">
      <div
        role="rowheader"
        data-slot="calendar-cell"
        data-date={dateStr}
        data-today={today ? 'true' : undefined}
        aria-current={today ? 'date' : undefined}
        className="sticky top-0 bg-background z-10 text-center text-sm font-medium py-2 border-b"
      >
        {currentDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
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
                aria-label={t('scheduling.calendar.scheduleFor', { date: `${resource.title || resource.text} ${dateStr}` })}
                className="relative border-b last:border-b-0"
                style={{ minHeight: `${totalHours * HOUR_HEIGHT}px` }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${String(hour).padStart(2, '0')}:00 for ${resource.title || resource.text}`}
                    // [G4-R3-视角11-02] data-slot/date/resource 使
                    // getCellFromPoint 在日视图长按拖拽创建会话中可解析格子。
                    data-slot="calendar-cell"
                    data-date={dateStr}
                    data-resource={resource.id}
                    className="border-b border-border"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onPointerDown={(pe) => {
                      if (pe.button !== 0) return;
                      onCellDragStart?.(dateStr, resource.id, pe);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCellKeyboardCreate?.(dateStr, resource.id);
                        return;
                      }
                      handleHourCellKeyDown(e);
                    }}
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

    </div>
  );
}

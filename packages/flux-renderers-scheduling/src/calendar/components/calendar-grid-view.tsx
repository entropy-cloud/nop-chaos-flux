import { useState } from 'react';
import { cn } from '@nop-chaos/ui';
import { formatDate, getSixWeekGrid, isSameDay, isToday, toISODateString } from '../utils/calendar-date-utils.js';

export interface CalendarGridViewProps {
  currentDate: Date;
  firstDayOfWeek: 0 | 1;
  locale?: string;
  onDateSelect?: (payload: { date: string; inMonth: boolean }) => void;
}

/**
 * Booker-style six-week vertical date-selection grid (L4.2 monthShape:'grid').
 * Pure selection surface: no events, resources, drag-create or keyboard-create.
 * Selection is internal state + onDateSelect dispatch — it never navigates
 * (currentDate/dateOwnership untouched, adjudication §1.4).
 */
export function CalendarGridView({ currentDate, firstDayOfWeek, locale, onDateSelect }: CalendarGridViewProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = getSixWeekGrid(currentDate, firstDayOfWeek);
  const weekdays = days.slice(0, 7);
  const localeTag = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

  const handleSelect = (day: Date) => {
    const iso = toISODateString(day);
    setSelected(iso);
    onDateSelect?.({ date: iso, inMonth: isSameDay(day, currentDate) || day.getUTCMonth() === currentDate.getUTCMonth() });
  };

  return (
    <div className="nop-calendar-grid flex-1 overflow-auto p-2" data-slot="calendar-grid">
      <div role="grid" className="grid grid-cols-7 gap-1">
        <div role="row" data-slot="calendar-grid-weekdays" className="contents">
        {weekdays.map((day) => (
          <div
            key={toISODateString(day)}
            role="columnheader"
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {day.toLocaleDateString(localeTag, { weekday: 'short' })}
          </div>
        ))}
        </div>
        {days.map((day) => {
          const iso = toISODateString(day);
          const outsideMonth = day.getUTCMonth() !== currentDate.getUTCMonth();
          const selectedDay = selected === iso;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              data-slot="calendar-grid-cell"
              data-date={iso}
              data-outside-month={outsideMonth || undefined}
              data-today={isToday(day) || undefined}
              data-selected={selectedDay || undefined}
              aria-label={formatDate(day, locale)}
              className={cn(
                'flex h-16 flex-col items-center justify-start rounded-md border p-1 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
                outsideMonth && 'text-muted-foreground/50',
                selectedDay && 'border-primary bg-primary/10',
              )}
              onClick={() => handleSelect(day)}
            >
              <span className={cn('text-xs', isToday(day) && 'font-bold text-primary')}>{day.getUTCDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

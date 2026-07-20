import React, { useImperativeHandle } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { CalendarSchema, CalendarView, CalendarEvent, CalendarResource } from '../schemas.js';
import { useCalendarState } from './hooks/use-calendar-state.js';
import { useCalendarNavigation } from './hooks/use-calendar-navigation.js';
import { useCalendarVirtualizer } from './hooks/use-calendar-virtualizer.js';
import { CalendarHeader } from './components/calendar-header.js';
import { CalendarMonthView } from './components/calendar-month-view.js';
import { CalendarWeekView } from './components/calendar-week-view.js';
import { CalendarDayView } from './components/calendar-day-view.js';
import { parseISODate } from './utils/calendar-date-utils.js';

export interface CalendarHandle {
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  setView: (view: CalendarView) => void;
  scrollToDate: (date: string) => void;
}

export function Calendar(props: RendererComponentProps<CalendarSchema> & { ref?: React.Ref<CalendarHandle> }) {
  const { ref, props: resolved, meta, regions, events } = props;

  const initialDate = resolved.date
    ? (parseISODate(resolved.date as string) ?? new Date())
    : new Date();
  const activeView = (resolved.view as CalendarView) ?? 'month';
  const firstDayOfWeek = (resolved.firstDayOfWeek as 0 | 1) ?? 0;
  const showWeekends = resolved.showWeekends !== false;
  const maxConcurrent = (resolved.maxConcurrent as number) ?? 4;

  const eventsData = (resolved.events as CalendarSchema['events']) ?? [];
  const resourcesData = (resolved.resources as CalendarSchema['resources']) ?? [];

  const dayStartHour = 8;
  const dayEndHour = 20;

  const { currentDate, dateRange, setCurrentDate, setActiveView } = useCalendarState({
    initialDate,
    initialView: activeView,
    firstDayOfWeek,
    onDateChange: (date: Date) => {
      events.onDateChange?.({ date: date.toISOString(), view: activeView });
    },
    onViewChange: (view: CalendarView) => {
      events.onViewChange?.({ view, date: currentDate.toISOString() });
    },
  });

  const navigation = useCalendarNavigation({
    currentDate,
    activeView,
    onDateChange: setCurrentDate,
  });

  useImperativeHandle(
    ref,
    () => ({
      goNext: navigation.goNext,
      goPrev: navigation.goPrev,
      goToday: navigation.goToday,
      setView: (view: CalendarView) => setActiveView(view),
      scrollToDate: (date: string) => {
        const parsed = parseISODate(date);
        if (parsed) setCurrentDate(parsed);
      },
    }),
    [navigation, setActiveView, setCurrentDate],
  );

  const displayResources = resourcesData.length === 0
    ? [{ id: '_default', text: '', title: '' } as CalendarResource]
    : resourcesData;

  const { scrollRef, virtualItems, totalSize } = useCalendarVirtualizer({
    count: displayResources.length,
  });

  if (!meta.visible) return null;

  const onEventClick = (payload: { event: CalendarEvent; resource?: CalendarResource; date: string }) => {
    events.onEventClick?.(payload);
  };

  return (
    <div
      className={cn('nop-calendar flex flex-col', meta.className)}
      data-view={activeView}
      data-date={currentDate.toISOString().split('T')[0]}
      data-testid={meta.testid || undefined}
      data-cid={meta.cid || undefined}
    >
      <CalendarHeader
        currentDate={currentDate}
        activeView={activeView}
        navigation={navigation}
        onViewChange={setActiveView}
        className={resolved.headerClassName as string | undefined}
      />

      {activeView === 'month' && (
        <div ref={scrollRef} className="overflow-auto flex-1">
          <CalendarMonthView
            events={eventsData}
            resources={displayResources}
            dateRange={dateRange}
            currentDate={currentDate}
            firstDayOfWeek={firstDayOfWeek}
            showWeekends={showWeekends}
            maxConcurrent={maxConcurrent}
            eventTemplate={regions.eventTemplate ?? undefined}
            onEventClick={onEventClick}
            virtualItems={virtualItems}
            totalSize={totalSize}
          />
        </div>
      )}

      {activeView === 'week' && (
        <CalendarWeekView
          events={eventsData}
          resources={displayResources}
          currentDate={currentDate}
          firstDayOfWeek={firstDayOfWeek}
          showWeekends={showWeekends}
          maxConcurrent={maxConcurrent}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          eventTemplate={regions.eventTemplate ?? undefined}
          onEventClick={onEventClick}
        />
      )}

      {activeView === 'day' && (
        <CalendarDayView
          events={eventsData}
          resources={displayResources}
          currentDate={currentDate}
          maxConcurrent={maxConcurrent}
          dayStartHour={dayStartHour}
          dayEndHour={dayEndHour}
          eventTemplate={regions.eventTemplate ?? undefined}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

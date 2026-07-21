import React, { useImperativeHandle, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn, Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useFocusTrap } from './hooks/use-focus-trap.js';
import type { CalendarSchema, CalendarView, CalendarEvent, CalendarResource } from '../schemas.js';
import { useCalendarState } from './hooks/use-calendar-state.js';
import { useCalendarNavigation } from './hooks/use-calendar-navigation.js';
import { useCalendarVirtualizer } from './hooks/use-calendar-virtualizer.js';
import { useCalendarDrag } from './hooks/use-calendar-drag.js';
import { useCalendarDragCreate } from './hooks/use-calendar-drag-create.js';
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
  exportToPNG?: () => void;
  exportToPrint?: () => void;
}

const DEFAULT_SHIFT_TYPES = [
  { type: 'shift', label: t('scheduling.calendar.morningShift'), color: 'var(--color-calendar-shift, #4ade80)' },
  { type: 'leave', label: t('scheduling.calendar.leave'), color: 'var(--color-calendar-leave, #f87171)' },
  { type: 'appointment', label: t('scheduling.calendar.appointment'), color: 'var(--color-calendar-appointment, #60a5fa)' },
  { type: 'maintenance', label: t('scheduling.calendar.maintenance'), color: 'var(--color-calendar-maintenance, #fbbf24)' },
];

export function Calendar(props: RendererComponentProps<CalendarSchema> & { ref?: React.Ref<CalendarHandle> }) {
  const { ref, props: resolved, meta, regions, events } = props;

  useEffect(() => {
    events.onMount?.({});
    return () => { events.onUnmount?.({}); };
  }, [events]);

  const initialDate = resolved.date
    ? (parseISODate(resolved.date as string) ?? new Date())
    : new Date();
  const activeView = (resolved.view as CalendarView) ?? 'month';
  const firstDayOfWeek = (resolved.firstDayOfWeek as 0 | 1) ?? 0;
  const showWeekends = resolved.showWeekends !== false;
  const maxConcurrent = (resolved.maxConcurrent as number) ?? 4;
  const showCrossDayLines = resolved.showCrossDayLines !== false;

  const eventsData = useMemo(() => (resolved.events as CalendarSchema['events']) ?? [], [resolved.events]);
  const resourcesData = useMemo(() => (resolved.resources as CalendarSchema['resources']) ?? [], [resolved.resources]);

  const dayStartHour = 8;
  const dayEndHour = 20;

  const [confirmDialog, setConfirmDialog] = useState<{
    event: CalendarEvent;
    targetDate: string;
    targetResource: string;
  } | null>(null);

  const calendarRef = useRef<HTMLDivElement | null>(null);

  const getCellFromPoint = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest('[data-slot="calendar-cell"]');
    if (!cell) return null;
    const date = cell.getAttribute('data-date');
    const resourceId = cell.getAttribute('data-resource');
    if (!date || !resourceId) return null;
    return { date, resourceId };
  }, []);

  const handleSwapConfirm = useCallback((payload: {
    eventId: string;
    fromResource: string;
    toResource: string;
    fromDate: string;
    toDate: string;
    event: CalendarEvent;
  }) => {
    setConfirmDialog({
      event: payload.event,
      targetDate: payload.toDate,
      targetResource: payload.toResource,
    });
  }, []);

  const executeSwap = useCallback(() => {
    if (!confirmDialog) return;
    events.onEventChange?.({
      eventId: confirmDialog.event.id,
      fromResource: confirmDialog.event.resourceId ?? '',
      toResource: confirmDialog.targetResource,
      fromDate: confirmDialog.event.start.split('T')[0] ?? confirmDialog.event.start,
      toDate: confirmDialog.targetDate,
      event: confirmDialog.event,
    });
    setConfirmDialog(null);
  }, [confirmDialog, events]);

  const cancelSwap = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const handleDragCreateEvent = useCallback((payload: {
    title: string;
    type: string;
    start: string;
    end: string;
    resourceId: string;
  }) => {
    const newEvent: CalendarEvent = {
      id: `new-${Date.now()}`,
      title: payload.title,
      start: payload.start,
      end: payload.end,
      type: payload.type,
      resourceId: payload.resourceId,
      color: DEFAULT_SHIFT_TYPES.find(t => t.type === payload.type)?.color,
    };
    events.onEventCreate?.({ event: newEvent });
    events.onEventChange?.({ event: newEvent, type: 'create' });
  }, [events]);

  const [keyboardDragEventId, setKeyboardDragEventId] = useState<string | null>(null);

  const handleKeyboardMoveEvent = useCallback((eventId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const event = eventsData.find((e) => e.id === eventId);
    if (!event) return;
    const dayDelta = 1;
    const oldStart = new Date(event.start.split('T')[0]);
    const oldEnd = new Date((event.end || event.start).split('T')[0]);
    let newStart: Date;
    let newEnd: Date;
    switch (direction) {
      case 'left':
        newStart = new Date(oldStart);
        newStart.setDate(newStart.getDate() - dayDelta);
        newEnd = new Date(oldEnd);
        newEnd.setDate(newEnd.getDate() - dayDelta);
        break;
      case 'right':
        newStart = new Date(oldStart);
        newStart.setDate(newStart.getDate() + dayDelta);
        newEnd = new Date(oldEnd);
        newEnd.setDate(newEnd.getDate() + dayDelta);
        break;
      case 'up': {
        const resourceIdx = resourcesData.findIndex((r) => r.id === event.resourceId);
        if (resourceIdx > 0) {
          const prevResource = resourcesData[resourceIdx - 1];
          events.onEventChange?.({
            eventId: event.id,
            fromResource: event.resourceId ?? '',
            toResource: prevResource.id,
            fromDate: event.start.split('T')[0] ?? event.start,
            toDate: event.start.split('T')[0] ?? event.start,
            event,
          });
        }
        return;
      }
      case 'down': {
        const resourceIdx = resourcesData.findIndex((r) => r.id === event.resourceId);
        if (resourceIdx < resourcesData.length - 1) {
          const nextResource = resourcesData[resourceIdx + 1];
          events.onEventChange?.({
            eventId: event.id,
            fromResource: event.resourceId ?? '',
            toResource: nextResource.id,
            fromDate: event.start.split('T')[0] ?? event.start,
            toDate: event.start.split('T')[0] ?? event.start,
            event,
          });
        }
        return;
      }
    }
    events.onEventChange?.({
      eventId: event.id,
      fromResource: event.resourceId ?? '',
      toResource: event.resourceId ?? '',
      fromDate: event.start.split('T')[0] ?? event.start,
      toDate: newStart.toISOString().slice(0, 10),
      event,
    });
  }, [eventsData, resourcesData, events]);

  const dragSwap = useCalendarDrag({
    events: eventsData,
    resources: resourcesData,
    onEventChange: handleSwapConfirm,
    getCellFromPoint,
    onKeyboardMoveEvent: handleKeyboardMoveEvent,
  });

  const handleEventKeyDown = useCallback((e: React.KeyboardEvent, event: CalendarEvent) => {
    if (keyboardDragEventId) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          dragSwap.moveKeyboardDrag('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          dragSwap.moveKeyboardDrag('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          dragSwap.moveKeyboardDrag('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          dragSwap.moveKeyboardDrag('right');
          break;
        case 'Escape':
          e.preventDefault();
          dragSwap.cancelKeyboardDrag();
          setKeyboardDragEventId(null);
          break;
        case 'Enter':
          e.preventDefault();
          dragSwap.confirmKeyboardDrop();
          setKeyboardDragEventId(null);
          break;
      }
    } else {
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        dragSwap.startKeyboardDrag(event);
        setKeyboardDragEventId(event.id);
      }
    }
  }, [keyboardDragEventId, dragSwap]);

  const dragCreate = useCalendarDragCreate({
    onEventCreate: handleDragCreateEvent,
    getCellFromPoint,
    longPressMs: 500,
  });

  const { currentDate, dateRange, setCurrentDate, setActiveView } = useCalendarState({
    initialDate,
    initialView: activeView,
    firstDayOfWeek,
    onDateChange: (date: Date) => {
      events.onDateChange?.({ date: date.toISOString(), view: activeViewRef.current });
    },
    onViewChange: (view: CalendarView) => {
      events.onViewChange?.({ view, date: currentDateRef.current.toISOString() });
    },
  });

  const activeViewRef = useRef(activeView);
  const currentDateRef = useRef(currentDate);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  const navigation = useCalendarNavigation({
    currentDate,
    activeView,
    onDateChange: setCurrentDate,
  });

  const prevDateRef = useRef<string | undefined>(resolved.date as string | undefined);
  useEffect(() => {
    const dateStr = resolved.date as string | undefined;
    if (dateStr && dateStr !== prevDateRef.current) {
      prevDateRef.current = dateStr;
      const parsed = parseISODate(dateStr);
      if (parsed && parsed.getTime() !== currentDateRef.current.getTime()) {
        setCurrentDate(parsed);
      }
    }
  }, [resolved.date, setCurrentDate]);

  const prevViewRef = useRef<string | undefined>(resolved.view as string | undefined);
  useEffect(() => {
    const viewStr = resolved.view as string | undefined;
    if (viewStr && viewStr !== prevViewRef.current) {
      prevViewRef.current = viewStr;
      const view = viewStr as CalendarView;
      if (view !== activeViewRef.current) {
        setActiveView(view);
      }
    }
  }, [resolved.view, setActiveView]);

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
      ref={calendarRef}
      className={cn('nop-calendar flex flex-col', meta.className)}
      data-view={activeView}
      data-date={currentDate.toISOString().split('T')[0]}
      data-testid={meta.testid || undefined}
      data-cid={meta.cid || undefined}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Viewing ${activeView} view, ${eventsData.length} events`}
      </div>
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
            onDragStart={dragSwap.startDrag}
            onCellDragStart={dragCreate.startCellDrag}
            showCrossDayLines={showCrossDayLines}
            onEventKeyDown={handleEventKeyDown}
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
          onDragStart={dragSwap.startDrag}
          onEventKeyDown={handleEventKeyDown}
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
          onDragStart={dragSwap.startDrag}
          onEventKeyDown={handleEventKeyDown}
        />
      )}

      {dragSwap.dragState.active && (
        <div
          className="nop-calendar-drag-ghost"
          style={{
            position: 'fixed',
            left: dragSwap.dragState.currentX - 60,
            top: dragSwap.dragState.currentY - 20,
          }}
        >
          {dragSwap.dragState.sourceEvent?.title ?? ''}
        </div>
      )}

      {dragCreate.showTypeSelector && (
        <CalendarOverlay
          onEscape={dragCreate.dismissTypeSelector}
          onClick={dragCreate.dismissTypeSelector}
          ariaLabel={t('scheduling.calendar.selectType')}
        >
          <div
            className="nop-calendar-type-selector"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') dragCreate.dismissTypeSelector(); e.stopPropagation(); }}
          >
            <div className="nop-calendar-type-selector-title">
              {t('scheduling.calendar.selectType')}
            </div>
            <div className="nop-calendar-type-selector-list">
              {DEFAULT_SHIFT_TYPES.map((st) => (
                <Button
                  key={st.type}
                  type="button"
                  className="nop-calendar-type-selector-btn"
                  style={{ backgroundColor: st.color }}
                  onClick={() => dragCreate.selectType(st.type)}
                >
                  {st.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              type="button"
              className="nop-calendar-type-selector-cancel"
              onClick={dragCreate.dismissTypeSelector}
            >
              {t('flux.common.cancel')}
            </Button>
          </div>
        </CalendarOverlay>
      )}

      {confirmDialog && (
        <CalendarOverlay
          onEscape={cancelSwap}
          onClick={cancelSwap}
          ariaLabel={t('scheduling.calendar.confirmMove')}
        >
          <div
            className="nop-calendar-confirm-dialog"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') cancelSwap(); e.stopPropagation(); }}
          >
            <div className="nop-calendar-confirm-title">
              {t('scheduling.calendar.confirmMove')}
            </div>
            <div className="nop-calendar-confirm-body">
              {t('scheduling.calendar.moveConfirm', {
                title: confirmDialog.event.title,
                date: confirmDialog.targetDate,
                resource: confirmDialog.targetResource,
              })}
            </div>
            <div className="nop-calendar-confirm-actions">
              <Button variant="outline" type="button" onClick={cancelSwap}>
                {t('flux.common.cancel')}
              </Button>
              <Button type="button" onClick={executeSwap}>
                {t('flux.common.confirm')}
              </Button>
            </div>
          </div>
        </CalendarOverlay>
      )}
    </div>
  );
}

interface CalendarOverlayProps {
  children: React.ReactNode;
  onEscape: () => void;
  onClick: () => void;
  ariaLabel: string;
}

function CalendarOverlay({ children, onEscape, onClick, ariaLabel }: CalendarOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef, true);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="nop-calendar-overlay"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onEscape();
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

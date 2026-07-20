import React, { useImperativeHandle, useCallback, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
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
  { type: 'shift', label: '早班', color: '#4ade80' },
  { type: 'leave', label: '休假', color: '#f87171' },
  { type: 'appointment', label: '预约', color: '#60a5fa' },
  { type: 'maintenance', label: '维保', color: '#fbbf24' },
];

export function Calendar(props: RendererComponentProps<CalendarSchema> & { ref?: React.Ref<CalendarHandle> }) {
  const { ref, props: resolved, meta, regions, events } = props;

  const initialDate = resolved.date
    ? (parseISODate(resolved.date as string) ?? new Date())
    : new Date();
  const activeView = (resolved.view as CalendarView) ?? 'month';
  const firstDayOfWeek = (resolved.firstDayOfWeek as 0 | 1) ?? 0;
  const showWeekends = resolved.showWeekends !== false;
  const maxConcurrent = (resolved.maxConcurrent as number) ?? 4;
  const showCrossDayLines = resolved.showCrossDayLines !== false;

  const eventsData = (resolved.events as CalendarSchema['events']) ?? [];
  const resourcesData = (resolved.resources as CalendarSchema['resources']) ?? [];

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
    events.onEventChange?.({ event: newEvent, type: 'create' });
  }, [events]);

  const dragSwap = useCalendarDrag({
    events: eventsData,
    resources: resourcesData,
    onEventChange: handleSwapConfirm,
    getCellFromPoint,
  });

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
      ref={calendarRef}
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
            onDragStart={dragSwap.startDrag}
            onCellDragStart={dragCreate.startCellDrag}
            showCrossDayLines={showCrossDayLines}
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
        />
      )}

      {dragSwap.dragState.active && (
        <div
          className="nop-calendar-drag-ghost"
          style={{
            position: 'fixed',
            left: dragSwap.dragState.currentX - 60,
            top: dragSwap.dragState.currentY - 20,
            width: 120,
            height: 40,
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.85,
            backgroundColor: '#3b82f6',
            color: '#fff',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {dragSwap.dragState.sourceEvent?.title ?? ''}
        </div>
      )}

      {dragCreate.showTypeSelector && (
        <div
          className="nop-calendar-type-selector-overlay"
          role="dialog"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') dragCreate.dismissTypeSelector(); }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={dragCreate.dismissTypeSelector}
        >
          <div
            className="nop-calendar-type-selector"
            role="presentation"
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
              选择班次类型
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEFAULT_SHIFT_TYPES.map((st) => (
                <button
                  type="button"
                  key={st.type}
                  style={{
                    backgroundColor: st.color,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onClick={() => dragCreate.selectType(st.type)}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              style={{
                marginTop: 12,
                border: 'none',
                background: 'none',
                color: '#666',
                cursor: 'pointer',
                width: '100%',
                padding: 8,
                fontSize: 13,
              }}
              onClick={dragCreate.dismissTypeSelector}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div
          className="nop-calendar-confirm-overlay"
          role="dialog"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') cancelSwap(); }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={cancelSwap}
        >
          <div
            role="presentation"
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              minWidth: 280,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
              确认移动排班
            </div>
            <div style={{ fontSize: 13, marginBottom: 16, color: '#333' }}>
              将 {confirmDialog.event.title} 移到 {confirmDialog.targetDate} {confirmDialog.targetResource}?
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{
                  border: '1px solid #d0d5dd',
                  borderRadius: 4,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={cancelSwap}
              >
                取消
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={executeSwap}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

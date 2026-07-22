/**
 * State management rationale for Calendar (hooks-based):
 * Calendar state is highly localized — view selection (month/week/day), date
 * navigation, drag interaction, and virtual scrolling each belong to isolated
 * concerns. Custom hooks (useCalendarState, useCalendarDrag, etc.) keep each
 * concern self-contained without a global store or Context. This avoids
 * unnecessary re-renders when only one axis of state changes.
 * Gantt uses Zustand + Context (deeper tree, cross-component subscriptions).
 * Kanban uses useState + imperative callbacks (flatter tree, snapshot undo).
 */
import React, { useImperativeHandle, useRef, useState, useEffect } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
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
import { CalendarConfirmDialog } from './components/calendar-confirm-dialog.js';
import { CalendarDragTypeSelector } from './components/calendar-drag-type-selector.js';
import { useCalendarExport } from './hooks/use-calendar-export.js';
import { parseISODate } from './utils/calendar-date-utils.js';
import './utils/calendar-print.css';

function flattenResources(resources: CalendarResource[]): CalendarResource[] {
  const result: CalendarResource[] = [];
  for (const r of resources) {
    result.push(r);
    if (r.resources && r.resources.length > 0) {
      result.push(...flattenResources(r.resources));
    }
  }
  return result;
}

export interface CalendarHandle {
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  setView: (view: CalendarView) => void;
  scrollToDate: (date: string) => void;
  exportToPNG?: (element?: HTMLElement | null, fileName?: string, signal?: AbortSignal) => Promise<void>;
  exportToPrint?: () => void;
}

const DEFAULT_SHIFT_TYPES = [
  { type: 'shift', label: t('scheduling.calendar.morningShift'), color: 'var(--color-calendar-shift, #4ade80)' },
  { type: 'leave', label: t('scheduling.calendar.leave'), color: 'var(--color-calendar-leave, #f87171)' },
  { type: 'appointment', label: t('scheduling.calendar.appointment'), color: 'var(--color-calendar-appointment, #60a5fa)' },
  { type: 'maintenance', label: t('scheduling.calendar.maintenance'), color: 'var(--color-calendar-maintenance, #fbbf24)' },
];

export function Calendar(props: RendererComponentProps<CalendarSchema> & { ref?: React.Ref<CalendarHandle> }) {
  const { ref, props: resolved, meta, regions, events, helpers: _helpers } = props;
  const _runtime = useRendererRuntime();
  const _scope = useRenderScope();

  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);
  const reactionsRef = useRef(props.reactions);
  useEffect(() => { reactionsRef.current = props.reactions; }, [props.reactions]);

  useEffect(() => {
    void eventsRef.current.onMount?.({});
    void eventsRef.current.loadAction?.({});
    return () => { void eventsRef.current.onUnmount?.({}); };
  }, []);

  const initialDate = resolved.date
    ? (parseISODate(resolved.date as string) ?? new Date())
    : new Date();
  const initialView = (resolved.view as CalendarView) ?? 'month';
  const firstDayOfWeek = (resolved.firstDayOfWeek as 0 | 1) ?? 0;
  const showWeekends = resolved.showWeekends !== false;
  const maxConcurrent = (resolved.maxConcurrent as number) ?? 4;
  const showCrossDayLines = resolved.showCrossDayLines !== false;

  const eventsData = (resolved.events as CalendarSchema['events']) ?? (resolved as any).data as CalendarEvent[] ?? [];
  const resourcesData = (resolved.resources as CalendarSchema['resources']) ?? [];
  if ((resolved as any).data != null && resolved.events == null && typeof console !== 'undefined') {
    console.warn('Calendar: `data` field is deprecated, use `events` instead');
  }

  const dayStartHour = 8;
  const dayEndHour = 20;

  const [confirmDialog, setConfirmDialog] = useState<{
    event: CalendarEvent;
    targetDate: string;
    targetResource: string;
  } | null>(null);

  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarExport = useCalendarExport(calendarRef);

  const viewOwnership = (resolved.viewOwnership as string) ?? 'local';
  const dateOwnership = (resolved.dateOwnership as string) ?? 'local';
  const viewStatePath = resolved.viewStatePath as string | undefined;
  const dateStatePath = resolved.dateStatePath as string | undefined;

  const scope = useRenderScope();

  const isScopeView = viewOwnership === 'scope' && !!viewStatePath;
  const isScopeDate = dateOwnership === 'scope' && !!dateStatePath;

  const scopeViewRaw = useScopeSelector((s: Record<string, unknown>) => {
    if (!isScopeView || !viewStatePath) return undefined;
    const keys = viewStatePath.split('.');
    let val: unknown = s;
    for (const k of keys) { if (val && typeof val === 'object') val = (val as Record<string, unknown>)[k]; else return undefined; }
    return val as CalendarView | undefined;
  });

  const scopeDateRaw = useScopeSelector((s: Record<string, unknown>) => {
    if (!isScopeDate || !dateStatePath) return undefined;
    const keys = dateStatePath.split('.');
    let val: unknown = s;
    for (const k of keys) { if (val && typeof val === 'object') val = (val as Record<string, unknown>)[k]; else return undefined; }
    return val as string | undefined;
  });

  const scopeView = isScopeView ? scopeViewRaw : undefined;
  const scopeDate = isScopeDate ? scopeDateRaw : undefined;

  const controlledView = viewOwnership === 'controlled'
    ? (resolved.view as CalendarView) ?? 'month'
    : viewOwnership === 'scope' && scopeView
      ? scopeView
      : undefined;

  const controlledDate = dateOwnership === 'controlled'
    ? (resolved.date ? (parseISODate(resolved.date as string) ?? undefined) : undefined)
    : dateOwnership === 'scope' && scopeDate
      ? parseISODate(scopeDate)
      : undefined;

  const latestViewRef = useRef(controlledView ?? initialView);
  const latestDateRef = useRef(controlledDate ?? initialDate);

  const { currentDate, dateRange, activeView, setCurrentDate, setActiveView } = useCalendarState({
    initialDate,
    initialView,
    firstDayOfWeek,
    controlledView,
    controlledDate,
    onDateChange: (date: Date) => {
      if (dateOwnership === 'scope' && dateStatePath && scope) {
        scope.merge({ [dateStatePath]: date.toISOString().split('T')[0] });
      }
      void events.onDateChange?.({ date: date.toISOString(), view: latestViewRef.current });
    },
    onViewChange: (view: CalendarView) => {
      if (viewOwnership === 'scope' && viewStatePath && scope) {
        scope.merge({ [viewStatePath]: view });
      }
      void events.onViewChange?.({ view, date: latestDateRef.current.toISOString() });
    },
  });

  const navigation = useCalendarNavigation({
    currentDate,
    activeView,
    onDateChange: setCurrentDate,
  });

  useEffect(() => {
    latestViewRef.current = activeView;
  }, [activeView]);
  useEffect(() => {
    latestDateRef.current = currentDate;
  }, [currentDate]);

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
      exportToPNG: calendarExport.exportToPNG,
      exportToPrint: calendarExport.exportToPrint,
    }),
    [navigation, setActiveView, setCurrentDate, calendarExport],
  );

  const getCellFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest('[data-slot="calendar-cell"]');
    if (!cell) return null;
    const date = cell.getAttribute('data-date');
    const resourceId = cell.getAttribute('data-resource');
    if (!date || !resourceId) return null;
    return { date, resourceId };
  };

  const handleSwapConfirm = (payload: {
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
  };

  const executeSwap = () => {
    if (!confirmDialog) return;
    void events.onEventChange?.({
      eventId: confirmDialog.event.id,
      fromResource: confirmDialog.event.resourceId ?? '',
      toResource: confirmDialog.targetResource,
      fromDate: confirmDialog.event.start.split('T')[0] ?? confirmDialog.event.start,
      toDate: confirmDialog.targetDate,
      event: confirmDialog.event,
    });
    setConfirmDialog(null);
  };

  const cancelSwap = () => {
    setConfirmDialog(null);
  };

  const handleDragCreateEvent = (payload: {
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
    void events.onEventCreate?.({ event: newEvent });
  };

  const [keyboardDragEventId, setKeyboardDragEventId] = useState<string | null>(null);

  const handleKeyboardMoveEvent = (eventId: string, direction: 'up' | 'down' | 'left' | 'right') => {
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
          void events.onEventChange?.({
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
          void events.onEventChange?.({
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
    void events.onEventChange?.({
      eventId: event.id,
      fromResource: event.resourceId ?? '',
      toResource: event.resourceId ?? '',
      fromDate: event.start.split('T')[0] ?? event.start,
      toDate: newStart.toISOString().slice(0, 10),
      event,
    });
  };

  const dragSwap = useCalendarDrag({
    events: eventsData,
    resources: resourcesData,
    onEventChange: handleSwapConfirm,
    getCellFromPoint,
    onKeyboardMoveEvent: handleKeyboardMoveEvent,
  });

  const handleEventKeyDown = (e: React.KeyboardEvent, event: CalendarEvent) => {
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
  };

  const dragCreate = useCalendarDragCreate({
    onEventCreate: handleDragCreateEvent,
    getCellFromPoint,
    longPressMs: 500,
  });

  const [_resourceOpenMap, _setResourceOpenMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const r of resourcesData) {
      map[r.id] = r.open !== false;
    }
    return map;
  });

  const _handleGroupToggle = (groupId: string) => {
    _setResourceOpenMap((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      void eventsRef.current.onGroupToggle?.({ groupId, open: next[groupId] });
      return next;
    });
  };

  const displayResources = resourcesData.length === 0
    ? [{ id: '_default', text: '', title: '' } as CalendarResource]
    : flattenResources(resourcesData);

  const { scrollRef, virtualItems, totalSize } = useCalendarVirtualizer({
    count: displayResources.length,
  });

  if (!meta.visible) return null;

  if (resolved.loading) {
    const loadingRegion = regions.loading;
    if (loadingRegion) {
      return <div data-slot="calendar" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>{loadingRegion.render() as React.ReactNode}</div>;
    }
  }

  if (!resolved.loading && eventsData.length === 0 && !resourcesData.length) {
    const emptyRegion = regions.empty;
    if (emptyRegion) {
      return <div data-slot="calendar" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn(meta.className, resolved.emptyClassName as string | undefined)}>{emptyRegion.render() as React.ReactNode}</div>;
    }
  }

  const onEventClick = (payload: { event: CalendarEvent; resource?: CalendarResource; date: string }) => {
    void events.onEventClick?.(payload);
  };

  const bodyRegion = regions.body;
  if (bodyRegion) {
    return <div data-slot="calendar" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-calendar flex flex-col', meta.className)}>{bodyRegion.render() as React.ReactNode}</div>;
  }

  return (
    <div
      ref={calendarRef}
      className={cn('nop-calendar flex flex-col', meta.className, resolved.emptyClassName as string | undefined)}
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
            eventClassName={resolved.eventClassName as string | undefined}
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
        <CalendarDragTypeSelector
          shiftTypes={DEFAULT_SHIFT_TYPES}
          onSelectType={dragCreate.selectType}
          onDismiss={dragCreate.dismissTypeSelector}
        />
      )}

      {confirmDialog && (
        <CalendarConfirmDialog
          confirmDialog={confirmDialog}
          onCancel={cancelSwap}
          onConfirm={executeSwap}
        />
      )}
    </div>
  );
}

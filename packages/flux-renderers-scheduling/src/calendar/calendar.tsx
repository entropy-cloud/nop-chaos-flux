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
import React, { useImperativeHandle, useRef, useState, useEffect, useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope } from '@nop-chaos/flux-react';
import { Skeleton, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { Calendar as CalendarIcon } from 'lucide-react';
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
import { useCalendarOwnership } from './hooks/use-calendar-ownership.js';
import { useCalendarConfirmDialog } from './hooks/use-calendar-confirm-dialog.js';
import { parseISODate, flattenResources } from './utils/calendar-date-utils.js';
import './utils/calendar-print.css';

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

  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);
  const reactionsRef = useRef(props.reactions);
  useEffect(() => { reactionsRef.current = props.reactions; }, [props.reactions]);

  const initialDate = resolved.date
    ? (parseISODate(resolved.date as string) ?? new Date())
    : new Date();
  const initialView = (resolved.view as CalendarView) ?? 'month';
  const firstDayOfWeek = (resolved.firstDayOfWeek as 0 | 1) ?? 1;
  const showWeekends = resolved.showWeekends !== false;
  const maxConcurrent = (resolved.maxConcurrent as number) ?? 4;
  const showCrossDayLines = resolved.showCrossDayLines !== false;

  const locale = (resolved.locale as string) ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

  const eventsData = (resolved.events as CalendarSchema['events']) ?? (resolved as any).data as CalendarEvent[] ?? [];
  const resourcesData = useMemo(() => (resolved.resources as CalendarSchema['resources']) ?? [], [resolved.resources]);
  if ((resolved as any).data != null && resolved.events == null && typeof console !== 'undefined') {
    console.warn('Calendar: `data` field is deprecated, use `events` instead');
  }

  const dayStartHour = 8;
  const dayEndHour = 20;

  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarExport = useCalendarExport(calendarRef);

  const viewOwnership = (resolved.viewOwnership as string) ?? 'local';
  const dateOwnership = (resolved.dateOwnership as string) ?? 'local';
  const viewStatePath = resolved.viewStatePath as string | undefined;
  const dateStatePath = resolved.dateStatePath as string | undefined;

  const scope = useRenderScope();

  const { controlledView, controlledDate } = useCalendarOwnership(resolved as Record<string, unknown>);

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
      void events.onDateChange?.({ date: date.toISOString(), view: activeView });
    },
    onViewChange: (view: CalendarView) => {
      if (viewOwnership === 'scope' && viewStatePath && scope) {
        scope.merge({ [viewStatePath]: view });
      }
      void events.onViewChange?.({ view, date: currentDate.toISOString() });
    },
  });

  const navigation = useCalendarNavigation({
    currentDate,
    activeView,
    onDateChange: setCurrentDate,
  });

  useEffect(() => {
    const ev = eventsRef.current;
    void ev.onMount?.({});
    void ev.loadAction?.({});
    return () => {
      void ev.onUnmount?.({});
    };
  }, []);

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

  const { confirmDialog, handleSwapConfirm, cancelSwap, setConfirmDialog } = useCalendarConfirmDialog();

  const getCellFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    if (!el || !calendarRef.current?.contains(el)) return null;
    const cell = el.closest('[data-slot="calendar-cell"]');
    if (!cell) return null;
    const date = cell.getAttribute('data-date');
    const resourceId = cell.getAttribute('data-resource');
    if (!date || !resourceId) return null;
    return { date, resourceId };
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

  const handleDragCreateEvent = (p: { title: string; type: string; start: string; end: string; resourceId: string }) => {
    const newEvent: CalendarEvent = { id: `new-${Date.now()}`, title: p.title, start: p.start, end: p.end, type: p.type, resourceId: p.resourceId, color: DEFAULT_SHIFT_TYPES.find(t => t.type === p.type)?.color };
    void events.onEventCreate?.({ event: newEvent });
  };

  const [keyboardDragEventId, setKeyboardDragEventId] = useState<string | null>(null);

  const moveCalendarEvent = (eventId: string, fromResource: string, toResource: string, fromDate: string, toDate: string) => {
    const event = eventsData.find((e) => e.id === eventId);
    if (event) void events.onEventChange?.({ eventId, fromResource, toResource, fromDate, toDate, event });
  };

  const handleKeyboardMoveEvent = (eventId: string, direction: 'up' | 'down' | 'left' | 'right') => {
    const event = eventsData.find((e) => e.id === eventId);
    if (!event) return;
    const dayDelta = 1;
    const oldStartStr = event.start.split('T')[0];
    const oldEndStr = (event.end || event.start).split('T')[0];
    const oldStart = new Date(oldStartStr);
    if (direction === 'left' || direction === 'right') {
      const sign = direction === 'left' ? -1 : 1;
      const newStart = new Date(oldStart);
      newStart.setUTCDate(newStart.getUTCDate() + sign * dayDelta);
      const newEnd = new Date(oldEndStr);
      newEnd.setUTCDate(newEnd.getUTCDate() + sign * dayDelta);
      moveCalendarEvent(event.id, event.resourceId ?? '', event.resourceId ?? '', oldStartStr, newStart.toISOString().slice(0, 10));
    } else {
      const resourceIdx = resourcesData.findIndex((r) => r.id === event.resourceId);
      const targetIdx = direction === 'up' ? resourceIdx - 1 : resourceIdx + 1;
      if (targetIdx >= 0 && targetIdx < resourcesData.length) {
        const targetResource = resourcesData[targetIdx];
        moveCalendarEvent(event.id, event.resourceId ?? '', targetResource.id, oldStartStr, oldStartStr);
      }
    }
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
      const dragActions: Record<string, () => void> = {
        ArrowUp: () => dragSwap.moveKeyboardDrag('up'),
        ArrowDown: () => dragSwap.moveKeyboardDrag('down'),
        ArrowLeft: () => dragSwap.moveKeyboardDrag('left'),
        ArrowRight: () => dragSwap.moveKeyboardDrag('right'),
        Escape: () => { dragSwap.cancelKeyboardDrag(); setKeyboardDragEventId(null); },
        Enter: () => { dragSwap.confirmKeyboardDrop(); setKeyboardDragEventId(null); },
      };
      const action = dragActions[e.key];
      if (action) { e.preventDefault(); action(); }
    } else if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      dragSwap.startKeyboardDrag(event);
      setKeyboardDragEventId(event.id);
    }
  };

  const prevTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const container = calendarRef.current;
    if (!container) return;
    if (prevTargetRef.current) {
      const [pDate, pRes] = prevTargetRef.current.split(':');
      const prevEl = container.querySelector(`[data-slot="calendar-cell"][data-date="${pDate}"][data-resource="${pRes}"]`);
      if (prevEl) {
        prevEl.removeAttribute('data-drop-target');
        prevEl.removeAttribute('data-drop-valid');
        prevEl.classList.remove('drag-ok', 'drag-conflict');
      }
    }
    const { targetDate, targetResource, active, sourceEvent } = dragSwap.dragState;
    if (!active || !targetDate || !targetResource) { prevTargetRef.current = null; return; }
    const key = `${targetDate}:${targetResource}`;
    prevTargetRef.current = key;
    const el = container.querySelector(`[data-slot="calendar-cell"][data-date="${targetDate}"][data-resource="${targetResource}"]`);
    if (el) {
      el.setAttribute('data-drop-target', 'true');
      const isValid = targetDate !== sourceEvent?.start.split('T')[0] || targetResource !== sourceEvent?.resourceId;
      el.setAttribute('data-drop-valid', String(isValid));
      el.classList.add(isValid ? 'drag-ok' : 'drag-conflict');
      el.classList.remove(isValid ? 'drag-conflict' : 'drag-ok');
    }
  }, [dragSwap.dragState]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reconcile open/close state when resourcesData changes, no cascading risk
    _setResourceOpenMap(() => {
      const next: Record<string, boolean> = {};
      for (const r of resourcesData) {
        next[r.id] = r.open !== false;
      }
      return next;
    });
  }, [resourcesData]);

  const _handleGroupToggle = (groupId: string) => {
    _setResourceOpenMap((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      void eventsRef.current.onGroupToggle?.({ groupId, open: next[groupId] });
      return next;
    });
  };

  const displayResources = resourcesData.length === 0
    ? (() => {
        const uniqueIds = [...new Set(eventsData.map((e) => e.resourceId).filter(Boolean))];
        if (uniqueIds.length > 0) {
          return uniqueIds.map((id) => ({ id, text: id, title: id }) as CalendarResource);
        }
        return [{ id: '_default', text: '', title: '' } as CalendarResource];
      })()
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
    return (
      <div data-slot="calendar" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-calendar flex flex-col h-full', meta.className)}>
        <div className="flex gap-2 p-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-24" /></div>
        <Skeleton className="flex-1 m-2" />
      </div>
    );
  }

  if (!resolved.loading && eventsData.length === 0 && !resourcesData.length) {
    const emptyRegion = regions.empty;
    if (emptyRegion) {
      return <div data-slot="calendar" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn(meta.className, resolved.emptyClassName as string | undefined)}>{emptyRegion.render() as React.ReactNode}</div>;
    }
    return (
      <div data-slot="calendar" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-calendar flex flex-col', meta.className, resolved.emptyClassName as string | undefined)}>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarIcon className="text-4xl mb-4 opacity-30" />
          <p className="text-sm">{t('scheduling.noScheduleData')}</p>
        </div>
      </div>
    );
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
        {`Viewing ${activeView} view, ${currentDate.toISOString().slice(0, 10)}, ${eventsData.length} events`}
      </div>
      <CalendarHeader
        currentDate={currentDate}
        activeView={activeView}
        navigation={navigation}
        onViewChange={setActiveView}
        className={resolved.headerClassName as string | undefined}
        locale={locale}
      />

      {activeView === 'month' && (
        <div ref={scrollRef} className="overflow-auto flex-1">
          <CalendarMonthView
            events={eventsData} resources={displayResources} currentDate={currentDate}
            dateRange={dateRange} firstDayOfWeek={firstDayOfWeek} showWeekends={showWeekends}
            maxConcurrent={maxConcurrent} eventTemplate={regions.eventTemplate ?? undefined}
            onEventClick={onEventClick} virtualItems={virtualItems} totalSize={totalSize}
            onDragStart={dragSwap.startDrag} onCellDragStart={dragCreate.startCellDrag}
            showCrossDayLines={showCrossDayLines} onEventKeyDown={handleEventKeyDown}
            eventClassName={resolved.eventClassName as string | undefined} locale={locale}
          />
        </div>
      )}

      {activeView === 'week' && (
        <CalendarWeekView
          events={eventsData} resources={displayResources} currentDate={currentDate}
          firstDayOfWeek={firstDayOfWeek} showWeekends={showWeekends} maxConcurrent={maxConcurrent}
          dayStartHour={dayStartHour} dayEndHour={dayEndHour}
          eventTemplate={regions.eventTemplate ?? undefined} onEventClick={onEventClick}
          onDragStart={dragSwap.startDrag} onEventKeyDown={handleEventKeyDown} locale={locale}
        />
      )}

      {activeView === 'day' && (
        <CalendarDayView
          events={eventsData} resources={displayResources} currentDate={currentDate}
          maxConcurrent={maxConcurrent} dayStartHour={dayStartHour} dayEndHour={dayEndHour}
          eventTemplate={regions.eventTemplate ?? undefined} onEventClick={onEventClick}
          onDragStart={dragSwap.startDrag} onEventKeyDown={handleEventKeyDown} locale={locale}
        />
      )}

      {dragSwap.dragState.active && (
        <div
          className="nop-calendar-drag-ghost"
          style={{
            position: 'fixed',
            left: dragSwap.dragState.currentX,
            top: dragSwap.dragState.currentY,
            transform: 'translate(-50%, -50%)',
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

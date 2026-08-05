import React, { useRef, useImperativeHandle, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { Skeleton, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RendererComponentProps, ComponentHandle } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRenderScope } from '@nop-chaos/flux-react';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import type { GanttSchema } from '../schemas.js';
import { createGanttStore } from './gantt-store.js';
import type { GanttStoreApi } from './gantt.types.js';
import { GanttLayout } from './gantt-layout.js';
import { GanttHeader } from './gantt-header.js';
import { GanttGrid } from './gantt-grid.js';
import { GanttTimeScale } from './gantt-timescale.js';
import { GanttCellGrid } from './gantt-cellgrid.js';
import { GanttBars } from './gantt-bars.js';
import { GanttLinks } from './gantt-links.js';
import { GanttMarkers } from './gantt-markers.js';
import { BaselineBars } from './components/baseline-bars.js';
import { GanttEditor } from './gantt-editor.js';
import { useGanttDrag } from './hooks/use-gantt-drag.js';
import { useGanttLinkDraw } from './hooks/use-gantt-link-draw.js';
import { useGanttScroll } from './hooks/use-gantt-scroll.js';
import { useGanttKeyboard } from './hooks/use-gantt-keyboard.js';
import { dateToPixel } from './utils/layout.js';
import { UndoStack, UpdateTaskCommand } from './undo-stack.js';

export interface GanttHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  scrollToToday: () => void;
  scrollToTask: (taskId: string | number) => void;
}

export function createInitialStore(resolved: Record<string, unknown>): GanttStoreApi {
  const s = createGanttStore({
    cellWidth: (resolved.cellWidth as number) ?? 40,
    defaultZoom: (resolved.defaultZoom as string) ?? 'week',
    taskBarHeight: (resolved.taskBarHeight as number) ?? 28,
    zoomLevels: (resolved.zoomLevels as any[]) ?? [
      { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day', step: 1, format: 'MM/DD' }] },
      { key: 'week', label: 'Week', minCellWidth: 80, scales: [{ unit: 'week', step: 1, format: 'YYYY' }, { unit: 'day', step: 1, format: 'DD' }] },
      { key: 'month', label: 'Month', minCellWidth: 60, scales: [{ unit: 'month', step: 1, format: 'YYYY' }, { unit: 'day', step: 1, format: 'DD' }] },
    ],
  });
  const taskData = (resolved.tasks as any[]) ?? [];
  const linkData = (resolved.links as any[]) ?? [];
  const resourceData = (resolved.resources as any[]) ?? undefined;
  const assignmentData = (resolved.assignments as any[]) ?? undefined;
  s.parse(taskData, linkData, resourceData, assignmentData);
  return s;
}

export const Gantt = React.forwardRef<GanttHandle, RendererComponentProps<GanttSchema>>(
  function Gantt(props, ref) {
    const { props: resolved, meta, regions, events, helpers: _helpers } = props;
    const scope = useRenderScope();
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const [store] = useState(() => createInitialStore(resolved));

    // Re-seed the store when the schema data props change at runtime
    // (data-source refresh, scope-driven updates). Local edits are preserved
    // because this only fires on prop reference changes.
    const lastDataRef = useRef({
      tasks: resolved.tasks,
      links: resolved.links,
      resources: resolved.resources,
      assignments: resolved.assignments,
    });
    useEffect(() => {
      const prev = lastDataRef.current;
      const changed =
        prev.tasks !== resolved.tasks ||
        prev.links !== resolved.links ||
        prev.resources !== resolved.resources ||
        prev.assignments !== resolved.assignments;
      if (!changed) return;
      lastDataRef.current = {
        tasks: resolved.tasks,
        links: resolved.links,
        resources: resolved.resources,
        assignments: resolved.assignments,
      };
      const taskData = (resolved.tasks as any[]) ?? [];
      const linkData = (resolved.links as any[]) ?? [];
      const resourceData = (resolved.resources as any[]) ?? undefined;
      const assignmentData = (resolved.assignments as any[]) ?? undefined;
      store.parse(taskData, linkData, resourceData, assignmentData);
      // parse() does not bump layoutRevision (the render subscription), so
      // force a layout recompute + revision bump to re-render the new data.
      store.recalcLayout();
    }, [resolved.tasks, resolved.links, resolved.resources, resolved.assignments, store]);

    const selectedTaskId = useSyncExternalStore(store.subscribe, () => store.selectedTaskId);
    const editingTaskId = useSyncExternalStore(store.subscribe, () => store.editingTaskId);

    const eventsRef = useRef(events);
    useEffect(() => { eventsRef.current = events; }, [events]);
    const scopeRef = useRef(scope);
    useEffect(() => { scopeRef.current = scope; }, [scope]);

    // CX-10 / bug-83 family convention: schema event dispatches carry a
    // second dispatch-arg ctx { event, evaluationBindings, scope } so action
    // args templates can read payload keys as bare bindings.
    const eventCtx = useCallback((payload: Record<string, unknown>) => ({
      event: { ...payload, type: typeof payload.type === 'string' ? payload.type : 'custom' },
      evaluationBindings: payload,
      scope: scopeRef.current,
    }), []);

    useEffect(() => {
      void eventsRef.current.onMount?.({}, eventCtx({}));
      undoStackRef.current.clear();
      return () => {
        void eventsRef.current.onUnmount?.({}, eventCtx({}));
      };
    }, [eventCtx]);

    const handleTaskDragCommit = (taskId: string | number, changes: Record<string, string>) => {
      const payload = { _taskId: taskId, changes };
      void eventsRef.current.onTaskDragEnd?.(payload, eventCtx(payload));
    };

    const handleLinkDragCommit = (sourceId: string | number, targetId: string | number, linkType: string) => {
      const payload = { _sourceId: sourceId, _targetId: targetId, _linkType: linkType };
      void eventsRef.current.onLinkDragEnd?.(payload, eventCtx(payload));
    };

    const draggable = resolved.draggable !== false;
    const editable = resolved.editable !== false;
    const linkable = resolved.linkable !== false;

    const { onPointerDown: onDragPointerDown } = useGanttDrag(store, containerRef, draggable ? handleTaskDragCommit : undefined);
    const { onLinkHandlePointerDown } = useGanttLinkDraw(store, svgRef, linkable ? handleLinkDragCommit : undefined, linkable);
    useGanttScroll(gridRef, timelineRef, (scrollLeft, scrollTop) => {
      const payload = { scrollLeft, scrollTop };
      void eventsRef.current.onScroll?.(payload, eventCtx(payload));
    });

    const openEditor = (id: string | number) => {
      store.editTask(id);
    };

    const handleBarKeyAction = (taskId: string | number, action: 'move-up' | 'move-down' | 'resize-left' | 'resize-right' | 'select') => {
      const task = store.tasks.get(taskId);
      if (!task) return;
      const oldStart = task.start;
      const oldEnd = task.end;
      const oldStartDt = new Date(oldStart);
      const oldEndDt = new Date(oldEnd);
      switch (action) {
        case 'move-up': {
          const newStart = new Date(oldStartDt);
          newStart.setUTCDate(newStart.getUTCDate() - 1);
          const newEnd = new Date(oldEndDt);
          newEnd.setUTCDate(newEnd.getUTCDate() - 1);
          const startVal = newStart.toISOString().slice(0, 10);
          const endVal = newEnd.toISOString().slice(0, 10);
          const payload = { _taskId: taskId, changes: { start: startVal, end: endVal } };
          void eventsRef.current.onTaskDragEnd?.(payload, eventCtx(payload));
          store.updateTask(taskId, { start: startVal, end: endVal });
          undoStackRef.current.push(new UpdateTaskCommand(store, taskId, { start: oldStart, end: oldEnd }, { start: startVal, end: endVal }));
          break;
        }
        case 'move-down': {
          const newStart = new Date(oldStartDt);
          newStart.setUTCDate(newStart.getUTCDate() + 1);
          const newEnd = new Date(oldEndDt);
          newEnd.setUTCDate(newEnd.getUTCDate() + 1);
          const startVal = newStart.toISOString().slice(0, 10);
          const endVal = newEnd.toISOString().slice(0, 10);
          const payload = { _taskId: taskId, changes: { start: startVal, end: endVal } };
          void eventsRef.current.onTaskDragEnd?.(payload, eventCtx(payload));
          store.updateTask(taskId, { start: startVal, end: endVal });
          undoStackRef.current.push(new UpdateTaskCommand(store, taskId, { start: oldStart, end: oldEnd }, { start: startVal, end: endVal }));
          break;
        }
        case 'resize-left': {
          const newEnd = new Date(oldEndDt);
          newEnd.setUTCDate(newEnd.getUTCDate() - 1);
          if (newEnd > oldStartDt) {
            const endVal = newEnd.toISOString().slice(0, 10);
            const payload = { _taskId: taskId, changes: { end: endVal } };
            void eventsRef.current.onTaskDragEnd?.(payload, eventCtx(payload));
            store.updateTask(taskId, { end: endVal });
            undoStackRef.current.push(new UpdateTaskCommand(store, taskId, { end: oldEnd }, { end: endVal }));
          }
          break;
        }
        case 'resize-right': {
          const newEnd = new Date(oldEndDt);
          newEnd.setUTCDate(newEnd.getUTCDate() + 1);
          const endVal = newEnd.toISOString().slice(0, 10);
          const payload = { _taskId: taskId, changes: { end: endVal } };
          void eventsRef.current.onTaskDragEnd?.(payload, eventCtx(payload));
          store.updateTask(taskId, { end: endVal });
          undoStackRef.current.push(new UpdateTaskCommand(store, taskId, { end: oldEnd }, { end: endVal }));
          break;
        }
        case 'select': {
          store.selectTask(taskId);
          break;
        }
      }
    };

    const undoStackRef = useRef<UndoStack>(new UndoStack());

    const handleUndo = () => {
      undoStackRef.current.undo();
    };

    const handleRedo = () => {
      undoStackRef.current.redo();
    };

    useGanttKeyboard({
      store,
      containerRef,
      selectedTaskId,
      onSelectTask: (id) => { store.selectTask(id); },
      onOpenEditor: openEditor,
      onUndo: handleUndo,
      onRedo: handleRedo,
    });

    const scrollToToday = useCallback(() => {
      const today = new Date();
      const x = dateToPixel(today, store.scaleRange, store.cellWidth);
      const container = timelineRef.current;
      if (container) {
        container.scrollLeft = Math.max(0, x - container.clientWidth / 2);
      }
    }, [store, timelineRef]);

    const scrollToTask = useCallback((taskId: string | number) => {
      const task = store.tasks.get(taskId);
      if (task) {
        const x = dateToPixel(new Date(task.start), store.scaleRange, store.cellWidth);
        const container = timelineRef.current;
        if (container) {
          container.scrollLeft = Math.max(0, x - container.clientWidth / 2);
        }
      }
    }, [store, timelineRef]);

    const handleZoomChange = useCallback((zoomKey: string) => {
      const payload = { zoom: zoomKey };
      void eventsRef.current.onZoomChange?.(payload, eventCtx(payload));
    }, [eventCtx]);

    const doZoomIn = useCallback(() => {
      const zooms = store.getAvailableZooms();
      const idx = zooms.findIndex((z) => z.key === store.currentZoom);
      if (idx < zooms.length - 1) {
        store.setZoom(zooms[idx + 1].key);
        handleZoomChange(zooms[idx + 1].key);
      }
    }, [store, handleZoomChange]);

    const doZoomOut = useCallback(() => {
      const zooms = store.getAvailableZooms();
      const idx = zooms.findIndex((z) => z.key === store.currentZoom);
      if (idx > 0) {
        store.setZoom(zooms[idx - 1].key);
        handleZoomChange(zooms[idx - 1].key);
      }
    }, [store, handleZoomChange]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: doZoomIn,
        zoomOut: doZoomOut,
        scrollToToday,
        scrollToTask,
      }),
      [doZoomIn, doZoomOut, scrollToToday, scrollToTask],
    );

    // CX-9 / reaction contract: activate the declared reaction plans so
    // schema-declared zoomIn/zoomOut/scrollToToday/scrollToTask actions fire.
    useEffect(() => {
      for (const key of ['zoomIn', 'zoomOut', 'scrollToToday', 'scrollToTask']) {
        props.reactions[key]?.ready();
      }
    }, [props.reactions]);

    // Component handle registration: makes `component:zoomIn/zoomOut/
    // scrollToToday/scrollToTask` actions resolvable (design.md §8.2/§8.3).
    const componentRegistry = useCurrentComponentRegistry();
    useEffect(() => {
      if (!componentRegistry) return;
      const handle: ComponentHandle = {
        id: props.id,
        type: 'gantt',
        capabilities: {
          invoke(method, payload) {
            switch (method) {
              case 'zoomIn':
                doZoomIn();
                return { ok: true };
              case 'zoomOut':
                doZoomOut();
                return { ok: true };
              case 'scrollToToday':
                scrollToToday();
                return { ok: true };
              case 'scrollToTask': {
                const taskId = (payload as { taskId?: string | number } | undefined)?.taskId;
                if (taskId == null) {
                  return { ok: false, error: new Error('gantt scrollToTask requires a taskId') };
                }
                scrollToTask(taskId);
                return { ok: true };
              }
              default:
                return { ok: false, error: new Error(`Unsupported gantt method: ${method}`) };
            }
          },
          hasMethod(method) {
            return method === 'zoomIn' || method === 'zoomOut' || method === 'scrollToToday' || method === 'scrollToTask';
          },
          listMethods() {
            return ['zoomIn', 'zoomOut', 'scrollToToday', 'scrollToTask'];
          },
          getDebugData() {
            return { currentZoom: store.currentZoom, taskCount: store.tasks.size };
          },
        },
      };
      return componentRegistry.register(handle, { cid: meta.cid });
    }, [componentRegistry, props.id, meta.cid, store, doZoomIn, doZoomOut, scrollToToday, scrollToTask]);

    useSyncExternalStore(store.subscribe, () => store.layoutRevision);
    const visibleTasks = store.getVisibleTasks();
    const timelineHeight = visibleTasks.length > 0
      ? visibleTasks.reduce((max, t) => Math.max(max, (t.$y ?? 0) + (t.$h ?? 0)), 400)
      : 400;

    const handleTaskClick = (taskId: string | number) => {
      store.selectTask(taskId);
      const payload = { _taskId: taskId };
      void eventsRef.current.onTaskClick?.(payload, eventCtx(payload));
    };

    const handleTaskDoubleClick = (taskId: string | number) => {
      const payload = { _taskId: taskId };
      void eventsRef.current.onTaskDoubleClick?.(payload, eventCtx(payload));
    };

    const handleLinkClick = (linkId: string | number) => {
      const payload = { _linkId: linkId };
      void eventsRef.current.onLinkClick?.(payload, eventCtx(payload));
    };

    const handleEmptyCellClick = () => {
      void eventsRef.current.onEmptyCellClick?.({}, eventCtx({}));
    };

    if (!meta.visible) return null;

    if (resolved.loading) {
      const loadingRegion = regions.loading;
      if (loadingRegion) {
        return <div data-slot="gantt" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>{loadingRegion.render() as React.ReactNode}</div>;
      }
      return (
        <div data-slot="gantt" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-gantt flex flex-col h-full', meta.className)}>
          <div className="flex gap-2 p-2"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-24" /></div>
          <Skeleton className="flex-1 m-2" />
        </div>
      );
    }

    const totalTaskCount = store.tasks.size;
    if (!resolved.loading && totalTaskCount === 0) {
      const emptyRegion = regions.empty;
      if (emptyRegion) {
        return <div data-slot="gantt" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn(meta.className, resolved.emptyClassName as string | undefined)}>{emptyRegion.render() as React.ReactNode}</div>;
      }
      return (
        <div data-slot="gantt" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-gantt', meta.className)} />
      );
    }

    const columns = resolved.columns as any[] | undefined;
    const showWeekends = resolved.showWeekends !== false;
    const showToday = resolved.showToday !== false;
    const columnNames = columns?.map((c: any) => c.name as string) ?? ['text', 'start', 'end', 'duration', 'predecessor'];
    const columnRegions = Object.fromEntries(
      columnNames.map((name: string) => [name, regions[name] as RenderRegionHandle | undefined]).filter(([, r]) => r),
    );

    return (
      <div ref={containerRef} data-slot="gantt" className={cn('nop-gantt flex flex-col h-full', meta.className)} data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {t('scheduling.gantt.tasksVisible', { count: store.getVisibleTasks().length })}
        </div>
        <GanttHeader
          store={store}
          toolbarRegion={regions.toolbar as RenderRegionHandle}
          className={resolved.toolbarClassName as string | undefined}
          onZoomChange={handleZoomChange}
          onZoomIn={() => { doZoomIn(); void props.reactions.zoomIn?.dispatch(); }}
          onZoomOut={() => { doZoomOut(); void props.reactions.zoomOut?.dispatch(); }}
          onTodayClick={() => { scrollToToday(); void props.reactions.scrollToToday?.dispatch(); }}
        />
        <GanttLayout
          grid={
            <div ref={gridRef} className="h-full">
              <GanttGrid
                store={store}
                columns={columns}
                selectedTaskId={selectedTaskId}
                onSelectTask={(id) => { store.selectTask(id); }}
                columnRegions={columnRegions}
                onTaskClick={handleTaskClick}
                onTaskDoubleClick={handleTaskDoubleClick}
                onEmptyCellClick={handleEmptyCellClick}
                editable={editable}
                scrollContainerRef={gridRef}
              />
            </div>
          }
          timeline={
            <div ref={timelineRef} className="h-full overflow-auto">
              <GanttTimeScale store={store} />
              <div className="relative" style={{ minHeight: timelineHeight }}>
                <GanttCellGrid store={store} showWeekends={showWeekends} />
                <GanttBars
                  store={store}
                  onBarPointerDown={draggable ? onDragPointerDown : undefined}
                  onLinkHandlePointerDown={linkable ? onLinkHandlePointerDown : undefined}
                  onBarDoubleClick={openEditor}
                  onBarKeyAction={handleBarKeyAction}
                  taskBarRegion={regions.taskBar as RenderRegionHandle}
                  taskBarClassName={resolved.taskBarClassName as string | undefined}
                  onBarClick={handleTaskClick}
                  onBarDoubleClickEvent={handleTaskDoubleClick}
                  scrollContainerRef={timelineRef}
                />
                <svg ref={svgRef} className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
                  <GanttLinks store={store} onLinkClick={handleLinkClick} />
                  {store.getVisibleTasks().filter(t => t.baselines?.length).map(task => (
                    <BaselineBars key={String(task.id)} task={task} scaleRange={store.scaleRange} cellWidth={store.cellWidth} taskBarHeight={store.taskBarHeight} />
                  ))}
                </svg>
                <GanttMarkers store={store} showToday={showToday} />
              </div>
            </div>
          }
          header={null}
        />
        <GanttEditor
          store={store}
          editorRegion={regions.editor as RenderRegionHandle}
          editingTaskId={editingTaskId}
          onClose={() => { store.editTask(null); }}
          onBarDoubleClick={(id) => { store.editTask(id); }}
          className={resolved.editorClassName as string | undefined}
        />
      </div>
    );
  },
);

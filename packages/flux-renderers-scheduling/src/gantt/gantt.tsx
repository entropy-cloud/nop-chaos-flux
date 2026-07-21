import React, { useRef, useImperativeHandle, useState, useEffect, useCallback } from 'react';
import { cn } from '@nop-chaos/ui';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import type { RenderRegionHandle } from '@nop-chaos/flux-react';
import type { GanttSchema } from '../schemas.js';
import { GanttStore } from './gantt-store.js';
import { GanttStoreProvider } from './gantt-context.js';
import { GanttLayout } from './gantt-layout.js';
import { GanttHeader } from './gantt-header.js';
import { GanttGrid } from './gantt-grid.js';
import { GanttTimeScale } from './gantt-timescale.js';
import { GanttCellGrid } from './gantt-cellgrid.js';
import { GanttBars } from './gantt-bars.js';
import { GanttLinks } from './gantt-links.js';
import { GanttMarkers } from './gantt-markers.js';
import { GanttEditor } from './gantt-editor.js';
import { useGanttDrag } from './hooks/use-gantt-drag.js';
import { useGanttLinkDraw } from './hooks/use-gantt-link-draw.js';
import { useGanttScroll } from './hooks/use-gantt-scroll.js';
import { useGanttKeyboard } from './hooks/use-gantt-keyboard.js';
import { dateToPixel } from './utils/layout.js';

export interface GanttHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  scrollToToday: () => void;
  scrollToTask: (taskId: string | number) => void;
}

function createInitialStore(resolved: Record<string, unknown>): GanttStore {
  const s = new GanttStore({
    cellWidth: (resolved.cellWidth as number) ?? 40,
    defaultZoom: (resolved.defaultZoom as string) ?? 'week',
    taskBarHeight: (resolved.taskBarHeight as number) ?? 28,
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
    const _runtime = useRendererRuntime();
    const _scope = useRenderScope();
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<string | number | null>(null);

    const [store] = useState(() => createInitialStore(resolved));

    const eventsRef = useRef(events);
    useEffect(() => { eventsRef.current = events; }, [events]);

    useEffect(() => {
      void eventsRef.current.onMount?.({});
      return () => {
        void eventsRef.current.onUnmount?.({});
        store.destroy();
      };
    }, [store]);

    const dataFingerprintRef = useRef('');
    useEffect(() => {
      const newData = { tasks: resolved.tasks, links: resolved.links, resources: resolved.resources, assignments: resolved.assignments };
      const fp = JSON.stringify(newData);
      if (fp === dataFingerprintRef.current) return;
      dataFingerprintRef.current = fp;
      store.parse(newData.tasks ?? [], newData.links ?? [], newData.resources, newData.assignments);
    }, [store, resolved.tasks, resolved.links, resolved.resources, resolved.assignments]);

    const { onPointerDown: onDragPointerDown } = useGanttDrag(containerRef);
    const { onLinkHandlePointerDown } = useGanttLinkDraw(svgRef);
    useGanttScroll(gridRef, timelineRef);

    const handleBarKeyAction = (taskId: string | number, action: 'move-up' | 'move-down' | 'resize-left' | 'resize-right' | 'select') => {
      const task = store.tasks.get(taskId);
      if (!task) return;
      const oldStart = new Date(task.start);
      const oldEnd = new Date(task.end);
      switch (action) {
        case 'move-up': {
          const newStart = new Date(oldStart);
          newStart.setDate(newStart.getDate() - 1);
          const newEnd = new Date(oldEnd);
          newEnd.setDate(newEnd.getDate() - 1);
          store.updateTask(taskId, { start: newStart.toISOString().slice(0, 10), end: newEnd.toISOString().slice(0, 10) });
          break;
        }
        case 'move-down': {
          const newStart = new Date(oldStart);
          newStart.setDate(newStart.getDate() + 1);
          const newEnd = new Date(oldEnd);
          newEnd.setDate(newEnd.getDate() + 1);
          store.updateTask(taskId, { start: newStart.toISOString().slice(0, 10), end: newEnd.toISOString().slice(0, 10) });
          break;
        }
        case 'resize-left': {
          const newEnd = new Date(oldEnd);
          newEnd.setDate(newEnd.getDate() - 1);
          if (newEnd > oldStart) {
            store.updateTask(taskId, { end: newEnd.toISOString().slice(0, 10) });
          }
          break;
        }
        case 'resize-right': {
          const newEnd = new Date(oldEnd);
          newEnd.setDate(newEnd.getDate() + 1);
          store.updateTask(taskId, { end: newEnd.toISOString().slice(0, 10) });
          break;
        }
        case 'select': {
          setSelectedTaskId(taskId);
          break;
        }
      }
    };

    useGanttKeyboard({
      containerRef,
      selectedTaskId,
      onSelectTask: setSelectedTaskId,
      onOpenEditor: (id) => setEditingTaskId(id),
    });

    const scrollToToday = useCallback(() => {
      const today = new Date();
      const x = dateToPixel(today, store.scaleRange, store.cellWidth);
      const container = gridRef.current;
      if (container) {
        container.scrollLeft = Math.max(0, x - container.clientWidth / 2);
      }
      if (timelineRef.current) {
        timelineRef.current.scrollLeft = container?.scrollLeft ?? 0;
      }
    }, [store, gridRef, timelineRef]);

    const scrollToTask = useCallback((taskId: string | number) => {
      const task = store.tasks.get(taskId);
      if (task) {
        const x = dateToPixel(new Date(task.start), store.scaleRange, store.cellWidth);
        const container = gridRef.current;
        if (container) {
          container.scrollLeft = Math.max(0, x - container.clientWidth / 2);
        }
        if (timelineRef.current) {
          timelineRef.current.scrollLeft = container?.scrollLeft ?? 0;
        }
      }
    }, [store, gridRef, timelineRef]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const zooms = store.getAvailableZooms();
          const idx = zooms.findIndex((z) => z.key === store.currentZoom);
          if (idx < zooms.length - 1) store.setZoom(zooms[idx + 1].key);
        },
        zoomOut: () => {
          const zooms = store.getAvailableZooms();
          const idx = zooms.findIndex((z) => z.key === store.currentZoom);
          if (idx > 0) store.setZoom(zooms[idx - 1].key);
        },
        scrollToToday,
        scrollToTask,
      }),
      [store, scrollToToday, scrollToTask],
    );

    if (!meta.visible) return null;

    const columns = resolved.columns as any[] | undefined;
    const showWeekends = resolved.showWeekends !== false;
    const showToday = resolved.showToday !== false;

    return (
      <GanttStoreProvider store={store}>
        <div ref={containerRef} className={cn('nop-gantt flex flex-col h-full', meta.className)} data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {`${store.getVisibleTasks().length} tasks visible`}
          </div>
          <GanttHeader toolbarRegion={regions.toolbar as RenderRegionHandle} onScrollToToday={scrollToToday} />
          <GanttLayout
            grid={
              <div ref={gridRef} className="h-full overflow-auto">
                <GanttGrid
                  columns={columns}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                />
              </div>
            }
            timeline={
              <div ref={timelineRef} className="h-full overflow-auto">
                <GanttTimeScale />
                <div className="relative">
                  <GanttCellGrid showWeekends={showWeekends} />
                  <GanttBars
                      onBarPointerDown={onDragPointerDown}
                      onLinkHandlePointerDown={onLinkHandlePointerDown}
                      onBarDoubleClick={(id) => setEditingTaskId(id)}
                      onBarKeyAction={handleBarKeyAction}
                    />
                  <svg ref={svgRef} className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
                    <GanttLinks />
                  </svg>
                  <GanttMarkers showToday={showToday} />
                </div>
              </div>
            }
            header={null}
          />
          <GanttEditor
            editorRegion={regions.editor as RenderRegionHandle}
            editingTaskId={editingTaskId}
            onClose={() => setEditingTaskId(null)}
            onBarDoubleClick={(id) => setEditingTaskId(id)}
          />
        </div>
      </GanttStoreProvider>
    );
  },
);

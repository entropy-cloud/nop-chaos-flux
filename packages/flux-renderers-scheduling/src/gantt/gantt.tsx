import React, { useRef, useImperativeHandle, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
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
    const { props: resolved, meta, regions } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);

    const [store] = useState(() => createInitialStore(resolved));

    const { onPointerDown: onDragPointerDown } = useGanttDrag(containerRef);
    const { onLinkHandlePointerDown } = useGanttLinkDraw(svgRef);
    useGanttScroll(gridRef, timelineRef);
    useGanttKeyboard({
      containerRef,
      selectedTaskId,
      onSelectTask: setSelectedTaskId,
      onOpenEditor: (id) => setSelectedTaskId(id),
    });

    useImperativeHandle(ref, () => ({
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
      scrollToToday: () => {
        store.emit('change');
      },
      scrollToTask: (taskId: string | number) => {
        const task = store.tasks.get(taskId);
        if (task) {
          store.emit('change');
        }
      },
    }), [store]);

    if (!meta.visible) return null;

    const columns = resolved.columns as any[] | undefined;
    const showWeekends = resolved.showWeekends !== false;
    const showToday = resolved.showToday !== false;

    return (
      <GanttStoreProvider store={store}>
        <div ref={containerRef} className="nop-gantt flex flex-col h-full" data-testid={meta.testid || undefined}>
          <GanttHeader toolbarRegion={regions.toolbar as any} />
          <GanttLayout
            grid={
              <div ref={gridRef} className="h-full overflow-auto">
                <GanttGrid
                  columns={columns as any}
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
                      onBarPointerDown={onDragPointerDown as any}
                      onLinkHandlePointerDown={onLinkHandlePointerDown as any}
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
          <GanttEditor editorRegion={regions.editor as any} />
        </div>
      </GanttStoreProvider>
    );
  },
);

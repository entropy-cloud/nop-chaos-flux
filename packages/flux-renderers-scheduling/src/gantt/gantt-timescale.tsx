import React, { useSyncExternalStore } from 'react';
import { cn } from '@nop-chaos/ui';
import type { GanttStoreApi } from './gantt.types.js';
import { computeScaleIntervalsCached, sliceVisibleCells } from './utils/scale.js';

interface GanttTimeScaleProps {
  store: GanttStoreApi;
  className?: string;
}

export function GanttTimeScale({ store, className }: GanttTimeScaleProps) {
  useSyncExternalStore(store.subscribe, () => store.layoutRevision);
  useSyncExternalStore(store.subscribe, () => store.scrollRevision);

  const rows = (() => {
    const zoom = store.zoomLevels.get(store.currentZoom);
    const scales = zoom?.scales ?? [];
    if (scales.length === 0) return [];
    const fullRows = computeScaleIntervalsCached(store.scaleRange, scales, store.cellWidth);
    // Horizontal windowing: only visible cells (+ overscan) mount; each row is
    // a total-width relative canvas with absolutely positioned cells so the
    // visible slice stays aligned to the scrolled timeline.
    return fullRows.map((row) => ({
      ...row,
      ...sliceVisibleCells(row.cells, store.scrollLeft, store.containerWidth),
    }));
  })();

  return (
    <div className={cn('nop-gantt-scale flex-shrink-0', className)} style={{ position: 'sticky', top: 0, zIndex: 10 }} data-slot="gantt-scale">
      {rows.map((row) => (
        <div key={`row-${row.unit}`} className="border-b" style={{ position: 'relative', width: row.totalWidth, height: 24 }}>
          {row.cells.map((cell) => (
            <div
              key={`cell-${cell.start.getTime()}`}
              className="absolute top-0 h-full border-r border-border px-1 text-[10px] leading-6 text-muted-foreground truncate text-center"
              style={{ left: cell.x, width: cell.width }}
              data-slot="gantt-scale-cell"
            >
              {cell.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

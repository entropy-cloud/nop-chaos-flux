import React from 'react';
import { cn } from '@nop-chaos/ui';
import { useGanttStore, useGanttStoreSnapshot } from './gantt-context.js';
import { computeScaleIntervals } from './utils/scale.js';

interface GanttTimeScaleProps {
  className?: string;
}

export function GanttTimeScale({ className }: GanttTimeScaleProps) {
  const store = useGanttStore();
  useGanttStoreSnapshot();

  const rows = (() => {
    const zoom = store.zoomLevels.get(store.currentZoom);
    const scales = zoom?.scales ?? [];
    if (scales.length === 0) return [];
    return computeScaleIntervals(store.scaleRange, scales, store.cellWidth);
  })();

  return (
    <div className={cn('nop-gantt-scale flex-shrink-0', className)} data-slot="gantt-scale">
      {rows.map((row) => (
        <div key={`row-${row.unit}`} className="flex border-b" style={{ height: 24 }}>
          {row.cells.map((cell) => (
            <div
              key={`cell-${cell.start.getTime()}`}
              className="flex-shrink-0 border-r border-gray-200 px-1 text-[10px] leading-6 text-gray-500 truncate text-center"
              style={{ width: cell.width, minWidth: cell.width }}
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

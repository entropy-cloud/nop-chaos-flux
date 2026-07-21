import React from 'react';
import { cn } from '@nop-chaos/ui';
import { useGanttStore, useGanttStoreSnapshot } from './gantt-context.js';
import { computeScaleIntervals } from './utils/scale.js';

interface GanttCellGridProps {
  showWeekends?: boolean;
  className?: string;
}

export function GanttCellGrid({ showWeekends = true, className }: GanttCellGridProps) {
  const store = useGanttStore();
  useGanttStoreSnapshot();

  const tasks = store.getVisibleTasks();
  const totalHeight = tasks.length * store.rowHeight;

  const zoom = store.zoomLevels.get(store.currentZoom);
  const dayScale = (() => {
    if (!zoom) return [];
    const dayScales = zoom.scales.filter((s) => s.unit === 'day');
    if (dayScales.length === 0) return [];
    return computeScaleIntervals(store.scaleRange, dayScales, store.cellWidth);
  })();

  const dayCells = dayScale.length > 0 ? dayScale[0].cells : [];

  return (
    <div className={cn('nop-gantt-cell-grid absolute inset-0 pointer-events-none', className)} data-slot="gantt-cell-grid">
      {dayCells.map((cell) => {
        const isWeekend = showWeekends && (cell.start.getDay() === 0 || cell.start.getDay() === 6);
        return (
          <div
            key={`cell-${cell.start.getTime()}`}
            className={cn(
              'absolute top-0 h-full border-r border-gray-100',
              isWeekend && 'bg-gray-50/50',
            )}
            style={{
              left: cell.x,
              width: cell.width,
              height: totalHeight || '100%',
            }}
            data-weekend={isWeekend ? 'true' : undefined}
            data-slot="gantt-weekend"
          />
        );
      })}
    </div>
  );
}

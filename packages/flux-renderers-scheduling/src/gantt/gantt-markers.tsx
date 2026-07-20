import React, { useMemo } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useGanttStore, useGanttStoreSnapshot } from './gantt-context.js';
import { dateToPixel } from './utils/layout.js';

interface GanttMarkersProps {
  showToday?: boolean;
  className?: string;
}

export function GanttMarkers({ showToday = true, className }: GanttMarkersProps) {
  const store = useGanttStore();
  useGanttStoreSnapshot();

  const tasks = store.getVisibleTasks();
  const totalHeight = tasks.length > 0
    ? tasks.reduce((max, t) => Math.max(max, t.$y + t.$h), 0)
    : tasks.length * 40;

  const todayX = useMemo(() => {
    if (!showToday) return -1;
    return dateToPixel(new Date(), store.scaleRange, store.cellWidth);
  }, [showToday, store.scaleRange, store.cellWidth]);

  return (
    <div className={cn('nop-gantt-markers absolute inset-0 pointer-events-none', className)} data-slot="gantt-markers">
      {showToday && todayX >= 0 && (
        <div
          data-slot="gantt-today"
          className="absolute top-0 w-px bg-red-400 z-20"
          style={{ left: todayX, height: Math.max(totalHeight, 100) }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-red-500 whitespace-nowrap">
            {t('scheduling.today')}
          </div>
        </div>
      )}
    </div>
  );
}

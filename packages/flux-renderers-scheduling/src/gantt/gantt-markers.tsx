import React, { useSyncExternalStore } from 'react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { GanttStoreApi } from './gantt.types.js';
import { dateToPixel } from './utils/layout.js';

interface GanttMarkersProps {
  store: GanttStoreApi;
  showToday?: boolean;
  className?: string;
}

export function GanttMarkers({ store, showToday = true, className }: GanttMarkersProps) {
  useSyncExternalStore(store.subscribe, () => store.layoutRevision);

  const tasks = store.getVisibleTasks();
  const totalHeight = tasks.length > 0
    ? tasks.reduce((max, t) => Math.max(max, t.$y + t.$h), 0)
    : tasks.length * 40;

  const todayX = (() => {
    if (!showToday) return -1;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return dateToPixel(today, store.scaleRange, store.cellWidth);
  })();

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

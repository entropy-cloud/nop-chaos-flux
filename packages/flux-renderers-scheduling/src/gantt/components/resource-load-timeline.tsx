import React from 'react';
import { cn } from '@nop-chaos/ui';
import type { ResourceLoadResult, DayLoad } from './resource-load.js';
import { getUnitLoadColor, getUnitLoadTooltip } from './resource-load.js';

interface ResourceLoadTimelineProps {
  loadResults: ResourceLoadResult[];
  cellWidth: number;
  className?: string;
}

export function ResourceLoadTimeline({ loadResults, cellWidth, className }: ResourceLoadTimelineProps) {
  if (loadResults.length === 0) return null;

  return (
    <div className={cn('nop-gantt-load-timeline h-full overflow-auto', className)} data-slot="gantt-load-timeline">
      {loadResults.map((result) => (
        <div
          key={String(result.resourceId)}
          className="flex border-b border-gray-100"
          style={{ height: 32 }}
          data-slot="gantt-load-row"
          data-resource-id={String(result.resourceId)}
        >
          {result.timelineLoad.map((dayLoad: DayLoad) => (
            <div
              key={dayLoad.date}
              className={cn(
                'flex-shrink-0 border-r border-gray-100',
                getUnitLoadColor(dayLoad.unitLoad),
              )}
              style={{ width: Math.max(cellWidth, 4), height: '100%' }}
              title={`${dayLoad.date}: ${getUnitLoadTooltip(dayLoad.unitLoad)}`}
              data-slot="gantt-load-cell"
              data-date={dayLoad.date}
              data-load={Math.round(dayLoad.unitLoad)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

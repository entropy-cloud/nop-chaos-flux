import React from 'react';
import type { GanttId, GanttResource, GanttAssignment, GanttTask } from '../gantt.types.js';
import type { WorkCalendar } from '../utils/worktime.js';
import { ResourceLoadGrid } from './resource-load-grid.js';
import { ResourceLoadTimeline } from './resource-load-timeline.js';
import { computeResourceLoads, type ResourceLoadResult } from './resource-load.js';

interface ResourceLoadViewProps {
  resources: Map<GanttId, GanttResource>;
  assignments: Map<GanttId, GanttAssignment>;
  tasks: Map<GanttId, GanttTask>;
  startDate: Date;
  endDate: Date;
  cellWidth: number;
  calendar?: WorkCalendar;
}

export function ResourceLoadView({
  resources, assignments, tasks, startDate, endDate, cellWidth, calendar,
}: ResourceLoadViewProps) {
  const loadResults: ResourceLoadResult[] = computeResourceLoads({
    resources, assignments, tasks, startDate, endDate, calendar,
  });

  if (resources.size === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm" data-slot="gantt-resource-empty">
        {'No resources configured'}
      </div>
    );
  }

  return (
    <div className="flex h-full border-t border-gray-200" data-slot="gantt-resource-load">
      <div className="flex-shrink-0" style={{ width: 220 }}>
        <ResourceLoadGrid resources={resources} loadResults={loadResults} />
      </div>
      <div className="flex-1 min-w-0 overflow-auto">
        <ResourceLoadTimeline
          loadResults={loadResults}
          cellWidth={cellWidth}
        />
      </div>
    </div>
  );
}

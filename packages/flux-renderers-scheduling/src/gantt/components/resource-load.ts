import type { GanttId, GanttAssignment, GanttResource, GanttTask } from '../gantt.types.js';
import type { WorkCalendar } from '../utils/worktime.js';
import { diffInDays } from '../utils/date.js';

export interface DayLoad {
  date: string;
  unitLoad: number;
  taskIds: GanttId[];
}

export interface ResourceLoadResult {
  resourceId: GanttId;
  totalLoad: number;
  timelineLoad: DayLoad[];
}

export interface ResourceLoadInput {
  resources: Map<GanttId, GanttResource>;
  assignments: Map<GanttId, GanttAssignment>;
  tasks: Map<GanttId, GanttTask>;
  startDate: Date;
  endDate: Date;
  calendar?: WorkCalendar;
}

function getWorkMinutesForDate(calendar: WorkCalendar | undefined, date: Date): number {
  if (!calendar) return 480;
  if (!calendar.isWorkingDay(date)) return 0;
  return calendar.getWorkMinutes(date);
}

export function computeResourceLoads(input: ResourceLoadInput): ResourceLoadResult[] {
  const { resources, assignments, tasks, startDate, endDate, calendar } = input;
  const totalDays = Math.max(diffInDays(endDate, startDate), 1);

  const assignmentByResource = new Map<GanttId, GanttAssignment[]>();
  for (const a of assignments.values()) {
    const list = assignmentByResource.get(a.resourceId) ?? [];
    list.push(a);
    assignmentByResource.set(a.resourceId, list);
  }

  const results: ResourceLoadResult[] = [];

  for (const resource of resources.values()) {
    const resourceAssignments = assignmentByResource.get(resource.id) ?? [];
    const dayLoads: DayLoad[] = [];
    let totalLoadSum = 0;

    for (let d = 0; d < totalDays; d++) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + d);
      const dateStr = currentDate.toISOString().slice(0, 10);

      const workMins = getWorkMinutesForDate(calendar, currentDate);
      if (workMins === 0) {
        dayLoads.push({ date: dateStr, unitLoad: 0, taskIds: [] });
        continue;
      }

      let totalUnits = 0;
      const dayTaskIds: GanttId[] = [];

      for (const assignment of resourceAssignments) {
        const task = tasks.get(assignment.taskId);
        if (!task) continue;

        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        if (currentDate < taskStart || currentDate > taskEnd) continue;

        const units = assignment.units ?? 100;
        totalUnits += (units / 100) * workMins;
        dayTaskIds.push(task.id);
      }

      const unitLoad = workMins > 0 ? (totalUnits / workMins) * 100 : 0;
      dayLoads.push({ date: dateStr, unitLoad: Math.min(unitLoad, 100), taskIds: dayTaskIds });
      totalLoadSum += unitLoad;
    }

    const avgTotalLoad = totalDays > 0 ? totalLoadSum / totalDays : 0;

    results.push({
      resourceId: resource.id,
      totalLoad: Math.min(avgTotalLoad, 100),
      timelineLoad: dayLoads,
    });
  }

  return results;
}

export function getUnitLoadColor(unitLoad: number): string {
  if (unitLoad < 70) return 'bg-green-400';
  if (unitLoad < 90) return 'bg-yellow-400';
  return 'bg-red-400';
}

export function getUnitLoadTooltip(unitLoad: number): string {
  if (unitLoad < 1) return 'Idle';
  if (unitLoad < 70) return `Normal (${Math.round(unitLoad)}%)`;
  if (unitLoad < 90) return `Warning (${Math.round(unitLoad)}%)`;
  return `Overload (${Math.round(unitLoad)}%)`;
}

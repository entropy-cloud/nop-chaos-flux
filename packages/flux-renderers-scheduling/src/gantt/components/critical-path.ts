import type { GanttId, GanttTask, GanttLink } from '../gantt.types.js';
import type { WorkCalendar } from '../utils/worktime.js';

export interface CriticalPathResult {
  criticalTaskIds: Set<GanttId>;
  totalDuration: number;
}

export function calculateCriticalPath(
  tasks: Map<GanttId, GanttTask>,
  links: Map<GanttId, GanttLink>,
  workCalendar?: WorkCalendar,
): CriticalPathResult {
  const taskIds = Array.from(tasks.keys());
  const n = taskIds.length;
  if (n === 0) return { criticalTaskIds: new Set(), totalDuration: 0 };

  const adj = new Map<GanttId, { target: GanttId; lag: number }[]>();
  const inDegree = new Map<GanttId, number>();

  for (const id of taskIds) {
    adj.set(id, []);
    inDegree.set(id, 0);
  }

  for (const link of links.values()) {
    const edges = adj.get(link.source);
    if (edges) {
      edges.push({ target: link.target, lag: link.lag ?? 0 });
    }
    inDegree.set(link.target, (inDegree.get(link.target) ?? 0) + 1);
  }

  const sorted: GanttId[] = [];
  const queue: GanttId[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const edge of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(edge.target) ?? 1) - 1;
      inDegree.set(edge.target, newDeg);
      if (newDeg === 0) queue.push(edge.target);
    }
  }

  const earliestStart = new Map<GanttId, number>();
  const earliestFinish = new Map<GanttId, number>();

  function taskDur(task: GanttTask): number {
    return workCalendar ? diffWorkingMs(task.end, task.start, workCalendar) : diffMs(task.end, task.start);
  }

  for (const id of taskIds) {
    const task = tasks.get(id)!;
    const dur = taskDur(task);
    earliestStart.set(id, 0);
    earliestFinish.set(id, dur);
  }

  for (const id of sorted) {
    const ef = earliestFinish.get(id) ?? 0;
    for (const edge of adj.get(id) ?? []) {
      const targetEs = Math.max(earliestStart.get(edge.target) ?? 0, ef + edge.lag * 86400000);
      earliestStart.set(edge.target, targetEs);
      const targetTask = tasks.get(edge.target);
      if (targetTask) {
        const targetDur = taskDur(targetTask);
        earliestFinish.set(edge.target, targetEs + targetDur);
      }
    }
  }

  const projectEnd = Math.max(...Array.from(earliestFinish.values()), 0);

  const revAdj = new Map<GanttId, { source: GanttId; lag: number }[]>();
  for (const id of taskIds) {
    revAdj.set(id, []);
  }
  for (const link of links.values()) {
    const preds = revAdj.get(link.target);
    if (preds) {
      preds.push({ source: link.source, lag: link.lag ?? 0 });
    }
  }

  const latestStart = new Map<GanttId, number>();
  const latestFinish = new Map<GanttId, number>();

  for (const id of taskIds) {
    latestFinish.set(id, projectEnd);
  }

  for (const id of sorted.slice().reverse()) {
    const lf = latestFinish.get(id) ?? projectEnd;
    const task = tasks.get(id)!;
    const dur = taskDur(task);
    const ls = lf - dur;
    latestStart.set(id, ls);

    for (const pred of revAdj.get(id) ?? []) {
      const predCandidate = ls - pred.lag * 86400000;
      const currentLf = latestFinish.get(pred.source) ?? projectEnd;
      latestFinish.set(pred.source, Math.min(currentLf, predCandidate));
    }
  }

  const criticalTaskIds = new Set<GanttId>();
  for (const id of taskIds) {
    const es = earliestStart.get(id) ?? 0;
    const lsVal = latestStart.get(id) ?? 0;
    const totalFloat = lsVal - es;
    if (Math.abs(totalFloat) < 1) {
      criticalTaskIds.add(id);
    }
  }

  return { criticalTaskIds, totalDuration: projectEnd };
}

function diffMs(end: string, start: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

function diffWorkingMs(end: string, start: string, calendar: WorkCalendar): number {
  const from = new Date(start);
  const to = new Date(end);
  const workDays = Math.max(0, calendar.countWorkDays(from, to) - 1);
  return workDays * 86400000;
}

export function isCriticalTask(taskId: GanttId, criticalPathResult: CriticalPathResult): boolean {
  return criticalPathResult.criticalTaskIds.has(taskId);
}

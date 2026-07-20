import type { GanttTask, GanttLink, GanttId } from '../gantt.types.js';
import { diffInDays } from './date.js';

export interface TaskLayoutInput {
  start: string;
  end: string;
}

export interface TaskLayoutResult {
  $x: number;
  $y: number;
  $w: number;
  $h: number;
}

export interface ScaleLayoutRange {
  start: Date;
  end: Date;
}

export function dateToPixel(date: Date, scaleRange: ScaleLayoutRange, cellWidth: number): number {
  const relDays = diffInDays(date, scaleRange.start);
  return Math.max(relDays * cellWidth, 0);
}

export function pixelToDate(x: number, scaleRange: ScaleLayoutRange, cellWidth: number): Date {
  const days = x / cellWidth;
  const result = new Date(scaleRange.start);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function taskToPixels(
  task: TaskLayoutInput,
  scaleRange: ScaleLayoutRange,
  cellWidth: number,
  taskBarHeight: number,
  rowPadding: number,
): TaskLayoutResult {
  const taskStart = new Date(task.start);
  const taskEnd = new Date(task.end);

  const x = dateToPixel(taskStart, scaleRange, cellWidth);
  const durDays = diffInDays(taskEnd, taskStart);
  const w = Math.max(durDays * cellWidth, 4);
  const h = taskBarHeight;
  const y = rowPadding / 2;

  return { $x: x, $y: y, $w: w, $h: h };
}

export function computeTaskLayout(
  tasks: GanttTask[],
  visibleTaskIds: GanttId[],
  scaleRange: ScaleLayoutRange,
  cellWidth: number,
  taskBarHeight: number,
  rowHeight: number,
): void {
  const taskMap = new Map<GanttId, GanttTask>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  let y = 0;
  for (const taskId of visibleTaskIds) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    const pixels = taskToPixels(task, scaleRange, cellWidth, taskBarHeight, rowHeight - taskBarHeight);
    task.$x = pixels.$x;
    task.$y = y + pixels.$y;
    task.$w = pixels.$w;
    task.$h = pixels.$h;
    y += rowHeight;
  }
}

export interface LinkPolylineInput {
  $x: number;
  $y: number;
  $w: number;
  $h: number;
}

export function linkToPolyline(
  source: LinkPolylineInput,
  target: LinkPolylineInput,
): string {
  const sx = source.$x + source.$w;
  const sy = source.$y + source.$h / 2;
  const tx = target.$x;
  const ty = target.$y + target.$h / 2;
  const mx = (sx + tx) / 2;

  return `${sx},${sy} ${mx},${sy} ${mx},${ty} ${tx},${ty}`;
}

export function computeLinkPolylines(
  tasks: Map<GanttId, GanttTask>,
  links: Map<GanttId, GanttLink>,
): void {
  for (const link of links.values()) {
    const source = tasks.get(link.source);
    const target = tasks.get(link.target);
    if (source && target) {
      link.$p = linkToPolyline(source, target);
    }
  }
}

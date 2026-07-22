import type { GanttTask, GanttLink, GanttId, GanttLinkType } from '../gantt.types.js';
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
  const w = Math.max(durDays * cellWidth, cellWidth);
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

function getAnchor(input: LinkPolylineInput, side: 'left' | 'right'): { x: number; y: number } {
  return {
    x: side === 'left' ? input.$x : input.$x + input.$w,
    y: input.$y + input.$h / 2,
  };
}

export function linkToPolyline(
  source: LinkPolylineInput,
  target: LinkPolylineInput,
  type: GanttLinkType = 'finish_to_start',
): string {
  const src = getAnchor(source, type === 'finish_to_start' || type === 'finish_to_finish' ? 'right' : 'left');
  const tgt = getAnchor(target, type === 'finish_to_start' || type === 'start_to_start' ? 'left' : 'right');
  const bend = 20;

  if (tgt.x >= src.x + bend) {
    const mx = (src.x + tgt.x) / 2;
    return `${src.x},${src.y} ${mx},${src.y} ${mx},${tgt.y} ${tgt.x},${tgt.y}`;
  }

  const wrapX = Math.max(tgt.x - bend, 0);
  const mx1 = (src.x + wrapX) / 2;
  const mx2 = (wrapX + tgt.x) / 2;
  return `${src.x},${src.y} ${mx1},${src.y} ${mx1},${src.y} ${wrapX},${src.y} ${wrapX},${tgt.y} ${mx2},${tgt.y} ${tgt.x},${tgt.y}`;
}

export function computeLinkPolylines(
  tasks: Map<GanttId, GanttTask>,
  links: Map<GanttId, GanttLink>,
): void {
  for (const link of links.values()) {
    const source = tasks.get(link.source);
    const target = tasks.get(link.target);
    if (source && target) {
      link.$p = linkToPolyline(source, target, link.type);
    }
  }
}

import type { GanttTask, GanttScale as GanttScaleConfig } from '../gantt.types.js';
import { unitStart, unitEnd, addUnit, formatDate, diffInDays } from './date.js';

export interface ScaleRange {
  start: Date;
  end: Date;
}

export interface ScaleCell {
  start: Date;
  end: Date;
  label: string;
  x: number;
  width: number;
}

export interface ScaleRow {
  unit: GanttScaleConfig['unit'];
  cells: ScaleCell[];
}

export function computeScaleRange(tasks: GanttTask[], startDate?: string, endDate?: string): ScaleRange {
  if (startDate && endDate) {
    return { start: unitStart(new Date(startDate), 'day'), end: unitEnd(new Date(endDate), 'day') };
  }

  if (tasks.length === 0) {
    const now = new Date();
    return {
      start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
      end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)),
    };
  }

  let minMs = Infinity;
  let maxMs = -Infinity;

  if (startDate) {
    minMs = new Date(startDate).getTime();
  }
  if (endDate) {
    maxMs = new Date(endDate).getTime();
  }

  for (const task of tasks) {
    const s = new Date(task.start).getTime();
    const e = new Date(task.end).getTime();
    if (!startDate && s < minMs) minMs = s;
    if (!endDate && e > maxMs) maxMs = e;
  }

  if (minMs === Infinity) minMs = Date.now();
  if (maxMs === -Infinity) maxMs = minMs + 86400000;
  if (minMs >= maxMs) maxMs = minMs + 86400000;

  const pad = Math.max((maxMs - minMs) * 0.1, 86400000);

  return {
    start: unitStart(new Date(minMs - pad), 'day'),
    end: unitEnd(new Date(maxMs + pad), 'day'),
  };
}

export function computeScaleIntervals(
  scaleRange: ScaleRange,
  scales: GanttScaleConfig[],
  cellWidth: number,
): ScaleRow[] {
  return scales.map((scaleConfig) => computeScaleRow(scaleRange, scaleConfig, cellWidth));
}

function computeScaleRow(
  scaleRange: ScaleRange,
  scaleConfig: GanttScaleConfig,
  cellWidth: number,
): ScaleRow {
  const { unit, step = 1, format = defaultFormat(unit) } = scaleConfig;
  const cells: ScaleCell[] = [];

  let cursor = unitStart(scaleRange.start, unit);
  const end = scaleRange.end;

  let x = 0;

  while (cursor < end) {
    const cellEnd = addUnit(cursor, unit, step);
    const cellStartDays = diffInDays(cursor, scaleRange.start);
    const cellEndDays = diffInDays(cellEnd, scaleRange.start);

    const cellWidthPx = Math.max((cellEndDays - cellStartDays) * cellWidth, 0);

    cells.push({
      start: new Date(cursor),
      end: new Date(cellEnd),
      label: formatDate(cursor, format),
      x,
      width: cellWidthPx,
    });

    x += cellWidthPx;
    cursor = cellEnd;
  }

  return { unit, cells };
}

function defaultFormat(unit: GanttScaleConfig['unit']): string {
  switch (unit) {
    case 'hour':
      return '%H:00';
    case 'day':
      return '%d';
    case 'week':
      return 'W%V';
    case 'month':
      return '%Y/%m';
    case 'quarter':
      return 'Q%q';
    case 'year':
      return '%Y';
  }
}

export interface VisibleWindow {
  startCellIndex: number;
  endCellIndex: number;
  offsetX: number;
}

export function smartScaling(
  scrollLeft: number,
  containerWidth: number,
  cells: ScaleCell[],
): VisibleWindow {
  const visibleStart = scrollLeft;
  const visibleEnd = scrollLeft + containerWidth;

  let startIndex = 0;
  let endIndex = cells.length - 1;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.x + cell.width > visibleStart) {
      startIndex = i;
      break;
    }
  }

  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i];
    if (cell.x < visibleEnd) {
      endIndex = i;
      break;
    }
  }

  return {
    startCellIndex: startIndex,
    endCellIndex: endIndex,
    offsetX: cells[startIndex]?.x ?? 0,
  };
}

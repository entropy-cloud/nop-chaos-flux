import React from 'react';
import type { GanttTask, GanttBaseline } from '../gantt.types.js';
import { dateToPixel } from '../utils/layout.js';
import type { ScaleLayoutRange } from '../utils/layout.js';
import { diffInDays } from '../utils/date.js';

interface BaselineBarsProps {
  task: GanttTask;
  scaleRange: ScaleLayoutRange;
  cellWidth: number;
  taskBarHeight: number;
}

function getDeviationDays(baseline: GanttBaseline, task: GanttTask): number {
  const baseStart = new Date(baseline.baseStart).getTime();
  const actualStart = new Date(task.start).getTime();
  return Math.round((actualStart - baseStart) / 86400000);
}

export function BaselineBars({ task, scaleRange, cellWidth, taskBarHeight }: BaselineBarsProps) {
  if (!task.baselines || task.baselines.length === 0) return null;

  return (
    <>
      {task.baselines.map((baseline) => {
        const baseStartDate = new Date(baseline.baseStart);
        const baseEndDate = new Date(baseline.baseEnd);
        const bx = dateToPixel(baseStartDate, scaleRange, cellWidth);
        const bw = Math.max(diffInDays(baseEndDate, baseStartDate) * cellWidth, 4);
        const by = task.$y + taskBarHeight + 2;

        const deviationDays = getDeviationDays(baseline, task);
        const hasDeviation = Math.abs(deviationDays) > 0;

        return (
          <g key={String(baseline.id)}>
            <rect
              x={bx}
              y={by}
              width={bw}
              height={taskBarHeight * 0.6}
              style={{
                fill: 'var(--color-muted-foreground)',
                fillOpacity: 0.4,
                stroke: 'var(--color-muted-foreground)',
                strokeOpacity: 0.6,
              }}
              strokeWidth={1}
              rx={2}
              data-slot="gantt-baseline-bar"
              data-baseline-id={String(baseline.id)}
            />
            {hasDeviation && (
              <>
                <line
                  x1={task.$x + task.$w / 2}
                  y1={task.$y + taskBarHeight / 2}
                  x2={bx + bw / 2}
                  y2={by + taskBarHeight * 0.3}
                  style={{ stroke: deviationDays > 0 ? 'var(--color-destructive)' : 'var(--color-warning)' }}
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  data-slot="gantt-baseline-deviation"
                  data-deviation={deviationDays > 0 ? 'late' : 'early'}
                />
                <text
                  x={(task.$x + task.$w / 2 + bx + bw / 2) / 2}
                  y={Math.max(Math.min(task.$y, by) - 4, 8)}
                  textAnchor="middle"
                  style={{ fill: deviationDays > 0 ? 'var(--color-destructive)' : 'var(--color-warning)' }}
                  fontSize={9}
                  data-slot="gantt-baseline-label"
                >
                  {deviationDays > 0 ? `+${deviationDays}d` : `${deviationDays}d`}
                </text>
              </>
            )}
          </g>
        );
      })}
    </>
  );
}

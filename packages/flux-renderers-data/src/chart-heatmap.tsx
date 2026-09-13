import React from 'react';

// 自绘 heatmap 网格单元尺寸（viewBox 坐标，随容器缩放）。
export const HEATMAP_CELL_SIZE = 28;

export interface HeatmapRow {
  x: string | number;
  y: string | number;
  value: number;
}

/** 清洗 heatmap 数据行（`{ x, y, value }`）；畸形行丢弃（DD1 空态硬契约延续）。 */
export function sanitizeHeatmapRows(value: unknown): HeatmapRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: HeatmapRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const candidate = item as Record<string, unknown>;
    const x = candidate.x;
    const y = candidate.y;
    const numeric = Number(candidate.value);
    if (typeof x !== 'string' && typeof x !== 'number') {
      continue;
    }
    if (typeof y !== 'string' && typeof y !== 'number') {
      continue;
    }
    if (!Number.isFinite(numeric)) {
      continue;
    }
    rows.push({ x, y, value: numeric });
  }
  return rows;
}

export interface HeatmapGridModel {
  xLabels: (string | number)[];
  yLabels: (string | number)[];
  cells: Array<{ x: number; y: number; value: number; opacity: number }>;
  width: number;
  height: number;
}

/** 把 heatmap 行映射为 x/y 网格 + 单元格（含色阶不透明度）。 */
export function buildHeatmapGrid(rows: HeatmapRow[]): HeatmapGridModel {
  const xLabels: (string | number)[] = [];
  const yLabels: (string | number)[] = [];
  const xIndex = new Map<string | number, number>();
  const yIndex = new Map<string | number, number>();
  for (const row of rows) {
    if (!xIndex.has(row.x)) {
      xIndex.set(row.x, xLabels.length);
      xLabels.push(row.x);
    }
    if (!yIndex.has(row.y)) {
      yIndex.set(row.y, yLabels.length);
      yLabels.push(row.y);
    }
  }
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    if (row.value < min) min = row.value;
    if (row.value > max) max = row.value;
  }
  const span = max - min || 1;
  const cells = rows.map((row) => ({
    x: xIndex.get(row.x)!,
    y: yIndex.get(row.y)!,
    value: row.value,
    opacity: 0.15 + 0.85 * ((row.value - min) / span),
  }));
  return {
    xLabels,
    yLabels,
    cells,
    width: Math.max(xLabels.length, 1) * HEATMAP_CELL_SIZE,
    height: Math.max(yLabels.length, 1) * HEATMAP_CELL_SIZE,
  };
}

// 轴标签留白（viewBox 坐标）：左侧 y 标签列宽 + 底部 x 标签行高。
const LABEL_GUTTER_X = 56;
const LABEL_GUTTER_Y = 18;
const LABEL_FONT_SIZE = 9;

export function HeatmapGrid(props: { grid: HeatmapGridModel; ariaLabel: string }) {
  const { grid, ariaLabel } = props;
  const totalWidth = LABEL_GUTTER_X + grid.width;
  const totalHeight = grid.height + LABEL_GUTTER_Y;
  return (
    <svg
      data-slot="chart-heatmap"
      data-x-labels={grid.xLabels.join(',')}
      data-y-labels={grid.yLabels.join(',')}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className="h-full w-full"
    >
      {grid.cells.map((cell) => (
        <rect
          key={`heatmap-cell-${cell.x}-${cell.y}`}
          data-cell-x={String(grid.xLabels[cell.x])}
          data-cell-y={String(grid.yLabels[cell.y])}
          data-cell-value={String(cell.value)}
          x={LABEL_GUTTER_X + cell.x * HEATMAP_CELL_SIZE}
          y={cell.y * HEATMAP_CELL_SIZE}
          width={HEATMAP_CELL_SIZE - 1}
          height={HEATMAP_CELL_SIZE - 1}
          rx={2}
          fill="hsl(var(--chart-1))"
          fillOpacity={cell.opacity}
        >
          <title>{`${grid.xLabels[cell.x]} / ${grid.yLabels[cell.y]}: ${cell.value}`}</title>
        </rect>
      ))}
      {grid.xLabels.map((label, index) => (
        <text
          key={`heatmap-x-label-${label}`}
          x={LABEL_GUTTER_X + index * HEATMAP_CELL_SIZE + HEATMAP_CELL_SIZE / 2}
          y={grid.height + LABEL_FONT_SIZE + 3}
          textAnchor="middle"
          fontSize={LABEL_FONT_SIZE}
          fill="hsl(var(--muted-foreground))"
        >
          {label}
        </text>
      ))}
      {grid.yLabels.map((label, index) => (
        <text
          key={`heatmap-y-label-${label}`}
          x={LABEL_GUTTER_X - 4}
          y={index * HEATMAP_CELL_SIZE + HEATMAP_CELL_SIZE / 2}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={LABEL_FONT_SIZE}
          fill="hsl(var(--muted-foreground))"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

import type { SparklineStatus } from './sparkline-schemas.js';

export interface SparklineDomain {
  min: number;
  max: number;
}

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineGeometryOptions {
  width: number;
  height: number;
  smooth: boolean;
  fill: boolean;
  min?: number;
  max?: number;
}

export interface SparklineGeometry {
  /** 折线/平滑曲线 path `d`（空数据/单点 = undefined）。 */
  path: string | undefined;
  /** 渐变面积 path `d`（`fill` 开启且 ≥2 点时）。 */
  area: string | undefined;
  /** 单点标记（仅单点数据）。 */
  dot: { cx: number; cy: number } | undefined;
  /** 归一化坐标串（≥2 点时，供 data-points 程序化断言）。 */
  points: string | undefined;
}

function devWarn(message: string): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[sparkline] ${message}`);
  }
}

/**
 * 归一化 sparkline 数据：
 * - 非数组 → 空数组（dev warn，Failure Path sparkline-empty）；
 * - 含 null/NaN/非有限数的点过滤 + dev warn（Failure Path sparkline-invalid-point）。
 */
export function sanitizeSparklineValues(value: unknown): number[] {
  if (!Array.isArray(value)) {
    if (value !== undefined && value !== null) {
      devWarn('sparkline.data must be an array of numbers; rendering empty sparkline.');
    }
    return [];
  }
  const out: number[] = [];
  let dropped = 0;
  for (const item of value) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      out.push(item);
    } else {
      dropped += 1;
    }
  }
  if (dropped > 0) {
    devWarn(`sparkline.data contains ${dropped} non-finite value(s); they were filtered out.`);
  }
  return out;
}

/**
 * 方向推导：尾 > 首 = `up`，尾 < 首 = `down`，其余（含空/单点）= `neutral`。
 */
export function resolveSparklineStatus(values: number[]): SparklineStatus {
  if (values.length < 2) {
    return 'neutral';
  }
  const first = values[0];
  const last = values[values.length - 1];
  if (last > first) {
    return 'up';
  }
  if (last < first) {
    return 'down';
  }
  return 'neutral';
}

/**
 * Y 域归一化：
 * - 显式 `min`/`max` 优先（缺省取数据极值）；
 * - 零跨度（全部数据相等）回退 [value-1, value+1]（避免除零，Failure Path sparkline-flat）；
 * - 空数据回退 [0, 1]（调用方据此不渲染）。
 */
export function normalizeYDomain(
  values: number[],
  explicitMin?: number,
  explicitMax?: number,
): SparklineDomain {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }
  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (const value of values) {
    if (value < dataMin) dataMin = value;
    if (value > dataMax) dataMax = value;
  }
  const min = typeof explicitMin === 'number' && Number.isFinite(explicitMin) ? explicitMin : dataMin;
  const max = typeof explicitMax === 'number' && Number.isFinite(explicitMax) ? explicitMax : dataMax;
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  if (min > max) {
    return { min: max, max: min };
  }
  return { min, max };
}

/**
 * 坐标映射：首点贴 x=0 边、末点贴 x=width 边；y 翻转（数据大 → 视觉上）。
 * 单点无法映射（无跨度），调用方改走单点标记路径。
 */
export function buildSparklinePoints(
  values: number[],
  width: number,
  height: number,
  domain: SparklineDomain,
): SparklinePoint[] | undefined {
  if (values.length < 2) {
    return undefined;
  }
  const span = domain.max - domain.min;
  const step = width / (values.length - 1);
  return values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - domain.min) / span) * height;
    return { x: roundCoord(x), y: roundCoord(y) };
  });
}

function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * SVG path `d` 构造：折线（`smooth=false` → L 段）或 Catmull-Rom 转贝塞尔平滑
 * （`smooth=true` → C 段）。n < 2 → undefined。
 */
export function buildSparklinePath(points: SparklinePoint[] | undefined, smooth: boolean): string | undefined {
  if (!points || points.length < 2) {
    return undefined;
  }
  const d = [`M ${points[0].x},${points[0].y}`];
  if (!smooth) {
    for (let i = 1; i < points.length; i += 1) {
      d.push(`L ${points[i].x},${points[i].y}`);
    }
    return d.join(' ');
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${roundCoord(c1x)},${roundCoord(c1y)} ${roundCoord(c2x)},${roundCoord(c2y)} ${p2.x},${p2.y}`);
  }
  return d.join(' ');
}

/**
 * 组合入口：空数据/单点/正常三态降级（Failure Paths sparkline-empty /
 * sparkline-single-point / sparkline-flat / sparkline-invalid-point）。
 */
export function buildSparklineGeometry(values: number[], options: SparklineGeometryOptions): SparklineGeometry {
  const width = options.width;
  const height = options.height;
  if (values.length === 0) {
    return { path: undefined, area: undefined, dot: undefined, points: undefined };
  }
  if (values.length === 1) {
    return {
      path: undefined,
      area: undefined,
      dot: { cx: width / 2, cy: height / 2 },
      points: undefined,
    };
  }
  const domain = normalizeYDomain(values, options.min, options.max);
  const points = buildSparklinePoints(values, width, height, domain);
  const path = buildSparklinePath(points, options.smooth);
  const area = options.fill && points ? buildSparklineArea(points, width, height) : undefined;
  return {
    path,
    area,
    dot: undefined,
    points: points?.map((p) => `${p.x},${p.y}`).join(' '),
  };
}

function buildSparklineArea(points: SparklinePoint[], width: number, height: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  const line = points
    .slice(1)
    .map((p) => `L ${p.x},${p.y}`)
    .join(' ');
  return `M ${first.x},${first.y} ${line} L ${last.x},${height} L ${first.x},${height} Z`;
}

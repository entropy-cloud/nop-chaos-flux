import { describe, expect, it, vi } from 'vitest';
import {
  buildSparklineGeometry,
  buildSparklinePath,
  buildSparklinePoints,
  normalizeYDomain,
  resolveSparklineStatus,
  sanitizeSparklineValues,
} from './sparkline-path.js';

describe('sanitizeSparklineValues — 非法点过滤 + dev warn', () => {
  it('returns [] for non-array input and dev-warns (sparkline-empty)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(sanitizeSparklineValues(undefined)).toEqual([]);
    expect(sanitizeSparklineValues(null)).toEqual([]);
    expect(sanitizeSparklineValues({ not: 'array' })).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn when data is missing entirely (undefined/null)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(sanitizeSparklineValues(undefined)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('filters null/NaN/non-finite points and dev-warns (sparkline-invalid-point)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(sanitizeSparklineValues([1, 'x', null, NaN, Infinity, 2])).toEqual([1, 2]);
    expect(warn).toHaveBeenCalledWith(
      '[sparkline] sparkline.data contains 4 non-finite value(s); they were filtered out.',
    );
    warn.mockRestore();
  });
});

describe('resolveSparklineStatus — 首尾值比较推导', () => {
  it('last > first = up', () => {
    expect(resolveSparklineStatus([1, 2, 3])).toBe('up');
  });

  it('last < first = down', () => {
    expect(resolveSparklineStatus([5, 4, 2])).toBe('down');
  });

  it('equal ends / single point / empty = neutral', () => {
    expect(resolveSparklineStatus([3, 3, 3])).toBe('neutral');
    expect(resolveSparklineStatus([7])).toBe('neutral');
    expect(resolveSparklineStatus([])).toBe('neutral');
  });
});

describe('normalizeYDomain — 极值 / 显式域 / 零跨度回退', () => {
  it('derives extremes from data by default', () => {
    expect(normalizeYDomain([2, 8, 4])).toEqual({ min: 2, max: 8 });
  });

  it('explicit min/max override data extremes', () => {
    expect(normalizeYDomain([2, 8, 4], 0, 10)).toEqual({ min: 0, max: 10 });
  });

  it('half-explicit domain keeps the other extreme from data', () => {
    expect(normalizeYDomain([2, 8, 4], undefined, 10)).toEqual({ min: 2, max: 10 });
    expect(normalizeYDomain([2, 8, 4], 0)).toEqual({ min: 0, max: 8 });
  });

  it('zero-span domain falls back to [value-1, value+1] (sparkline-flat)', () => {
    expect(normalizeYDomain([5, 5, 5])).toEqual({ min: 4, max: 6 });
    expect(normalizeYDomain([5, 5, 5], 5)).toEqual({ min: 4, max: 6 });
  });

  it('empty data falls back to [0, 1]', () => {
    expect(normalizeYDomain([])).toEqual({ min: 0, max: 1 });
  });
});

describe('buildSparklinePoints — 端点贴边与坐标映射', () => {
  it('maps endpoints to the canvas edges (first x=0, last x=width)', () => {
    const points = buildSparklinePoints([0, 10], 100, 50, { min: 0, max: 10 });
    expect(points).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 0 },
    ]);
  });

  it('flips the y axis (larger value renders higher)', () => {
    const points = buildSparklinePoints([0, 5, 10], 100, 50, { min: 0, max: 10 });
    expect(points).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ]);
  });

  it('flat domain (fallback) renders a mid-line', () => {
    const points = buildSparklinePoints([5, 5, 5], 120, 32, { min: 4, max: 6 });
    expect(points).toEqual([
      { x: 0, y: 16 },
      { x: 60, y: 16 },
      { x: 120, y: 16 },
    ]);
  });

  it('returns undefined for a single point (dot path instead)', () => {
    expect(buildSparklinePoints([7], 120, 32, { min: 0, max: 1 })).toBeUndefined();
  });
});

describe('buildSparklinePath — 折线 / 平滑路径', () => {
  const points = [
    { x: 0, y: 50 },
    { x: 50, y: 25 },
    { x: 100, y: 0 },
  ];

  it('polyline emits M + L segments through every point', () => {
    expect(buildSparklinePath(points, false)).toBe('M 0,50 L 50,25 L 100,0');
  });

  it('smooth emits M + C segments ending at the last point', () => {
    const d = buildSparklinePath(points, true);
    expect(d).toBeDefined();
    expect(d?.startsWith('M 0,50')).toBe(true);
    expect((d?.split('C ').length ?? 0) - 1).toBe(2);
    expect(d?.endsWith('100,0')).toBe(true);
  });

  it('returns undefined for fewer than 2 points', () => {
    expect(buildSparklinePath(undefined, false)).toBeUndefined();
    expect(buildSparklinePath([{ x: 0, y: 0 }], false)).toBeUndefined();
  });
});

describe('buildSparklineGeometry — 三态组合与降级', () => {
  it('empty data → no path/area/dot (sparkline-empty)', () => {
    const geometry = buildSparklineGeometry([], { width: 120, height: 32, smooth: false, fill: false });
    expect(geometry).toEqual({ path: undefined, area: undefined, dot: undefined, points: undefined });
  });

  it('single point → centered dot, no path (sparkline-single-point)', () => {
    const geometry = buildSparklineGeometry([7], { width: 120, height: 32, smooth: false, fill: false });
    expect(geometry.path).toBeUndefined();
    expect(geometry.area).toBeUndefined();
    expect(geometry.dot).toEqual({ cx: 60, cy: 16 });
  });

  it('flat values → mid-line path via domain fallback (sparkline-flat)', () => {
    const geometry = buildSparklineGeometry([5, 5, 5], { width: 120, height: 32, smooth: false, fill: false });
    expect(geometry.path).toBe('M 0,16 L 60,16 L 120,16');
    expect(geometry.area).toBeUndefined();
  });

  it('fill builds the area path closing at the bottom edge', () => {
    const geometry = buildSparklineGeometry([0, 10], { width: 100, height: 50, smooth: false, fill: true });
    expect(geometry.path).toBe('M 0,50 L 100,0');
    expect(geometry.area).toBe('M 0,50 L 100,0 L 100,50 L 0,50 Z');
  });

  it('smooth propagates into the path and points stay assertable', () => {
    const geometry = buildSparklineGeometry([0, 5, 10], { width: 100, height: 50, smooth: true, fill: true });
    expect((geometry.path?.split('C ').length ?? 0) - 1).toBe(2);
    expect(geometry.points).toBe('0,50 50,25 100,0');
    expect(geometry.area).toBeDefined();
  });
});

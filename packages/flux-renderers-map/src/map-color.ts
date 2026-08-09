import type { MapVisualMapSchema } from './schemas.js';

/** 缺省色阶（无 visualMap.colors 时）：蓝 → 青 → 黄 → 红（choropleth 常规语义）。 */
const DEFAULT_COLORS = ['#1e88e5', '#29b6f6', '#ffd54f', '#ff8f00', '#e53935'];

/** 缺省无值 / 无范围颜色。 */
export const DEFAULT_MAP_COLOR = '#dddddd';

export interface DataRange {
  min: number;
  max: number;
}

export interface MapColorScale {
  min: number | undefined;
  max: number | undefined;
  color(value: number | undefined): string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): [number, number, number] {
  let normalized = hex.trim().replace(/^#/, '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) {
    return [0, 0, 0];
  }
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb.map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
}

function interpolate(stops: Array<[number, [number, number, number]]>, t: number): string {
  const clamped = clamp(t, 0, 1);
  if (stops.length === 1) {
    return rgbToHex(stops[0][1]);
  }
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [t0, rgb0] = stops[i];
    const [t1, rgb1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const local = t1 === t0 ? 0 : (clamped - t0) / (t1 - t0);
      return rgbToHex([
        rgb0[0] + (rgb1[0] - rgb0[0]) * local,
        rgb0[1] + (rgb1[1] - rgb0[1]) * local,
        rgb0[2] + (rgb1[2] - rgb0[2]) * local,
      ]);
    }
  }
  return rgbToHex(stops[stops.length - 1][1]);
}

/**
 * 色阶构造：min/max 取 visualMap 声明值，缺省回退数据范围；
 * 颜色数组多段线性插值，数据外插 clamp；无值 / NaN → defaultColor。
 */
export function buildColorScale(
  visualMap: MapVisualMapSchema | undefined,
  dataRange: DataRange | null,
): MapColorScale {
  const colors = Array.isArray(visualMap?.colors)
    ? visualMap.colors.filter((color): color is string => typeof color === 'string')
    : DEFAULT_COLORS;
  const defaultColor =
    typeof visualMap?.defaultColor === 'string' ? visualMap.defaultColor : DEFAULT_MAP_COLOR;

  const declaredMin = typeof visualMap?.min === 'number' ? visualMap.min : undefined;
  const declaredMax = typeof visualMap?.max === 'number' ? visualMap.max : undefined;
  const min = declaredMin ?? dataRange?.min;
  const max = declaredMax ?? dataRange?.max;

  const hasRange =
    typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max);

  if (!hasRange) {
    return {
      min,
      max,
      color: () => defaultColor,
    };
  }

  const resolvedMin = min as number;
  const resolvedMax = max as number;
  const stops: Array<[number, [number, number, number]]> = colors.map((color, index) => [
    colors.length === 1 ? 0 : index / (colors.length - 1),
    hexToRgb(color),
  ]);

  if (resolvedMin === resolvedMax) {
    return {
      min: resolvedMin,
      max: resolvedMax,
      color: (value) =>
        value === undefined || !Number.isFinite(value) ? defaultColor : rgbToHex(stops[0][1]),
    };
  }

  return {
    min: resolvedMin,
    max: resolvedMax,
    color: (value) => {
      if (value === undefined || !Number.isFinite(value)) {
        return defaultColor;
      }
      const normalized = (clamp(value, resolvedMin, resolvedMax) - resolvedMin) / (resolvedMax - resolvedMin);
      return interpolate(stops, normalized);
    },
  };
}

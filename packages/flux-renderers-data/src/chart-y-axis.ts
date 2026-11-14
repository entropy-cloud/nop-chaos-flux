import { getIn } from '@nop-chaos/flux-core';
import type { ChartSeriesSchema, ChartYAxisSchema } from './chart-schemas.js';

export interface SanitizedYAxisEntry {
  label?: string;
  position: 'left' | 'right';
  integerTicks: boolean;
}

/**
 * 归一化 `yAxis`：单轴形态（`{ label }`）产出单个 left 轴；多轴形态（数组）
 * 逐项清洗（非法项丢弃，全部非法 → 回退单轴）。
 */
export function sanitizeYAxis(value: unknown): { entries: SanitizedYAxisEntry[]; multi: boolean } {
  if (Array.isArray(value)) {
    const entries: SanitizedYAxisEntry[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const candidate = entry as ChartYAxisSchema;
      const position = candidate.position === 'right' ? 'right' : 'left';
      entries.push({
        label: typeof candidate.label === 'string' ? candidate.label : undefined,
        position,
        integerTicks: candidate.integerTicks === true,
      });
    }
    if (entries.length > 0) {
      return { entries, multi: true };
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = value as { label?: unknown; integerTicks?: unknown };
    return {
      entries: [
        {
          label: typeof candidate.label === 'string' ? candidate.label : undefined,
          position: 'left',
          integerTicks: candidate.integerTicks === true,
        },
      ],
      multi: false,
    };
  }
  return { entries: [{ label: undefined, position: 'left', integerTicks: false }], multi: false };
}

type IntegerYAxisScale = Map<number, { domain: [number, number]; ticks: number[] }>;

/**
 * `integerTicks: true` 时由数据推导整数刻度（0..ceil(max)，最多 ~6 档）。
 * recharts 3 的 `allowDecimals` 在默认 `scale.ticks` 路径下不生效，显式
 * domain+ticks 是跨版本稳定的最小实现。
 */
export function buildIntegerYAxisScale(
  cartesianData: Array<Record<string, unknown>>,
  series: ChartSeriesSchema[],
  yAxisEntries: SanitizedYAxisEntry[],
  dualAxisEnabled: boolean,
): IntegerYAxisScale {
  const integerYAxisScale: IntegerYAxisScale = new Map();
  if (cartesianData.length === 0) {
    return integerYAxisScale;
  }
  yAxisEntries.forEach((entry, index) => {
    if (!entry.integerTicks) {
      return;
    }
    const axisId = dualAxisEnabled ? index : 0;
    let maxVal = 0;
    cartesianData.forEach((item) => {
      series.forEach((s) => {
        if (dualAxisEnabled ? (s.yAxisId ?? 0) !== axisId : index !== 0) {
          return;
        }
        const raw = Number(getIn(item, s.dataRegionKey ?? s.name ?? 'value'));
        if (Number.isFinite(raw) && raw > maxVal) {
          maxVal = raw;
        }
      });
    });
    const top = Math.max(1, Math.ceil(maxVal));
    const step = top <= 6 ? 1 : Math.ceil(top / 5);
    const ticks: number[] = [];
    for (let v = 0; v <= top; v += step) {
      ticks.push(v);
    }
    integerYAxisScale.set(index, { domain: [0, top], ticks });
  });
  return integerYAxisScale;
}

export function integerYAxisScaleProps(
  integerYAxisScale: IntegerYAxisScale,
  index: number,
): { domain?: [number, number]; ticks?: number[]; allowDecimals?: boolean } {
  const scale = integerYAxisScale.get(index);
  if (!scale) {
    return {};
  }
  return { domain: scale.domain, ticks: scale.ticks, allowDecimals: false };
}

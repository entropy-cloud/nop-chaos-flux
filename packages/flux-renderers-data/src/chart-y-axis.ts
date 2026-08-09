import type { ChartYAxisSchema } from './chart-schemas.js';

export interface SanitizedYAxisEntry {
  label?: string;
  position: 'left' | 'right';
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
      });
    }
    if (entries.length > 0) {
      return { entries, multi: true };
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const candidate = value as { label?: unknown };
    return {
      entries: [{ label: typeof candidate.label === 'string' ? candidate.label : undefined, position: 'left' }],
      multi: false,
    };
  }
  return { entries: [{ label: undefined, position: 'left' }], multi: false };
}

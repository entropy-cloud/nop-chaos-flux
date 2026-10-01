import { getIn } from '@nop-chaos/flux-core';
import { isDevRuntime } from './table-renderer/use-table-tree.js';
import type { ChartSeriesSchema, ChartType } from './chart-schemas.js';

/**
 * chart 静默空白失败路径诊断（ux-r1）：source 非空但所有 series 的 dataKey
 * （`dataRegionKey ?? name ?? 'value'`，含无 series 时的隐式 `'value'` 回退）在
 * 全部行上解析为 undefined → 回退空态 + dev 告警；series 声明非空 `data` 时为
 * conflict 路径（source 优先渲染，仅告警）。pie（`item.value ?? 0` 已定义回退）、
 * scatter（仅认 dataRegionKey 的存量语义）、heatmap（自绘网格另有空态）不在检测范围。
 * 告警按 chartType+series keys+source 行结构签名模块级去重，防 StrictMode/重渲染刷屏。
 */

const warnedSignatures = new Set<string>();

export function resetChartDiagnosticsForTests(): void {
  warnedSignatures.clear();
}

function hasDeclaredData(series: ChartSeriesSchema[]): boolean {
  return series.some((s) => Array.isArray(s.data) && s.data.length > 0);
}

function seriesResolvesNoValues(
  source: Array<Record<string, unknown>>,
  series: ChartSeriesSchema[],
): boolean {
  if (series.length === 0) {
    return source.every((item) => getIn(item, 'value') === undefined);
  }
  return series.every((s) => {
    const key = s.dataRegionKey ?? s.name ?? 'value';
    return source.every((item) => getIn(item, key) === undefined);
  });
}

export function isSilentBlankSource(
  chartType: ChartType,
  source: Array<Record<string, unknown>>,
  series: ChartSeriesSchema[],
): boolean {
  if (chartType === 'pie' || chartType === 'scatter' || chartType === 'heatmap') {
    return false;
  }
  if (source.length === 0) {
    return false;
  }
  if (hasDeclaredData(series)) {
    return false;
  }
  return seriesResolvesNoValues(source, series);
}

function warnOnce(signature: string, message: string): void {
  if (!isDevRuntime() || warnedSignatures.has(signature)) {
    return;
  }
  warnedSignatures.add(signature);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
}

export function warnSilentBlank(
  chartType: ChartType,
  source: Array<Record<string, unknown>>,
  series: ChartSeriesSchema[],
): void {
  const keys =
    series.length > 0
      ? series.map((s) => s.dataRegionKey ?? s.name ?? 'value')
      : ['value'];
  const signature = `${chartType}|${keys.join(',')}|[${Object.keys(source[0] ?? {}).join(',')}]`;
  warnOnce(
    `silent-blank:${signature}`,
    `[chart] source has ${source.length} rows but series "${keys.join('", "')}" resolve no values on them; rendering the empty face — check series dataRegionKey/name against source fields`,
  );
}

export function warnSeriesDataIgnored(
  chartType: ChartType,
  series: ChartSeriesSchema[],
): void {
  const declared = series.filter((s) => Array.isArray(s.data) && s.data.length > 0);
  if (declared.length === 0) {
    return;
  }
  const names = declared.map((s) => String(s.name ?? s.dataRegionKey ?? 'unnamed'));
  const signature = `${chartType}|ignored-data|${names.join(',')}`;
  warnOnce(
    `ignored-data:${signature}`,
    `[chart] series "${names.join('", "')}" declare data while source is non-empty; data is ignored (source wins) — clear source to render per-series data`,
  );
}

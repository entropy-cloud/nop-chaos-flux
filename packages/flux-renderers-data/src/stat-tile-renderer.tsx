import React from 'react';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type {
  StatTileDeltaSchema,
  StatTileFormatterSchema,
  StatTileSchema,
  StatTileStatus,
} from './schemas.js';

const SPARKLINE_WIDTH = 96;
const SPARKLINE_HEIGHT = 32;
const SPARKLINE_PADDING = 2;

// NOTE: stat-tile 与独立 `sparkline` 原子组件（type: 'sparkline'）的复用契约
// （plan 2026-08-09-sparkline-component-plan Phase 1 Follow-up）：
// - 本组件保留内联 buildSparklineGeometry（96×32 布局微调 + 单点/面积/极值降级），
//   不替换为 <SparklineRenderer>——stat-tile 是卡片级组合语义，sparkline 是
//   可独立使用的展示原子，二者维持各自实现；共享的是同一套计算语义
//   （`sparkline-path.ts` 的 normalizeYDomain/buildSparklinePoints/buildSparklinePath）。
// - 最终组合裁定归 stat-tile 后续演进：若需要渐变/平滑/显式 Y 域，可直接复用
//   `sparkline-path.ts` 纯函数或 `<SparklineRenderer>` 子组件（design.md 正式声明见
//   docs/components/sparkline/design.md §11 复用约定）。

function sanitizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeFormatter(value: unknown): StatTileFormatterSchema {
  const candidate = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  const decimals =
    typeof candidate?.decimals === 'number' && Number.isFinite(candidate.decimals) && candidate.decimals >= 0
      ? Math.floor(candidate.decimals)
      : 0;
  return {
    thousands: candidate?.thousands === true,
    decimals,
  };
}

function formatValue(
  value: number,
  formatter: StatTileFormatterSchema,
  language: string | undefined,
): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: formatter.decimals,
    maximumFractionDigits: formatter.decimals,
    useGrouping: formatter.thousands,
  }).format(value);
}

interface ResolvedDelta {
  value: number | undefined;
  label: string | undefined;
  direction: StatTileStatus;
}

function resolveDelta(value: unknown, status: unknown): ResolvedDelta | undefined {
  let raw: number | undefined;
  let label: string | undefined;
  let explicitDirection: StatTileStatus | undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    raw = value;
  } else if (value && typeof value === 'object') {
    const candidate = value as StatTileDeltaSchema;
    if (typeof candidate.value === 'number' && Number.isFinite(candidate.value)) {
      raw = candidate.value;
    }
    if (typeof candidate.label === 'string' && candidate.label !== '') {
      label = candidate.label;
    }
    if (
      candidate.direction === 'up' ||
      candidate.direction === 'down' ||
      candidate.direction === 'neutral'
    ) {
      explicitDirection = candidate.direction;
    }
  }
  if (raw === undefined) {
    return undefined;
  }
  if (status === 'up' || status === 'down' || status === 'neutral') {
    explicitDirection = status;
  }
  const direction: StatTileStatus =
    explicitDirection ?? (raw > 0 ? 'up' : raw < 0 ? 'down' : 'neutral');
  if (label === undefined) {
    label = `${raw > 0 ? '+' : ''}${raw}%`;
  }
  return { value: raw, label, direction };
}

function sanitizeSparkline(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: number[] = [];
  for (const item of value) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      out.push(item);
    }
  }
  return out;
}

function buildSparklineGeometry(values: number[]) {
  const width = SPARKLINE_WIDTH;
  const height = SPARKLINE_HEIGHT;
  const pad = SPARKLINE_PADDING;
  const innerWidth = width - pad * 2;
  const innerHeight = height - pad * 2;
  if (values.length === 1) {
    return {
      points: undefined,
      area: undefined,
      dot: { cx: width / 2, cy: height / 2 },
    };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = max - min || 1;
  const step = innerWidth / (values.length - 1);
  const points = values.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - ((value - min) / span) * innerHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `M ${points[0]} L ${points.join(' L ')} L ${pad + innerWidth},${height - pad} L ${pad},${height - pad} Z`;
  return { points: points.join(' '), area, dot: undefined };
}

const STATUS_TEXT_CLASS: Record<StatTileStatus, string> = {
  up: 'text-emerald-600 dark:text-emerald-500',
  down: 'text-red-600 dark:text-red-500',
  neutral: 'text-muted-foreground',
};

export function StatTileRenderer(props: RendererComponentProps<StatTileSchema>) {
  const { i18n } = useFluxTranslation();
  const labelContent = resolveRendererSlotContent(props, 'label');
  const hasLabel = hasRendererSlotContent(labelContent);
  const value = sanitizeNumber(props.props.value);
  const formatter = normalizeFormatter(props.props.formatter);
  const delta = resolveDelta(props.props.delta, props.props.status);
  const sparklineValues = sanitizeSparkline(props.props.sparkline);
  const sparklineGeometry = buildSparklineGeometry(sparklineValues);
  const prefix = typeof props.props.prefix === 'string' && props.props.prefix ? props.props.prefix : undefined;
  const suffix = typeof props.props.suffix === 'string' && props.props.suffix ? props.props.suffix : undefined;
  const direction = delta?.direction ?? 'neutral';

  return (
    <div
      className={cn('nop-stat-tile flex flex-col gap-1.5', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="stat-tile-root"
    >
      {hasLabel ? <div data-slot="stat-tile-label">{labelContent}</div> : null}
      <div className="flex items-baseline gap-1">
        {prefix ? (
          <span data-slot="stat-tile-prefix" className="text-lg text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <span
          data-slot="stat-tile-value"
          data-value={value === undefined ? 'null' : String(value)}
          className="text-3xl font-semibold tabular-nums tracking-tight"
        >
          {value === undefined ? '--' : formatValue(value, formatter, i18n.language)}
        </span>
        {suffix ? (
          <span data-slot="stat-tile-suffix" className="text-lg text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {delta || sparklineValues.length > 0 ? (
        <div className="flex items-center gap-2">
          {delta ? (
            <span
              data-slot="stat-tile-delta"
              data-direction={direction}
              className={cn('inline-flex items-center gap-0.5 text-xs font-medium', STATUS_TEXT_CLASS[direction])}
            >
              {direction === 'up' ? (
                <ArrowUpIcon className="size-3" aria-hidden="true" />
              ) : direction === 'down' ? (
                <ArrowDownIcon className="size-3" aria-hidden="true" />
              ) : (
                <MinusIcon className="size-3" aria-hidden="true" />
              )}
              {delta.label}
            </span>
          ) : null}
          {sparklineValues.length > 0 && sparklineGeometry ? (
            <svg
              data-slot="stat-tile-sparkline"
              data-points={sparklineGeometry.points ?? undefined}
              viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
              width={SPARKLINE_WIDTH}
              height={SPARKLINE_HEIGHT}
              role="img"
              aria-hidden="true"
              className="shrink-0"
            >
              {sparklineGeometry.area ? (
                <path d={sparklineGeometry.area} fill="hsl(var(--chart-1))" fillOpacity={0.15} />
              ) : null}
              {sparklineGeometry.points ? (
                <polyline
                  points={sparklineGeometry.points}
                  fill="none"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={1.5}
                />
              ) : null}
              {sparklineGeometry.dot ? (
                <circle
                  cx={sparklineGeometry.dot.cx}
                  cy={sparklineGeometry.dot.cy}
                  r={2}
                  fill="hsl(var(--chart-1))"
                />
              ) : null}
            </svg>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

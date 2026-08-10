import { useId } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { SparklineColorSchema, SparklineSchema, SparklineStatus } from './sparkline-schemas.js';
import {
  buildSparklineGeometry,
  resolveSparklineStatus,
  sanitizeSparklineValues,
} from './sparkline-path.js';

export const DEFAULT_SPARKLINE_WIDTH = 120;
export const DEFAULT_SPARKLINE_HEIGHT = 32;

/**
 * 趋势语义色（CSS 变量，主题无关——`hsl(var(--...))` 随主题 token 切换）。
 * `up` → 正向色（success）、`down` → 负向色（destructive）、`neutral` → 中性前景。
 */
export const SPARKLINE_STATUS_COLOR: Record<SparklineStatus, string> = {
  up: 'hsl(var(--success))',
  down: 'hsl(var(--destructive))',
  neutral: 'hsl(var(--muted-foreground))',
};

function sanitizeDimension(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveColorStatus(color: unknown, values: number[]): SparklineStatus {
  if (color && typeof color === 'object' && !Array.isArray(color)) {
    const candidate = color as SparklineColorSchema;
    if (candidate.status === 'up' || candidate.status === 'down' || candidate.status === 'neutral') {
      return candidate.status;
    }
  }
  return resolveSparklineStatus(values);
}

function resolveSparklineColor(color: unknown, values: number[]): string {
  if (typeof color === 'string' && color.trim() !== '') {
    return color;
  }
  return SPARKLINE_STATUS_COLOR[resolveColorStatus(color, values)];
}

/**
 * `sparkline` 原子组件：自绘 SVG 迷你趋势图（纯展示、零新依赖）。
 * 数据经 props/scope 流入（`props.props.data`，`${expr}` 已由编译期解析，
 * 运行期经 `helpers.evaluate` 兜底求值），无 IO（INV-1 合规）。
 */
export function SparklineRenderer(props: RendererComponentProps<SparklineSchema>) {
  const gradientId = `sparkline-gradient-${useId().replace(/:/g, '')}`;
  const width = sanitizeDimension(props.props.width, DEFAULT_SPARKLINE_WIDTH);
  const height = sanitizeDimension(props.props.height, DEFAULT_SPARKLINE_HEIGHT);
  const smooth = props.props.smooth === true;
  const fill = props.props.fill === true;
  const rawData = props.helpers.evaluate(props.props.data);
  const values = sanitizeSparklineValues(rawData);
  const geometry = buildSparklineGeometry(values, {
    width,
    height,
    smooth,
    fill,
    min: props.props.min,
    max: props.props.max,
  });
  const color = resolveSparklineColor(props.props.color, values);
  const status = resolveColorStatus(props.props.color, values);
  const isEmpty = values.length === 0;

  return (
    <div
      className={cn('nop-sparkline', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="sparkline-root"
      data-status={status}
      data-smooth={smooth ? 'true' : undefined}
      data-fill={fill ? 'true' : undefined}
    >
      <svg
        data-slot={isEmpty ? 'sparkline-empty' : 'sparkline-canvas'}
        data-points={geometry.points ?? undefined}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-hidden="true"
        className="shrink-0"
      >
        {fill && geometry.area ? (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
        ) : null}
        {geometry.area ? <path d={geometry.area} fill={`url(#${gradientId})`} /> : null}
        {geometry.path ? (
          <path
            d={geometry.path}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {geometry.dot ? <circle cx={geometry.dot.cx} cy={geometry.dot.cy} r={2} fill={color} /> : null}
      </svg>
    </div>
  );
}

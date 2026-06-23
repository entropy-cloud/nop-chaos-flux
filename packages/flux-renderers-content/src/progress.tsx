import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Progress, cn } from '@nop-chaos/ui';
import type { ProgressSchema, ProgressVariant } from './schemas.js';

export interface NormalizedProgress {
  value: number;
  max: number;
  /** Clamped 0..1 ratio; never overflows even when raw value exceeds max. */
  ratio: number;
  /** Clamped 0..100 percentage. */
  percent: number;
}

/**
 * Normalize a raw (value, max) pair into a clamped, overflow-safe form.
 * - missing/non-finite `max` falls back to 100.
 * - missing/non-finite `value` falls back to 0.
 * - `value` is clamped into [0, max] so the bar can never render past full.
 */
export function normalizeProgressValue(value: unknown, max: unknown): NormalizedProgress {
  const safeMax =
    typeof max === 'number' && Number.isFinite(max) && max > 0 ? max : 100;
  const rawValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const clamped = Math.min(Math.max(rawValue, 0), safeMax);
  const ratio = safeMax > 0 ? clamped / safeMax : 0;
  return { value: clamped, max: safeMax, ratio, percent: Math.round(ratio * 100) };
}

function resolveVariant(variant: unknown): ProgressVariant {
  return variant === 'success' || variant === 'warning' || variant === 'danger'
    ? variant
    : 'default';
}

export function ProgressRenderer(props: RendererComponentProps<ProgressSchema>) {
  const slotProps = props.props;
  const variant = resolveVariant(slotProps.variant);
  const normalized = normalizeProgressValue(slotProps.value, slotProps.max);
  const showValue = slotProps.showValue === true;
  const labelContent = resolveRendererSlotContent(props, 'label');
  const hasLabel = hasRendererSlotContent(labelContent);
  const displayValue = normalized.ratio >= 1 ? normalized.max : normalized.value;

  return (
    <Progress
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="progress"
      data-variant={variant}
      value={normalized.value}
      max={normalized.max}
      className={cn('nop-progress w-full', props.meta.className)}
    >
      {hasLabel ? (
        <span data-slot="progress-label" className="text-sm font-medium">
          {labelContent}
        </span>
      ) : null}
      {showValue ? (
        <span data-slot="progress-value" className="ml-auto text-sm text-muted-foreground tabular-nums">
          {displayValue}
        </span>
      ) : null}
    </Progress>
  );
}

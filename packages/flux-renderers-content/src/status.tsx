import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Badge, cn, resolveLucideIconStrict } from '@nop-chaos/ui';
import type { StatusSchema } from './schemas.js';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const STATUS_LEVEL_VARIANT: Record<string, BadgeVariant> = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  fail: 'destructive',
  danger: 'destructive',
  destructive: 'destructive',
  info: 'secondary',
  default: 'secondary',
  neutral: 'secondary',
  processing: 'secondary',
  pending: 'outline',
  inactive: 'outline',
};

function resolveBadgeVariant(level: unknown): BadgeVariant {
  if (typeof level === 'string') {
    const normalized = level.toLowerCase();
    if (STATUS_LEVEL_VARIANT[normalized]) {
      return STATUS_LEVEL_VARIANT[normalized];
    }
  }
  return 'secondary';
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function StatusRenderer(props: RendererComponentProps<StatusSchema>) {
  const slotProps = props.props;
  const value = slotProps.value;
  const labelMap = isPlainObject(slotProps.labelMap) ? slotProps.labelMap : {};
  const levelMap = isPlainObject(slotProps.levelMap) ? slotProps.levelMap : {};
  const iconMap = isPlainObject(slotProps.iconMap) ? slotProps.iconMap : {};
  const placeholder =
    typeof slotProps.placeholder === 'string' && slotProps.placeholder.length > 0
      ? slotProps.placeholder
      : null;

  const empty = isEmptyValue(value);
  const key = empty ? null : String(value);
  // 命中以 labelMap 为准：value 未命中 labelMap 即 miss。
  const hit = key !== null && Object.prototype.hasOwnProperty.call(labelMap, key);

  if (key === null || !hit) {
    return (
      <span
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="status-root"
        data-state="miss"
        className={cn('nop-status', props.meta.className)}
      >
        {placeholder}
      </span>
    );
  }

  const label = typeof labelMap[key] === 'string' ? labelMap[key] : key;
  const level = typeof levelMap[key] === 'string' ? levelMap[key] : 'default';
  const variant = resolveBadgeVariant(level);
  const iconName = typeof iconMap[key] === 'string' && iconMap[key] ? (iconMap[key] as string) : null;
  const IconComp = iconName ? resolveLucideIconStrict(iconName) : null;

  return (
    <span
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="status-root"
      data-state="hit"
      data-level={level}
      className={cn('nop-status', props.meta.className)}
    >
      <Badge variant={variant} data-slot="status-badge" data-level={level}>
        {IconComp ? React.createElement(IconComp, { className: 'size-3', 'aria-hidden': true }) : null}
        {label}
      </Badge>
    </span>
  );
}

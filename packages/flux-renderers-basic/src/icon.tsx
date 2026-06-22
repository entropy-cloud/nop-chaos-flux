import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn, resolveLucideIcon } from '@nop-chaos/ui';
import type { IconSchema, IconSize } from './schemas.js';

const ICON_SIZE_TOKEN_PIXELS = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

function resolveIconSize(size: IconSize | undefined): number {
  if (typeof size === 'number') {
    return Number.isFinite(size) ? Math.max(1, Math.floor(size)) : 16;
  }
  if (typeof size === 'string' && size in ICON_SIZE_TOKEN_PIXELS) {
    return ICON_SIZE_TOKEN_PIXELS[size as keyof typeof ICON_SIZE_TOKEN_PIXELS];
  }
  if (size !== undefined) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `[flux-icon] Unrecognized size ${JSON.stringify(size)}; falling back to 16.`,
      );
    }
  }
  return 16;
}

export { ICON_SIZE_TOKEN_PIXELS, resolveIconSize };

export function IconRenderer(props: RendererComponentProps<IconSchema>) {
  const icon = typeof props.props.icon === 'string' ? props.props.icon : undefined;
  const Icon = resolveLucideIcon(icon);

  const IconComp = Icon as React.ComponentType<Record<string, unknown>>;

  const size = resolveIconSize(props.props.size);
  const color = typeof props.props.color === 'string' ? props.props.color : undefined;

  return (
    <IconComp
      className={cn('nop-icon', props.meta.className)}
      data-icon={icon}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      size={size}
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
      style={color ? { color } : undefined}
    />
  );
}

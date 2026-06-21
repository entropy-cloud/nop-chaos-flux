import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn, resolveLucideIcon } from '@nop-chaos/ui';
import type { IconSchema } from './schemas.js';

export function IconRenderer(props: RendererComponentProps<IconSchema>) {
  const icon = typeof props.props.icon === 'string' ? props.props.icon : undefined;
  const Icon = resolveLucideIcon(icon);

  const IconComp = Icon as React.ComponentType<Record<string, unknown>>;

  const size = typeof props.props.size === 'number' && Number.isFinite(props.props.size)
    ? Math.max(1, Math.floor(props.props.size))
    : 16;
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

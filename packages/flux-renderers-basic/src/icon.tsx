import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn, resolveLucideIcon } from '@nop-chaos/ui';
import type { IconSchema } from './schemas.js';

export function IconRenderer(props: RendererComponentProps<IconSchema>) {
  const icon = typeof props.props.icon === 'string' ? props.props.icon : undefined;
  const Icon = resolveLucideIcon(icon);

  const IconComp = Icon as React.ComponentType<Record<string, unknown>>;

  return (
    <IconComp
      className={cn('nop-icon', props.meta.className)}
      data-icon={icon}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      size={16}
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
    />
  );
}

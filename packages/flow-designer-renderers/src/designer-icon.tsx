import React from 'react';
import { cn, resolveLucideIcon } from '@nop-chaos/ui';

export interface DesignerIconProps {
  icon?: string;
  className?: string;
  size?: number;
}

export function DesignerIcon(props: DesignerIconProps) {
  const Icon = resolveLucideIcon(props.icon);
  const IconComp = Icon as React.ComponentType<Record<string, unknown>>;

  return (
    <IconComp
      className={cn('nop-icon', props.className)}
      data-icon={props.icon}
      size={props.size ?? 16}
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
    />
  );
}

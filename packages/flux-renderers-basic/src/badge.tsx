import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Badge } from '@nop-chaos/ui';
import type { BadgeSchema } from './schemas';

export function BadgeRenderer(props: RendererComponentProps<BadgeSchema>) {
  const text = props.props.text;
  const variant = props.props.level === 'success'
    ? 'success'
    : props.props.level === 'warning'
      ? 'warning'
      : props.props.level === 'danger'
        ? 'destructive'
        : 'secondary';
  return <Badge variant={variant} className={props.meta.className} data-testid={props.meta.testid || undefined}>{String(text ?? '')}</Badge>;
}

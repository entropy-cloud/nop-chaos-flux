import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import type { ButtonSchema } from './schemas';

export function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const label = props.props.label;
  const variant: 'default' | 'destructive' | 'ghost' =
    props.props.variant === 'danger' ? 'destructive' : props.props.variant === 'ghost' ? 'ghost' : 'default';
  const size: 'default' | 'sm' | 'lg' =
    props.props.size === 'sm' || props.props.size === 'lg' ? props.props.size : 'default';

  return (
 <Button
      variant={variant}
      size={size}
      className={props.meta.className}
      type="button"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      onClick={() => void props.events.onClick?.()}
      disabled={props.meta.disabled}
    >
      {String(label ?? props.meta.label ?? 'Button')}
    </Button>
  );
}

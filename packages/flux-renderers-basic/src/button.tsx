import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import type { ButtonSchema } from './schemas';

type ButtonVariant = NonNullable<ButtonSchema['variant']>;
type ButtonSize = NonNullable<ButtonSchema['size']>;

export function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const label = props.props.label;
  const variant = (props.props.variant ?? 'default') as ButtonVariant;
  const size = (props.props.size ?? 'default') as ButtonSize;

  return (
    <Button
      variant={variant}
      size={size}
      className={props.meta.className}
      type="button"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      onClick={(event) => void props.events.onClick?.(event)}
      disabled={props.meta.disabled}
    >
      {String(label ?? 'Button')}
    </Button>
  );
}

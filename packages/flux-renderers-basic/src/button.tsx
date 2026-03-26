import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ButtonSchema } from './schemas';
import { classNames } from './utils';

export function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const label = props.props.label;
  const variant: NonNullable<ButtonSchema['variant']> =
    props.props.variant === 'primary' || props.props.variant === 'danger' || props.props.variant === 'ghost'
      ? props.props.variant
      : 'default';
  const size: NonNullable<ButtonSchema['size']> =
    props.props.size === 'sm' || props.props.size === 'lg' ? props.props.size : 'md';

  const variantClasses = {
    default: 'nop-button',
    primary: 'nop-button nop-button--primary',
    danger: 'nop-button nop-button--danger',
    ghost: 'nop-button nop-button--ghost'
  };

  const sizeClasses = {
    sm: 'nop-button--sm',
    md: 'nop-button--md',
    lg: 'nop-button--lg'
  };

  return (
    <button
      className={classNames(variantClasses[variant], sizeClasses[size], props.meta.className)}
      type="button"
      onClick={() => void props.events.onClick?.()}
      disabled={props.meta.disabled}
    >
      {String(label ?? props.meta.label ?? 'Button')}
    </button>
  );
}

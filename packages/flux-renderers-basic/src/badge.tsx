import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { BadgeSchema } from './schemas';
import { classNames } from './utils';

export function BadgeRenderer(props: RendererComponentProps<BadgeSchema>) {
  const text = props.props.text;
  const level: NonNullable<BadgeSchema['level']> =
    props.props.level === 'success' || props.props.level === 'warning' || props.props.level === 'danger'
      ? props.props.level
      : 'info';

  const levelClasses = {
    info: 'nop-badge nop-badge--info',
    success: 'nop-badge nop-badge--success',
    warning: 'nop-badge nop-badge--warning',
    danger: 'nop-badge nop-badge--danger'
  };

  return <span className={classNames(levelClasses[level], props.meta.className)}>{String(text ?? '')}</span>;
}

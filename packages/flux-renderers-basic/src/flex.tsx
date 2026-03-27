import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { classNames, resolveDirection } from './utils';
import type { FlexSchema } from './schemas';

export function FlexRenderer(props: RendererComponentProps<FlexSchema>) {
  const direction = props.props.direction === 'column' ? 'column' : 'row';
  const wrap = props.props.wrap === true;
  const align =
    props.props.align === 'start' ||
    props.props.align === 'center' ||
    props.props.align === 'end' ||
    props.props.align === 'stretch'
      ? props.props.align
      : undefined;
  const justify =
    props.props.justify === 'start' ||
    props.props.justify === 'center' ||
    props.props.justify === 'end' ||
    props.props.justify === 'between' ||
    props.props.justify === 'around'
      ? props.props.justify
      : undefined;
  const gap = typeof props.props.gap === 'number' || typeof props.props.gap === 'string' ? props.props.gap : undefined;
  const bodyContent = props.regions.body?.render();

  return (
    <div
      className={classNames(
        'nop-flex',
        'flex',
        resolveDirection(direction),
        wrap && 'flex-wrap',
        align === 'center' && 'items-center',
        align === 'start' && 'items-start',
        align === 'end' && 'items-end',
        align === 'stretch' && 'items-stretch',
        justify === 'center' && 'justify-center',
        justify === 'start' && 'justify-start',
        justify === 'end' && 'justify-end',
        justify === 'between' && 'justify-between',
        justify === 'around' && 'justify-around',
        props.meta.className
      )}
      style={gap !== undefined ? { gap: typeof gap === 'number' ? `${gap}px` : gap } : undefined}
    >
      {bodyContent}
    </div>
  );
}

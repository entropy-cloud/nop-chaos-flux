import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { asReactNode, resolveDirection } from './utils.js';
import { resolveGap } from '@nop-chaos/flux-react';
import type { FlexSchema } from './schemas.js';

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
  const gap = resolveGap(props.props.gap as number | string | undefined);
  const bodyContent = asReactNode(props.regions.body?.render());
  const itemsContent = asReactNode(props.regions.items?.render());

  return (
    <div
      className={cn(
        'nop-flex',
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
        props.meta.className,
        gap.className,
      )}
      style={gap.style}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {bodyContent ?? itemsContent}
    </div>
  );
}

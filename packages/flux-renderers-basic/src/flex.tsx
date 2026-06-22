import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import {
  asReactNode,
  resolveDirection,
  resolveResponsiveDirection,
  resolveResponsiveWrap,
} from './utils.js';
import { resolveGap } from '@nop-chaos/flux-react';
import type { FlexSchema } from './schemas.js';

const FLEX_ALIGN_CLASS_MAP: Record<NonNullable<FlexSchema['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const FLEX_JUSTIFY_CLASS_MAP: Record<NonNullable<FlexSchema['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const FLEX_ALIGN_CONTENT_CLASS_MAP: Record<NonNullable<FlexSchema['alignContent']>, string> = {
  start: 'content-start',
  center: 'content-center',
  end: 'content-end',
  between: 'content-between',
  around: 'content-around',
  evenly: 'content-evenly',
  stretch: 'content-stretch',
};

export function FlexRenderer(props: RendererComponentProps<FlexSchema>) {
  const rawDirection = props.props.direction;
  const direction =
    rawDirection === 'row' ||
    rawDirection === 'column' ||
    rawDirection === 'row-reverse' ||
    rawDirection === 'column-reverse'
      ? rawDirection
      : undefined;
  const wrap = props.props.wrap === true;
  const align = props.props.align != null ? FLEX_ALIGN_CLASS_MAP[props.props.align] : undefined;
  const justify =
    props.props.justify != null ? FLEX_JUSTIFY_CLASS_MAP[props.props.justify] : undefined;
  const alignContent =
    props.props.alignContent != null
      ? FLEX_ALIGN_CONTENT_CLASS_MAP[props.props.alignContent]
      : undefined;
  const gap = resolveGap(props.props.gap as number | string | undefined);
  const responsiveDirectionClasses = resolveResponsiveDirection(
    props.props.responsiveDirection as Record<string, string | undefined> | undefined,
  );
  const responsiveWrapClasses = resolveResponsiveWrap(
    props.props.responsiveWrap as Record<string, boolean | undefined> | undefined,
  );
  const bodyContent = asReactNode(props.regions.body?.render());
  const itemsContent = asReactNode(props.regions.items?.render());

  return (
    <div
      className={cn(
        'nop-flex',
        resolveDirection(direction),
        wrap && 'flex-wrap',
        ...responsiveDirectionClasses,
        ...responsiveWrapClasses,
        align,
        justify,
        alignContent,
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

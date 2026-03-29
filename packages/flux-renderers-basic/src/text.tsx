import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { TextSchema } from './schemas';
import { classNames } from './utils';

export function TextRenderer(props: RendererComponentProps<TextSchema>) {
  const text = props.props.body ?? props.props.text;
  const tag =
    props.props.tag === 'span' ||
    props.props.tag === 'p' ||
    props.props.tag === 'h1' ||
    props.props.tag === 'h2' ||
    props.props.tag === 'h3' ||
    props.props.tag === 'h4' ||
    props.props.tag === 'h5' ||
    props.props.tag === 'h6' ||
    props.props.tag === 'label' ||
    props.props.tag === 'div'
      ? props.props.tag
      : 'span';
  const Tag: keyof React.JSX.IntrinsicElements = tag;

  return <Tag className={classNames('nop-text', props.meta.className)} data-testid={props.meta.testid || undefined}>{String(text ?? '')}</Tag>;
}

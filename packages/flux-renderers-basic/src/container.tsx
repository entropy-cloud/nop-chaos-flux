import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { ContainerSchema } from './schemas';
import { classNames, resolveDirection, resolveGap } from './utils';

export function ContainerRenderer(props: RendererComponentProps<ContainerSchema>) {
  const direction = props.props.direction === 'column' ? 'column' : 'row';
  const wrap = props.props.wrap === true;
  const align =
    props.props.align === 'start' ||
    props.props.align === 'center' ||
    props.props.align === 'end' ||
    props.props.align === 'stretch'
      ? props.props.align
      : undefined;
  const gap = resolveGap(props.props.gap as number | string | undefined);
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const bodyContent = props.regions.body?.render();

  const useFlexChild = wrap || align !== undefined || (gap.className || gap.style) || direction !== 'row';

  return (
    <div className={classNames('nop-container', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(headerContent) ? <div data-slot="container-header">{headerContent}</div> : null}
      {useFlexChild ? (
        <div
          data-slot="container-body"
          className={classNames(
            'flex',
            resolveDirection(direction),
            wrap && 'flex-wrap',
            align === 'center' && 'items-center justify-center',
            align === 'start' && 'items-start justify-start',
            align === 'end' && 'items-end justify-end',
            align === 'stretch' && 'items-stretch',
            gap.className
          )}
          style={gap.style}
        >
          {bodyContent}
        </div>
      ) : (
        <div data-slot="container-body">{bodyContent}</div>
      )}
      {hasRendererSlotContent(footerContent) ? <div data-slot="container-footer">{footerContent}</div> : null}
    </div>
  );
}

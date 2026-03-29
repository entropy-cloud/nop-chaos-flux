import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { ContainerSchema } from './schemas';
import { classNames, resolveDirection } from './utils';

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
  const gap = typeof props.props.gap === 'number' || typeof props.props.gap === 'string' ? props.props.gap : undefined;
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const bodyContent = props.regions.body?.render();

  const useFlexChild = wrap || align !== undefined || gap !== undefined || direction !== 'row';

  return (
    <div className={classNames('nop-container', props.meta.className)}>
      {hasRendererSlotContent(headerContent) ? <div className="nop-container__header">{headerContent}</div> : null}
      {useFlexChild ? (
        <div
          className={classNames(
            'flex',
            resolveDirection(direction),
            wrap && 'flex-wrap',
            align === 'center' && 'items-center justify-center',
            align === 'start' && 'items-start justify-start',
            align === 'end' && 'items-end justify-end',
            align === 'stretch' && 'items-stretch'
          )}
          style={gap !== undefined ? { gap: typeof gap === 'number' ? `${gap}px` : gap } : undefined}
        >
          {bodyContent}
        </div>
      ) : (
        bodyContent
      )}
      {hasRendererSlotContent(footerContent) ? <div className="nop-container__footer">{footerContent}</div> : null}
    </div>
  );
}

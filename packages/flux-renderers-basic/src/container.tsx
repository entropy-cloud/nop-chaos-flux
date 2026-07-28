import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ContainerSchema } from './schemas.js';
import { asReactNode } from './utils.js';

export function ContainerRenderer(props: RendererComponentProps<ContainerSchema>) {
  const slotProps = props.props;
  const direction = slotProps.direction === 'column' || slotProps.direction === 'row'
    ? slotProps.direction
    : undefined;
  const wrap = slotProps.wrap === true;
  const align =
    slotProps.align === 'start' ||
    slotProps.align === 'center' ||
    slotProps.align === 'end' ||
    slotProps.align === 'stretch'
      ? slotProps.align
      : undefined;
  const gap = slotProps.gap as number | string | undefined;
  const hasResponsive = slotProps.responsiveDirection != null || slotProps.responsiveWrap != null;
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const bodyContent = asReactNode(props.regions.body?.render());

  const useFlexChild =
    wrap || align !== undefined || gap !== undefined || direction !== undefined || hasResponsive;
  return (
    <div
      className={cn('nop-container', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="container-header" className={cn(slotProps.headerClassName)}>
          {headerContent}
        </div>
      ) : null}
      {useFlexChild ? (
        <div
          data-slot="container-body"
          data-flex=""
          data-direction={direction || undefined}
          data-wrap={wrap ? 'true' : undefined}
          data-align={align || undefined}
          data-gap={gap !== undefined ? String(gap) : undefined}
          className={cn(
            slotProps.bodyClassName,
          )}
        >
          {bodyContent}
        </div>
      ) : (
        <div data-slot="container-body" className={cn(slotProps.bodyClassName)}>
          {bodyContent}
        </div>
      )}
      {hasRendererSlotContent(footerContent) ? (
        <div data-slot="container-footer" className={cn(slotProps.footerClassName)}>
          {footerContent}
        </div>
      ) : null}
    </div>
  );
}

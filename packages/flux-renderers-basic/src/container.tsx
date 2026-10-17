import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveGap,
  resolveRendererSlotContent,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ContainerSchema } from './schemas.js';
import {
  asReactNode,
  resolveDirection,
  resolveResponsiveDirection,
  resolveResponsiveWrap,
} from './utils.js';

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
  const gap = resolveGap(slotProps.gap as number | string | undefined);
  const responsiveDirectionClasses = resolveResponsiveDirection(
    slotProps.responsiveDirection as Record<string, string | undefined> | undefined,
  );
  const responsiveWrapClasses = resolveResponsiveWrap(
    slotProps.responsiveWrap as Record<string, boolean | undefined> | undefined,
  );
  const hasResponsive = responsiveDirectionClasses.length > 0 || responsiveWrapClasses.length > 0;
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const bodyContent = asReactNode(props.regions.body?.render());

  const useFlexChild =
    wrap || align !== undefined || gap.className || gap.style || direction !== undefined || hasResponsive;

  const isClickable = props.events.onClick != null;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    void props.events.onClick?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void props.events.onClick?.(event);
    }
  };

  const noWrapperBody = !useFlexChild && !hasRendererSlotContent(headerContent) && !hasRendererSlotContent(footerContent);
  // plan 641 UR-14: in the no-wrapper body branch the author's bodyClassName
  // composes onto the root (there is no body element left to carry it).
  const commonClassName = cn(
    'nop-container',
    props.meta.className,
    noWrapperBody && slotProps.bodyClassName,
  );

  const interactiveProps = isClickable
    ? { role: 'button' as const, tabIndex: 0 as const, onClick: handleClick, onKeyDown: handleKeyDown }
    : {};

  return (
    <div
      className={commonClassName}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-container-bare={noWrapperBody ? '' : undefined}
      {...interactiveProps}
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
          data-gap={slotProps.gap !== undefined ? String(slotProps.gap) : undefined}
          className={cn(
            'flex',
            resolveDirection(direction),
            wrap && 'flex-wrap',
            ...responsiveDirectionClasses,
            ...responsiveWrapClasses,
            align === 'center' && 'items-center justify-center',
            align === 'start' && 'items-start justify-start',
            align === 'end' && 'items-end justify-end',
            align === 'stretch' && 'items-stretch',
            gap.className,
            slotProps.bodyClassName,
          )}
          style={gap.style}
        >
          {bodyContent}
        </div>
      ) : noWrapperBody ? (
        // plan 641 UR-14: no header/footer and no flex contract in play — render
        // the body directly so layout classes authored on the outer className
        // (e.g. `flex`) reach the content instead of dying on an anonymous
        // wrapper (the author-trap this fixes). bodyClassName composes onto the
        // root (see noWrapperBody above).
        <>{bodyContent}</>
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

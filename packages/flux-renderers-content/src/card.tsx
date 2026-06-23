import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, cn } from '@nop-chaos/ui';
import type { CardSchema, CardVariant } from './schemas.js';

export function CardRenderer(props: RendererComponentProps<CardSchema>) {
  const slotProps = props.props;
  const variant: CardVariant = slotProps.variant === 'sm' ? 'sm' : 'default';
  const size = variant === 'sm' ? 'sm' : 'default';

  const titleContent = resolveRendererSlotContent(props, 'title');
  const hasTitle = hasRendererSlotContent(titleContent);
  const headerContent = resolveRendererSlotContent(props, 'header');
  const hasHeader = hasRendererSlotContent(headerContent);
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const hasBody = hasRendererSlotContent(bodyContent);
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const hasFooter = hasRendererSlotContent(footerContent);
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const hasActions = hasRendererSlotContent(actionsContent);
  const image =
    typeof slotProps.image === 'string' && slotProps.image.length > 0 ? slotProps.image : undefined;

  const onClick = props.events.onClick;
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      void onClick?.(event);
    },
    [onClick],
  );

  const showHeader = hasTitle || hasHeader;
  const showFooter = hasFooter || hasActions;

  return (
    <Card
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-variant={variant}
      size={size}
      onClick={onClick ? handleClick : undefined}
      className={cn('nop-card', props.meta.className)}
    >
      {image ? (
        <img src={image} alt="" data-slot="card-image" className="aspect-video w-full object-cover" />
      ) : null}
      {showHeader ? (
        <CardHeader>
          {hasTitle ? <CardTitle>{titleContent}</CardTitle> : null}
          {hasHeader ? <div data-slot="card-header-region">{headerContent}</div> : null}
        </CardHeader>
      ) : null}
      {hasBody ? <CardContent>{bodyContent}</CardContent> : null}
      {showFooter ? (
        <CardFooter>
          {hasFooter ? (
            <div data-slot="card-footer-region" className="flex-1">
              {footerContent}
            </div>
          ) : null}
          {hasActions ? (
            <div data-slot="card-actions" className="ml-auto flex items-center gap-2">
              {actionsContent}
            </div>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

import React, { useMemo } from 'react';
import type { RendererComponentProps, SurfaceStatusSummary } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useCurrentComponentRegistry, useResolvedContainer } from '@nop-chaos/flux-react';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, cn } from '@nop-chaos/ui';
import type { DrawerSchema } from './schemas';
import { useStatusPathPublication } from './status-hooks';

export function DrawerRenderer(props: RendererComponentProps<DrawerSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const bodyContent = props.regions.body?.render();
  const actionsContent = props.regions.actions?.render();
  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;
  const summary = useMemo<SurfaceStatusSummary>(() => ({
    id: props.id,
    kind: 'drawer',
    open: Boolean(props.props.open ?? props.props.defaultOpen ?? true),
    active: Boolean(props.props.open ?? props.props.defaultOpen ?? true),
    opening: false,
    closing: false,
  }), [props.id, props.props.defaultOpen, props.props.open]);

  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, statusPath, summary);

  const containerId = typeof props.props.container === 'string' ? props.props.container : undefined;
  const showMask = props.props.showMask !== false;
  const componentRegistry = useCurrentComponentRegistry();
  const containerElement = useResolvedContainer(containerId, componentRegistry);

  const direction = props.props.side === 'left' ? 'left' : props.props.side === 'top' ? 'top' : props.props.side === 'bottom' ? 'bottom' : props.props.side === 'right' ? 'right' : 'bottom';

  return (
    <Drawer open={summary.open} onOpenChange={(open) => { if (!open) void props.events.onClose?.(); else void props.events.onOpen?.(); }} direction={direction} containerElement={containerElement}>
      <DrawerContent className={cn('nop-drawer', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined} showMask={showMask}>
        {titleContent ? (
          <DrawerHeader>
            <DrawerTitle>{titleContent}</DrawerTitle>
          </DrawerHeader>
        ) : null}
        {bodyContent}
        {actionsContent ? <DrawerFooter>{actionsContent}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}

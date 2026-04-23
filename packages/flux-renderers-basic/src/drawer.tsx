import React, { useMemo } from 'react';
import type { RendererComponentProps, SurfaceStatusSummary } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useCurrentComponentRegistry, useResolvedContainer } from '@nop-chaos/flux-react';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, cn } from '@nop-chaos/ui';
import type { DrawerSchema } from './schemas';
import { getDeclarativeSurfaceStackSnapshot, isDeclarativeSurfaceActive, registerDeclarativeSurface, subscribeDeclarativeSurfaceStack, unregisterDeclarativeSurface } from './declarative-surface-stack';

export function DrawerRenderer(props: RendererComponentProps<DrawerSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const bodyContent = props.regions.body?.render();
  const actionsContent = props.regions.actions?.render();
  const controlledOpen = props.props.open;
  const [localOpen, setLocalOpen] = React.useState(Boolean(props.props.defaultOpen ?? false));
  const effectiveOpen = controlledOpen ?? localOpen;
  const [surfaceStackSnapshot, setSurfaceStackSnapshot] = React.useState(getDeclarativeSurfaceStackSnapshot());
  const summary = useMemo<SurfaceStatusSummary>(() => ({
    id: props.id,
    kind: 'drawer',
    open: Boolean(effectiveOpen),
    active: Boolean(effectiveOpen) && isDeclarativeSurfaceActive(props.id),
    opening: false,
    closing: false,
  }), [effectiveOpen, props.id, surfaceStackSnapshot]);

  const containerId = typeof props.props.container === 'string' ? props.props.container : undefined;
  const showMask = props.props.showMask !== false;
  const componentRegistry = useCurrentComponentRegistry();
  const containerElement = useResolvedContainer(containerId, componentRegistry);
  const statusPath = typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;
  const ownerScope = props.node.scope.parent ?? props.node.scope;

  const direction = props.props.side === 'left' ? 'left' : props.props.side === 'top' ? 'top' : props.props.side === 'bottom' ? 'bottom' : props.props.side === 'right' ? 'right' : 'bottom';

  React.useEffect(() => {
    setSurfaceStackSnapshot(getDeclarativeSurfaceStackSnapshot());
    return subscribeDeclarativeSurfaceStack(() => {
      setSurfaceStackSnapshot(getDeclarativeSurfaceStackSnapshot());
    });
  }, []);

  React.useEffect(() => {
    if (effectiveOpen) {
      registerDeclarativeSurface(props.id);
    } else {
      unregisterDeclarativeSurface(props.id);
    }

    return () => {
      unregisterDeclarativeSurface(props.id);
    };
  }, [effectiveOpen, props.id]);

  React.useEffect(() => {
    publishOwnerStatus(ownerScope, statusPath, summary);

    return undefined;
  }, [ownerScope, statusPath, summary]);

  React.useEffect(() => {
    return () => {
      publishOwnerStatus(ownerScope, statusPath, {
        id: props.id,
        kind: 'drawer',
        open: false,
        active: false,
        opening: false,
        closing: false,
      });
    };
  }, [ownerScope, props.id, statusPath]);

  React.useEffect(() => {
    if (controlledOpen !== undefined) {
      setLocalOpen(Boolean(controlledOpen));
    }
  }, [controlledOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setLocalOpen(nextOpen);
    }

    if (!nextOpen) {
      void props.events.onClose?.();
      return;
    }

    void props.events.onOpen?.();
  }

  return (
    <Drawer open={summary.open} onOpenChange={handleOpenChange} direction={direction} containerElement={containerElement}>
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

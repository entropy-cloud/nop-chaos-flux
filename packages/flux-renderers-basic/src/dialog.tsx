import React, { useMemo } from 'react';
import type { RendererComponentProps, SurfaceStatusSummary } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useCurrentComponentRegistry, useResolvedContainer } from '@nop-chaos/flux-react';
import { publishOwnerStatus } from '@nop-chaos/flux-react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, cn } from '@nop-chaos/ui';
import type { DialogSchema } from './schemas';
import { getDeclarativeSurfaceStackSnapshot, isDeclarativeSurfaceActiveInSnapshot, registerDeclarativeSurface, subscribeDeclarativeSurfaceStack, unregisterDeclarativeSurface } from './declarative-surface-stack';

export function DialogRenderer(props: RendererComponentProps<DialogSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const bodyContent = props.regions.body?.render();
  const actionsContent = props.regions.actions?.render();
  const controlledOpen = props.props.open;
  const [localOpen, setLocalOpen] = React.useState(Boolean(props.props.defaultOpen ?? false));
  const effectiveOpen = controlledOpen !== undefined ? Boolean(controlledOpen) : localOpen;
  const [surfaceStackSnapshot, setSurfaceStackSnapshot] = React.useState(getDeclarativeSurfaceStackSnapshot());
  const summary = useMemo<SurfaceStatusSummary>(() => ({
    id: props.id,
    kind: 'dialog',
    open: Boolean(effectiveOpen),
    active: Boolean(effectiveOpen) && isDeclarativeSurfaceActiveInSnapshot(props.id, surfaceStackSnapshot),
    opening: false,
    closing: false,
  }), [effectiveOpen, props.id, surfaceStackSnapshot]);

  const containerId = typeof props.props.container === 'string' ? props.props.container : undefined;
  const showMask = props.props.showMask !== false;
  const componentRegistry = useCurrentComponentRegistry();
  const containerElement = useResolvedContainer(containerId, componentRegistry);
  const statusPath = typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;
  const ownerScope = props.node.scope.parent ?? props.node.scope;

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
        kind: 'dialog',
        open: false,
        active: false,
        opening: false,
        closing: false,
      });
    };
  }, [ownerScope, props.id, statusPath]);

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
    <Dialog open={summary.open} onOpenChange={handleOpenChange} closeOnOutsideClick={props.props.closeOnOutsideClick !== false} containerElement={containerElement} noOverlay={!showMask}>
      <DialogContent className={cn('nop-dialog', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {titleContent ? (
          <DialogHeader>
            <DialogTitle>{titleContent}</DialogTitle>
          </DialogHeader>
        ) : null}
        <DialogBody>{bodyContent}</DialogBody>
        {actionsContent ? <DialogFooter>{actionsContent}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

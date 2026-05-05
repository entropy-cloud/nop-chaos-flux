import React from 'react';
import type { SurfaceEntry, SurfaceRuntime } from '@nop-chaos/flux-core';
import { useCurrentPage, useCurrentSurfaceRuntime } from './hooks';
import {
  renderSurfaceNode,
  SurfaceScopeProviders,
  useSurfaceScopeSnapshot,
} from './dialog-host-surface';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  cn,
} from '@nop-chaos/ui';
import { resolveContainerElement } from './container-hooks';

function sameSurfaces(left: SurfaceEntry[], right: SurfaceEntry[]) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((surface, index) => surface === right[index]);
}

export function DialogHost() {
  const page = useCurrentPage();
  const surfaceRuntime = useCurrentSurfaceRuntime();
  const modalContainer = (page as { modalContainer?: string } | undefined)?.modalContainer;

  const surfaces = useSyncExternalStoreWithSelector(
    surfaceRuntime?.store.subscribe ?? (() => () => undefined),
    () => surfaceRuntime?.store.getState().entries ?? [],
    () => surfaceRuntime?.store.getState().entries ?? [],
    (state: SurfaceEntry[]) => state,
    sameSurfaces,
  );

  if (!surfaceRuntime || surfaces.length === 0) {
    return null;
  }

  return (
    <>
      {surfaces.map((surface: SurfaceEntry) =>
        surface.kind === 'dialog' ? (
          <DialogView
            key={surface.id}
            surface={surface}
            surfaceRuntime={surfaceRuntime}
            modalContainer={modalContainer}
          />
        ) : (
          <DrawerView
            key={surface.id}
            surface={surface}
            surfaceRuntime={surfaceRuntime}
            modalContainer={modalContainer}
          />
        ),
      )}
    </>
  );
}

function DialogView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
}) {
  useSurfaceScopeSnapshot(props.surface.scope);

  const { surface, surfaceRuntime } = props;
  const handleDeclarativeOpenChange = surface.surface.__handleOpenChange as
    | ((nextOpen: boolean) => void)
    | undefined;
  const handleClose = React.useCallback(() => {
    if (handleDeclarativeOpenChange) {
      handleDeclarativeOpenChange(false);
      return;
    }

    surfaceRuntime.close(surface.id);
  }, [handleDeclarativeOpenChange, surface.id, surfaceRuntime]);

  const surfaceContext = React.useMemo(
    () => ({
      scope: surface.scope,
      validationOwner: surface.validationOwner,
      actionScope: surface.actionScope,
      componentRegistry: surface.componentRegistry,
      ownerNodeInstance: surface.ownerNodeInstance,
    }),
    [
      surface.scope,
      surface.validationOwner,
      surface.actionScope,
      surface.componentRegistry,
      surface.ownerNodeInstance,
    ],
  );
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;
  const actionsNode = surface.actions ? renderSurfaceNode(surface.actions, surfaceContext) : null;

  const containerId =
    typeof surface.surface.container === 'string'
      ? surface.surface.container
      : props.modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      containerElement={containerElement}
      noOverlay={!showMask}
      closeOnOutsideClick={surface.surface.closeOnOutsideClick !== false}
    >
      <DialogContent
        className={cn('nop-dialog', surface.meta?.className)}
        data-testid={surface.meta?.testid || undefined}
        data-cid={surface.meta?.cid || undefined}
        data-slot="dialog-surface"
        onClickCapture={(event) => {
          const target = event.target;

          if (!(target instanceof Element)) {
            return;
          }

          if (target.closest('[data-slot="dialog-close"]')) {
            handleClose();
          }
        }}
      >
        <SurfaceScopeProviders {...surfaceContext}>
          {titleNode && (
            <DialogHeader>
              <DialogTitle>{titleNode}</DialogTitle>
            </DialogHeader>
          )}
          <DialogBody>
            {renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
          </DialogBody>
          {actionsNode ? <DialogFooter>{actionsNode}</DialogFooter> : null}
        </SurfaceScopeProviders>
      </DialogContent>
    </Dialog>
  );
}

function DrawerView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
}) {
  useSurfaceScopeSnapshot(props.surface.scope);

  const { surface, surfaceRuntime } = props;
  const handleDeclarativeOpenChange = surface.surface.__handleOpenChange as
    | ((nextOpen: boolean) => void)
    | undefined;
  const handleClose = React.useCallback(() => {
    if (handleDeclarativeOpenChange) {
      handleDeclarativeOpenChange(false);
      return;
    }

    surfaceRuntime.close(surface.id);
  }, [handleDeclarativeOpenChange, surface.id, surfaceRuntime]);

  const surfaceContext = React.useMemo(
    () => ({
      scope: surface.scope,
      validationOwner: surface.validationOwner,
      actionScope: surface.actionScope,
      componentRegistry: surface.componentRegistry,
      ownerNodeInstance: surface.ownerNodeInstance,
    }),
    [
      surface.scope,
      surface.validationOwner,
      surface.actionScope,
      surface.componentRegistry,
      surface.ownerNodeInstance,
    ],
  );
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;
  const actionsNode = surface.actions ? renderSurfaceNode(surface.actions, surfaceContext) : null;

  const containerId =
    typeof surface.surface.container === 'string'
      ? surface.surface.container
      : props.modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      direction={
        surface.surface.side === 'left'
          ? 'left'
          : surface.surface.side === 'top'
            ? 'top'
            : surface.surface.side === 'bottom'
              ? 'bottom'
              : 'right'
      }
      containerElement={containerElement}
    >
      <DrawerContent
        className={cn('nop-drawer', surface.meta?.className)}
        data-testid={surface.meta?.testid || undefined}
        data-cid={surface.meta?.cid || undefined}
        data-slot="drawer-surface"
        showMask={showMask}
        onClickCapture={(event) => {
          const target = event.target;

          if (!(target instanceof Element)) {
            return;
          }

          if (target.closest('[data-slot="drawer-close"]')) {
            handleClose();
          }
        }}
      >
        <SurfaceScopeProviders {...surfaceContext}>
          {titleNode && (
            <DrawerHeader>
              <DrawerTitle>{titleNode}</DrawerTitle>
            </DrawerHeader>
          )}
          <DrawerBody>
            {renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
          </DrawerBody>
          {actionsNode ? <DrawerFooter>{actionsNode}</DrawerFooter> : null}
        </SurfaceScopeProviders>
      </DrawerContent>
    </Drawer>
  );
}

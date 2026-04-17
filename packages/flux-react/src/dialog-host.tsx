import React from 'react';
import type {
  PageRuntime,
  SurfaceEntry,
  SurfaceRuntime
} from '@nop-chaos/flux-core';
import { useCurrentPage, useCurrentSurfaceRuntime } from './hooks';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';
import { renderSurfaceNode, SurfaceScopeProviders, useSurfaceScopeSnapshot } from './dialog-host-surface';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@nop-chaos/ui';
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

  const surfaces = useSyncExternalStoreWithSelector(
    surfaceRuntime?.store.subscribe ?? (() => () => undefined),
    () => surfaceRuntime?.store.getState().entries ?? [],
    () => surfaceRuntime?.store.getState().entries ?? [],
    (state: SurfaceEntry[]) => state,
    sameSurfaces
  );

  if (!page || !surfaceRuntime || surfaces.length === 0) {
    return null;
  }

  return (
    <>
      {surfaces.map((surface: SurfaceEntry) => (
        surface.kind === 'dialog'
          ? <DialogView key={surface.id} surface={surface} page={page} surfaceRuntime={surfaceRuntime} />
          : <DrawerView key={surface.id} surface={surface} surfaceRuntime={surfaceRuntime} page={page} />
      ))}
    </>
  );
}

function DialogView(props: {
  surface: SurfaceEntry;
  page: PageRuntime;
  surfaceRuntime: SurfaceRuntime;
}) {
  useSurfaceScopeSnapshot(props.surface.scope);

  const { page, surface, surfaceRuntime } = props;
  const handleClose = React.useCallback(() => {
    surfaceRuntime.close(surface.id);
  }, [surface.id, surfaceRuntime]);

  React.useEffect(() => {
    const statusPath = typeof surface.surface.statusPath === 'string' ? surface.surface.statusPath : undefined;
    publishOwnerStatus(surface.scope, statusPath, {
      id: surface.id,
      kind: 'dialog',
      open: true,
      active: true,
      opening: false,
      closing: false
    });
  }, [page, surface]);

  const surfaceContext = {
    scope: surface.scope,
    actionScope: surface.actionScope,
    componentRegistry: surface.componentRegistry,
    ownerNodeInstance: surface.ownerNodeInstance
  };
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;

  const containerId = typeof surface.surface.container === 'string' ? surface.surface.container : page.modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }} containerElement={containerElement} noOverlay={!showMask}>
      <DialogContent data-slot="dialog-surface" onClickCapture={(event) => {
        const target = event.target;

        if (!(target instanceof Element)) {
          return;
        }

        if (target.closest('[data-slot="dialog-close"]')) {
          handleClose();
        }
      }}>
        <SurfaceScopeProviders {...surfaceContext}>
              {titleNode && (
                <DialogHeader>
                  <DialogTitle>{titleNode}</DialogTitle>
                </DialogHeader>
              )}
              {renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
        </SurfaceScopeProviders>
      </DialogContent>
    </Dialog>
  );
}

function DrawerView(props: {
  surface: SurfaceEntry;
  page: PageRuntime;
  surfaceRuntime: SurfaceRuntime;
}) {
  useSurfaceScopeSnapshot(props.surface.scope);

  const { page, surface, surfaceRuntime } = props;
  const handleClose = React.useCallback(() => {
    surfaceRuntime.close(surface.id);
  }, [surface.id, surfaceRuntime]);

  React.useEffect(() => {
    const statusPath = typeof surface.surface.statusPath === 'string' ? surface.surface.statusPath : undefined;
    publishOwnerStatus(surface.scope, statusPath, {
      id: surface.id,
      kind: 'drawer',
      open: true,
      active: true,
      opening: false,
      closing: false
    });
  }, [page, surface]);

  const surfaceContext = {
    scope: surface.scope,
    actionScope: surface.actionScope,
    componentRegistry: surface.componentRegistry,
    ownerNodeInstance: surface.ownerNodeInstance
  };
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;

  const containerId = typeof surface.surface.container === 'string' ? surface.surface.container : page.modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;

  return (
    <Drawer open onOpenChange={(open) => { if (!open) handleClose(); }} direction={surface.surface.side === 'left' ? 'left' : surface.surface.side === 'top' ? 'top' : surface.surface.side === 'bottom' ? 'bottom' : 'right'} containerElement={containerElement}>
      <DrawerContent data-slot="drawer-surface" showMask={showMask} onClickCapture={(event) => {
        const target = event.target;

        if (!(target instanceof Element)) {
          return;
        }

        if (target.closest('[data-slot="drawer-close"]')) {
          handleClose();
        }
      }}>
        <SurfaceScopeProviders {...surfaceContext}>
              {titleNode && (
                <DrawerHeader>
                  <DrawerTitle>{titleNode}</DrawerTitle>
                </DrawerHeader>
              )}
              {renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
        </SurfaceScopeProviders>
      </DrawerContent>
    </Drawer>
  );
}

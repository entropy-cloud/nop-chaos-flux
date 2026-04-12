import React from 'react';
import type {
  DialogState,
  PageRuntime,
  SurfaceState
} from '@nop-chaos/flux-core';
import { useCurrentPage } from './hooks';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';
import { renderSurfaceNode, SurfaceScopeProviders, useSurfaceScopeSnapshot } from './dialog-host-surface';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@nop-chaos/ui';

function sameDrawerSurfaces(left: SurfaceState[], right: SurfaceState[]) {
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

  const dialogs = useSyncExternalStoreWithSelector(
    page?.store.subscribe ?? (() => () => undefined),
    () => page?.store.getState().dialogs ?? [],
    () => page?.store.getState().dialogs ?? [],
    (state: DialogState[]) => state,
    Object.is
  );
  const surfaces = useSyncExternalStoreWithSelector(
    page?.store.subscribe ?? (() => () => undefined),
    () => page?.store.getState().surfaces ?? [],
    () => page?.store.getState().surfaces ?? [],
    (state: SurfaceState[]) => state.filter((surface) => surface.kind === 'drawer'),
    sameDrawerSurfaces
  );

  if (!page || (dialogs.length === 0 && surfaces.length === 0)) {
    return null;
  }

  return (
    <>
      {dialogs.map((dialog: DialogState) => (
        <DialogView key={dialog.id} dialog={dialog} page={page} />
      ))}
      {surfaces.map((surface: SurfaceState) => (
        <DrawerView key={surface.id} surface={surface} page={page} />
      ))}
    </>
  );
}

function DialogView(props: {
  dialog: DialogState;
  page: PageRuntime;
}) {
  useSurfaceScopeSnapshot(props.dialog.scope);

  const { dialog, page } = props;
  const handleClose = React.useCallback(() => {
    page.closeDialog(dialog.id);
  }, [dialog.id, page]);

  React.useEffect(() => {
    const statusPath = typeof dialog.dialog.statusPath === 'string' ? dialog.dialog.statusPath : undefined;
    publishOwnerStatus(page.scope, statusPath, {
      id: dialog.id,
      kind: 'dialog',
      open: true,
      active: true,
      opening: false,
      closing: false
    });
  }, [dialog, page]);

  const surfaceContext = {
    scope: dialog.scope,
    actionScope: dialog.actionScope,
    componentRegistry: dialog.componentRegistry,
    ownerNode: dialog.ownerNode,
    ownerNodeInstance: dialog.ownerNodeInstance
  };
  const titleNode = dialog.title ? renderSurfaceNode(dialog.title, surfaceContext) : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="nop-dialog-card" onClickCapture={(event) => {
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
              {renderSurfaceNode(dialog.body ?? dialog.dialog.body, surfaceContext)}
        </SurfaceScopeProviders>
      </DialogContent>
    </Dialog>
  );
}

function DrawerView(props: {
  surface: SurfaceState;
  page: PageRuntime;
}) {
  useSurfaceScopeSnapshot(props.surface.scope);

  const { page, surface } = props;
  const handleClose = React.useCallback(() => {
    page.closeSurface(surface.id);
  }, [page, surface.id]);

  React.useEffect(() => {
    const statusPath = typeof surface.surface.statusPath === 'string' ? surface.surface.statusPath : undefined;
    publishOwnerStatus(page.scope, statusPath, {
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
    ownerNode: surface.ownerNode,
    ownerNodeInstance: surface.ownerNodeInstance
  };
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;

  return (
    <Drawer open onOpenChange={(open) => { if (!open) handleClose(); }} direction={surface.surface.side === 'left' ? 'left' : surface.surface.side === 'top' ? 'top' : surface.surface.side === 'bottom' ? 'bottom' : 'right'}>
      <DrawerContent className="nop-drawer-card" onClickCapture={(event) => {
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

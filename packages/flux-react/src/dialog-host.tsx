import React from 'react';
import type {
  CompiledSchemaNode,
  DialogState,
  PageRuntime,
  RenderNodeInput,
  SurfaceState
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  ScopeContext
} from './contexts';
import { useCurrentPage } from './hooks';
import { RenderNodes } from './render-nodes';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';

function isCompiledNode(input: unknown): input is CompiledSchemaNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<CompiledSchemaNode>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

function isCompiledNodeArray(input: unknown): input is CompiledSchemaNode[] {
  return Array.isArray(input) && input.every((item) => isCompiledNode(item));
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
    Object.is
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
  useSyncExternalStoreWithSelector(
    props.dialog.scope.store?.subscribe ?? (() => () => undefined),
    () => props.dialog.scope.read(),
    () => props.dialog.scope.read(),
    (state: unknown) => state,
    Object.is
  );

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

  const titleNode = dialog.title
    ? (
        <ActionScopeContext.Provider value={dialog.actionScope}>
          <ComponentRegistryContext.Provider value={dialog.componentRegistry}>
            <ScopeContext.Provider value={dialog.scope}>
              {typeof dialog.title === 'string'
                ? dialog.title
                : isCompiledNode(dialog.title) || isCompiledNodeArray(dialog.title)
                  ? <RenderNodes input={dialog.title as RenderNodeInput} options={{ scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry, ownerNode: dialog.ownerNode, ownerNodeInstance: dialog.ownerNodeInstance }} />
                  : String(dialog.title)}
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      )
    : null;

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
        <ActionScopeContext.Provider value={dialog.actionScope}>
          <ComponentRegistryContext.Provider value={dialog.componentRegistry}>
            <ScopeContext.Provider value={dialog.scope}>
              {titleNode && (
                <DialogHeader>
                  <DialogTitle>{titleNode}</DialogTitle>
                </DialogHeader>
              )}
              <RenderNodes
                input={(dialog.body ?? dialog.dialog.body) as RenderNodeInput}
                options={{ scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry, ownerNode: dialog.ownerNode, ownerNodeInstance: dialog.ownerNodeInstance }}
              />
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </DialogContent>
    </Dialog>
  );
}

function DrawerView(props: {
  surface: SurfaceState;
  page: PageRuntime;
}) {
  useSyncExternalStoreWithSelector(
    props.surface.scope.store?.subscribe ?? (() => () => undefined),
    () => props.surface.scope.read(),
    () => props.surface.scope.read(),
    (state: unknown) => state,
    Object.is
  );

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

  const titleNode = surface.title
    ? (
        <ActionScopeContext.Provider value={surface.actionScope}>
          <ComponentRegistryContext.Provider value={surface.componentRegistry}>
            <ScopeContext.Provider value={surface.scope}>
              {typeof surface.title === 'string'
                ? surface.title
                : isCompiledNode(surface.title) || isCompiledNodeArray(surface.title)
                  ? <RenderNodes input={surface.title as RenderNodeInput} options={{ scope: surface.scope, actionScope: surface.actionScope, componentRegistry: surface.componentRegistry, ownerNode: surface.ownerNode, ownerNodeInstance: surface.ownerNodeInstance }} />
                  : String(surface.title)}
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      )
    : null;

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
        <ActionScopeContext.Provider value={surface.actionScope}>
          <ComponentRegistryContext.Provider value={surface.componentRegistry}>
            <ScopeContext.Provider value={surface.scope}>
              {titleNode && (
                <DrawerHeader>
                  <DrawerTitle>{titleNode}</DrawerTitle>
                </DrawerHeader>
              )}
              <RenderNodes
                input={(surface.body ?? surface.surface.body) as RenderNodeInput}
                options={{ scope: surface.scope, actionScope: surface.actionScope, componentRegistry: surface.componentRegistry, ownerNode: surface.ownerNode, ownerNodeInstance: surface.ownerNodeInstance }}
              />
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </DrawerContent>
    </Drawer>
  );
}

import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@nop-chaos/ui';

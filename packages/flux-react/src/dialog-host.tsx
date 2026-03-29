import React from 'react';
import type {
  CompiledSchemaNode,
  DialogState,
  PageRuntime,
  RenderNodeInput
} from '@nop-chaos/flux-core';
import {
  ActionScopeContext,
  ComponentRegistryContext,
  ScopeContext
} from './contexts';
import { useCurrentPage } from './hooks';
import { RenderNodes } from './render-nodes';

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

  if (!page || dialogs.length === 0) {
    return null;
  }

  return (
    <>
      {dialogs.map((dialog: DialogState) => (
        <DialogView key={dialog.id} dialog={dialog} page={page} />
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
    () => props.dialog.scope.readOwn(),
    () => props.dialog.scope.readOwn(),
    (state: unknown) => state,
    Object.is
  );

  const { dialog, page } = props;

  const titleNode = dialog.title
    ? (
        <ActionScopeContext.Provider value={dialog.actionScope}>
          <ComponentRegistryContext.Provider value={dialog.componentRegistry}>
            <ScopeContext.Provider value={dialog.scope}>
              {typeof dialog.title === 'string'
                ? dialog.title
                : isCompiledNode(dialog.title) || isCompiledNodeArray(dialog.title)
                  ? <RenderNodes input={dialog.title as RenderNodeInput} options={{ scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry }} />
                  : String(dialog.title)}
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      )
    : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) page.closeDialog(dialog.id); }}>
      <DialogContent className="nop-dialog-card">
        <ActionScopeContext.Provider value={dialog.actionScope}>
          <ComponentRegistryContext.Provider value={dialog.componentRegistry}>
            <ScopeContext.Provider value={dialog.scope}>
              {titleNode && <DialogTitle>{titleNode}</DialogTitle>}
              <RenderNodes
                input={(dialog.body ?? dialog.dialog.body) as RenderNodeInput}
                options={{ scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry }}
              />
            </ScopeContext.Provider>
          </ComponentRegistryContext.Provider>
        </ActionScopeContext.Provider>
      </DialogContent>
    </Dialog>
  );
}

import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { Dialog, DialogContent, DialogTitle } from '@nop-chaos/ui';

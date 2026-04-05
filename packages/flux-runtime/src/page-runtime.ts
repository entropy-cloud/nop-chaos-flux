import type { PageRuntime, PageStoreApi, RendererRuntime, ScopeChange } from '@nop-chaos/flux-core';
import { createPageStore } from './form-store';
import { createScopeRef } from './scope';

export function createManagedPageRuntime(input: {
  data?: Record<string, any>;
  pageStore?: PageStoreApi;
} = {}): PageRuntime {
  const data = input.data ?? {};
  const store = input.pageStore ?? createPageStore(data);
  store.setData(data);
  let lastChange: ScopeChange = {
    paths: ['*'],
    sourceScopeId: 'page',
    kind: 'replace'
  };

  function setLastChange(change: ScopeChange) {
    lastChange = change;
  }

  const scope = createScopeRef({
    id: 'page',
    path: '$page',
    initialData: store.getState().data,
    store: {
      getSnapshot: () => store.getState().data,
      getLastChange: () => lastChange,
      setSnapshot: (next, change) => {
        setLastChange(change ?? {
          paths: ['*'],
          sourceScopeId: 'page',
          kind: 'replace'
        });
        store.setData(next);
      },
      subscribe: (listener) => store.subscribe(() => listener(lastChange))
    },
    update: (path, value) => {
      setLastChange({
        paths: [path || '*'],
        sourceScopeId: 'page',
        kind: 'update'
      });
      store.updateData(path, value);
    }
  });
  let dialogCounter = 0;

  function createDialogId(nodeId: string) {
    dialogCounter += 1;
    return `${nodeId}-dialog-${dialogCounter}`;
  }

  return {
    store,
    scope,
    openDialog(dialog, dialogScope, runtime: RendererRuntime, options) {
      const id = createDialogId(dialogScope.id);
      store.openDialog({
        id,
        dialog,
        scope: dialogScope,
        actionScope: options?.actionScope,
        componentRegistry: options?.componentRegistry,
        title: typeof dialog.title === 'string' ? dialog.title : dialog.title ? runtime.compile(dialog.title as any) : undefined,
        body: dialog.body ? runtime.compile(dialog.body as any) : undefined
      });
      return id;
    },
    closeDialog(dialogId) {
      store.closeDialog(dialogId);
    },
    refresh() {
      store.refresh();
    }
  };
}

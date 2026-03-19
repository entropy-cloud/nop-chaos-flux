import type { PageRuntime, PageStoreApi } from '@nop-chaos/amis-schema';
import { createPageStore } from './form-store';
import { createScopeRef } from './scope';

let dialogCounter = 0;

function createDialogId(nodeId: string) {
  dialogCounter += 1;
  return `${nodeId}-dialog-${dialogCounter}`;
}

export function createManagedPageRuntime(input: {
  data?: Record<string, any>;
  pageStore?: PageStoreApi;
} = {}): PageRuntime {
  const data = input.data ?? {};
  const store = input.pageStore ?? createPageStore(data);
  store.setData(data);
  const scope = createScopeRef({
    id: 'page',
    path: '$page',
    initialData: store.getState().data,
    store: {
      getSnapshot: () => store.getState().data,
      setSnapshot: (next) => store.setData(next),
      subscribe: (listener) => store.subscribe(listener)
    },
    update: (path, value) => store.updateData(path, value)
  });

  return {
    store,
    scope,
    openDialog(dialog, dialogScope) {
      const id = createDialogId(dialogScope.id);
      store.openDialog({ id, dialog, scope: dialogScope });
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

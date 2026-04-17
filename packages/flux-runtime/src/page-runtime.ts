import type {
  PageRuntime,
  PageStoreApi,
  ScopeChange
} from '@nop-chaos/flux-core';
import { createPageStore } from './form-store';
import { createScopeRef } from './scope';

export function createManagedPageRuntime(input: {
  data?: Record<string, any>;
  pageStore?: PageStoreApi;
  modalContainer?: string;
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
      subscribe: (listener) => {
        let previousData = store.getState().data;

        return store.subscribe(() => {
          const nextData = store.getState().data;

          if (nextData === previousData) {
            return;
          }

          previousData = nextData;
          listener(lastChange);
        });
      }
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
  return {
    store,
    scope,
    modalContainer: input.modalContainer,
    refresh() {
      store.refresh();
    }
  };
}

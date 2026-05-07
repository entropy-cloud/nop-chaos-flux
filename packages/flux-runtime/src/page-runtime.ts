import type {
  PageRuntime,
  PageStoreApi,
  ScopeChange,
  ScopeRef,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { createPageStore } from './form-store.js';
import { createScopeRef } from './scope.js';

export function createManagedPageRuntime(
  input: {
    data?: Record<string, any>;
    pageStore?: PageStoreApi;
    modalContainer?: string;
    validationOwner?: ValidationScopeRuntime;
    scope?: ScopeRef;
  } = {},
): PageRuntime {
  const data = input.data ?? {};
  const store = input.pageStore ?? createPageStore(data);
  store.setData(data);
  let nextRevision = 0;
  let lastChange: ScopeChange = {
    paths: ['*'],
    sourceScopeId: 'page',
    kind: 'replace',
    revision: nextRevision,
  };

  function setLastChange(change: ScopeChange) {
    nextRevision += 1;
    lastChange = {
      ...change,
      revision: change.revision ?? nextRevision,
    };
  }

  const scope =
    input.scope ??
    createScopeRef({
      id: 'page',
      path: '$page',
      initialData: store.getState().data,
      store: {
        getSnapshot: () => store.getState().data,
        getLastChange: () => lastChange,
        setSnapshot: (next, change) => {
          setLastChange(
            change ?? {
              paths: ['*'],
              sourceScopeId: 'page',
              kind: 'replace',
            },
          );
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
        },
      },
      update: (path, value) => {
        setLastChange({
          paths: [path || '*'],
          sourceScopeId: 'page',
          kind: 'update',
        });
        store.updateData(path, value);
      },
    });
  return {
    store,
    scope,
    validationOwner: input.validationOwner,
    modalContainer: input.modalContainer,
    refresh() {
      store.refresh();
    },
  };
}

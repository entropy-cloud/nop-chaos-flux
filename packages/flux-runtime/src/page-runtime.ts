import type {
  PageRuntime,
  PageStoreApi,
  ScopeChange,
  ScopeRef,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { createPageStore } from './page-store.js';
import { createStoreBackedScopeAdapter } from './store-backed-scope-adapter.js';

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
    createStoreBackedScopeAdapter({
      id: 'page',
      path: '$page',
      initialData: store.getState().data,
      getLastChange: () => lastChange,
      setLastChange,
      getSnapshot: () => store.getState().data,
      commitSnapshot: (next) => store.setData(next),
      subscribeStore: (listener) => store.subscribe(listener),
      readSignal: () => store.getState().data,
      subscriptionGate: (nextData, previousData) =>
        nextData === previousData ? 'skip' : 'emit',
      applyUpdate: (path, value) => store.updateData(path, value),
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

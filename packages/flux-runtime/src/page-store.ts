import { createStore } from 'zustand/vanilla';
import type { PageStoreApi, PageStoreState } from '@nop-chaos/flux-core';
import { setIn } from '@nop-chaos/flux-core';

export function createPageStore(initialData: Record<string, any>): PageStoreApi {
  const store = createStore<PageStoreState>(() => ({
    data: initialData,
    refreshTick: 0,
  }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    setData(data) {
      store.setState({ data });
    },
    updateData(path, value) {
      const state = store.getState();
      store.setState({ data: setIn(state.data, path, value) });
    },
    refresh() {
      const state = store.getState();
      store.setState({ refreshTick: state.refreshTick + 1 });
    },
  };
}

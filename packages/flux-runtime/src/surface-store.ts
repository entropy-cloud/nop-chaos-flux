import { createStore } from 'zustand/vanilla';
import type { SurfaceEntry, SurfaceStoreApi, SurfaceStoreState } from '@nop-chaos/flux-core';

export function createSurfaceStore(): SurfaceStoreApi {
  const store = createStore<SurfaceStoreState>(() => ({
    entries: [],
    uncontrolledOpenById: {},
  }));

  return {
    getState() {
      return store.getState();
    },
    subscribe(listener) {
      return store.subscribe(listener);
    },
    push(entry: SurfaceEntry) {
      const state = store.getState();
      store.setState({ entries: [...state.entries, entry] });
    },
    upsert(entry: SurfaceEntry) {
      const state = store.getState();
      const index = state.entries.findIndex((existing) => existing.id === entry.id);

      if (index < 0) {
        store.setState({ entries: [...state.entries, entry] });
        return;
      }

      const nextEntries = state.entries.slice();
      nextEntries[index] = entry;
      store.setState({ entries: nextEntries });
    },
    remove(surfaceId) {
      const state = store.getState();

      if (!surfaceId) {
        const target = state.entries[state.entries.length - 1];

        if (!target) {
          return undefined;
        }

        store.setState({ entries: state.entries.slice(0, -1) });
        return target;
      }

      const target = state.entries.find((entry) => entry.id === surfaceId);

      if (!target) {
        return undefined;
      }

      store.setState({ entries: state.entries.filter((entry) => entry.id !== surfaceId) });
      return target;
    },
    setUncontrolledOpen(surfaceId, open) {
      const state = store.getState();
      if (state.uncontrolledOpenById[surfaceId] === open) {
        return;
      }

      store.setState({
        uncontrolledOpenById: {
          ...state.uncontrolledOpenById,
          [surfaceId]: open,
        },
      });
    },
    getUncontrolledOpen(surfaceId) {
      return store.getState().uncontrolledOpenById[surfaceId];
    },
    clearUncontrolledOpen(surfaceId) {
      const state = store.getState();
      if (!Object.prototype.hasOwnProperty.call(state.uncontrolledOpenById, surfaceId)) {
        return;
      }

      const next = { ...state.uncontrolledOpenById };
      delete next[surfaceId];
      store.setState({ uncontrolledOpenById: next });
    },
  };
}

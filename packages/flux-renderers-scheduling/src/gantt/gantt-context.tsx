import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { GanttStore } from './gantt-store.js';

const GanttStoreContext = createContext<GanttStore | null>(null);

export function GanttStoreProvider({ store, children }: { store: GanttStore; children: React.ReactNode }) {
  return <GanttStoreContext.Provider value={store}>{children}</GanttStoreContext.Provider>;
}

export function useGanttStore(): GanttStore {
  const store = useContext(GanttStoreContext);
  if (!store) throw new Error('useGanttStore must be used within GanttStoreProvider');
  return store;
}

export function useGanttStoreSnapshot(): number {
  const store = useGanttStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.revision,
  );
}

export function useGanttTaskSnapshot(): number {
  const store = useGanttStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.taskRevision,
  );
}

export function useGanttLinkSnapshot(): number {
  const store = useGanttStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.linkRevision,
  );
}

export function useGanttLayoutSnapshot(): number {
  const store = useGanttStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.layoutRevision,
  );
}

export function useGanttTreeSnapshot(): number {
  const store = useGanttStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.treeRevision,
  );
}

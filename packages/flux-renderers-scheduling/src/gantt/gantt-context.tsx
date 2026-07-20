import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react';
import { GanttStore } from './gantt-store.js';

const GanttStoreContext = createContext<GanttStore | null>(null);

const ALL_EVENTS = ['taskChange', 'linkChange', 'treeChange', 'layoutChange', 'dataChange', 'taskDelete', 'linkAdd', 'linkDelete'] as const;

function subscribeToEvents(store: GanttStore, events: readonly string[], callback: () => void) {
  for (const event of events) {
    store.on(event, callback);
  }
  return () => {
    for (const event of events) {
      store.off(event, callback);
    }
  };
}

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
  const getSnapshot = useCallback(() => store.revision, [store]);
  return useSyncExternalStore(
    (cb) => subscribeToEvents(store, ALL_EVENTS, cb),
    getSnapshot,
  );
}

export function useGanttTaskSnapshot(): number {
  const store = useGanttStore();
  const getSnapshot = useCallback(() => store.taskRevision, [store]);
  return useSyncExternalStore(
    (cb) => subscribeToEvents(store, ['taskChange', 'taskDelete'], cb),
    getSnapshot,
  );
}

export function useGanttLinkSnapshot(): number {
  const store = useGanttStore();
  const getSnapshot = useCallback(() => store.linkRevision, [store]);
  return useSyncExternalStore(
    (cb) => subscribeToEvents(store, ['linkChange', 'linkAdd', 'linkDelete'], cb),
    getSnapshot,
  );
}

export function useGanttLayoutSnapshot(): number {
  const store = useGanttStore();
  const getSnapshot = useCallback(() => store.layoutRevision, [store]);
  return useSyncExternalStore(
    (cb) => subscribeToEvents(store, ['layoutChange'], cb),
    getSnapshot,
  );
}

export function useGanttTreeSnapshot(): number {
  const store = useGanttStore();
  const getSnapshot = useCallback(() => store.treeRevision, [store]);
  return useSyncExternalStore(
    (cb) => subscribeToEvents(store, ['treeChange'], cb),
    getSnapshot,
  );
}

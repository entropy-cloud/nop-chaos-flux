import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { GanttStore } from './gantt-store.js';

const GanttStoreContext = createContext<GanttStore | null>(null);

function ganttStoreSubscribe(store: GanttStore, callback: () => void) {
  store.on('change', callback);
  return () => store.off('change', callback);
}

function ganttStoreSnapshot(store: GanttStore) {
  return store.getVisibleTasks().length;
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
  return useSyncExternalStore(
    (cb) => ganttStoreSubscribe(store, cb),
    () => ganttStoreSnapshot(store),
  );
}

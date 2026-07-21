/**
 * State management rationale for Gantt (Zustand + Context):
 * Gantt has a deeply nested component tree (header, grid, timeline, bars, links,
 * timescale, editor) where prop drilling would be impractical. Zustand provides
 * efficient per-component subscriptions without full re-render on every store change.
 * Kanban uses useState + imperative callbacks instead (fewer nested component layers).
 * Calendar uses custom hooks (self-contained view state managed via local refs/hooks).
 */
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

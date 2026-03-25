import { DEFAULT_FILTERS } from './diagnostics';
import type { NopDebugEvent, NopDebuggerSnapshot, NopDebuggerTab } from './types';

export interface NopDebuggerStore {
  getSnapshot(): NopDebuggerSnapshot;
  subscribe(listener: () => void): () => void;
  append(event: Omit<NopDebugEvent, 'id' | 'sessionId' | 'timestamp'> & { timestamp?: number }): void;
  clear(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  pause(): void;
  resume(): void;
  setActiveTab(tab: NopDebuggerTab): void;
  setPosition(position: { x: number; y: number }): void;
  toggleFilter(filter: NopDebuggerSnapshot['filters'][number]): void;
}

export function createDebuggerStore(input: {
  enabled: boolean;
  sessionId: string;
  maxEvents: number;
  defaultOpen: boolean;
  defaultTab: NopDebuggerTab;
  position: { x: number; y: number };
}): NopDebuggerStore {
  const listeners = new Set<() => void>();
  let notifyScheduled = false;

  let snapshot: NopDebuggerSnapshot = {
    enabled: input.enabled,
    panelOpen: input.defaultOpen,
    paused: false,
    activeTab: input.defaultTab,
    position: input.position,
    events: [],
    filters: [...DEFAULT_FILTERS]
  };

  let nextId = 1;

  const notify = () => {
    notifyScheduled = false;
    listeners.forEach((listener) => listener());
  };

  const scheduleNotify = () => {
    if (notifyScheduled) {
      return;
    }

    notifyScheduled = true;
    queueMicrotask(() => {
      notify();
    });
  };

  const setSnapshot = (updater: (current: NopDebuggerSnapshot) => NopDebuggerSnapshot) => {
    snapshot = updater(snapshot);
    scheduleNotify();
  };

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    append(event) {
      if (!snapshot.enabled || snapshot.paused) {
        return;
      }

      const timestamp = event.timestamp ?? Date.now();

      setSnapshot((current) => ({
        ...current,
        events: [
          {
            ...event,
            id: nextId++,
            sessionId: input.sessionId,
            timestamp
          },
          ...current.events
        ].slice(0, input.maxEvents)
      }));
    },
    clear() {
      setSnapshot((current) => ({ ...current, events: [] }));
    },
    show() {
      setSnapshot((current) => ({ ...current, panelOpen: true }));
    },
    hide() {
      setSnapshot((current) => ({ ...current, panelOpen: false }));
    },
    toggle() {
      setSnapshot((current) => ({ ...current, panelOpen: !current.panelOpen }));
    },
    pause() {
      setSnapshot((current) => ({ ...current, paused: true }));
    },
    resume() {
      setSnapshot((current) => ({ ...current, paused: false }));
    },
    setActiveTab(tab: NopDebuggerTab) {
      setSnapshot((current) => ({ ...current, activeTab: tab }));
    },
    setPosition(position: { x: number; y: number }) {
      setSnapshot((current) => ({ ...current, position }));
    },
    toggleFilter(filter: NopDebuggerSnapshot['filters'][number]) {
      setSnapshot((current) => {
        const exists = current.filters.includes(filter);
        if (exists) {
          if (current.filters.length === 1) {
            return current;
          }

          return {
            ...current,
            filters: current.filters.filter((item) => item !== filter)
          };
        }

        return {
          ...current,
          filters: [...current.filters, filter]
        };
      });
    }
  };
}

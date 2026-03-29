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
  errorBufferKeepEarliest: number;
  errorBufferKeepLatest: number;
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
    filters: [...DEFAULT_FILTERS],
    pinnedErrors: { earliest: [], latest: [] }
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

  const isErrorLevel = (level: string) => level === 'error' || level === 'warning';

  const updatePinnedErrors = (
    pinned: { earliest: NopDebugEvent[]; latest: NopDebugEvent[] },
    event: NopDebugEvent
  ) => {
    const keepEarliest = input.errorBufferKeepEarliest;
    const keepLatest = input.errorBufferKeepLatest;

    if (keepEarliest === 0 && keepLatest === 0) {
      return pinned;
    }

    let earliest = [...pinned.earliest];
    let latest = [...pinned.latest];

    if (keepEarliest > 0 && earliest.length < keepEarliest) {
      earliest = [...earliest, event];
    }

    if (keepLatest > 0) {
      latest = [...latest, event];
      if (latest.length > keepLatest) {
        latest = latest.slice(-keepLatest);
      }
    }

    return { earliest, latest };
  };

  const lastRenderStartTimestamp = new Map<string, number>();
  const RENDER_THROTTLE_MS = 100;

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
      let fullEvent: NopDebugEvent = {
        ...event,
        id: nextId++,
        sessionId: input.sessionId,
        timestamp
      };

      if (event.kind === 'render:start' && event.nodeId) {
        const lastTimestamp = lastRenderStartTimestamp.get(event.nodeId);
        if (lastTimestamp !== undefined && timestamp - lastTimestamp < RENDER_THROTTLE_MS) {
          fullEvent = {
            ...fullEvent,
            detail: 'skipped render throttle (only throttle render:start, skipped)'
          };
        } else {
          lastRenderStartTimestamp.set(event.nodeId, timestamp);
        }
      }

      setSnapshot((current) => {
        const newEvents = [fullEvent, ...current.events].slice(0, input.maxEvents);
        const newPinnedErrors = isErrorLevel(fullEvent.level)
          ? updatePinnedErrors(current.pinnedErrors, fullEvent)
          : current.pinnedErrors;

        return {
          ...current,
          events: newEvents,
          pinnedErrors: newPinnedErrors
        };
      });
    },
    clear() {
      setSnapshot((current) => ({ ...current, events: [], pinnedErrors: { earliest: [], latest: [] } }));
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

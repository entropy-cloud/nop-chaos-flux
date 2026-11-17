import { DEFAULT_FILTERS } from './diagnostics.js';
import { toDisplayProjection } from './log-tree.js';
import type { DebuggerWindowDock, NopDebugEvent, NopDebuggerAnyTab, NopDebuggerSnapshot, NopDebuggerTab } from './types.js';

export interface NopDebuggerStore {
  getSnapshot(): NopDebuggerSnapshot;
  subscribe(listener: () => void): () => void;
  append(
    event: Omit<NopDebugEvent, 'id' | 'sessionId' | 'timestamp'> & { timestamp?: number },
  ): void;
  /** M1 log bus: diff-based update of an existing event; no-op when nothing changed. */
  updateEvent(id: number, patch: Partial<Omit<NopDebugEvent, 'id' | 'sessionId'>>): boolean;
  getFullEvent(id: number): NopDebugEvent | undefined;
  getDisplayEvents(): ReturnType<typeof import('./log-tree.js').toDisplayProjection>[];
  clear(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  minimize(): void;
  unminimize(): void;
  pause(): void;
  resume(): void;
  setActiveTab(tab: NopDebuggerAnyTab): void;
  setPosition(position: { x: number; y: number }): void;
  toggleFilter(filter: NopDebuggerSnapshot['filters'][number]): void;
  setStrictMode(enabled: boolean): void;
}

export function createDebuggerStore(input: {
  enabled: boolean;
  sessionId: string;
  maxEvents: number;
  defaultOpen: boolean;
  defaultTab: NopDebuggerTab;
  position: { x: number; y: number };
  /** 缺省 'floating'（既有宿主/测试的绝对坐标语义）；bottom-left 由显式配置启用。 */
  dock?: DebuggerWindowDock;
  errorBufferKeepEarliest: number;
  errorBufferKeepLatest: number;
  persistPosition?: (position: { x: number; y: number }) => void;
}): NopDebuggerStore {
  const listeners = new Set<() => void>();
  let notifyScheduled = false;

  let snapshot: NopDebuggerSnapshot = {
    enabled: input.enabled,
    panelOpen: input.defaultOpen,
    minimized: false,
    paused: false,
    strictMode: false,
    activeTab: input.defaultTab,
    position: input.position,
    dock: input.dock ?? 'floating',
    events: [],
    filters: [...DEFAULT_FILTERS],
    pinnedErrors: { earliest: [], latest: [] },
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
    event: NopDebugEvent,
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
  const LOG_THROTTLE_MS = 4;
  const pendingUpdates = new Map<number, { firstAt: number; patch: Record<string, unknown> }>();

  let positionPersistTimerId: ReturnType<typeof setTimeout> | undefined;

  const positionPersistCallback = input.persistPosition
    ? (position: { x: number; y: number }) => {
        if (positionPersistTimerId) {
          clearTimeout(positionPersistTimerId);
        }
        positionPersistTimerId = setTimeout(() => {
          input.persistPosition?.(position);
        }, RENDER_THROTTLE_MS);
      }
    : undefined;

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
      const fullEvent: NopDebugEvent = {
        ...event,
        id: nextId++,
        sessionId: input.sessionId,
        timestamp,
      };

      if (event.kind === 'render:start' && event.nodeId) {
        const lastTimestamp = lastRenderStartTimestamp.get(event.nodeId);
        if (lastTimestamp !== undefined && timestamp - lastTimestamp < RENDER_THROTTLE_MS) {
          return;
        }
        lastRenderStartTimestamp.set(event.nodeId, timestamp);
      }

      setSnapshot((current) => {
        const newEvents = [fullEvent, ...current.events].slice(0, input.maxEvents);
        const newPinnedErrors = isErrorLevel(fullEvent.level)
          ? updatePinnedErrors(current.pinnedErrors, fullEvent)
          : current.pinnedErrors;

        return {
          ...current,
          events: newEvents,
          pinnedErrors: newPinnedErrors,
        };
      });
    },
    updateEvent(id, patch) {
      const currentEvent = snapshot.events.find((candidate) => candidate.id === id);
      if (!currentEvent) {
        return false;
      }
      let changed = false;
      for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
        if (currentEvent[key] !== patch[key]) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        return false;
      }
      const applyUpdate = (mergedPatch: Record<string, unknown>) => {
        setSnapshot((current) => ({
          ...current,
          events: current.events.map((candidate) =>
            candidate.id === id ? { ...candidate, ...mergedPatch } : candidate,
          ),
        }));
      };
      // 4ms trailing merge per event id: collapse rapid status flips into one notify
      const pending = pendingUpdates.get(id);
      const now = Date.now();
      if (pending && now - pending.firstAt < LOG_THROTTLE_MS) {
        pending.patch = { ...pending.patch, ...patch };
        return true;
      }
      pendingUpdates.set(id, { firstAt: now, patch: { ...patch } });
      setTimeout(() => {
        const queued = pendingUpdates.get(id);
        pendingUpdates.delete(id);
        if (queued) {
          applyUpdate(queued.patch);
        }
      }, LOG_THROTTLE_MS);
      return true;
    },
    getFullEvent(id) {
      return snapshot.events.find((candidate) => candidate.id === id);
    },
    getDisplayEvents() {
      return snapshot.events.map(toDisplayProjection);
    },
    clear() {
      setSnapshot((current) => ({
        ...current,
        events: [],
        pinnedErrors: { earliest: [], latest: [] },
      }));
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
    minimize() {
      setSnapshot((current) => ({ ...current, minimized: true }));
    },
    unminimize() {
      setSnapshot((current) => ({ ...current, minimized: false }));
    },
    pause() {
      setSnapshot((current) => ({ ...current, paused: true }));
    },
    resume() {
      setSnapshot((current) => ({ ...current, paused: false }));
    },
    setActiveTab(tab: NopDebuggerAnyTab) {
      setSnapshot((current) => ({ ...current, activeTab: tab }));
    },
    setPosition(position: { x: number; y: number }) {
      positionPersistCallback?.(position);
      // 拖拽落点即绝对坐标：dock 翻转 floating（ux-r6 G-1）
      setSnapshot((current) => ({ ...current, position, dock: 'floating' }));
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
            filters: current.filters.filter((item) => item !== filter),
          };
        }

        return {
          ...current,
          filters: [...current.filters, filter],
        };
      });
    },
    setStrictMode(enabled: boolean) {
      setSnapshot((current) => ({ ...current, strictMode: enabled }));
    },
  };
}

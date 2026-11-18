import type { ClockEvent } from './protocol/types.js';

interface FakeClock {
  install(): void;
  uninstall(): void;
  isInstalled(): boolean;
  now(): number;
  tick(ms: number): void;
  getEvents(): ClockEvent[];
}

interface FakeTimer {
  id: number;
  kind: 'setTimeout' | 'setInterval';
  at: number;
  intervalMs?: number;
  callback: () => void;
}

/**
 * Replay-scoped clock: replaces window-level timers and Date.now ONLY while
 * installed (never global-resident) and records every scheduling event as
 * DevSession ClockEvent entries (M0 protocol kinds).
 */
export function createFakeClock(origin: number = Date.now()): FakeClock {
  let installed = false;
  let current = origin;
  let nextId = 1;
  const events: ClockEvent[] = [];
  const timers = new Map<number, FakeTimer>();
  const real = {
    setTimeout: typeof window !== 'undefined' ? window.setTimeout.bind(window) : setTimeout,
    setInterval: typeof window !== 'undefined' ? window.setInterval.bind(window) : setInterval,
    clearTimeout: typeof window !== 'undefined' ? window.clearTimeout.bind(window) : clearTimeout,
    clearInterval: typeof window !== 'undefined' ? window.clearInterval.bind(window) : clearInterval,
    dateNow: Date.now,
  };

  return {
    install() {
      if (installed || typeof window === 'undefined') return;
      installed = true;
      window.setTimeout = ((callback: (...args: unknown[]) => void, delay = 0) => {
        const id = nextId++;
        timers.set(id, { id, kind: 'setTimeout', at: current + delay, callback });
        events.push({ at: current - origin, kind: 'setTimeout', timerId: String(id), delayMs: delay });
        return id;
      }) as never;
      window.setInterval = ((callback: (...args: unknown[]) => void, delay = 0) => {
        const id = nextId++;
        timers.set(id, { id, kind: 'setInterval', at: current + delay, intervalMs: delay, callback });
        events.push({ at: current - origin, kind: 'setInterval', timerId: String(id), delayMs: delay });
        return id;
      }) as never;
      window.clearTimeout = ((id: number) => {
        if (timers.delete(id)) {
          events.push({ at: current - origin, kind: 'clearTimeout', timerId: String(id) });
        }
      }) as never;
      window.clearInterval = ((id: number) => {
        if (timers.delete(id)) {
          events.push({ at: current - origin, kind: 'clearInterval', timerId: String(id) });
        }
      }) as never;
      Date.now = () => current;
    },
    uninstall() {
      if (!installed) return;
      installed = false;
      window.setTimeout = real.setTimeout as never;
      window.setInterval = real.setInterval as never;
      window.clearTimeout = real.clearTimeout as never;
      window.clearInterval = real.clearInterval as never;
      Date.now = real.dateNow;
      timers.clear();
    },
    isInstalled: () => installed,
    now: () => current,
    tick(ms: number) {
      current += ms;
      events.push({ at: current - origin, kind: 'tick' });
      const due = [...timers.values()].filter((timer) => timer.at <= current).sort((a, b) => a.at - b.at);
      for (const timer of due) {
        if (timer.kind === 'setTimeout') {
          timers.delete(timer.id);
        }
        try {
          timer.callback();
        } catch (error) {
          console.error('[fake-clock] timer callback failed cause:', error instanceof Error ? error.message : String(error));
        }
      }
    },
    getEvents: () => events,
  };
}

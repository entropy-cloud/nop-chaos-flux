import type { NopDebugEvent } from './types.js';
import type { NopDebuggerStore } from './store.js';

interface WaitForOptions {
  timeoutMs?: number;
  intervalMs?: number;
  stableGate?: boolean;
}

interface WaitForOk {
  ok: true;
  attempts: number;
  durationMs: number;
}

interface WaitForFailed {
  ok: false;
  attempts: number;
  durationMs: number;
  lastError: string;
}

type WaitResult = WaitForOk | WaitForFailed;

export type WaitForPredicate =
  | { type: 'cid'; cid: number; state: (inspect: unknown) => boolean }
  | { type: 'scope'; scopeId?: string; selector: (data: Record<string, unknown>) => unknown; until: (value: unknown) => boolean }
  | { type: 'scope-path'; scopeId?: string; path: string; op: 'eq' | 'ne' | 'truthy' | 'defined'; value?: unknown }
  | { type: 'event'; kind: NopDebugEvent['kind']; match?: (log: NopDebugEvent) => boolean }
  | { type: 'stability' }
  | { type: 'visual'; baselineKey: string; maxDiffRatio: number };

export interface WaitForDeps {
  whenStable(timeoutMs?: number): Promise<{ stable: boolean }>;
  inspectByCid(cid: number): unknown;
  getScopeData(scopeId?: string): Record<string, unknown> | null;
  getLatestEvent(kind: NopDebugEvent['kind']): NopDebugEvent | undefined;
  compareVisual(baselineKey: string): Promise<{ match: boolean; diffRatio: number } | { missing: true }>;
  log: NopDebuggerStore;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function getInPath(data: Record<string, unknown>, path: string): unknown {
  let current: unknown = data;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function evaluateScopePathPredicate(predicate: Extract<WaitForPredicate, { type: 'scope-path' }>, deps: WaitForDeps): boolean {
  const data = deps.getScopeData(predicate.scopeId);
  if (!data) return false;
  const value = getInPath(data, predicate.path);
  switch (predicate.op) {
    case 'eq': return value === predicate.value;
    case 'ne': return value !== predicate.value;
    case 'truthy': return Boolean(value);
    case 'defined': return value !== undefined;
  }
}

function describePredicate(predicate: WaitForPredicate): string {
  switch (predicate.type) {
    case 'cid': return `cid:${predicate.cid}`;
    case 'scope': return 'scope:selector';
    case 'scope-path': return `scope-path:${predicate.path} ${predicate.op}`;
    case 'event': return `event:${predicate.kind}`;
    case 'stability': return 'stability';
    case 'visual': return `visual:${predicate.baselineKey}`;
  }
}

function evaluateOnce(predicate: WaitForPredicate, deps: WaitForDeps): { ok: boolean; reason: string } {
  try {
    switch (predicate.type) {
      case 'cid': {
        const inspect = deps.inspectByCid(predicate.cid);
        if (inspect === undefined) return { ok: false, reason: 'cid not found' };
        return predicate.state(inspect) ? { ok: true, reason: '' } : { ok: false, reason: 'cid state predicate false' };
      }
      case 'scope': {
        const data = deps.getScopeData(predicate.scopeId);
        if (!data) return { ok: false, reason: 'scope data unavailable' };
        return predicate.until(predicate.selector(data)) ? { ok: true, reason: '' } : { ok: false, reason: 'scope until predicate false' };
      }
      case 'scope-path':
        return evaluateScopePathPredicate(predicate, deps) ? { ok: true, reason: '' } : { ok: false, reason: 'scope-path predicate false' };
      case 'event': {
        const event = deps.getLatestEvent(predicate.kind);
        if (!event) return { ok: false, reason: `no ${predicate.kind} event yet` };
        return !predicate.match || predicate.match(event) ? { ok: true, reason: '' } : { ok: false, reason: 'event match false' };
      }
      case 'stability':
        // stability ok is decided by the stableGate await before this evaluation
        return { ok: true, reason: '' };
      case 'visual': {
        // compareVisual is async — visual predicates must use waitForVisual helper
        return { ok: false, reason: 'visual predicate requires async compare; use type visual via waitForVisual' };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `${message} cause: predicate evaluation failed` };
  }
}

function logRetry(deps: WaitForDeps, attempts: number, label: string, detail: string): void {
  deps.log.append({
    kind: 'assertion',
    group: 'assertion',
    level: 'warning',
    source: 'waitFor',
    summary: `retry ${attempts} · ${label}`,
    detail,
  });
}

interface WaitTiming {
  timeoutMs: number;
  intervalMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

function resolveWaitTiming(deps: WaitForDeps, options: WaitForOptions, defaults: { timeoutMs: number; intervalMs: number }): WaitTiming {
  return {
    timeoutMs: options.timeoutMs ?? defaults.timeoutMs,
    intervalMs: options.intervalMs ?? defaults.intervalMs,
    now: deps.now ?? Date.now,
    sleep: deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))),
  };
}

export async function waitFor(predicate: WaitForPredicate, deps: WaitForDeps, options: WaitForOptions = {}): Promise<WaitResult> {
  if (predicate.type === 'visual') {
    // visual comparison is async — route through waitForVisual (assertion-bridge does this)
    return { ok: false, attempts: 0, durationMs: 0, lastError: 'visual predicate requires waitForVisual' };
  }
  const stableGate = options.stableGate ?? true;
  const { timeoutMs, intervalMs, now, sleep } = resolveWaitTiming(deps, options, { timeoutMs: 4000, intervalMs: 32 });
  const startedAt = now();
  let attempts = 0;
  let lastError = '';
  const label = describePredicate(predicate);

  for (;;) {
    attempts += 1;
    if (stableGate) {
      const stability = await deps.whenStable(timeoutMs);
      if (!stability.stable && predicate.type === 'stability') {
        lastError = 'stability timeout (degraded)';
        break;
      }
    }
    const evaluation = evaluateOnce(predicate, deps);
    if (evaluation.ok) {
      return { ok: true, attempts, durationMs: now() - startedAt };
    }
    lastError = evaluation.reason;
    if (now() - startedAt >= timeoutMs) {
      break;
    }
    logRetry(deps, attempts, label, lastError);
    const nextCheckAt = now() + intervalMs;
    const remaining = nextCheckAt - now();
    if (remaining > 0) await sleep(remaining);
  }

  deps.log.append({
    kind: 'assertion',
    group: 'assertion',
    level: 'error',
    source: 'waitFor',
    summary: `failed after ${attempts} attempts · ${label}`,
    detail: lastError,
  });
  return { ok: false, attempts, durationMs: now() - startedAt, lastError };
}

export async function waitForVisual(predicate: Extract<WaitForPredicate, { type: 'visual' }>, deps: WaitForDeps, options: WaitForOptions = {}): Promise<WaitResult> {
  const { timeoutMs, intervalMs, now, sleep } = resolveWaitTiming(deps, options, { timeoutMs: 4000, intervalMs: 32 });
  const startedAt = now();
  let attempts = 0;
  let lastError = '';
  for (;;) {
    attempts += 1;
    const comparison = await deps.compareVisual(predicate.baselineKey);
    if ('missing' in comparison) {
      lastError = `baseline missing: ${predicate.baselineKey}`;
    } else if (comparison.diffRatio <= predicate.maxDiffRatio) {
      return { ok: true, attempts, durationMs: now() - startedAt };
    } else {
      lastError = `diffRatio ${comparison.diffRatio.toFixed(4)} > ${predicate.maxDiffRatio}`;
    }
    if (now() - startedAt >= timeoutMs) break;
    logRetry(deps, attempts, `visual:${predicate.baselineKey}`, lastError);
    const remaining = now() + intervalMs - now();
    if (remaining > 0) await sleep(remaining);
  }
  return { ok: false, attempts, durationMs: now() - startedAt, lastError };
}

import type { PerfRow, RenderMetrics } from './types.js';

export type PerfProbeKind = 'render' | 'mount' | 'unmount';

export type PerfProbeCounter = {
  render: number;
  mount: number;
  unmount: number;
  lastCid?: number;
  lastInstancePath?: string;
};

export type PerfProbeDelta = PerfProbeCounter;

export type PerformanceDebuggerCoverageEvidence = {
  schemaUrl?: string;
  runtimeId?: string;
  inspectedProbeKey?: string;
  inspectedCid?: number;
  rendererType?: string;
  instancePath?: string;
  matchedByElement: boolean;
};

export type PerformanceDebuggerSummary = {
  covered: boolean;
  limitation?: string;
  coverageEvidence?: PerformanceDebuggerCoverageEvidence;
  failureCount: number;
  errorCount: number;
};

export type PerformanceProfilerSnapshot = Pick<
  RenderMetrics,
  'commitCount' | 'totalActualDuration' | 'lastActualDuration' | 'averageActualDuration' | 'maxActualDuration'
>;

export type PerformanceProfilerDelta = {
  commitsDelta: number;
  totalCommitMs: number;
  maxCommitMs: number;
};

export type PerformanceVisibleSnapshot = {
  targetValueBefore?: string;
  targetValueAfter?: string;
  siblingPrevValueBefore?: string;
  siblingPrevValueAfter?: string;
  siblingNextValueBefore?: string;
  siblingNextValueAfter?: string;
};

export type PerformanceValidationPathCheck = {
  expectedPath?: string;
  observedWritePath?: string;
  observedValidationPath?: string;
  usedItemKeyPath: boolean;
};

export type PerformanceDiagnosticScenario =
  | 'table-single-row-locality'
  | 'array-item-locality';

export type PerformanceDiagnosticStatus = 'running' | 'completed' | 'failed';

export type PerformanceDiagnosticSession = {
  id: string;
  scenario: PerformanceDiagnosticScenario;
  status: PerformanceDiagnosticStatus;
  startedAt: number;
  endedAt?: number;
  profilerBefore?: PerformanceProfilerSnapshot;
  profilerAfter?: PerformanceProfilerSnapshot;
  profilerDelta?: PerformanceProfilerDelta;
  changedRowKeys: string[];
  changedItemKeys: string[];
  probeDeltas: Record<string, PerfProbeDelta>;
  debuggerSummary: PerformanceDebuggerSummary;
  visibleSnapshot?: PerformanceVisibleSnapshot;
  validationPathCheck?: PerformanceValidationPathCheck;
  targetProbeDelta?: PerfProbeDelta;
  siblingProbeDelta?: PerfProbeDelta;
  siblingPrevProbeDelta?: PerfProbeDelta;
  siblingNextProbeDelta?: PerfProbeDelta;
  targetItemProbeDelta?: PerfProbeDelta;
  siblingItemProbeDelta?: PerfProbeDelta;
  unchangedRowUnmountDelta: number;
  unchangedItemUnmountDelta: number;
  targetRowKey?: string;
  targetItemKey?: string;
  error?: string;
};

type SessionInput = {
  id: string;
  scenario: PerformanceDiagnosticScenario;
  profilerBefore?: PerformanceProfilerSnapshot;
};

type SessionPatch = Partial<Omit<PerformanceDiagnosticSession, 'id' | 'scenario' | 'startedAt'>>;

export interface PerformanceDiagnosticsApi {
  startSession(input: SessionInput): PerformanceDiagnosticSession;
  completeSession(id: string, patch: SessionPatch): PerformanceDiagnosticSession | undefined;
  failSession(id: string, error: string, patch?: SessionPatch): PerformanceDiagnosticSession | undefined;
  recordProbeEvent(probeKey: string, kind: PerfProbeKind, meta?: { cid?: number; instancePath?: string }): void;
  recordProfilerSnapshot(snapshot: PerformanceProfilerSnapshot): void;
  getLatestSession(): PerformanceDiagnosticSession | undefined;
  getLatestProfilerSnapshot(): PerformanceProfilerSnapshot | undefined;
  getProbeCounters(): Record<string, PerfProbeCounter>;
  clear(): void;
}

function createProbeCounter(): PerfProbeCounter {
  return { render: 0, mount: 0, unmount: 0 };
}

function cloneProbeCounter(counter?: PerfProbeCounter): PerfProbeCounter {
  return {
    render: counter?.render ?? 0,
    mount: counter?.mount ?? 0,
    unmount: counter?.unmount ?? 0,
    lastCid: counter?.lastCid,
    lastInstancePath: counter?.lastInstancePath,
  };
}

function cloneProfilerSnapshot(
  snapshot?: PerformanceProfilerSnapshot,
): PerformanceProfilerSnapshot | undefined {
  return snapshot ? { ...snapshot } : undefined;
}

function createEmptyDebuggerSummary(): PerformanceDebuggerSummary {
  return {
    covered: false,
    limitation: 'Debugger coverage not recorded for this session.',
    failureCount: 0,
    errorCount: 0,
  };
}

export function snapshotProfiler(metrics: RenderMetrics): PerformanceProfilerSnapshot {
  return {
    commitCount: metrics.commitCount,
    totalActualDuration: metrics.totalActualDuration,
    lastActualDuration: metrics.lastActualDuration,
    averageActualDuration: metrics.averageActualDuration,
    maxActualDuration: metrics.maxActualDuration,
  };
}

export function diffProfiler(
  before?: PerformanceProfilerSnapshot,
  after?: PerformanceProfilerSnapshot,
): PerformanceProfilerDelta | undefined {
  if (!before || !after) {
    return undefined;
  }

  return {
    commitsDelta: Math.max(0, after.commitCount - before.commitCount),
    totalCommitMs: Math.max(0, after.totalActualDuration - before.totalActualDuration),
    maxCommitMs: after.maxActualDuration,
  };
}

export function createPerformanceDiagnosticsStore(): PerformanceDiagnosticsApi {
  const sessions: PerformanceDiagnosticSession[] = [];
  const probes = new Map<string, PerfProbeCounter>();
  let latestProfilerSnapshot: PerformanceProfilerSnapshot | undefined;

  return {
    startSession(input) {
      const session: PerformanceDiagnosticSession = {
        id: input.id,
        scenario: input.scenario,
        status: 'running',
        startedAt: Date.now(),
        profilerBefore: cloneProfilerSnapshot(input.profilerBefore),
        changedRowKeys: [],
        changedItemKeys: [],
        probeDeltas: {},
        debuggerSummary: createEmptyDebuggerSummary(),
        unchangedRowUnmountDelta: 0,
        unchangedItemUnmountDelta: 0,
      };
      sessions.push(session);
      return session;
    },
    completeSession(id, patch) {
      const session = sessions.find((entry) => entry.id === id);
      if (!session) {
        return undefined;
      }

      Object.assign(session, patch);
      session.status = patch.status ?? 'completed';
      session.endedAt = patch.endedAt ?? Date.now();
      return session;
    },
    failSession(id, error, patch) {
      const session = sessions.find((entry) => entry.id === id);
      if (!session) {
        return undefined;
      }

      Object.assign(session, patch);
      session.status = 'failed';
      session.error = error;
      session.endedAt = patch?.endedAt ?? Date.now();
      return session;
    },
    recordProbeEvent(probeKey, kind, meta) {
      const current = probes.get(probeKey) ?? createProbeCounter();
      current[kind] += 1;
      if (meta?.cid !== undefined) {
        current.lastCid = meta.cid;
      }
      if (meta?.instancePath) {
        current.lastInstancePath = meta.instancePath;
      }
      probes.set(probeKey, current);
    },
    recordProfilerSnapshot(snapshot) {
      latestProfilerSnapshot = { ...snapshot };
    },
    getLatestSession() {
      return sessions.at(-1);
    },
    getLatestProfilerSnapshot() {
      return cloneProfilerSnapshot(latestProfilerSnapshot);
    },
    getProbeCounters() {
      return Object.fromEntries(
        Array.from(probes.entries()).map(([key, value]) => [key, cloneProbeCounter(value)]),
      );
    },
    clear() {
      sessions.length = 0;
      probes.clear();
      latestProfilerSnapshot = undefined;
    },
  };
}

export function computeProbeDeltas(input: {
  before: Record<string, PerfProbeCounter>;
  after: Record<string, PerfProbeCounter>;
  probeKeys: readonly string[];
}): Record<string, PerfProbeDelta> {
  return Object.fromEntries(
    input.probeKeys.map((probeKey) => {
      const before = input.before[probeKey];
      const after = input.after[probeKey];
      return [
        probeKey,
        {
          render: Math.max(0, (after?.render ?? 0) - (before?.render ?? 0)),
          mount: Math.max(0, (after?.mount ?? 0) - (before?.mount ?? 0)),
          unmount: Math.max(0, (after?.unmount ?? 0) - (before?.unmount ?? 0)),
          lastCid: after?.lastCid,
          lastInstancePath: after?.lastInstancePath,
        },
      ];
    }),
  );
}

export function diffChangedRowKeys(beforeRows: readonly PerfRow[], afterRows: readonly PerfRow[]): string[] {
  const maxLength = Math.max(beforeRows.length, afterRows.length);
  const changed = new Set<string>();

  for (let index = 0; index < maxLength; index += 1) {
    const before = beforeRows[index];
    const after = afterRows[index];
    if (!before || !after) {
      const rowId = after?.id ?? before?.id;
      if (rowId) {
        changed.add(rowId);
      }
      continue;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed.add(after.id);
    }
  }

  return Array.from(changed);
}

export function diffChangedItemKeys<T extends { itemKey: string }>(
  beforeItems: readonly T[],
  afterItems: readonly T[],
): string[] {
  const maxLength = Math.max(beforeItems.length, afterItems.length);
  const changed = new Set<string>();

  for (let index = 0; index < maxLength; index += 1) {
    const before = beforeItems[index];
    const after = afterItems[index];
    if (!before || !after) {
      const itemKey = after?.itemKey ?? before?.itemKey;
      if (itemKey) {
        changed.add(itemKey);
      }
      continue;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed.add(after.itemKey);
    }
  }

  return Array.from(changed);
}

declare global {
  interface Window {
    __NOP_PERF_DIAGNOSTICS__?: PerformanceDiagnosticsApi;
  }
}

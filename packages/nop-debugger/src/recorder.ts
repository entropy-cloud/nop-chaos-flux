import type { DevSession, SessionInputEvent, SessionEnvFrame, SessionCheckpoint } from './protocol/types.js';
import type { ActionOutcome } from '@nop-chaos/flux-core';
import { redactData, type NormalizedRedactionOptions } from './redaction.js';
import type { ForestSnapshotCollector, ForestSnapshot } from './snapshot-repository.js';
import type { NopDebuggerStore } from './store.js';
import { getPathValue } from './path-walk.js';

// canonical serialization for checkpoint hashing — no JSON.stringify (perf-suspect rule:
// this is hashing, not change detection; manual canonical form keeps determinism explicit)
export function stableStringify(value: unknown, seen: WeakSet<object> = new WeakSet()): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'undefined') return 'undefined';
  if (type === 'number' || type === 'boolean') return String(value);
  if (type === 'string') {
    const text = value as string;
    const quote = String.fromCharCode(34);
    const escaped = text.split(quote).join(String.fromCharCode(92) + quote);
    return `"${escaped}"`;
  }
  if (type === 'function') return '[function]';
  if (seen.has(value as object)) return '[circular]';
  const objectValue = value as object;
  seen.add(objectValue);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item, seen)).join(',')}]`;
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort(compareStrings);
    const body = keys.map((key) => `"${key}":${stableStringify(record[key], seen)}`).join(',');
    return `{${body}}`;
  } finally {
    seen.delete(objectValue);
  }
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function readSetValuePath(outcome: ActionOutcome): string | null {
  const args = (outcome.action as { args?: { path?: unknown } }).args;
  const path = (args as { path?: unknown } | undefined)?.path;
  return typeof path === 'string' && path.length > 0 ? path : null;
}

/** Written-path-scoped hashes: key `scope::path`, value = hash of the path's current value. */
export function computeWrittenPathHashes(snapshot: ForestSnapshot, writtenPaths: readonly string[]): Record<string, string> {
  const pathHashes: Record<string, string> = {};
  for (const [scopeId, scopeData] of Object.entries(snapshot.scopes)) {
    const normalized = normalizeScopeKey(scopeId);
    for (const path of writtenPaths) {
      const current = getPathValue(scopeData, path);
      if (current === undefined) continue;
      pathHashes[`${normalized}::${path}`] = hashString(stableStringify(current));
    }
  }
  return pathHashes;
}

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(16);
}

export function computeCheckpointHashes(snapshot: ForestSnapshot): Record<string, string> {
  const pathHashes: Record<string, string> = {};
  for (const [scopeId, scopeData] of Object.entries(snapshot.scopes)) {
    pathHashes[normalizeScopeKey(scopeId)] = hashString(stableStringify(scopeData));
  }
  return pathHashes;
}

/** Runtime-scoped ids (`runtime-xxxx:action-root`) must compare equal across runtimes after reload. */
export function normalizeScopeKey(scopeId: string): string {
  return scopeId.replace(/^runtime-[a-z0-9]+:/, '');
}

interface RecorderDeps {
  redaction: NormalizedRedactionOptions;
  store: NopDebuggerStore;
  getCollector(): ForestSnapshotCollector | null;
}

interface RecorderState {
  recording: boolean;
  startedAt: number;
  inputs: SessionInputEvent[];
  envFrames: SessionEnvFrame[];
  lastResultByRequestId: Map<string, { request: unknown; response: unknown; status: number }>;
  checkpoints: SessionCheckpoint[];
  writtenPaths: Set<string>;
}

export function createRecorder(deps: RecorderDeps) {
  const state: RecorderState = {
    recording: false,
    startedAt: 0,
    inputs: [],
    envFrames: [],
    lastResultByRequestId: new Map(),
    checkpoints: [],
    writtenPaths: new Set(),
  };
  let seq = 0;

  return {
    isRecording: () => state.recording,
    start(): void {
      state.recording = true;
      state.startedAt = Date.now();
      state.inputs = [];
      state.envFrames = [];
      state.checkpoints = [];
      state.writtenPaths = new Set();
      seq = 0;
    },
    recordAction(outcome: ActionOutcome): void {
      if (!state.recording) return;
      seq += 1;
      const targetPath = readSetValuePath(outcome);
      if (targetPath) state.writtenPaths.add(targetPath);
      const NON_SERIALIZABLE_EVENT_KEYS = new Set(['type', 'nativeEvent', 'currentTarget', 'target', 'preventDefault', 'stopPropagation']);
      const rawPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(outcome.event?.payload ?? {})) {
        if (NON_SERIALIZABLE_EVENT_KEYS.has(key)) continue;
        if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
          rawPayload[key] = value;
        }
      }
      const input: SessionInputEvent = {
        seq,
        at: Date.now() - state.startedAt,
        type: outcome.event?.type ?? outcome.action.action ?? 'unknown',
        cid: typeof rawPayload.cid === 'string' ? rawPayload.cid : undefined,
        payload: redactData(
          {
            ...rawPayload,
            actionSchema: outcome.action,
            status: outcome.status,
          },
          deps.redaction,
        ) as Record<string, unknown>,
      };
      state.inputs.push(input);
    },
    recordApiFrame(frame: { requestKey: string; api: unknown; response: unknown; status: number }): void {
      if (!state.recording) return;
      const requestId = `req-${frame.requestKey}`;
      state.lastResultByRequestId.set(requestId, {
        request: redactData(frame.api, deps.redaction),
        response: redactData(frame.response, deps.redaction),
        status: frame.status,
      });
    },
    buildSession(): DevSession {
      for (const [requestId, frame] of state.lastResultByRequestId) {
        state.envFrames.push({
          requestId,
          channel: 'fetcher',
          request: frame.request,
          response: frame.response,
          status: frame.status,
        });
      }
      const checkpoints = [...state.checkpoints];
      const logs = deps.store.getSnapshot().events.slice(0, 50).map((event) => ({
        id: String(event.id),
        kind: event.kind as never,
        label: event.summary,
        status: (event.level === 'error' ? 'failed' : 'passed') as never,
        startedAt: event.timestamp,
      }));
      return {
        version: 1,
        meta: { startedAt: state.startedAt, endedAt: Date.now() },
        clock: { origin: state.startedAt, events: [] },
        inputs: state.inputs,
        envFrames: [...state.envFrames],
        checkpoints,
        logs,
      };
    },
    currentSeq(): number {
      return seq;
    },
    writtenPaths(): string[] {
      return [...state.writtenPaths];
    },
    /** Capture a checkpoint for `step` after the corresponding write has settled. Dedupes by step. */
    captureCheckpointAt(step: number): boolean {
      if (state.checkpoints.some((checkpoint) => checkpoint.step === step)) return false;
      const snapshot = deps.getCollector()?.flush();
      if (!snapshot) return false;
      let pathHashes: Record<string, string>;
      try {
        pathHashes = computeWrittenPathHashes(snapshot, [...state.writtenPaths]);
      } catch (error) {
        console.error('[recorder] checkpoint hash failed cause:', error instanceof Error ? error.message : String(error));
        return false;
      }
      state.checkpoints.push({
        step,
        epoch: snapshot.epoch,
        revisions: snapshot.revisions,
        pathHashes,
      });
      return true;
    },
    stop(): DevSession {
      state.recording = false;
      return this.buildSession();
    },
  };
}

export type Recorder = ReturnType<typeof createRecorder>;

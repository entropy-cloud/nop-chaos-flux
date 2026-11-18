import type { DevSession, SessionCheckpoint } from './protocol/types.js';
import { computeCheckpointHashes, normalizeScopeKey, computeWrittenPathHashes } from './recorder.js';

interface Divergence {
  step: number;
  path: string;
  expected: unknown;
  actual: unknown;
}

interface ReplayResult {
  steps: number;
  divergences: Divergence[];
  finalPathHashes: Record<string, string>;
}

interface ReplayRuntimeLike {
  dispatch(action: unknown, ctx?: unknown): Promise<unknown>;
  getStabilityTracker?(): { whenStable(timeoutMs?: number): Promise<{ stable: boolean }> } | undefined;
}

interface ReplayScopeProvider {
  /** Live replay-state scopes for checkpoint comparison (scopeId -> data). */
  getScopes(): Record<string, Record<string, unknown>>;
}

interface ReplayerEnvStub {
  /** Fetcher stub: envFrames by requestId; miss → 503 stub error (env-frame-miss). */
  resolve(requestId: string): { status: number; data: unknown } | { missing: true };
}

interface ReplayerDeps {
  runtime: ReplayRuntimeLike;
  scopeProvider: ReplayScopeProvider;
  envStub?: ReplayerEnvStub;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  waitForStable?: () => Promise<void>;
  onSideEffect?: (kind: string, detail: unknown) => void;
}

const SIDE_EFFECT_ACTIONS = new Set(['navigate', 'openDialog', 'openDrawer', 'print']);

export async function replaySession(session: DevSession, deps: ReplayerDeps): Promise<ReplayResult> {
  const divergences: Divergence[] = [];
  const checkpoints: SessionCheckpoint[] = [...session.checkpoints];
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let step = 0;

  // env coverage check: every recorded frame must resolve in the replay environment (env-frame-miss Failure Path)
  if (deps.envStub) {
    for (const frame of session.envFrames) {
      if ('missing' in deps.envStub.resolve(frame.requestId)) {
        divergences.push({ step: 0, path: `envFrame:${frame.requestId}`, expected: 'frame', actual: 'missing' });
      }
    }
  }

  for (const input of session.inputs) {
    step += 1;
    const actionSchema = (input.payload as { actionSchema?: unknown } | undefined)?.actionSchema;
    if (actionSchema && typeof actionSchema === 'object') {
      const actionName = (actionSchema as { action?: string }).action ?? '';
      if (SIDE_EFFECT_ACTIONS.has(actionName)) {
        deps.onSideEffect?.(actionName, actionSchema);
        continue;
      }
      await deps.runtime.dispatch(actionSchema, { replayInput: input });
      await deps.waitForStable?.();
    }
    await sleep(0);

    const checkpoint = checkpoints[0];
    if (checkpoint && step >= checkpoint.step) {
      checkpoints.shift();
      const divergence = compareCheckpoint(checkpoint, deps.scopeProvider.getScopes());
      if (divergence) {
        divergences.push(divergence);
        break; // 停驻分歧步
      }
    }
  }

  const finalPathHashes = computeCheckpointHashes({
    epoch: 0,
    capturedAt: now(),
    revisions: {},
    scopes: deps.scopeProvider.getScopes(),
    changedScopeIds: [],
  });
  return { steps: step, divergences, finalPathHashes };
}

export function compareCheckpoint(expected: SessionCheckpoint, actualScopes: Record<string, Record<string, unknown>>): Divergence | null {
  const normalizedActual: Record<string, Record<string, unknown>> = {};
  for (const [scopeId, scopeData] of Object.entries(actualScopes)) {
    normalizedActual[normalizeScopeKey(scopeId)] = scopeData;
  }
  const normalizedHashes = computeCheckpointHashes({
    epoch: 0,
    capturedAt: 0,
    revisions: {},
    scopes: normalizedActual,
    changedScopeIds: [],
  });
  for (const [key, hash] of Object.entries(expected.pathHashes)) {
    if (key.includes('::')) {
      // written-path hash: compare only the recorded write path's value
      const separator = key.indexOf('::');
      const scopeId = key.slice(0, separator);
      const path = key.slice(separator + 2);
      const scopeData = normalizedActual[scopeId];
      if (scopeData === undefined) {
        return { step: expected.step, path: key, expected: 'scope present', actual: Object.keys(actualScopes) };
      }
      const actualHash = computeWrittenPathHashes(
        { epoch: 0, capturedAt: 0, revisions: {}, scopes: { [scopeId]: scopeData }, changedScopeIds: [] },
        [path],
      )[`${scopeId}::${path}`];
      if (actualHash !== hash) {
        let actualValue: unknown = scopeData;
        for (const segment of path.split('.')) {
          if (actualValue === null || typeof actualValue !== 'object') break;
          actualValue = (actualValue as Record<string, unknown>)[segment];
        }
        return { step: expected.step, path: key, expected: hash, actual: `${String(actualValue)}:${typeof actualValue} (${actualHash ?? 'missing'})` };
      }
      continue;
    }
    if (normalizedActual[key] === undefined) {
      return { step: expected.step, path: key, expected: 'scope present', actual: Object.keys(actualScopes) };
    }
    if (normalizedHashes[key] !== hash) {
      return { step: expected.step, path: key, expected: hash, actual: normalizedHashes[key]! };
    }
  }
  return null;
}

export function envFrameStub(session: DevSession): ReplayerEnvStub {
  const frames = new Map(session.envFrames.map((frame) => [frame.requestId, frame]));
  return {
    resolve(requestId: string) {
      const frame = frames.get(requestId);
      if (!frame) return { missing: true };
      return { status: frame.status ?? 200, data: frame.response };
    },
  };
}

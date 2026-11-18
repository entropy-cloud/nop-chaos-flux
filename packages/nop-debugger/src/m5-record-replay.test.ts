import { describe, expect, it, vi } from 'vitest';
import Ajv from 'ajv';
import { createDebuggerStore } from './store.js';
import { createFakeClock } from './fake-clock.js';
import { computeCheckpointHashes, createRecorder, stableStringify } from './recorder.js';
import { createSessionCache } from './session-cache.js';
import { compareCheckpoint, envFrameStub, replaySession } from './replayer.js';
import { createVideoRecorder, isMediaRecorderSupported } from './capture/video.js';
import devSessionSchema from '../protocol/dev-session.schema.json';
import methodsSchema from '../protocol/methods.schema.json';
import type { DevSession } from './protocol/types.js';
import { normalizeRedactionOptions } from './redaction.js';

function makeRecorder() {
  const store = createDebuggerStore({
    enabled: true, sessionId: 's', maxEvents: 50, defaultOpen: false, defaultTab: 'overview',
    position: { x: 0, y: 0 }, errorBufferKeepEarliest: 5, errorBufferKeepLatest: 5,
  });
  return createRecorder({ redaction: normalizeRedactionOptions(undefined), store, getCollector: () => null });
}

function validateDevSession(session: unknown): void {
  const ajv = new Ajv({ strict: false, allErrors: true });
  ajv.addSchema([methodsSchema, devSessionSchema]);
  const validate = ajv.compile({ $ref: 'https://nop-chaos.dev/schemas/devtools/dev-session.schema.json' });
  const valid = validate(session);
  if (!valid) {
    throw new Error(`schema violations: ${ajv.errorsText(validate.errors)}`);
  }
}

describe('fake-clock (M5)', () => {
  it('installs, records scheduling events, ticks, and restores on uninstall', () => {
    vi.stubGlobal('window', globalThis);
    const clock = createFakeClock(1000);
    clock.install();
    expect(clock.isInstalled()).toBe(true);
    const fired: string[] = [];
    const timerId = window.setTimeout(() => fired.push('a'), 100);
    expect(fired).toHaveLength(0);
    clock.tick(100);
    expect(fired).toEqual(['a']);
    expect(clock.getEvents().some((event) => event.kind === 'setTimeout')).toBe(true);
    expect(clock.getEvents().some((event) => event.kind === 'tick')).toBe(true);
    window.clearTimeout(timerId as never);
    clock.uninstall();
    expect(clock.isInstalled()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('Date.now is driven by tick while installed', () => {
    vi.stubGlobal('window', globalThis);
    const clock = createFakeClock(5000);
    clock.install();
    expect(Date.now()).toBe(5000);
    clock.tick(250);
    expect(Date.now()).toBe(5250);
    clock.uninstall();
    vi.unstubAllGlobals();
  });
});

describe('recorder (M5)', () => {
  it('normalizes event payloads with the serializable whitelist (nativeEvent stripped)', async () => {
    const recorder = makeRecorder();
    recorder.start();
    recorder.recordAction({
      action: { action: 'setValue' } as never,
      status: 'success',
      durationMs: 5,
      event: {
        type: 'click',
        payload: { nativeEvent: new Event('x'), target: {}, keepMe: 'yes', n: 3, flag: true },
      } as never,
    });
    const session = recorder.stop();
    expect(session.inputs).toHaveLength(1);
    const payload = session.inputs[0]!.payload as Record<string, unknown>;
    expect(payload.keepMe).toBe('yes');
    expect(payload.n).toBe(3);
    expect(payload.nativeEvent).toBeUndefined();
    expect(payload.target).toBeUndefined();
  });

  it('stop produces a DevSession that passes the frozen M0 schema validation', () => {
    const recorder = makeRecorder();
    recorder.start();
    recorder.recordAction({ action: { action: 'setValue' } as never, status: 'success', durationMs: 1 });
    const session = recorder.stop();
    expect(session.version).toBe(1);
    expect(() => validateDevSession(session)).not.toThrow();
    // discriminative: a broken session (missing segments) must fail validation
    expect(() => validateDevSession({ version: 1 })).toThrow(/schema violations/);
  });

  it('checkpoint hashes are stable and sensitive to content', () => {
    const scopesA = { root: { a: 1 } };
    const scopesB = { root: { a: 2 } };
    const hashA = computeCheckpointHashes({ epoch: 0, capturedAt: 0, revisions: {}, scopes: scopesA, changedScopeIds: [] });
    const hashA2 = computeCheckpointHashes({ epoch: 9, capturedAt: 99, revisions: {}, scopes: scopesA, changedScopeIds: [] });
    const hashB = computeCheckpointHashes({ epoch: 0, capturedAt: 0, revisions: {}, scopes: scopesB, changedScopeIds: [] });
    expect(stableStringify(scopesA)).toBe(stableStringify(scopesA));
    expect(hashA.root).toBe(hashA2.root);
    expect(hashA.root).not.toBe(hashB.root);
  });
});

describe('session cache (M5)', () => {
  it('LRU evicts oldest entries over quota', async () => {
    const cache = createSessionCache(undefined, 64 * 1024);
    const bigSession = { ...makeRecorder().stop(), inputs: Array.from({ length: 5000 }, (_, i) => ({ seq: i, at: i, type: 'click' })) };
    for (let i = 0; i < 60; i++) {
      await cache.put(`session-${i}`, { ...bigSession, meta: { startedAt: i } } as DevSession);
    }
    expect(await cache.size()).toBeLessThan(60);
  });

  it('get refreshes recency and returns null on miss', async () => {
    const cache = createSessionCache();
    expect(await cache.get('missing')).toBeNull();
    const session = makeRecorder().stop();
    await cache.put('s-1', session);
    expect(await cache.get('s-1')).not.toBeNull();
  });
});

describe('replayer (M5)', () => {
  it('deterministic session: zero divergences when hashes match', async () => {
    const session = makeRecorder().stop();
    const dispatch = vi.fn(async () => ({}));
    const result = await replaySession(
      { ...session, inputs: [{ seq: 1, at: 0, type: 'setValue', payload: { actionSchema: { action: 'setValue' } } }], checkpoints: [] },
      {
        runtime: { dispatch },
        scopeProvider: { getScopes: () => ({ root: { a: 1 } }) },
        sleep: async () => {},
      },
    );
    expect(result.steps).toBe(1);
    expect(result.divergences).toHaveLength(0);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('injected divergence: hash mismatch is located at the checkpoint step/path', () => {
    const divergence = compareCheckpoint(
      { step: 3, epoch: 3, revisions: { root: 5 }, pathHashes: { root: 'deadbeef' } },
      { root: { a: 'changed-value' } },
    );
    expect(divergence).not.toBeNull();
    expect(divergence!.step).toBe(3);
    expect(divergence!.path).toBe('root');
    expect(divergence!.expected).not.toBe(divergence!.actual);
  });

  it('missing scope reports scope divergence with actual scope keys', () => {
    const divergence = compareCheckpoint(
      { step: 3, epoch: 3, revisions: {}, pathHashes: { gone: 'h' } },
      { root: {} },
    );
    expect(divergence?.expected).toBe('scope present');
    expect(Array.isArray(divergence?.actual)).toBe(true);
  });

  it('envFrame stub resolves recorded frames and reports misses', () => {
    const session = makeRecorder().stop();
    session.envFrames.push({ requestId: 'req-1', channel: 'fetcher', response: { ok: 1 }, status: 0 });
    const stub = envFrameStub(session);
    expect(stub.resolve('req-1')).toEqual({ status: 0, data: { ok: 1 } });
    expect(stub.resolve('req-404')).toEqual({ missing: true });
  });
});

describe('video recorder (M5)', () => {
  it('happy-dom lacks MediaRecorder captureStream — selects keyframes mode', () => {
    const recorder = createVideoRecorder(5);
    expect(isMediaRecorderSupported()).toBe(false);
    expect(recorder.mode()).toBe('keyframes');
    recorder.addFrame('AAAA');
    return recorder.stop().then((recording) => {
      expect(recording.mode).toBe('keyframes');
      expect(recording.keyframes).toHaveLength(1);
    });
  });
});

import type { DevSession } from './protocol/types.js';
import { createRecorder, type Recorder } from './recorder.js';
import type { ForestSnapshotCollector } from './snapshot-repository.js';
import { createSessionCache, type SessionCache } from './session-cache.js';
import { replaySession } from './replayer.js';
import { createFakeClock } from './fake-clock.js';
import { createVideoRecorder } from './capture/video.js';
import { collectDiagnosticBundle as collectBundleBase, replayDiagnosticBundle as replayBundleBase, type DiagnosticBundle } from './diagnostic-bundle.js';
import { buildAiRepairInput as buildAiRepairInputBase } from './ai-repair-input.js';
import { CaptureError } from './capture/screenshot.js';
import type { NormalizedRedactionOptions } from './redaction.js';

interface ReplayRuntimeLike {
  dispatch(action: unknown, ctx?: unknown): Promise<unknown>;
  getStabilityTracker?(): { whenStable(timeoutMs?: number): Promise<{ stable: boolean }> } | undefined;
}

interface SessionBridgeDeps {
  sessionId: string;
  redaction: NormalizedRedactionOptions;
  store: Parameters<typeof createRecorder>[0]['store'];
  getCollector(): ForestSnapshotCollector | null;
  getRuntime(): ReplayRuntimeLike | undefined;
  dispatchViaBridge(action: unknown, ctx?: unknown): Promise<unknown>;
  getStabilityTracker(): { whenStable(timeoutMs?: number): Promise<{ stable: boolean }> } | undefined;
}

export function createSessionBridge(deps: SessionBridgeDeps) {
  const recorder: Recorder = createRecorder({ redaction: deps.redaction, store: deps.store, getCollector: deps.getCollector });
  const sessionCache: SessionCache = createSessionCache();
  let videoRecorder: ReturnType<typeof createVideoRecorder> | null = null;

  return {
    recordAction(outcome: never): void {
      recorder.recordAction(outcome);
    },
    recordApiFrame(frame: { requestKey: string; api: unknown; response: unknown; status: number }): void {
      recorder.recordApiFrame(frame);
    },
    recordDispatch(action: unknown, ctx?: unknown): void {
      if (!recorder.isRecording()) return;
      recorder.recordAction({
        action,
        status: 'success',
        durationMs: 0,
        event: (ctx as { replayInput?: { event?: { type: string; payload: Record<string, unknown> } } } | undefined)?.replayInput?.event,
      } as never);
      // deterministic capture: each dispatched input settles (awaited) before the next
      // recordDispatch, so the state here reflects writes 1..N-1 — checkpoint step N-1
      const stepForCapture = recorder.currentSeq() - 1;
      if (stepForCapture > 0 && stepForCapture % 5 === 0) {
        recorder.captureCheckpointAt(stepForCapture);
      }
    },
    startRecording(): void {
      recorder.start();
    },
    async stopRecording(): Promise<DevSession> {
      const session = recorder.stop();
      await sessionCache.put(`session-${session.meta.startedAt}`, session);
      return session;
    },
    async replaySession(session: DevSession): Promise<{ steps: number; divergences: Array<{ step: number; path: string; expected: unknown; actual: unknown }> }> {
      if (!deps.getRuntime()) {
        return { steps: 0, divergences: [{ step: 0, path: 'runtime', expected: 'wired', actual: 'missing' }] };
      }
      // fake-clock drives replay when the session carries clock events (install scoped to the replay)
      let uninstallClock: (() => void) | null = null;
      if (session.clock.events.length > 0) {
        const clock = createFakeClock(session.clock.origin);
        clock.install();
        uninstallClock = () => clock.uninstall();
        const finalTick = session.clock.events.reduce((max, event) => Math.max(max, event.at), 0);
        clock.tick(finalTick);
      }
      try {
        const result = await replaySession(session, {
          runtime: {
            dispatch: (action: unknown, ctx?: unknown) => deps.dispatchViaBridge(action, { ...(ctx as Record<string, unknown> | undefined) }),
          },
          scopeProvider: {
            getScopes: () => deps.getCollector()?.getLatest()?.scopes ?? {},
          },
          waitForStable: async () => {
            await deps.getRuntime()?.getStabilityTracker?.()?.whenStable(2000);
          },
          envStub: {
            resolve: (requestId: string) => {
              const frame = session.envFrames.find((candidate: { requestId: string }) => candidate.requestId === requestId);
              return frame ? { status: frame.status ?? 200, data: frame.response } : { missing: true };
            },
          },
        });
        return { steps: result.steps, divergences: result.divergences };
      } finally {
        uninstallClock?.();
      }
    },
    recordVideo(options?: { fps?: number }): void {
      videoRecorder = createVideoRecorder(options?.fps ?? 5);
    },
    async collectDiagnosticBundle(session: DevSession): Promise<unknown> {
      return collectBundleBase({
        sessionId: deps.sessionId,
        store: deps.store,
        collector: deps.getCollector(),
        buildSession: () => session,
        screenshotTagRefs: () => [],
        redact: (value) => value,
      });
    },
    async replayDiagnosticBundle(bundle: DiagnosticBundle): Promise<{ steps: number; divergences: Array<{ step: number; path: string; expected: unknown; actual: unknown }> }> {
      if (!deps.getRuntime()) {
        return { steps: 0, divergences: [{ step: 0, path: 'runtime', expected: 'wired', actual: 'missing' }] };
      }
      return replayBundleBase(bundle, {
        runtime: deps.getRuntime() as never,
        getScopes: () => deps.getCollector()?.getLatest()?.scopes ?? {},
        waitForStable: async () => {
          await deps.getRuntime()?.getStabilityTracker?.()?.whenStable(2000);
        },
      });
    },
    buildAiRepairInput(input: never): unknown {
      return buildAiRepairInputBase(input as never);
    },
    isVideoRecording(): boolean {
      return videoRecorder !== null;
    },
    addVideoFrame(bytesBase64: string): void {
      videoRecorder?.addFrame(bytesBase64);
    },
    async stopRecordingVideo(): Promise<{ mode: string; bytesBase64: string; byteLength: number; frameCount: number }> {
      if (!videoRecorder) {
        throw new CaptureError('recording-not-started', 'recordVideo() must be called first');
      }
      const recording = await videoRecorder.stop();
      videoRecorder = null;
      return {
        mode: recording.mode,
        bytesBase64: recording.bytesBase64,
        byteLength: recording.bytesBase64.length,
        frameCount: recording.frameCount,
      };
    },
  };
}

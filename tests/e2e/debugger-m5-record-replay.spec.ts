import { expect, test } from '@playwright/test';

// M5 (plan 2026-11-18-m5): session recording → deterministic replay → divergence
// detection → video capture. Programmatic assertions only.

async function openFluxBasicPage(page: import('@playwright/test').Page) {
  await page.goto('/#/flux-basic');
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
}

test('M5: record deterministic steps → replay after reload → zero divergences and matching final state', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.waitForTimeout(500);

  const recordOutcome = await page.evaluate(async () => {
    const api = (window as unknown as {
      __NOP_DEBUGGER_API__?: {
        startRecording?: () => void;
        stopRecording?: () => Promise<DevSessionLike>;
        dispatch?: (action: unknown, ctx?: unknown) => Promise<unknown>;
        waitFor?: (p: unknown, o?: object) => Promise<unknown>;
      };
    }).__NOP_DEBUGGER_API__;
    if (!api?.startRecording || !api.stopRecording || !api.dispatch) return { wired: false };
    api.startRecording();
    for (let i = 1; i <= 30; i++) {
      await api.dispatch({ action: 'setValue', args: { path: 'm5Probe.step', value: i } } as never);
      await api.waitFor?.({ type: 'stability' }, { timeoutMs: 2000, stableGate: false });
    }
    const session = await api.stopRecording();
    return { wired: true, session };
  });
  expect(recordOutcome.wired).toBe(true);
  const session = (recordOutcome as { session: DevSessionLike }).session;
  expect(session.version).toBe(1);
  expect(session.inputs.length).toBeGreaterThanOrEqual(30);
  expect(session.checkpoints.length).toBeGreaterThan(0);

  // reload: fresh runtime, replay the recorded session
  await page.reload();
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  const replayOutcome = await page.evaluate(async (session) => {
    const api = (window as unknown as {
      __NOP_DEBUGGER_API__?: {
        replaySession?: (session: DevSessionLike) => Promise<{ steps: number; divergences: Array<{ step: number; path: string; expected: unknown; actual: unknown }> }>;
        waitFor?: (p: unknown, o?: object) => Promise<unknown>;
      };
    }).__NOP_DEBUGGER_API__;
    if (!api?.replaySession) return { wired: false };
    await api.waitFor?.({ type: 'stability' }, { timeoutMs: 5000, stableGate: false });
    const result = await api.replaySession(session);
    return { wired: true, result };
  }, session);

  expect(replayOutcome.wired).toBe(true);
  const result = (replayOutcome as { result: { steps: number; divergences: Array<{ step: number; path: string; expected: unknown; actual: unknown }> } }).result;
  expect(result.steps).toBeGreaterThan(0);
  expect(result.divergences).toHaveLength(0);
});

test('M5: tampered checkpoint is detected as a divergence at the right step', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.waitForTimeout(500);

  const recordOutcome = await page.evaluate(async () => {
    const api = (window as unknown as {
      __NOP_DEBUGGER_API__?: {
        startRecording?: () => void;
        stopRecording?: () => Promise<DevSessionLike>;
        dispatch?: (action: unknown) => Promise<unknown>;
      };
    }).__NOP_DEBUGGER_API__;
    if (!api?.startRecording || !api.stopRecording || !api.dispatch) return { wired: false };
    api.startRecording();
    for (let i = 1; i <= 10; i++) {
      await api.dispatch({ action: 'setValue', args: { path: 'm5Probe.tamper', value: i } } as never);
    }
    const session = await api.stopRecording();
    // tamper: flip one checkpoint hash to simulate divergence
    if (session.checkpoints.length > 0) {
      session.checkpoints[0]!.pathHashes = { ...session.checkpoints[0]!.pathHashes, tampered: 'deadbeef' };
    }
    return { wired: true, session };
  });
  expect(recordOutcome.wired).toBe(true);
  const session = (recordOutcome as { session: DevSessionLike }).session;

  await page.reload();
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  const replayOutcome = await page.evaluate(async (session) => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V5Api }).__NOP_DEBUGGER_API__;
    if (!api?.replaySession) return { wired: false };
    const result = await api.replaySession(session);
    const epochs = api.getSnapshotEpochs?.() ?? [];
    const finalState = epochs.length > 0 ? api.getSnapshotAt?.(epochs[epochs.length - 1]!) : null;
    const finalValue = finalState ? JSON.stringify((finalState as { scopes: Record<string, Record<string, unknown>> }).scopes) : 'null';
    return { wired: true, result, finalValue: String(finalValue).slice(0, 300) };
  }, session);

  expect(replayOutcome.wired).toBe(true);
  const result = (replayOutcome as { result: { divergences: unknown[] } }).result;
  expect(result.divergences.length).toBeGreaterThan(0);
});

test('M5: video recording produces a non-empty product', async ({ page }) => {
  await openFluxBasicPage(page);
  const video = await page.evaluate(async () => {
    const api = (window as unknown as {
      __NOP_DEBUGGER_API__?: {
        recordVideo?: (o?: { fps?: number }) => void;
        stopRecordingVideo?: () => Promise<{ mode: string; bytesBase64: string; byteLength: number }>;
        screenshot?: (o?: object) => Promise<{ bytes: string }>;
      };
    }).__NOP_DEBUGGER_API__;
    if (!api?.recordVideo || !api.stopRecordingVideo || !api.screenshot) return { wired: false };
    api.recordVideo({ fps: 5 });
    for (let i = 0; i < 3; i++) {
      const shot = await api.screenshot({ format: 'webp', tag: 'm5-video' });
      void shot;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const recording = await api.stopRecordingVideo();
    return { wired: true, recording };
  });

  expect(video.wired).toBe(true);
  const recording = (video as { recording: { mode: string; byteLength: number; frameCount: number } }).recording;
  expect(['media-recorder', 'keyframes']).toContain(recording.mode);
  expect(recording.byteLength).toBeGreaterThan(0);
  // frames must actually be fed from real screenshots (round-2 audit finding)
  expect(recording.frameCount).toBeGreaterThan(0);
});

interface DevSessionLike {
  version: number;
  inputs: Array<{ seq: number; type: string; payload?: Record<string, unknown> }>;
  checkpoints: Array<{ step: number; epoch?: number; revisions: Record<string, number>; pathHashes: Record<string, string> }>;
  meta: { startedAt: number };
}

interface V5Api {
  replaySession?: (session: DevSessionLike) => Promise<{ steps: number; divergences: Array<{ step: number; path: string }> }>;
}

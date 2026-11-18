import type { DevSession } from './protocol/types.js';
import type { DiagnosticBundle, NopDebugEvent } from './types.js';
import type { NopDebuggerStore } from './store.js';
import type { ForestSnapshotCollector } from './snapshot-repository.js';
import { replaySession } from './replayer.js';
import { CaptureError } from './capture/screenshot.js';


export interface DiagnosticBundleDeps {
  sessionId: string;
  store: NopDebuggerStore;
  collector: ForestSnapshotCollector | null;
  buildSession(): DevSession;
  screenshotTagRefs(tag: string): Array<{ screenshotId?: string }>;
  redact(value: unknown): unknown;
}

export function collectDiagnosticBundle(deps: DiagnosticBundleDeps): DiagnosticBundle {
  const session = deps.buildSession();
  const events: NopDebugEvent[] = deps.store.getSnapshot().events;
  const keyframes: Array<{ tag: string; screenshotId?: string }> = [];
  const seenTags = new Set<string>();

  // 首末帧
  if (events.length > 0) {
    keyframes.push({ tag: 'first' });
    keyframes.push({ tag: 'last' });
  }
  // 断言失败 / Why verdict 关键帧（按 refs.tag 前缀挑选）
  for (const event of events) {
    const isAssertionFailure = event.kind === 'assertion' && event.level === 'error';
    const hasWhyTag = event.screenshotId !== undefined && event.summary.includes('why:');
    if (!isAssertionFailure && !hasWhyTag) continue;
    const tag = event.summary;
    if (seenTags.has(tag)) continue;
    seenTags.add(tag);
    keyframes.push({ tag, screenshotId: event.screenshotId });
  }

  const patchAudit = events
    .filter((event) => event.kind === 'compile:start' || event.kind === 'state:snapshot')
    .slice(0, 20)
    .map((event) => ({ at: event.timestamp, summary: deps.redact(event.summary) as string }));

  return {
    version: 1,
    sessionId: deps.sessionId,
    createdAt: Date.now(),
    session: deps.redact(session) as DevSession,
    keyframes,
    patchAudit,
    uploadPath: 'local',
  };
}

export interface ReplayRuntimeLike {
  dispatch(action: unknown, ctx?: unknown): Promise<unknown>;
  getStabilityTracker?(): { whenStable(timeoutMs?: number): Promise<{ stable: boolean }> } | undefined;
}

export interface ReplayBundleDeps {
  runtime: ReplayRuntimeLike;
  getScopes(): Record<string, Record<string, unknown>>;
  waitForStable?(): Promise<void>;
}

export async function replayDiagnosticBundle(bundle: DiagnosticBundle, deps: ReplayBundleDeps): Promise<{ steps: number; divergences: Array<{ step: number; path: string; expected: unknown; actual: unknown }> }> {
  if (bundle.version !== 1 || !bundle.session || !Array.isArray(bundle.session.inputs)) {
    throw new CaptureError('bundle-invalid', 'diagnostic bundle is malformed');
  }
  const result = await replaySession(bundle.session, {
    runtime: deps.runtime,
    scopeProvider: { getScopes: deps.getScopes },
    waitForStable: deps.waitForStable,
  });
  return { steps: result.steps, divergences: result.divergences };
}

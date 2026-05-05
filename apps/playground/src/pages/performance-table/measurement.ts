import type { BatchRunSummary, RenderMetrics } from './types.js';

export function recordProfilerCommit(
  current: RenderMetrics,
  actualDuration: number,
  committedAt: number,
): RenderMetrics {
  const commitCount = current.commitCount + 1;
  const totalActualDuration = current.totalActualDuration + actualDuration;

  return {
    commitCount,
    totalActualDuration,
    lastActualDuration: actualDuration,
    averageActualDuration: totalActualDuration / commitCount,
    maxActualDuration: Math.max(current.maxActualDuration, actualDuration),
    lastCommitAt: committedAt,
    commitRevision: current.commitRevision + 1,
  };
}

export function summarizeBatchRun(input: {
  label: string;
  steps: number;
  before: RenderMetrics;
  after: RenderMetrics;
  schedulingStartedAt: number;
  schedulingEndedAt: number;
  settledAt: number;
}): BatchRunSummary {
  const commitsDelta = Math.max(0, input.after.commitCount - input.before.commitCount);
  const totalCommitMs = Math.max(
    0,
    input.after.totalActualDuration - input.before.totalActualDuration,
  );

  return {
    label: input.label,
    steps: input.steps,
    schedulingDurationMs: Math.max(0, input.schedulingEndedAt - input.schedulingStartedAt),
    quiescenceWaitMs: Math.max(0, input.settledAt - input.schedulingEndedAt),
    totalDurationMs: Math.max(0, input.settledAt - input.schedulingStartedAt),
    commitsDelta,
    totalCommitMs,
    avgCommitMs: commitsDelta > 0 ? totalCommitMs / commitsDelta : 0,
    maxCommitMs: commitsDelta > 0 ? input.after.maxActualDuration : 0,
  };
}

export async function waitForMetricQuiescence(input: {
  getMetrics(): RenderMetrics;
  idleFrames?: number;
  timeoutMs?: number;
}): Promise<RenderMetrics> {
  const idleFrames = Math.max(1, input.idleFrames ?? 2);
  const timeoutMs = Math.max(1, input.timeoutMs ?? 2000);
  const startedAt = performance.now();
  let lastRevision = input.getMetrics().commitRevision;
  let stableFrames = 0;

  while (performance.now() - startedAt < timeoutMs) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const next = input.getMetrics();
    if (next.commitRevision === lastRevision) {
      stableFrames += 1;
      if (stableFrames >= idleFrames) {
        return next;
      }
      continue;
    }

    lastRevision = next.commitRevision;
    stableFrames = 0;
  }

  return input.getMetrics();
}

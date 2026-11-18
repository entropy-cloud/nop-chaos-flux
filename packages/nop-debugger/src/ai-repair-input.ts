import { CaptureError } from './capture/screenshot.js';
import type { WhyReport } from './why-report.js';
import type { Divergence } from './replayer.js';

export interface AiRepairInputEvidence {
  kind: 'why-verdict' | 'replay-divergence' | 'visual-diff';
  summary: string;
  target?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface AiRepairInput {
  kind: 'ai-repair-input';
  summary: string;
  evidence: AiRepairInputEvidence[];
  suggestedPatchArea?: string;
}

const ALLOWED_PATCH_AREA_PATTERN = /^[a-zA-Z0-9_.\- ]{0,120}$/;

function summarizeWhy(report: WhyReport): AiRepairInputEvidence {
  return {
    kind: 'why-verdict',
    summary: report.verdict,
    target: String(report.cid),
  };
}

function summarizeDivergence(divergence: Divergence): AiRepairInputEvidence {
  return {
    kind: 'replay-divergence',
    summary: `replay divergence at step ${divergence.step} path ${divergence.path}`,
    target: divergence.path,
    expected: divergence.expected,
    actual: divergence.actual,
  };
}

function summarizeVisualDiff(visualDiff: { diffRatio: number; regions?: Array<{ cid?: string; diffRatio: number }> } | undefined): AiRepairInputEvidence | null {
  if (!visualDiff) return null;
  const regions = visualDiff.regions?.map((region) => `${region.cid ?? '?'}=${region.diffRatio.toFixed(4)}`).join(',') ?? '';
  return {
    kind: 'visual-diff',
    summary: `visual diffRatio=${visualDiff.diffRatio.toFixed(4)}${regions ? ` regions=[${regions}]` : ''}`,
  };
}

/** Types live in nop-debugger by design — nop-debugger-ai consumes this payload (ai-boundary direction). */
export function buildAiRepairInput(input: {
  whyReport?: WhyReport;
  divergences?: Divergence[];
  visualDiff?: { diffRatio: number; regions?: Array<{ cid?: string; diffRatio: number }> };
  suggestedPatchArea?: string;
}): AiRepairInput {
  const evidence: AiRepairInputEvidence[] = [];
  if (input.whyReport) evidence.push(summarizeWhy(input.whyReport));
  for (const divergence of input.divergences ?? []) evidence.push(summarizeDivergence(divergence));
  const visual = summarizeVisualDiff(input.visualDiff);
  if (visual) evidence.push(visual);

  if (input.suggestedPatchArea !== undefined && !ALLOWED_PATCH_AREA_PATTERN.test(input.suggestedPatchArea)) {
    throw new CaptureError('ai-input-invalid', `suggestedPatchArea exceeds allowed characters: ${input.suggestedPatchArea.slice(0, 40)}`);
  }

  return {
    kind: 'ai-repair-input',
    summary: evidence.length > 0 ? `${evidence.length} evidence item(s)` : 'no evidence collected',
    evidence,
    ...(input.suggestedPatchArea !== undefined ? { suggestedPatchArea: input.suggestedPatchArea } : {}),
  };
}


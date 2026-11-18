import { describe, expect, it } from 'vitest';
import { reportToTerminal, reportToJson } from './reporter.js';
import type { RunSummary } from './runner.js';

function summaryWith(results: RunSummary['results']): RunSummary {
  const failed = results.filter((r) => r.status === 'failed' || r.status === 'timeout').length;
  return { results, passed: results.length - failed, failed, exitCode: failed > 0 ? 1 : 0 };
}

describe('reporter', () => {
  it('renders terminal lines with per-status marks', () => {
    const text = reportToTerminal(summaryWith([
      { spec: 'a.flux-spec.ts', status: 'passed', durationMs: 12 },
      { spec: 'b.flux-spec.ts', status: 'failed', durationMs: 30, error: { message: 'boom' } },
      { spec: 'c.flux-spec.ts', status: 'timeout', durationMs: 1000, error: { message: 'spec-timeout' } },
      { spec: 'd.flux-spec.ts', status: 'expected-failure', durationMs: 5 },
    ]));
    expect(text).toContain('✓ a.flux-spec.ts');
    expect(text).toContain('✗ b.flux-spec.ts');
    expect(text).toContain('boom');
    expect(text).toContain('✗ c.flux-spec.ts');
    expect(text).toContain('⊘ d.flux-spec.ts');
    expect(text).toContain('2 passed, 2 failed, 4 total');
  });

  it('renders JSON with engine marker and exit code', () => {
    const json = JSON.parse(reportToJson(summaryWith([
      { spec: 'x.flux-spec.ts', status: 'failed', durationMs: 3, error: { message: 'no' } },
    ]))) as { engine: string; exitCode: number; failed: number; results: Array<{ error?: string }> };
    expect(json.engine).toBe('flux-test');
    expect(json.exitCode).toBe(1);
    expect(json.failed).toBe(1);
    expect(json.results[0]?.error).toBe('no');
  });

  it('maps all-passed to exit code 0', () => {
    expect(summaryWith([{ spec: 'y', status: 'passed', durationMs: 1 }]).exitCode).toBe(0);
  });
});

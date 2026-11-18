import type { RunSummary, SpecResult } from './runner.js';

export function reportToTerminal(summary: RunSummary): string {
  const lines: string[] = [];
  for (const result of summary.results) {
    const mark = result.status === 'passed' ? '✓' : result.status === 'expected-failure' ? '⊘' : '✗';
    lines.push(`${mark} ${result.spec} (${result.status}, ${result.durationMs}ms)`);
    if (result.error && result.status !== 'expected-failure') {
      lines.push(`    ${result.error.message}`);
    }
  }
  lines.push('');
  lines.push(`${summary.passed} passed, ${summary.failed} failed, ${summary.results.length} total`);
  return lines.join('\n');
}

export function reportToJson(summary: RunSummary): string {
  return JSON.stringify(
    {
      engine: 'flux-test',
      total: summary.results.length,
      passed: summary.passed,
      failed: summary.failed,
      exitCode: summary.exitCode,
      results: summary.results.map((r: SpecResult) => ({
        spec: r.spec,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error?.message,
      })),
    },
    null,
    2,
  );
}

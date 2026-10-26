import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Plan 763 (roadmap PH-11): line-number usage rule. Key positions in baseline
// JSON and the QA.7 §C identifier column must be content-anchored; free-text
// buckets (ref/reason/notes) are exempt.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'check-baseline-line-keys.mjs');

function run(args: string[]): { code: number; stderr: string } {
  try {
    execFileSync('node', [scriptPath, ...args], { encoding: 'utf-8' });
    return { code: 0, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stderr?: string };
    return { code: err.status ?? 1, stderr: err.stderr ?? '' };
  }
}

function jsonFixture(content: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'line-keys-'));
  const file = path.join(dir, 'fixture.json');
  writeFileSync(file, JSON.stringify(content, null, 2));
  return file;
}

function mdFixture(sectionCRows: string[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'line-keys-'));
  const file = path.join(dir, 'qa7.md');
  writeFileSync(file, ['# Register', '', '## C. flake ledger', '', ...sectionCRows.map((row) => `| ${row} | note | scope |`), ''].join('\n'));
  return file;
}

describe('check-baseline-line-keys', () => {
  it('fails when a baseline JSON KEY carries a line number', () => {
    const file = jsonFixture({ 'rules/engine.spec.ts:123': 'adjudication' });
    expect(run(['--file', file, '--mode', 'json']).code).toBe(1);
  });

  it('exempts free-text buckets (reason/notes) and ref fields', () => {
    const file = jsonFixture({
      reason: 'fixed at engine.ts:42 per review',
      notes: ['rules.mjs:144-150 historical note'],
      ref: 'renderer-core.ts:204',
      clean: { statements: 80 },
    });
    expect(run(['--file', file, '--mode', 'json']).code).toBe(0);
  });

  it('fails on a QA.7 §C identifier with an extension-qualified line pointer', () => {
    const file = mdFixture(['gantt flake（gantt-bars-and-links.spec.ts:131 拖拽 resize）']);
    const result = run(['--file', file, '--mode', 'qa7']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('line-keyed');
  });

  it('fails on a QA.7 §C identifier without a file extension (layout-family:58 shape)', () => {
    const file = mdFixture(['layout-family:58']);
    expect(run(['--file', file, '--mode', 'qa7']).code).toBe(1);
  });

  it('passes content-anchored §C rows with historical parentheticals (clean fixture)', () => {
    const file = mdFixture(['gantt flake（内容锚：`gantt-bars-and-links.spec.ts` 的「拖拽 resize」用例，历史观测 :131）']);
    expect(run(['--file', file, '--mode', 'qa7']).code).toBe(0);
  });

  it('runs green against the live repository', () => {
    expect(run([]).code).toBe(0);
  });
});

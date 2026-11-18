import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Plan 775 (roadmap PH-10): @watch-only tags and the flake ledger must agree.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'check-e2e-flake-ledger.mjs');

function run(args: string[]): { code: number; stderr: string; stdout: string } {
  try {
    const stdout = execFileSync('node', [scriptPath, ...args], { encoding: 'utf-8' });
    return { code: 0, stderr: '', stdout };
  } catch (error) {
    const err = error as { status?: number; stderr?: string; stdout?: string };
    return { code: err.status ?? 1, stderr: err.stderr ?? '', stdout: err.stdout ?? '' };
  }
}

function fixture(specs: Record<string, string>, ledgerRows: string[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'flake-ledger-'));
  const specsDir = path.join(dir, 'e2e');
  mkdirSync(specsDir, { recursive: true });
  for (const [name, body] of Object.entries(specs)) writeFileSync(path.join(specsDir, name), body);
  const ledger = path.join(dir, 'ledger.md');
  writeFileSync(ledger, ['# Ledger', '', '## 登记', '', '| 项 | 状态 | 证据 |', '| --- | --- | --- |', ...ledgerRows, ''].join('\n'));
  return { specsDir, ledger };
}

const perfSpec = `test.describe('Perf', () => {\n  test('drag FPS on kanban targets 60fps avg @watch-only', async () => {});\n  test('plain test', async () => {});\n});\n`;

describe('check-e2e-flake-ledger', () => {
  it('fails when a @watch-only test is missing from the ledger', () => {
    const { specsDir, ledger } = fixture({ 'kanban-perf.spec.ts': perfSpec }, []);
    const result = run(['--specs-dir', specsDir, '--ledger', ledger]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('kanban-perf.spec.ts > drag FPS on kanban targets 60fps avg @watch-only');
  });

  it('passes when every @watch-only test is registered', () => {
    const { specsDir, ledger } = fixture({ 'kanban-perf.spec.ts': perfSpec }, [
      '| `kanban-perf.spec.ts > drag FPS on kanban targets 60fps avg @watch-only` | CLOSED-watch-only | 50Hz |',
    ]);
    expect(run(['--specs-dir', specsDir, '--ledger', ledger]).code).toBe(0);
  });

  it('fails when a CLOSED-fixed entry names a test that no longer exists (ghost entry)', () => {
    const { specsDir, ledger } = fixture({ 'kanban-perf.spec.ts': perfSpec }, [
      '| `kanban-perf.spec.ts > drag FPS on kanban targets 60fps avg @watch-only` | CLOSED-watch-only | 50Hz |',
      '| `layout-family.spec.ts > old assertion that was deleted` | CLOSED-fixed | plan 513 |',
    ]);
    const result = run(['--specs-dir', specsDir, '--ledger', ledger]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('no longer exists');
    expect(result.stderr).toContain('old assertion that was deleted');
  });

  it('allows OPEN/ATTRIBUTED entries whose tests exist and ignores non-entry table rows', () => {
    const { specsDir, ledger } = fixture({ 'kanban-perf.spec.ts': perfSpec }, [
      '| `kanban-perf.spec.ts > drag FPS on kanban targets 60fps avg @watch-only` | CLOSED-watch-only | 50Hz |',
      '| `kanban-perf.spec.ts > plain test` | ATTRIBUTED(not-reproduced) | 5/5 green |',
      '| family note without backtick anchor | - | - |',
    ]);
    expect(run(['--specs-dir', specsDir, '--ledger', ledger]).code).toBe(0);
  });

  it('fails when a CLOSED-fixed row has no content anchor (cannot be machine-checked)', () => {
    const { specsDir, ledger } = fixture({ 'kanban-perf.spec.ts': perfSpec }, [
      '| `kanban-perf.spec.ts > drag FPS on kanban targets 60fps avg @watch-only` | CLOSED-watch-only | 50Hz |',
      '| some old assertion without anchor | CLOSED-fixed | plan 513 |',
    ]);
    const result = run(['--specs-dir', specsDir, '--ledger', ledger]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('without a content anchor');
  });

  it('runs green against the live repository', () => {
    const result = run([]);
    expect(result.code).toBe(0);
    // E3 batch 1–3 迁移删除了 2 个带 @watch-only 的存量 spec（各含 1 个标记
    // 测试，其 ledger 行已随 spec 删除核对销项），存量 watch-only 计数降为 1。
    expect(result.stdout).toMatch(/\d+ @watch-only/);
    expect(result.stderr).not.toContain('FAILED');
  });
});

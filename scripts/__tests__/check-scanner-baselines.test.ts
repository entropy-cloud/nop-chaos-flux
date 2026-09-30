import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-scanner-baselines.mjs');

async function runGate(baselineScanners) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  const baselinePath = join(fixturesDir, 'temp-scanner-baselines.json');
  await writeFile(baselinePath, JSON.stringify({ scanners: baselineScanners }, null, 2), 'utf8');
  try {
    return await execFileAsync(process.execPath, [scriptPath, '--baseline', baselinePath], {
      cwd: rootDir,
      env: process.env,
    });
  } catch (error) {
    return error;
  } finally {
    await rm(baselinePath, { force: true });
  }
}

afterEach(async () => {
  await rm(join(rootDir, 'scripts', '__tests__', 'fixtures', 'temp-scanner-baselines.json'), { force: true });
});

describe('check-scanner-baselines', () => {
  it('passes when live counts equal the registered baselines (green path)', async () => {
    const result = await runGate({
      'find-styling-suspects': 221,
      'discover-audit-suspects': 716,
      'find-test-global-leaks': 108,
    });
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('within baseline');
  });

  it('fails when a scanner count grows beyond its baseline (red path)', async () => {
    const result = await runGate({
      'find-styling-suspects': 220,
      'discover-audit-suspects': 716,
      'find-test-global-leaks': 108,
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('find-styling-suspects');
    expect(result.stderr).toContain('exceeds registered baseline 220');
  });

  it('reports shrink opportunities without failing (exit 0)', async () => {
    const result = await runGate({
      'find-styling-suspects': 300,
      'discover-audit-suspects': 716,
      'find-test-global-leaks': 108,
    });
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('can be shrunk');
    expect(result.stdout).toContain('find-styling-suspects');
  });
});

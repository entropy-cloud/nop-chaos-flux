import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-duplicates.mjs');

async function runGate(stats) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  const inputPath = join(fixturesDir, 'temp-duplicates-stats.json');
  const baselinePath = join(fixturesDir, 'temp-duplicates-baseline.json');
  await writeFile(inputPath, JSON.stringify({ statistics: { total: stats } }), 'utf8');
  await writeFile(
    baselinePath,
    JSON.stringify({ clones: 100, percentage: '5.0', thresholdPct: 8 }, null, 2),
    'utf8',
  );
  try {
    return await execFileAsync(
      process.execPath,
      [scriptPath, '--input', inputPath, '--baseline', baselinePath],
      { cwd: rootDir, env: process.env },
    );
  } catch (error) {
    return error;
  } finally {
    await rm(inputPath, { force: true });
    await rm(baselinePath, { force: true });
  }
}

describe('check-duplicates baseline comparison', () => {
  it('passes when clones and ratio are within baseline (green path)', async () => {
    const result = await runGate({ clones: 90, percentage: '4.0', lines: 3000, duplicatedLines: 120 });
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('within baseline');
  });

  it('fails when the clone count grows beyond the baseline even if ratio stays flat', async () => {
    const result = await runGate({ clones: 131, percentage: '4.9', lines: 3000, duplicatedLines: 147 });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Clone count');
    expect(result.stderr).toContain('131');
  });

  it('fails when the duplicate ratio exceeds the hard threshold', async () => {
    const result = await runGate({ clones: 90, percentage: '9.5', lines: 3000, duplicatedLines: 285 });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('threshold');
  });
});

import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join, resolve } from 'node:path';
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

describe('check-duplicates output honesty (plan 835 G5)', () => {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  const baselinePath = join(fixturesDir, 'temp-duplicates-g5-baseline.json');
  const reportDir = join(rootDir, 'report');
  const shimDir = join(fixturesDir, 'temp-duplicates-npx-shim');

  async function stageBaseline(clones) {
    await mkdir(fixturesDir, { recursive: true });
    await writeFile(baselinePath, JSON.stringify({ clones, percentage: '5.0', thresholdPct: 8 }, null, 2), 'utf8');
  }

  async function run(args, env = process.env) {
    try {
      const result = await execFileAsync(process.execPath, [scriptPath, ...args], { cwd: rootDir, env });
      return { code: 0, stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      return { code: error.code ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
    }
  }

  it('points at the detail report when the real gate path (no --input) fails', async () => {
    // A stub `npx` writes a red jscpd report, so the gate runs its no-`--input`
    // branch without paying for a real scan. The pre-fix `if (!inputIndex)`
    // was false for inputIndex === -1, so this hint never printed here.
    await stageBaseline(100);
    await mkdir(shimDir, { recursive: true });
    const shimPath = join(shimDir, 'npx');
    const redReport = JSON.stringify({
      statistics: { total: { clones: 131, percentage: '4.9', lines: 3000, duplicatedLines: 147 } },
    });
    await writeFile(
      shimPath,
      `#!/bin/sh\nmkdir -p '${reportDir}'\nprintf '%s' '${redReport}' > '${join(reportDir, 'jscpd-report.json')}'\nexit 0\n`,
      'utf8',
    );
    await chmod(shimPath, 0o755);
    try {
      const result = await run(['--baseline', baselinePath], {
        ...process.env,
        PATH: `${shimDir}${delimiter}${process.env.PATH ?? ''}`,
      });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Clone count 131');
      expect(`${result.stdout}\n${result.stderr}`).toContain('pnpm check:duplicates:detail');
    } finally {
      await rm(shimDir, { recursive: true, force: true });
      await rm(reportDir, { recursive: true, force: true });
      await rm(baselinePath, { force: true });
    }
  });

  it('fails loudly when jscpd itself fails instead of gating on a stale report', async () => {
    // A green report left behind by an earlier run must not be reused: the
    // pre-fix gate swallowed the jscpd failure and read whatever was on disk.
    await stageBaseline(100);
    await mkdir(shimDir, { recursive: true });
    const shimPath = join(shimDir, 'npx');
    await writeFile(shimPath, "#!/bin/sh\necho 'jscpd exploded: simulated failure' >&2\nexit 3\n", 'utf8');
    await chmod(shimPath, 0o755);
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      join(reportDir, 'jscpd-report.json'),
      JSON.stringify({ statistics: { total: { clones: 1, percentage: '0.1', lines: 3000, duplicatedLines: 3 } } }),
      'utf8',
    );
    try {
      const result = await run(['--baseline', baselinePath], {
        ...process.env,
        PATH: `${shimDir}${delimiter}${process.env.PATH ?? ''}`,
      });
      expect(result.code).not.toBe(0);
      expect(result.stdout).not.toContain('within baseline');
      expect(result.stderr).toContain('jscpd failed');
      expect(result.stderr).toContain('jscpd exploded: simulated failure');
    } finally {
      await rm(shimDir, { recursive: true, force: true });
      await rm(reportDir, { recursive: true, force: true });
      await rm(baselinePath, { force: true });
    }
  });

  it('writes the baseline in --update-baseline mode', async () => {
    const inputPath = join(fixturesDir, 'temp-duplicates-g5-stats.json');
    await mkdir(fixturesDir, { recursive: true });
    await writeFile(
      inputPath,
      JSON.stringify({ statistics: { total: { clones: 42, percentage: '3.1', lines: 3000, duplicatedLines: 93 } } }),
      'utf8',
    );
    try {
      const result = await run(['--input', inputPath, '--baseline', baselinePath, '--update-baseline']);
      expect(result.code).toBe(0);
      const written = JSON.parse(await readFile(baselinePath, 'utf8'));
      expect(written.clones).toBe(42);
      expect(written.thresholdPct).toBe(8);
    } finally {
      await rm(inputPath, { force: true });
      await rm(baselinePath, { force: true });
    }
  });
});

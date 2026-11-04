import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-scanner-baselines.mjs');
const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
const tempBaselinePath = join(fixturesDir, 'temp-scanner-baselines.json');
const liveCapturePath = join(fixturesDir, 'temp-scanner-baselines-live.json');

interface GateResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function exec(args: string[]): Promise<GateResult> {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, ...args], { cwd: rootDir, env: process.env });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

async function runGate(baselineScanners: Record<string, number>): Promise<GateResult> {
  await mkdir(fixturesDir, { recursive: true });
  await writeFile(tempBaselinePath, JSON.stringify({ scanners: baselineScanners }, null, 2), 'utf8');
  try {
    return await exec(['--baseline', tempBaselinePath]);
  } finally {
    await rm(tempBaselinePath, { force: true });
  }
}

async function runScannerCount(scanner: string): Promise<number> {
  const scannerPath = join(rootDir, 'scripts', 'audit', `${scanner}.mjs`);
  let stdout = '';
  try {
    stdout = (await execFileAsync(process.execPath, [scannerPath], { cwd: rootDir, maxBuffer: 64 * 1024 * 1024 })).stdout;
  } catch (error) {
    stdout = (error as { stdout?: string }).stdout ?? '';
  }
  const found = stdout.match(/Found (\d+) /);
  if (found) return Number(found[1]);
  if (/No suspect matches found\./.test(stdout)) return 0;
  throw new Error(`cannot derive live count for ${scanner}`);
}

// Live counts are captured once per run so the cases below cannot drift red when
// the repository's suspect counts legitimately move (the pre-754 hardcoded
// 221/716/108 literals went red exactly that way).
let live: Record<string, number>;

beforeAll(async () => {
  await mkdir(fixturesDir, { recursive: true });
  const captured = await exec(['--update-baselines', '--baseline', liveCapturePath]);
  expect(captured.code).toBe(0);
  live = JSON.parse(await readFile(liveCapturePath, 'utf8')).scanners;
  await rm(liveCapturePath, { force: true });
}, 120_000);

afterEach(async () => {
  await rm(tempBaselinePath, { force: true });
  await rm(liveCapturePath, { force: true });
});

function pickLegacyTrio() {
  return {
    'find-styling-suspects': live['find-styling-suspects'],
    'discover-audit-suspects': live['discover-audit-suspects'],
    'find-test-global-leaks': live['find-test-global-leaks'],
  };
}

describe('check-scanner-baselines', () => {
  it('fails on a corrupt (null) baseline instead of letting a zero-count scanner pass silently', async () => {
    const result = await runGate({ 'find-todo-exitless': null as unknown as number });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('baseline corrupt');
  });

  it('with --require-all, fails when a gated scanner has no registered baseline', async () => {
    await mkdir(fixturesDir, { recursive: true });
    await writeFile(tempBaselinePath, JSON.stringify({ scanners: pickLegacyTrio() }, null, 2), 'utf8');
    try {
      const result = await exec(['--baseline', tempBaselinePath, '--require-all']);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('baseline missing');
    } finally {
      await rm(tempBaselinePath, { force: true });
    }
  });

  it('passes when live counts equal the registered baselines (green path)', async () => {
    const result = await runGate(pickLegacyTrio());
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('within baseline');
  });

  it('fails when a scanner count grows beyond its baseline (red path)', async () => {
    const trio = pickLegacyTrio();
    const tightened = trio['find-styling-suspects'] - 1;
    const result = await runGate({ ...trio, 'find-styling-suspects': tightened });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('find-styling-suspects');
    expect(result.stderr).toContain(`exceeds registered baseline ${tightened}`);
  });

  it('reports shrink opportunities without failing (exit 0)', async () => {
    const trio = pickLegacyTrio();
    const result = await runGate({ ...trio, 'find-styling-suspects': trio['find-styling-suspects'] + 1 });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('can be shrunk');
    expect(result.stdout).toContain('find-styling-suspects');
  });

  it('parses the "Found N suspect references" output shape (plan 754 ratchet extension)', async () => {
    const count = await runScannerCount('find-non-retained-renderer-references');
    const result = await runGate({ 'find-non-retained-renderer-references': count });
    expect(result.stderr).not.toContain('unparseable');
    expect(result.code).toBe(0);
  });

  it('parses the "No suspect matches found." output shape as zero (plan 754 ratchet extension)', async () => {
    const result = await runGate({ 'find-canvas-wrapper-a11y-gaps': 0 });
    expect(result.stderr).not.toContain('unparseable');
    expect(result.code).toBe(0);
  });

  it('fails when a newly ratcheted scanner is registered below its live count (reverse proof)', async () => {
    const count = await runScannerCount('find-fieldframe-bypasses');
    const result = await runGate({ 'find-fieldframe-bypasses': count - 1 });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('find-fieldframe-bypasses');
    expect(result.stderr).toContain(`exceeds registered baseline ${count - 1}`);
  });

  it('includes all fourteen ratcheted scanners in --update-baselines output (plan 754)', async () => {
    const captured = await exec(['--update-baselines', '--baseline', liveCapturePath]);
    expect(captured.code).toBe(0);
    const scanners = JSON.parse(await readFile(liveCapturePath, 'utf8')).scanners as Record<string, number>;
    for (const scanner of [
      'find-canvas-wrapper-a11y-gaps',
      'find-hardcoded-type-dispatch',
      'find-missing-renderer-markers',
      'find-fieldframe-bypasses',
      'find-reactive-render-reads',
      'find-performance-suspects',
      'find-non-retained-renderer-references',
    ]) {
      expect(typeof scanners[scanner], scanner).toBe('number');
    }
    expect(Object.keys(scanners)).toHaveLength(14);
  });

  it('--update-baselines preserves the existing _header notes (plan 754)', async () => {
    const notes = ['keep-me-754'];
    await writeFile(
      liveCapturePath,
      JSON.stringify({ _header: { description: 'x', reRegistrationNotes: notes }, scanners: {} }, null, 2),
      'utf8',
    );
    const captured = await exec(['--update-baselines', '--baseline', liveCapturePath]);
    expect(captured.code).toBe(0);
    const header = JSON.parse(await readFile(liveCapturePath, 'utf8'))._header;
    expect(header.reRegistrationNotes).toEqual(notes);
  });
});

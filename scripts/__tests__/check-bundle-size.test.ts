import { afterEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Plan 761 (roadmap PH-8): tarball size budget over the @nop-chaos/flux pack
// artifact. Synthetic tarballs let the gate be exercised without a real build.

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-bundle-size.mjs');

const tempDirs: string[] = [];

async function makeTarball(mainBytes: number, chunkBytes: number) {
  const dir = await mkdtemp(join(tmpdir(), 'bundle-size-'));
  tempDirs.push(dir);
  await mkdir(join(dir, 'package', 'dist'), { recursive: true });
  await writeFile(join(dir, 'package', 'dist', 'index.js'), 'x'.repeat(mainBytes), 'utf8');
  await writeFile(join(dir, 'package', 'dist', 'chunk-abc.js'), 'y'.repeat(chunkBytes), 'utf8');
  await writeFile(join(dir, 'package', 'dist', 'index.js.map'), 'm'.repeat(1000), 'utf8');
  await writeFile(join(dir, 'package', 'package.json'), '{"name":"fixture"}', 'utf8');
  const tarball = join(dir, 'fixture.tgz');
  execFileSync('tar', ['-czf', tarball, '-C', dir, 'package']);
  return { dir, tarball };
}

async function writeBaseline(dir: string, scanners: Record<string, number>) {
  const baseline = join(dir, 'baseline.json');
  await writeFile(baseline, JSON.stringify({ _header: { tolerance: 0.05 }, metrics: scanners }, null, 2), 'utf8');
  return baseline;
}

async function runGate(args: string[]) {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, ...args], { cwd: rootDir });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('check-bundle-size', () => {
  it('passes when every metric equals its baseline (green path)', async () => {
    const { dir, tarball } = await makeTarball(5000, 2000);
    const baseline = await writeBaseline(dir, { jsBytes: 7000, mainEntryBytes: 5000 });
    const result = await runGate(['--tarball', tarball, '--baseline', baseline]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('within budget');
  });

  it('fails when jsBytes grows more than the tolerance (red path)', async () => {
    const { dir, tarball } = await makeTarball(5000, 2500);
    const baseline = await writeBaseline(dir, { jsBytes: 7000, mainEntryBytes: 5000 });
    const result = await runGate(['--tarball', tarball, '--baseline', baseline]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('jsBytes');
    expect(result.stderr).toContain('7500');
  });

  it('passes and reports a shrink opportunity when a metric is well below baseline', async () => {
    const { dir, tarball } = await makeTarball(4000, 2000);
    const baseline = await writeBaseline(dir, { jsBytes: 7000, mainEntryBytes: 5000 });
    const result = await runGate(['--tarball', tarball, '--baseline', baseline]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('can be tightened');
    expect(result.stdout).toContain('mainEntryBytes');
  });

  it('fails when the baseline file is missing', async () => {
    const { dir, tarball } = await makeTarball(5000, 2000);
    const result = await runGate(['--tarball', tarball, '--baseline', join(dir, 'nope.json')]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('baseline');
  });

  const liveTarballPresent =
    existsSync(join(rootDir, 'dist-packages')) && readdirSync(join(rootDir, 'dist-packages')).some((name) => name.endsWith('.tgz'));

  // Without a packed tarball the CLI would trigger a full pack build; the unit
  // test only asserts the live comparison when check:flux-bundle-pack already ran.
  it.skipIf(!liveTarballPresent)('runs green against the live repository tarball and baseline', async () => {
    const result = await runGate([]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('jsBytes');
  });
});

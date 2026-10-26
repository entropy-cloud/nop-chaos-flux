import { afterAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-deps-baseline.mjs');
const committedBaseline = resolve(rootDir, 'scripts', 'baselines', 'deps-baseline.json');

// Slow gate (a full dependency-cruise per invocation) — keep the case count
// minimal: green path against the committed baseline + one red path against a
// shrunken fixture baseline (removing a registered signature makes that live
// cycle "new", which must fail the gate naming it).
describe('check-deps-baseline', () => {
  let workDir: string | undefined;
  afterAll(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('passes with the committed baseline (green path against the live tree)', async () => {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], { cwd: rootDir });
    expect(stdout).toContain('no new circular dependencies');
  }, 240_000);

  it('fails naming the cycle when a live signature is missing from the baseline (red path)', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'deps-baseline-fixture-'));
    const committed = JSON.parse(await readFile(committedBaseline, 'utf8'));
    expect(committed.signatures.length).toBeGreaterThan(0);
    const removed = committed.signatures[0];
    const shrunkPath = join(workDir, 'shrunk-deps-baseline.json');
    await writeFile(
      shrunkPath,
      JSON.stringify({ ...committed, signatures: committed.signatures.slice(1) }, null, 2),
    );
    await expect(
      execFileAsync(process.execPath, [scriptPath, '--baseline', shrunkPath], { cwd: rootDir }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('NEW circular-dependency signatures'),
      stderr: expect.stringContaining(removed.split(' -> ')[0]),
    });
  }, 240_000);
});

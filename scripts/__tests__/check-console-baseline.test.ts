import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-console-baseline.mjs');
const tempBaselinePath = join(rootDir, 'scripts', '__tests__', 'fixtures', 'temp-console-baseline.json');

async function runGate(baselineJson) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  const baselinePath = tempBaselinePath;
  if (baselineJson === undefined) {
    // No override: the script falls back to the committed baseline file.
    try {
      return await execFileAsync(process.execPath, [scriptPath], { cwd: rootDir, env: process.env });
    } catch (error) {
      return error;
    }
  }
  await writeFile(baselinePath, JSON.stringify(baselineJson, null, 2), 'utf8');
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

// plan 864 G3: `--update-baselines` merges into the target baseline (the
// `--baseline` path in test mode) keyed by file+text, preserving existing
// `reason` fields. Tests run against a temp copy, never the committed file.
async function runUpdate(baselineJson) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  await writeFile(tempBaselinePath, JSON.stringify(baselineJson, null, 2), 'utf8');
  try {
    return await execFileAsync(
      process.execPath,
      [scriptPath, '--update-baselines', '--baseline', tempBaselinePath],
      { cwd: rootDir, env: process.env },
    );
  } catch (error) {
    return error;
  }
}

async function readTempBaseline() {
  return JSON.parse(await readFile(tempBaselinePath, 'utf8'));
}

afterEach(async () => {
  await rm(tempBaselinePath, { force: true });
});

describe('check-console-baseline', () => {
  it('passes with the committed baseline (green path against the live tree)', async () => {
    const result = await runGate(undefined);
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('no new hits');
  });

  it('fails when the baseline is empty but the live tree has registered hits (red path)', async () => {
    const result = await runGate({ entries: [] });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('NEW console.log/debug hits');
    // The live tree's unregistered hits change over time (undo-stack.ts at
    // writing, editor-canvas.tsx:160 later) — assert the listing shape
    // (file:line per hit) instead of pinning a specific file.
    expect(result.stderr).toMatch(/\s+packages\/[\w/-]+\.[cm]?[jt]sx?:\d+\s+console\./);
  });

  it('matches baseline entries by file+text so line drift does not produce false reds', async () => {
    const committed = JSON.parse(
      await (await import('node:fs/promises')).readFile(
        join(rootDir, 'scripts', 'baselines', 'console-log-baseline.json'),
        'utf8',
      ),
    );
    const shifted = {
      entries: committed.entries.map((entry) => ({ ...entry, line: entry.line + 500 })),
    };
    const result = await runGate(shifted);
    expect(result.code ?? 0).toBe(0);
  });

  describe('--update-baselines merge (plan 864 G3)', () => {
    it('preserves the existing reason of a registered hit when regenerating the baseline', async () => {
      const committed = JSON.parse(
        await (await import('node:fs/promises')).readFile(
          join(rootDir, 'scripts', 'baselines', 'console-log-baseline.json'),
          'utf8',
        ),
      );
      const first = committed.entries[0];
      const seeded = {
        entries: committed.entries.map((entry) => ({
          ...entry,
          reason: entry.file === first.file ? 'seeded reason survives regeneration' : 'seeded reason',
        })),
      };
      const result = await runUpdate(seeded);
      expect(result.code ?? 0).toBe(0);
      const merged = await readTempBaseline();
      const surviving = merged.entries.filter((entry) => entry.file === first.file);
      expect(surviving.length).toBeGreaterThan(0);
      expect(surviving.every((entry) => entry.reason === 'seeded reason survives regeneration')).toBe(true);
      // Every live hit is annotated; no bare entries slip in.
      expect(merged.entries.every((entry) => typeof entry.reason === 'string' && entry.reason.length > 0)).toBe(true);
    });

    it('errors instead of writing when a live hit has no registered reason (new entries must be adjudicated)', async () => {
      const result = await runUpdate({ entries: [] });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('no registered baseline entry');
      // The temp file must stay untouched (no silent rewrite without reasons).
      const untouched = JSON.parse(await readFile(tempBaselinePath, 'utf8'));
      expect(untouched.entries).toEqual([]);
    });
  });
});

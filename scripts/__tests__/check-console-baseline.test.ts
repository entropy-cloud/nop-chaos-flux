import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-console-baseline.mjs');

async function runGate(baselineJson) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  const baselinePath = join(fixturesDir, 'temp-console-baseline.json');
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

afterEach(async () => {
  await rm(join(rootDir, 'scripts', '__tests__', 'fixtures', 'temp-console-baseline.json'), { force: true });
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
    expect(result.stderr).toContain('undo-stack.ts');
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
});

import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-jsdom-pragma-whitelist.mjs');

async function runGate(whitelist) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  const baselinePath = join(fixturesDir, 'temp-jsdom-whitelist.json');
  await writeFile(baselinePath, JSON.stringify({ entries: whitelist ?? [] }, null, 2), 'utf8');
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
  await rm(join(rootDir, 'scripts', '__tests__', 'fixtures', 'temp-jsdom-whitelist.json'), { force: true });
});

describe('check-jsdom-pragma-whitelist', () => {
  it('passes with the committed whitelist (green path against the live tree)', async () => {
    const committed = JSON.parse(
      await (await import('node:fs/promises')).readFile(
        join(rootDir, 'scripts', 'baselines', 'jsdom-pragma-whitelist.json'),
        'utf8',
      ),
    );
    const result = await runGate(committed.entries);
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('no new entries');
  });

  it('fails when a jsdom pragma is not whitelisted (red path via live content entries)', async () => {
    const result = await runGate(['packages/flux-renderers-content/src/sanitize.test.ts:4']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('NEW jsdom pragmas');
    expect(result.stderr).toContain('markdown-src.test.tsx');
  });

  it('reports resolved whitelist entries as shrink hints without failing', async () => {
    const committed = JSON.parse(
      await (await import('node:fs/promises')).readFile(
        join(rootDir, 'scripts', 'baselines', 'jsdom-pragma-whitelist.json'),
        'utf8',
      ),
    );
    const result = await runGate([
      ...committed.entries,
      'packages/flux-renderers-content/src/gone-file.test.tsx:1',
    ]);
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('can be shrunk');
    expect(result.stdout).toContain('gone-file.test.tsx');
  });
});

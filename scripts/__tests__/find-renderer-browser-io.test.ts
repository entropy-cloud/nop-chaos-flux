import { describe, expect, it, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-renderer-browser-io.mjs');
const fixtureDir = resolve(here, 'fixtures', 'inv1-browser-io');

const stagedDirs = [];

async function stageFixture(packageDir, fileName) {
  const tempDir = join(rootDir, 'packages', packageDir, '__inv1_scan_fixture__');
  await mkdir(tempDir, { recursive: true });
  stagedDirs.push(tempDir);
  const content = await readFile(join(fixtureDir, fileName), 'utf8');
  await writeFile(join(tempDir, fileName), content, 'utf8');
}

function runGate() {
  return execFileAsync(process.execPath, [scriptPath], { cwd: rootDir, env: process.env });
}

afterEach(async () => {
  for (const dir of stagedDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  stagedDirs.length = 0;
});

describe('find-renderer-browser-io', () => {
  it('hits direct fetch in a renderer package outside the flux-renderers-* scope', async () => {
    await stageFixture('flow-designer-renderers', 'flow-designer-renderers-fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('renderer-direct-fetch'),
      stdout: expect.stringContaining('flow-designer-renderers-fixture.ts:2'),
    });
  });

  it('ignores browser IO in packages outside the renderer scope', async () => {
    await stageFixture('flow-designer-core', 'nop-debugger-fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No direct browser IO in renderer packages.');
  });

  it('hits dynamic import() of a remote URL in renderer packages', async () => {
    await stageFixture('flow-designer-renderers', 'remote-dynamic-import-fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('renderer-remote-dynamic-import'),
      stdout: expect.stringContaining('remote-dynamic-import-fixture.ts:2'),
    });
  });

  it('ignores type imports, local lazy imports, and import() in strings and comments', async () => {
    await stageFixture('flow-designer-renderers', 'import-negatives-fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No direct browser IO in renderer packages.');
  });
});

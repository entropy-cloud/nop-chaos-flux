import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-renderer-browser-io.mjs');
const fixtureDir = resolve(here, 'fixtures', 'inv1-browser-io');

// Fixtures live in a throwaway temp tree (os.tmpdir) mirrored as
// `packages/<pkg>/<file>`, NOT in real package dirs — a killed test process
// can never leave violating fixtures behind in the repo. The temp root and
// directory names avoid `ignoreDirectoryNames` (shared.mjs), and the gate is
// exec'd with `FLUX_AUDIT_SCAN_ROOT=<temp root>` so it scans the temp tree.
let scanRoot;
let stagedDirs;

beforeEach(async () => {
  scanRoot = await mkdtemp(join(tmpdir(), 'flux-inv1-scan-fixtures-'));
  stagedDirs = [];
});

async function stageFixture(packageDir, fileName) {
  const targetDir = join(scanRoot, 'packages', packageDir);
  await mkdir(targetDir, { recursive: true });
  stagedDirs.push(targetDir);
  const content = await readFile(join(fixtureDir, fileName), 'utf8');
  await writeFile(join(targetDir, fileName), content, 'utf8');
}

function runGate() {
  return execFileAsync(process.execPath, [scriptPath], {
    cwd: rootDir,
    env: { ...process.env, FLUX_AUDIT_SCAN_ROOT: scanRoot },
  });
}

afterEach(async () => {
  for (const dir of stagedDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  stagedDirs.length = 0;
  await rm(scanRoot, { recursive: true, force: true });
});

describe('find-renderer-browser-io', () => {
  it('hits direct fetch in a renderer package outside the flux-renderers-* scope', async () => {
    await stageFixture('flow-designer-renderers', 'flow-designer-renderers-fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('renderer-direct-fetch'),
      stdout: expect.stringContaining('flow-designer-renderers-fixture.ts:2'),
    });
  });

  it('hits direct fetch in a flux-renderers-* package (prefix-scope coverage)', async () => {
    await stageFixture('flux-renderers-data', 'flux-renderers-data-fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('renderer-direct-fetch'),
      stdout: expect.stringContaining('flux-renderers-data-fixture.ts:2'),
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

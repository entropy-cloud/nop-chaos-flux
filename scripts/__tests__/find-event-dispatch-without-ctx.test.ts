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
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-event-dispatch-without-ctx.mjs');
const fixtureDir = resolve(here, 'fixtures', 'event-dispatch-ctx');

// 0150-1 stagedDirs governance (DG, 2026-08-09): fixtures live in a throwaway
// temp tree (os.tmpdir) mirrored as `packages/<pkg>/<file>`, NOT in real
// package dirs — a killed test process can never leave violating fixtures
// behind in the repo. The temp root avoids `ignoreDirectoryNames`
// (shared.mjs), and the gate is exec'd with `FLUX_AUDIT_SCAN_ROOT=<temp root>`
// so it scans the temp tree with renderer-package-relative paths intact.
// Aligned with the find-renderer-browser-io.test.ts precedent.
let scanRoot;
let stagedDirs;

beforeEach(async () => {
  scanRoot = await mkdtemp(join(tmpdir(), 'flux-event-ctx-scan-fixtures-'));
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

describe('find-event-dispatch-without-ctx', () => {
  it('flags an aliased-receiver dispatch (`owner.events.X`) without the event ctx', async () => {
    await stageFixture('flux-renderers-data', 'alias-receiver-missing-ctx.fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('alias-receiver-missing-ctx.fixture.ts'),
      stdout: expect.stringContaining('owner.events.onItemClick'),
    });
  });

  it('accepts an aliased-receiver dispatch with the full { event, evaluationBindings, scope } ctx', async () => {
    await stageFixture('flux-renderers-data', 'alias-receiver-compliant.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No schema event dispatch without full ctx');
  });

  it('accepts a native-event forward through an aliased receiver (class-level adjudication)', async () => {
    await stageFixture('flux-renderers-data', 'alias-receiver-native-forward.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No schema event dispatch without full ctx');
  });

  it('flags a missing-ctx dispatch in a host renderer package (flow-designer-renderers)', async () => {
    await stageFixture('flow-designer-renderers', 'host-renderer-missing-ctx.fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('host-renderer-missing-ctx.fixture.ts'),
      stdout: expect.stringContaining('owner.events.onNodeClick'),
    });
  });

  it('accepts a full-ctx dispatch in a host renderer package (report-designer-renderers)', async () => {
    await stageFixture('report-designer-renderers', 'host-renderer-compliant.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No schema event dispatch without full ctx');
  });

  it('ignores a missing-ctx dispatch in a non-renderer package (flow-designer-core)', async () => {
    await stageFixture('flow-designer-core', 'host-core-fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No schema event dispatch without full ctx');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-event-dispatch-without-ctx.mjs');
const fixtureDir = resolve(here, 'fixtures', 'event-dispatch-ctx');

const stagedDirs = [];

async function stageFixture(packageDir, fileName) {
  const tempDir = join(rootDir, 'packages', packageDir, '__event_dispatch_ctx_fixture__');
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

describe('find-event-dispatch-without-ctx', () => {
  it('flags an aliased-receiver dispatch (`owner.events.X`) without the event ctx', async () => {
    await stageFixture('flux-renderers-data', 'alias-receiver-missing-ctx.fixture.ts');
    await expect(runGate()).rejects.toMatchObject({
      stdout: expect.stringContaining('__event_dispatch_ctx_fixture__/alias-receiver-missing-ctx.fixture.ts'),
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
});

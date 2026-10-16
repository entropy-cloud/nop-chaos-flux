import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-runtime-raw-schema-reads.mjs');
const fixtureDir = resolve(here, 'fixtures', 'runtime-raw-schema-reads');

const stagedDirs = [];

async function stageFixture(packageDir, fileName, inSrc = false) {
  const tempDir = inSrc
    ? join(rootDir, 'packages', packageDir, 'src', '__raw_schema_fixture__')
    : join(rootDir, 'packages', packageDir, '__raw_schema_fixture__');
  await mkdir(tempDir, { recursive: true });
  stagedDirs.push(tempDir);
  const content = await readFile(join(fixtureDir, fileName), 'utf8');
  await writeFile(join(tempDir, fileName), content, 'utf8');
}

async function runGate(): Promise<{ stdout: string; exitCode: number }> {
  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: rootDir,
      env: process.env,
    });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const failed = error as { stdout?: string; code?: number };
    return { stdout: failed.stdout ?? '', exitCode: failed.code ?? 1 };
  }
}

afterEach(async () => {
  for (const dir of stagedDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  stagedDirs.length = 0;
});

describe('find-runtime-raw-schema-reads', () => {
  it('ignores props.schema / templateNode.schema mentions inside block comments and line comments', async () => {
    await stageFixture('flux-renderers-data', 'block-comment-negative.fixture.ts');
    const { stdout, exitCode } = await runGate();
    expect(stdout).not.toContain('block-comment-negative.fixture.ts');
    expect(exitCode).toBe(0);
  });

  it('hits real runtime reads written as `as TemplateNode).schema` / `as BaseSchema).schema` casts (exit 1)', async () => {
    await stageFixture('flux-renderers-data', 'as-cast-positive.fixture.ts');
    const { stdout, exitCode } = await runGate();
    expect(stdout).toContain('as-cast-positive.fixture.ts');
    expect(stdout).toContain('(n as TemplateNode).schema');
    expect(stdout).toContain('(schemas[0] as BaseSchema).schema');
    // RM-8 (plan 610): an unregistered raw read now fails the gate.
    expect(exitCode).toBe(1);
  });

  it('flags unregistered raw reads inside framework packages (flux-react)', async () => {
    await stageFixture('flux-react', 'framework-unmarked.fixture.ts', true);
    const { stdout, exitCode } = await runGate();
    expect(stdout).toContain('framework-unmarked.fixture.ts');
    expect(exitCode).toBe(1);
  });

  it('exempts framework reads carrying the retained-channel marker', async () => {
    await stageFixture('flux-react', 'framework-retained.fixture.ts', true);
    const { stdout, exitCode } = await runGate();
    expect(stdout).not.toContain('framework-retained.fixture.ts');
    expect(exitCode).toBe(0);
  });
});

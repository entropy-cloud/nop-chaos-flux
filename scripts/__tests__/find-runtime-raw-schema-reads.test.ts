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

async function stageFixture(packageDir, fileName) {
  const tempDir = join(rootDir, 'packages', packageDir, '__raw_schema_fixture__');
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

describe('find-runtime-raw-schema-reads', () => {
  it('ignores props.schema / templateNode.schema mentions inside block comments and line comments', async () => {
    await stageFixture('flux-renderers-data', 'block-comment-negative.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).not.toContain('block-comment-negative.fixture.ts');
  });

  it('hits real runtime reads written as `as TemplateNode).schema` / `as BaseSchema).schema` casts', async () => {
    await stageFixture('flux-renderers-data', 'as-cast-positive.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('as-cast-positive.fixture.ts');
    expect(stdout).toContain('(n as TemplateNode).schema');
    expect(stdout).toContain('(schemas[0] as BaseSchema).schema');
  });
});

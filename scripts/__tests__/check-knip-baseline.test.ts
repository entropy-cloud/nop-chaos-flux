import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-knip-baseline.mjs');

function knipJson(entries) {
  return JSON.stringify({
    issues: entries.map(({ file, files = [], exports = [], types = [], dependencies = [], devDependencies = [] }) => ({
      file,
      files,
      exports,
      types,
      dependencies,
      devDependencies,
    })),
  });
}

async function runGate(currentKnipJson, baselineJson) {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await mkdir(fixturesDir, { recursive: true });
  const inputPath = join(fixturesDir, 'temp-knip-input.json');
  const baselinePath = join(fixturesDir, 'temp-knip-baseline.json');
  await writeFile(inputPath, currentKnipJson, 'utf8');
  await writeFile(baselinePath, JSON.stringify({ files: [], exports: [], types: [], dependencies: [], devDependencies: [], ...baselineJson }, null, 2), 'utf8');
  try {
    return await execFileAsync(
      process.execPath,
      [scriptPath, '--input', inputPath, '--baseline', baselinePath],
      { cwd: rootDir, env: process.env },
    );
  } catch (error) {
    return error;
  }
}

function baselineFromIssues(issues) {
  const baseline = { files: [], exports: [], types: [], dependencies: [], devDependencies: [] };
  for (const issue of issues) {
    for (const entry of issue.files ?? []) baseline.files.push(entry.name);
    for (const entry of issue.exports ?? []) baseline.exports.push(`${issue.file}#${entry.name}`);
    for (const entry of issue.types ?? []) baseline.types.push(`${issue.file}#${entry.name}`);
    for (const entry of issue.dependencies ?? []) baseline.dependencies.push(`${issue.file}#${entry.name}`);
    for (const entry of issue.devDependencies ?? []) baseline.devDependencies.push(`${issue.file}#${entry.name}`);
  }
  return baseline;
}

afterEach(async () => {
  const fixturesDir = join(rootDir, 'scripts', '__tests__', 'fixtures');
  await rm(join(fixturesDir, 'temp-knip-input.json'), { force: true });
  await rm(join(fixturesDir, 'temp-knip-baseline.json'), { force: true });
});

const baselineIssues = [
  {
    file: 'packages/pkg-a/src/dead.ts',
    files: [{ name: 'packages/pkg-a/src/dead.ts' }],
    exports: [{ name: 'deadExport' }],
    types: [{ name: 'DeadType' }],
  },
  {
    file: 'packages/pkg-b/package.json',
    dependencies: [{ name: '@nop-chaos/flux-react' }],
    devDependencies: [{ name: 'leftover-dev-tool' }],
  },
];

describe('check-knip-baseline', () => {
  it('passes when current knip issues are all registered in the baseline (green path)', async () => {
    const result = await runGate(knipJson(baselineIssues), baselineFromIssues(baselineIssues));
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('no new hits');
  });

  it('fails when a new unused file appears that the baseline does not register (red path)', async () => {
    const result = await runGate(
      knipJson([
        ...baselineIssues,
        { file: 'packages/pkg-a/src/temp-new-dead-file.ts', files: [{ name: 'packages/pkg-a/src/temp-new-dead-file.ts' }] },
      ]),
      baselineFromIssues(baselineIssues),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('temp-new-dead-file.ts');
    expect(result.stderr).toContain('unused files');
  });

  it('fails per category: new unused export, type, dependency and devDependency are each reported', async () => {
    const extraIssues = [
      {
        file: 'packages/pkg-a/src/dead.ts',
        exports: [{ name: 'anotherNewExport' }],
        types: [{ name: 'AnotherNewType' }],
      },
      {
        file: 'packages/pkg-b/package.json',
        dependencies: [{ name: 'some-new-dep' }],
        devDependencies: [{ name: 'some-new-dev-dep' }],
      },
    ];
    const result = await runGate(
      knipJson([...baselineIssues, ...extraIssues]),
      baselineFromIssues(baselineIssues),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('anotherNewExport');
    expect(result.stderr).toContain('AnotherNewType');
    expect(result.stderr).toContain('some-new-dep');
    expect(result.stderr).toContain('some-new-dev-dep');
  });

  it('reports resolved entries as shrink hints without failing (exit 0)', async () => {
    const result = await runGate(
      knipJson([
        { file: 'packages/pkg-a/src/dead.ts', files: [{ name: 'packages/pkg-a/src/dead.ts' }] },
        { file: 'packages/pkg-b/package.json', dependencies: [{ name: '@nop-chaos/flux-react' }] },
      ]),
      baselineFromIssues(baselineIssues),
    );
    expect(result.code ?? 0).toBe(0);
    expect(result.stdout).toContain('can be shrunk');
    expect(result.stdout).toContain('--update-baselines');
    expect(result.stdout).toContain('deadExport');
  });
});

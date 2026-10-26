import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-wiring-coverage.mjs');

const tempDirs: string[] = [];

interface FixtureOptions {
  scripts: Record<string, string>;
  allowlist?: Record<string, unknown>;
  files?: Record<string, string>;
}

async function stageFixture({ scripts, allowlist, files = {} }: FixtureOptions) {
  const dir = await mkdtemp(join(tmpdir(), 'wiring-coverage-'));
  tempDirs.push(dir);
  await mkdir(join(dir, 'scripts', 'baselines'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', scripts }, null, 2), 'utf8');
  await writeFile(
    join(dir, 'scripts', 'baselines', 'check-wiring-allowlist.json'),
    JSON.stringify({ entries: allowlist ?? {} }, null, 2),
    'utf8',
  );
  for (const [relPath, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, relPath)), { recursive: true });
    await writeFile(join(dir, relPath), content, 'utf8');
  }
  return dir;
}

async function runGate(root: string) {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, '--root', root], { cwd: rootDir });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const baseScripts = {
  check: 'pnpm check:alpha && pnpm check:wrapper',
  lint: 'node scripts/check-lint-only.mjs && turbo run lint',
  'check:alpha': 'node scripts/check-alpha.mjs',
  'check:wrapper': 'node scripts/check-wrapper.mjs',
};

const baseFiles = {
  'scripts/check-alpha.mjs': '// alpha',
  'scripts/check-wrapper.mjs': "const WRAPPED = ['find-beta'];",
  'scripts/check-lint-only.mjs': '// lint only',
  'scripts/audit/find-beta.mjs': '// beta scanner',
};

describe('check-wiring-coverage', () => {
  it('passes when every check:* script is wired into the check aggregate (green path)', async () => {
    const root = await stageFixture({ scripts: baseScripts, files: baseFiles });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('check:alpha');
    expect(result.stdout).toContain('wired');
  });

  it('fails when a check:* script is neither wired nor registered in the allowlist (red path)', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, 'check:foo': 'node scripts/check-foo.mjs' },
      files: { ...baseFiles, 'scripts/check-foo.mjs': '// orphan' },
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('check:foo');
    expect(result.stderr).toContain('allowlist');
  });

  it('treats a check whose script runs inside the lint chain as lint-chain (not red)', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, 'check:lint-only': 'node scripts/check-lint-only.mjs' },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('lint-chain');
  });

  it('treats a check with a command identical to a wired check as an alias (not red)', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, 'check:alpha-alias': 'node scripts/check-alpha.mjs' },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('alias-of:check:alpha');
  });

  it('accepts a manual-only allowlist registration', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, 'check:dump': 'jscpd packages/' },
      allowlist: { 'check:dump': { manualOnly: 'raw dump exits 1 by design' } },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('manual-only');
  });

  it('accepts a wrapped-by registration when the wired wrapper source names the scanner', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, 'check:audit-beta': 'node scripts/audit/find-beta.mjs' },
      allowlist: { 'check:audit-beta': { wrappedBy: 'check:wrapper' } },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('wrapped-by:check:wrapper');
  });

  it('fails when a wrapped-by claim points at a wrapper whose source does not name the scanner', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, 'check:audit-gamma': 'node scripts/audit/find-gamma.mjs' },
      allowlist: { 'check:audit-gamma': { wrappedBy: 'check:wrapper' } },
      files: { ...baseFiles, 'scripts/audit/find-gamma.mjs': '// gamma' },
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('check:audit-gamma');
    expect(result.stderr).toContain('find-gamma');
  });

  it('fails when an allowlist entry refers to a check that no longer exists (stale allowlist)', async () => {
    const root = await stageFixture({
      scripts: baseScripts,
      allowlist: { 'check:ghost': { manualOnly: 'deleted long ago' } },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('check:ghost');
    expect(result.stderr).toContain('stale');
  });

  it('fails when an allowlist entry covers a check that is already wired (stale allowlist)', async () => {
    const root = await stageFixture({
      scripts: baseScripts,
      allowlist: { 'check:alpha': { manualOnly: 'should have been removed' } },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('check:alpha');
    expect(result.stderr).toContain('stale');
  });

  it('fails when a check command points at a script file that does not exist', async () => {
    const root = await stageFixture({
      scripts: { ...baseScripts, check: `${baseScripts.check} && pnpm check:missing`, 'check:missing': 'node scripts/check-missing.mjs' },
      files: baseFiles,
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('check:missing');
    expect(result.stderr).toContain('scripts/check-missing.mjs');
  });

  it('runs green against the live repository (18-entry disposition is fully registered)', async () => {
    const result = await runGate(rootDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('check:duplicates:detail');
    expect(result.stdout).toContain('check:audit-non-retained-renderer-references');
  });
});

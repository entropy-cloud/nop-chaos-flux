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
const auditDir = resolve(rootDir, 'scripts', 'audit');
const commentFixtureDir = resolve(here, 'fixtures', 'audit-comment-stripping');
const leakFixtureDir = resolve(here, 'fixtures', 'test-global-leaks');

// 2026-08-09 tool-governance round: committed regression tests exec the REAL
// audit gates against synthetic fixtures staged in a throwaway temp tree
// (`FLUX_AUDIT_SCAN_ROOT` env, 0150-1 stagedDirs governance — aligned with
// find-event-dispatch-without-ctx / find-renderer-browser-io / DG precedent).
let scanRoot;

beforeEach(async () => {
  scanRoot = await mkdtemp(join(tmpdir(), 'flux-audit-governance-'));
});

async function stageFixture(packageDir, fixtureFile, fixtureDir = commentFixtureDir) {
  const targetDir = join(scanRoot, 'packages', packageDir);
  await mkdir(targetDir, { recursive: true });
  const content = await readFile(join(fixtureDir, fixtureFile), 'utf8');
  await writeFile(join(targetDir, fixtureFile), content, 'utf8');
}

function runGate(scriptName) {
  return execFileAsync(process.execPath, [join(auditDir, scriptName)], {
    cwd: rootDir,
    env: { ...process.env, FLUX_AUDIT_SCAN_ROOT: scanRoot },
  });
}

afterEach(async () => {
  await rm(scanRoot, { recursive: true, force: true });
});

describe('comment/string blind-spot stripping (Phase 2 — line/window rules)', () => {
  it('styling: block-comment [data-slot mention is not flagged (styles.css:110 class)', async () => {
    await stageFixture('flux-renderers-ai/src', 'styles-block-comment-negative.fixture.css');
    const { stdout } = await runGate('find-styling-suspects.mjs');
    expect(stdout).not.toContain('styles-block-comment-negative.fixture.css');
  });

  it('styling: real bare [data-slot selector is still flagged', async () => {
    await stageFixture('flux-renderers-ai/src', 'styles-bare-positive.fixture.css');
    const { stdout } = await runGate('find-styling-suspects.mjs');
    expect(stdout).toContain('styles-bare-positive.fixture.css');
  });

  it('performance: JSON.stringify mention inside a comment is not flagged', async () => {
    await stageFixture('flux-renderers-data/src', 'perf-comment-negative.fixture.ts');
    const { stdout } = await runGate('find-performance-suspects.mjs');
    expect(stdout).not.toContain('perf-comment-negative.fixture.ts');
  });

  it('performance: real JSON.stringify change-detection is still flagged', async () => {
    await stageFixture('flux-renderers-data/src', 'perf-change-detection-positive.fixture.ts');
    const { stdout } = await runGate('find-performance-suspects.mjs');
    expect(stdout).toContain('perf-change-detection-positive.fixture.ts');
  });

  it('reactive: useScopeSelector mention inside a comment is not flagged', async () => {
    await stageFixture('flux-renderers-data/src', 'broad-scope-comment-negative.fixture.tsx');
    const { stdout } = await runGate('find-reactive-render-reads.mjs');
    expect(stdout).not.toContain('broad-scope-comment-negative.fixture.tsx');
  });

  it('reactive: real useScopeSelector without paths is still flagged', async () => {
    await stageFixture('flux-renderers-data/src', 'broad-scope-without-paths-positive.fixture.tsx');
    const { stdout } = await runGate('find-reactive-render-reads.mjs');
    expect(stdout).toContain('broad-scope-without-paths-positive.fixture.tsx');
  });

  it('react19: comment mentions of memo/useCallback/useMemo are not flagged', async () => {
    await stageFixture('flux-renderers-basic/src', 'react19-comment-negative.fixture.tsx');
    const { stdout } = await runGate('find-react19-optimization-candidates.mjs');
    expect(stdout).not.toContain('react19-comment-negative.fixture.tsx');
  });

  it('react19: real memo/useCallback/useMemo usages are still flagged', async () => {
    await stageFixture('flux-renderers-basic/src', 'react19-real-positive.fixture.tsx');
    const { stdout } = await runGate('find-react19-optimization-candidates.mjs');
    expect(stdout).toContain('react19-real-positive.fixture.tsx');
  });
});

describe('test-global-leaks const-container recognition (Phase 3)', () => {
  it('flags module-top const containers that are actually mutated', async () => {
    await stageFixture('flux-renderers-scheduling/src/__tests__', 'const-container-positive.fixture.ts', leakFixtureDir);
    const { stdout } = await runGate('find-test-global-leaks.mjs');
    expect(stdout).toContain('const-container-positive.fixture.ts');
    expect(stdout).toContain('const mutableList');
    expect(stdout).toContain('const mutableMap');
    expect(stdout).toContain('const mutableObject');
  });

  it('does NOT flag never-mutated const fixtures, primitives, frozen or as-const', async () => {
    await stageFixture('flux-renderers-scheduling/src/__tests__', 'const-static-negative.fixture.ts', leakFixtureDir);
    const { stdout } = await runGate('find-test-global-leaks.mjs');
    expect(stdout).not.toContain('const-static-negative.fixture.ts');
  });

  it('keeps flagging module-top let (baseline behavior regression)', async () => {
    await stageFixture('flux-renderers-scheduling/src/__tests__', 'let-module-top-positive.fixture.ts', leakFixtureDir);
    const { stdout } = await runGate('find-test-global-leaks.mjs');
    expect(stdout).toContain('let-module-top-positive.fixture.ts');
    expect(stdout).toContain('let moduleCounter');
  });
});

describe('test-global-leaks host renderer package coverage (Phase 5)', () => {
  it('detects module-top let in a host renderer package test file (flow-designer-renderers)', async () => {
    await stageFixture('flow-designer-renderers/src/__tests__', 'host-package-let-positive.fixture.ts', leakFixtureDir);
    const { stdout } = await runGate('find-test-global-leaks.mjs');
    expect(stdout).toContain('host-package-let-positive.fixture.ts');
    expect(stdout).toContain('let hostModuleCounter');
  });
});
